import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    LoginRequest, Token, UserOut, SecurityCodeVerify,
    ChangePasswordRequest, ForgotSecurityCodeRequest,
    ForgotPasswordRequest, VerifyPasswordResetCodeRequest, ResetPasswordRequest,
)
from app.auth import (
    verify_password, hash_password, create_access_token, get_current_user,
    decode_token, revoke_token, revoke_all_sessions,
    set_auth_cookie, clear_auth_cookie,
)
from app.email_service import send_email
from app.rate_limit import client_ip, enforce_rate_limit, reset_rate_limit

router = APIRouter(prefix="/api/auth", tags=["auth"])
ALLOWED_DOMAIN = "@afc-audit.com"
CODE_ALPHABET = string.ascii_uppercase + string.digits
PASSWORD_RESET_EXPIRE_MINUTES = 15


# ============================================================
# POLITIQUE ANTI BRUTE-FORCE
# ============================================================
#
# Deux limites complémentaires sont appliquées :
#
# - par ADRESSE IP : empêche un attaquant de balayer
#   de nombreux comptes depuis une même machine ;
# - par COMPTE : empêche le bourrage de mots de passe
#   sur un compte précis depuis plusieurs adresses.
#
# La limite par compte est volontairement plus stricte pour
# les codes à usage unique (8 caractères), afin que leur
# devinette reste hors de portée.

# Tentatives de connexion.
LOGIN_MAX_PER_IP = 10
LOGIN_MAX_PER_ACCOUNT = 5
LOGIN_WINDOW_SECONDS = 15 * 60

# Vérification d'un code (sécurité ou réinitialisation).
CODE_MAX_PER_ACCOUNT = 5
CODE_MAX_PER_IP = 20
CODE_WINDOW_SECONDS = 15 * 60

# Demandes d'envoi d'un code par email.
# Limite plus basse : chaque demande déclenche un email et
# invalide le code précédent.
REQUEST_MAX_PER_ACCOUNT = 3
REQUEST_MAX_PER_IP = 10
REQUEST_WINDOW_SECONDS = 60 * 60

TOO_MANY_LOGIN_ATTEMPTS = (
    "Trop de tentatives de connexion. "
    "Patientez quelques minutes avant de réessayer."
)

TOO_MANY_CODE_ATTEMPTS = (
    "Trop de tentatives. "
    "Patientez quelques minutes avant de réessayer."
)

TOO_MANY_REQUESTS = (
    "Trop de demandes envoyées. "
    "Patientez avant d'en formuler une nouvelle."
)


def generate_security_code(length: int = 8) -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def _generate_temp_password() -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%?"
    return "".join(secrets.choice(alphabet) for _ in range(14))


@router.post("/login", response_model=Token)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    ip = client_ip(request)

    enforce_rate_limit(
        "login-ip",
        ip,
        LOGIN_MAX_PER_IP,
        LOGIN_WINDOW_SECONDS,
        TOO_MANY_LOGIN_ATTEMPTS,
    )

    enforce_rate_limit(
        "login-compte",
        email,
        LOGIN_MAX_PER_ACCOUNT,
        LOGIN_WINDOW_SECONDS,
        TOO_MANY_LOGIN_ATTEMPTS,
    )

    if not email.endswith(ALLOWED_DOMAIN):
        raise HTTPException(status_code=403, detail="Utilisez votre adresse professionnelle @afc-audit.com.")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email professionnel ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    # Connexion réussie : les compteurs de ce compte et de
    # cette machine sont remis à zéro.
    reset_rate_limit("login-compte", email)
    reset_rate_limit("login-ip", ip)

    token = create_access_token(
        {"sub": user.id},
        token_version=user.token_version or 0,
    )

    # Le jeton part dans un cookie httpOnly : il n'est plus
    # accessible au JavaScript de la page, donc plus
    # exfiltrable en cas d'injection de script.
    set_auth_cookie(response, token)

    plain_code = None
    if not user.security_code_hash:
        plain_code = generate_security_code()
        user.security_code_hash = hash_password(plain_code)
        db.commit()

    return Token(
        security_code=plain_code,
        must_change_password=user.must_change_password,
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Déconnexion : le jeton courant est révoqué côté serveur,
    puis le cookie est supprimé.

    Sans cette révocation, un JWT volé resterait utilisable
    jusqu'à son expiration (12 h) malgré la déconnexion.
    """

    payload = getattr(request.state, "token_payload", None)

    if payload:
        revoke_token(db, payload)

    clear_auth_cookie(response)

    return {"success": True}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enforce_rate_limit(
        "changement-mdp",
        current_user.id,
        LOGIN_MAX_PER_ACCOUNT,
        LOGIN_WINDOW_SECONDS,
        TOO_MANY_CODE_ATTEMPTS,
    )

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    reset_rate_limit("changement-mdp", current_user.id)

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()

    # Un changement de mot de passe doit déconnecter toutes les
    # autres sessions : si le compte était compromis, l'intrus
    # perd immédiatement son accès.
    new_version = revoke_all_sessions(db, current_user)

    # L'utilisateur courant, lui, reste connecté : on lui émet
    # un jeton à la nouvelle version.
    set_auth_cookie(
        response,
        create_access_token(
            {"sub": current_user.id},
            token_version=new_version,
        ),
    )

    return {"success": True}


@router.post("/verify-security-code")
def verify_security_code(
    payload: SecurityCodeVerify,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    enforce_rate_limit(
        "code-securite",
        current_user.id,
        CODE_MAX_PER_ACCOUNT,
        CODE_WINDOW_SECONDS,
        TOO_MANY_CODE_ATTEMPTS,
    )

    enforce_rate_limit(
        "code-securite-ip",
        client_ip(request),
        CODE_MAX_PER_IP,
        CODE_WINDOW_SECONDS,
        TOO_MANY_CODE_ATTEMPTS,
    )

    if not current_user.security_code_hash:
        raise HTTPException(status_code=400, detail="Aucun code de sécurité n'est configuré.")
    code = payload.code.strip().upper()
    if not verify_password(code, current_user.security_code_hash):
        raise HTTPException(status_code=401, detail="Code de sécurité incorrect.")

    reset_rate_limit("code-securite", current_user.id)

    return {"valid": True}


@router.post("/forgot-security-code")
def forgot_security_code(
    payload: ForgotSecurityCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    ip = client_ip(request)

    # Cette route vérifie un mot de passe : elle est soumise
    # aux mêmes limites qu'une tentative de connexion.
    enforce_rate_limit(
        "login-ip",
        ip,
        LOGIN_MAX_PER_IP,
        LOGIN_WINDOW_SECONDS,
        TOO_MANY_LOGIN_ATTEMPTS,
    )

    enforce_rate_limit(
        "login-compte",
        email,
        LOGIN_MAX_PER_ACCOUNT,
        LOGIN_WINDOW_SECONDS,
        TOO_MANY_LOGIN_ATTEMPTS,
    )

    enforce_rate_limit(
        "envoi-code-compte",
        email,
        REQUEST_MAX_PER_ACCOUNT,
        REQUEST_WINDOW_SECONDS,
        TOO_MANY_REQUESTS,
    )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email professionnel ou mot de passe incorrect")

    reset_rate_limit("login-compte", email)

    new_code = generate_security_code()
    try:
        send_email(
            user.email,
            "AFC Soft Audit — Nouveau code de sécurité",
            f"Bonjour {user.first_name},\n\n"
            f"Votre nouveau code de sécurité AFC Soft Audit est : {new_code}\n\n"
            "Ce code sera demandé lors de votre prochaine authentification.\n"
            "Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement le cabinet.",
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Impossible d'envoyer le nouveau code par email : {exc}") from exc

    user.security_code_hash = hash_password(new_code)
    db.commit()
    return {"success": True}


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()

    # Limite appliquée AVANT toute recherche en base : le
    # comportement reste identique que le compte existe ou non,
    # ce qui préserve la non-divulgation des comptes.
    enforce_rate_limit(
        "envoi-code-ip",
        client_ip(request),
        REQUEST_MAX_PER_IP,
        REQUEST_WINDOW_SECONDS,
        TOO_MANY_REQUESTS,
    )

    enforce_rate_limit(
        "envoi-code-compte",
        email,
        REQUEST_MAX_PER_ACCOUNT,
        REQUEST_WINDOW_SECONDS,
        TOO_MANY_REQUESTS,
    )

    if not email.endswith(ALLOWED_DOMAIN):
        raise HTTPException(status_code=403, detail="Utilisez votre adresse professionnelle @afc-audit.com.")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        # Message volontairement générique : ne pas révéler si un compte existe.
        return {"success": True}

    code = generate_security_code(8)
    user.password_reset_code_hash = hash_password(code)
    user.password_reset_expires_at = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    db.commit()

    try:
        send_email(
            user.email,
            "AFC Soft Audit — Code de récupération du mot de passe",
            f"Bonjour {user.first_name},\n\n"
            "Vous avez demandé la réinitialisation de votre mot de passe AFC Soft Audit.\n\n"
            f"Votre code de sécurité est : {code}\n\n"
            f"Ce code est valable {PASSWORD_RESET_EXPIRE_MINUTES} minutes.\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et contactez le cabinet.",
        )
    except Exception as exc:
        user.password_reset_code_hash = None
        user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(status_code=503, detail=f"Impossible d'envoyer le code par email : {exc}") from exc

    return {"success": True}


@router.post("/verify-password-reset-code")
def verify_password_reset_code(
    payload: VerifyPasswordResetCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()

    enforce_rate_limit(
        "code-reinit-compte",
        email,
        CODE_MAX_PER_ACCOUNT,
        CODE_WINDOW_SECONDS,
        TOO_MANY_CODE_ATTEMPTS,
    )

    enforce_rate_limit(
        "code-reinit-ip",
        client_ip(request),
        CODE_MAX_PER_IP,
        CODE_WINDOW_SECONDS,
        TOO_MANY_CODE_ATTEMPTS,
    )

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_reset_code_hash or not user.password_reset_expires_at:
        raise HTTPException(status_code=400, detail="Code de récupération invalide ou expiré.")
    if datetime.utcnow() > user.password_reset_expires_at:
        user.password_reset_code_hash = None
        user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(status_code=400, detail="Code de récupération expiré. Demandez un nouveau code.")
    if not verify_password(payload.code.strip().upper(), user.password_reset_code_hash):
        raise HTTPException(status_code=401, detail="Code de récupération incorrect.")

    reset_rate_limit("code-reinit-compte", email)

    reset_token = create_access_token(
        {"sub": user.id, "purpose": "password_reset"},
        expires_delta=timedelta(minutes=10),
    )
    return {"success": True, "reset_token": reset_token}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        data = decode_token(payload.reset_token)
        if data.get("purpose") != "password_reset":
            raise ValueError("invalid purpose")
        user_id = data.get("sub")
        if not user_id:
            raise ValueError("missing subject")
    except (InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Session de réinitialisation invalide ou expirée.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Compte invalide ou désactivé.")

    user.hashed_password = hash_password(payload.new_password)
    user.must_change_password = False
    user.password_reset_code_hash = None
    user.password_reset_expires_at = None
    db.commit()

    # Une réinitialisation fait suite à une perte d'accès, voire
    # à une compromission : toutes les sessions existantes sont
    # invalidées.
    new_version = revoke_all_sessions(db, user)

    set_auth_cookie(
        response,
        create_access_token(
            {"sub": user.id},
            token_version=new_version,
        ),
    )

    return {"success": True, "must_change_password": False}