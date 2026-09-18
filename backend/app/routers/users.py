import os
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, MissionMember
from app.schemas import UserOut, UserCreate, UserUpdate
from app.auth import require_associe, hash_password, revoke_all_sessions
from app.email_service import send_email

router = APIRouter(prefix="/api/users", tags=["users"])
ALLOWED_DOMAIN = "@afc-audit.com"


def generate_temp_password(length: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%?"
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_associe),
):
    """
    Liste les utilisateurs du cabinet.

    SÉCURITÉ :
    réservé aux associés. Le module Utilisateurs n'est visible
    que pour eux, et cette liste expose les emails, rôles et
    statuts de l'ensemble du personnel.
    """
    return db.query(User).order_by(User.created_at.asc()).all()


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_associe),
):
    email = payload.email.lower()

    if not email.endswith(ALLOWED_DOMAIN):
        raise HTTPException(
            status_code=400,
            detail="L'email doit utiliser le domaine @afc-audit.com.",
        )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=400,
            detail="Un utilisateur avec cet email existe déjà",
        )

    temp_password = payload.password or generate_temp_password()

    user = User(
        email=email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        hashed_password=hash_password(temp_password),
        must_change_password=True,
    )

    db.add(user)
    db.flush()

    try:
        login_url = os.getenv(
            "APP_LOGIN_URL",
            "http://localhost:3000/login",
        )

        send_email(
            email,
            "AFC Soft Audit — Votre compte",
            f"Bonjour {payload.first_name},\n\n"
            "Un compte AFC Soft Audit vient d'être créé pour vous.\n\n"
            f"Email professionnel : {email}\n"
            f"Mot de passe provisoire : {temp_password}\n\n"
            f"Page de connexion : {login_url}\n\n"
            "Connectez-vous à l'application via ce lien. "
            "À votre première connexion, vous devrez obligatoirement "
            "remplacer ce mot de passe provisoire.\n\n"
            "Cordialement,\nAFC Soft Audit",
        )

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=(
                "Utilisateur non créé : impossible d'envoyer "
                f"l'email ({exc})"
            ),
        ) from exc

    db.commit()
    db.refresh(user)

    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_associe),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Utilisateur introuvable",
        )

    data = payload.model_dump(exclude_unset=True)

    # Une réinitialisation de mot de passe par un associé, ou la
    # désactivation d'un compte, doit couper immédiatement les
    # sessions déjà ouvertes de cet utilisateur.
    must_revoke = False

    if "password" in data:
        pwd = data.pop("password")

        if pwd:
            user.hashed_password = hash_password(pwd)
            user.must_change_password = True
            must_revoke = True

    if data.get("is_active") is False:
        must_revoke = True

    for field, value in data.items():
        setattr(user, field, value)

    db.commit()

    if must_revoke:
        revoke_all_sessions(db, user)

    db.refresh(user)

    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(require_associe),
):
    # Un associé ne peut pas supprimer son propre compte.
    if user_id == current.id:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas vous supprimer vous-même",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Utilisateur introuvable",
        )

    try:
        # -----------------------------------------------------
        # 1. Supprimer toutes les appartenances aux missions
        # -----------------------------------------------------
        db.query(MissionMember).filter(
            MissionMember.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        # -----------------------------------------------------
        # 2. Supprimer l'utilisateur
        # -----------------------------------------------------
        db.delete(user)

        # -----------------------------------------------------
        # 3. Valider la suppression dans la même transaction
        # -----------------------------------------------------
        db.commit()

    except Exception:
        db.rollback()
        raise

    return None