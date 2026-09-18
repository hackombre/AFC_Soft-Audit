import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import jwt
from jwt import InvalidTokenError

from app.database import get_db
from app.models import User, RevokedToken


# ---------------------------------------------------------------------------
# Configuration JWT
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("AFCSOFT_SECRET_KEY") or os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "AFCSOFT_SECRET_KEY n'est pas configurée. "
        "Vérifiez backend/.env."
    )

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 heures


# ---------------------------------------------------------------------------
# Cookie de session
# ---------------------------------------------------------------------------
#
# Le jeton est transporté par un cookie httpOnly plutôt que par
# localStorage : un script injecté dans la page ne peut alors
# plus le lire ni l'exfiltrer.
#
# Le frontend Next.js relaie /api/* vers cette API (voir les
# rewrites de next.config.js) : le cookie est donc same-origin,
# ce qui permet SameSite=Lax.

COOKIE_NAME = "afcsoft_session"

# Secure=true impose HTTPS. À laisser à false uniquement en
# développement local (http://localhost).
COOKIE_SECURE = os.getenv(
    "AFCSOFT_COOKIE_SECURE",
    "true",
).strip().lower() in {"1", "true", "yes"}

# SameSite=Lax empêche l'envoi du cookie sur une requête
# POST/PUT/DELETE déclenchée depuis un autre site : c'est la
# première barrière anti-CSRF.
COOKIE_SAMESITE = "lax"


def set_auth_cookie(response: Response, token: str) -> None:
    """Dépose le jeton de session dans un cookie httpOnly."""

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Supprime le cookie de session."""

    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )


# ---------------------------------------------------------------------------
# Sécurité mot de passe
# ---------------------------------------------------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain: str,
    hashed: str,
) -> bool:
    return pwd_context.verify(
        plain,
        hashed,
    )


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    token_version: int = 0,
) -> str:
    """
    Émet un jeton signé.

    Deux claims permettent la révocation :

    - "jti" : identifiant unique, pour révoquer CE jeton
      précis (déconnexion) ;
    - "ver" : version des jetons de l'utilisateur, pour
      révoquer d'un coup TOUS ses jetons.
    """

    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": uuid.uuid4().hex,
            "ver": token_version,
        }
    )

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    """
    Vérifie et décode un jeton.

    L'algorithme attendu est imposé explicitement : un jeton
    présenté avec "alg": "none" ou un algorithme différent est
    rejeté.
    """

    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options={"require": ["exp", "sub"]},
    )


# ---------------------------------------------------------------------------
# Révocation
# ---------------------------------------------------------------------------

def revoke_token(
    db: Session,
    payload: dict,
) -> None:
    """
    Révoque le jeton décrit par `payload` (déconnexion).

    Purge au passage les révocations dont le jeton aurait de
    toute façon expiré : la table ne grossit pas indéfiniment.
    """

    jti = payload.get("jti")

    if not jti:
        # Jeton émis par une version antérieure, sans jti :
        # rien à enregistrer. Il expirera de lui-même.
        return

    expires_at = datetime.utcfromtimestamp(
        payload.get("exp", 0)
    )

    db.query(RevokedToken).filter(
        RevokedToken.expires_at < datetime.utcnow()
    ).delete(synchronize_session=False)

    if not db.query(RevokedToken).filter(
        RevokedToken.jti == jti
    ).first():

        db.add(
            RevokedToken(
                jti=jti,
                user_id=payload.get("sub"),
                expires_at=expires_at,
            )
        )

    db.commit()


def revoke_all_sessions(
    db: Session,
    user: User,
) -> int:
    """
    Invalide immédiatement tous les jetons existants de
    l'utilisateur, en incrémentant sa version de jetons.

    Retourne la nouvelle version, à replacer dans le jeton
    fraîchement émis si l'on veut garder l'utilisateur connecté
    (cas d'un changement de mot de passe volontaire).
    """

    user.token_version = (user.token_version or 0) + 1

    db.commit()
    db.refresh(user)

    return user.token_version


# ---------------------------------------------------------------------------
# Lecture du jeton présenté
# ---------------------------------------------------------------------------

def _extract_token(request: Request) -> Optional[str]:
    """
    Récupère le jeton, en priorité depuis le cookie httpOnly.

    L'en-tête Authorization reste accepté pour les clients non
    navigateur (scripts d'intégration, tests). Il n'est plus
    utilisé par le frontend.
    """

    cookie_token = request.cookies.get(COOKIE_NAME)

    if cookie_token:
        return cookie_token

    header = request.headers.get("authorization") or ""

    if header.lower().startswith("bearer "):
        return header[7:].strip() or None

    return None


# ---------------------------------------------------------------------------
# Utilisateur connecté
# ---------------------------------------------------------------------------

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides ou session expirée",
    )

    token = _extract_token(request)

    if not token:
        raise credentials_exception

    try:
        payload = decode_token(token)

    except InvalidTokenError:
        # Couvre signature invalide, expiration, algorithme
        # inattendu et claims obligatoires manquants.
        raise credentials_exception

    # Un jeton de réinitialisation de mot de passe ne doit pas
    # ouvrir une session complète.
    if payload.get("purpose"):
        raise credentials_exception

    user_id = payload.get("sub")

    if user_id is None:
        raise credentials_exception

    # --- Révocation individuelle (déconnexion) ---
    jti = payload.get("jti")

    if jti and db.query(RevokedToken).filter(
        RevokedToken.jti == jti
    ).first():
        raise credentials_exception

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise credentials_exception

    # --- Révocation globale ---
    if int(payload.get("ver", 0)) != int(user.token_version or 0):
        raise credentials_exception

    # Rend le payload disponible aux routes qui doivent révoquer
    # le jeton courant (déconnexion).
    request.state.token_payload = payload

    return user


# ---------------------------------------------------------------------------
# Autorisation : associé
# ---------------------------------------------------------------------------

def require_associe(
    user: User = Depends(get_current_user),
) -> User:

    if user.role.value != "associe":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un associé peut effectuer cette action",
        )

    return user