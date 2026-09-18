from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Mission, MissionMember, Answer, Role, Entity
from app.schemas import MissionCreate, MissionOut
from app.auth import get_current_user
from app.questionnaire_utils import TOTAL_QUESTIONS
from app.google_drive import sync_mission_permissions


router = APIRouter(
    prefix="/api/missions",
    tags=["missions"],
)


# ============================================================
# RÔLES AUTORISÉS À CRÉER UNE MISSION
# ============================================================

CAN_CREATE_MISSION = {
    Role.associe,
}


# ============================================================
# PROGRESSION D'UNE MISSION
# ============================================================

def _mission_progress(
    db: Session,
    mission_id: str,
) -> float:
    """
    Calcule le pourcentage de questions renseignées
    pour une mission.
    """

    if TOTAL_QUESTIONS == 0:
        return 0.0

    answered = (
        db.query(Answer)
        .filter(
            Answer.mission_id == mission_id,
            Answer.value.isnot(None),
            Answer.value != "",
        )
        .count()
    )

    return round(
        100 * answered / TOTAL_QUESTIONS,
        1,
    )


# ============================================================
# VÉRIFICATION DE L'ACCÈS À UNE MISSION
# ============================================================

def _ensure_mission_access(
    mission: Mission,
    current_user: User,
):
    """
    Vérifie que l'utilisateur a accès à la mission.

    Règle AFCsoft :
    - Un associé a accès à toutes les missions.
    - Les autres utilisateurs doivent être membres
      de la mission.
    """

    if current_user.role == Role.associe:
        return

    has_access = any(
        member.user_id == current_user.id
        for member in mission.members
    )

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Vous n'avez pas accès à cette mission.",
        )


# ============================================================
# LISTE DES MISSIONS
# ============================================================

@router.get(
    "",
    response_model=list[MissionOut],
)
def list_missions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne les missions accessibles à l'utilisateur.

    Associé :
        -> toutes les missions.

    Autres utilisateurs :
        -> uniquement les missions dont ils sont membres.
    """

    if current_user.role == Role.associe:

        missions = (
            db.query(Mission)
            .order_by(
                Mission.created_at.desc()
            )
            .all()
        )

    else:

        missions = (
            db.query(Mission)
            .join(
                MissionMember,
                MissionMember.mission_id == Mission.id,
            )
            .filter(
                MissionMember.user_id
                == current_user.id
            )
            .order_by(
                Mission.created_at.desc()
            )
            .all()
        )

    out = []

    for mission in missions:

        item = MissionOut.model_validate(
            mission
        )

        item.entity_name = (
            mission.entity.name
            if mission.entity
            else None
        )

        item.progress = _mission_progress(
            db,
            mission.id,
        )

        out.append(item)

    return out


# ============================================================
# CRÉATION D'UNE MISSION
# ============================================================

@router.post(
    "",
    response_model=MissionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_mission(
    payload: MissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crée une mission.

    Règles :
    - Seul un associé peut créer une mission.
    - Tous les associés actifs sont automatiquement membres.
    - Les autres utilisateurs sont ajoutés selon member_ids.
    - Les permissions Google Drive sont ensuite synchronisées.
    """

    # --------------------------------------------------------
    # Vérification du rôle
    # --------------------------------------------------------

    if current_user.role not in CAN_CREATE_MISSION:
        raise HTTPException(
            status_code=403,
            detail="Seul un associé peut créer une mission",
        )

    # --------------------------------------------------------
    # Vérification de l'entité
    # --------------------------------------------------------

    entity = (
        db.query(Entity)
        .filter(
            Entity.id == payload.entity_id
        )
        .first()
    )

    if not entity:
        raise HTTPException(
            status_code=400,
            detail=(
                "Entité introuvable — "
                "créez d'abord l'entité."
            ),
        )

    # --------------------------------------------------------
    # Unicité du nom au sein de la même entité
    # --------------------------------------------------------
    #
    # Comparaison insensible à la casse et aux espaces en
    # trop, pour éviter que "Audit 2026" et "audit 2026 "
    # coexistent comme deux missions distinctes du même client.
    # Deux entités différentes peuvent avoir chacune une mission
    # du même nom — la contrainte est bien par entité, pas
    # globale.

    mission_name = payload.name.strip()

    existing = (
        db.query(Mission)
        .filter(
            Mission.entity_id == payload.entity_id,
            func.lower(Mission.name) == mission_name.lower(),
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Une mission nommée « {mission_name} » "
                "existe déjà pour cette entité. Choisissez "
                "un autre nom (par exemple en précisant "
                "l'exercice)."
            ),
        )

    # --------------------------------------------------------
    # Création de la mission
    # --------------------------------------------------------

    mission = Mission(
        entity_id=payload.entity_id,
        name=mission_name,
        closing_date=payload.closing_date,
        fiscal_year=payload.fiscal_year,
        client_name=payload.client_name,
        created_by=current_user.id,
    )

    db.add(mission)
    db.flush()
    db.refresh(mission)

    # --------------------------------------------------------
    # Tous les associés actifs sont obligatoires
    # --------------------------------------------------------

    associates = (
        db.query(User)
        .filter(
            User.role == Role.associe,
            User.is_active == True,
        )
        .all()
    )

    # --------------------------------------------------------
    # Utilisateurs sélectionnés
    # --------------------------------------------------------

    selected_ids = {
        str(uid).strip()
        for uid in (payload.member_ids or [])
        if uid is not None
        and str(uid).strip()
    }

    # --------------------------------------------------------
    # Ajout automatique des associés
    # --------------------------------------------------------

    for user in associates:

        db.add(
            MissionMember(
                mission_id=mission.id,
                user_id=user.id,
                role=user.role,
            )
        )

    # --------------------------------------------------------
    # Ajout des autres utilisateurs sélectionnés
    # --------------------------------------------------------

    if selected_ids:

        selected_users = (
            db.query(User)
            .filter(
                User.id.in_(selected_ids),
                User.is_active == True,
            )
            .all()
        )

        for user in selected_users:

            # Les associés sont déjà ajoutés
            # automatiquement.
            if user.role == Role.associe:
                continue

            db.add(
                MissionMember(
                    mission_id=mission.id,
                    user_id=user.id,
                    role=user.role,
                )
            )

    # --------------------------------------------------------
    # Enregistrement
    # --------------------------------------------------------

    db.commit()
    db.refresh(mission)

    # --------------------------------------------------------
    # Synchronisation Google Drive
    # --------------------------------------------------------
    #
    # Les mêmes utilisateurs qui ont accès à la mission
    # reçoivent l'accès au dossier Google Drive.
    #
    # Un utilisateur non membre n'obtient pas d'accès.
    #

    try:

        sync_mission_permissions(
            mission,
            # mission.members est la table de liaison
            # (MissionMember), pas des utilisateurs : elle
            # n'a pas de champ email. sync_mission_permissions
            # attend de vrais User, d'où .user ici.
            [
                member.user
                for member in mission.members
                if member.user
            ],
        )

    except Exception as exc:

        # La mission existe bien en base (le commit a déjà eu
        # lieu). Ce n'est pas un échec de la création : on le
        # signale via un champ de la réponse plutôt qu'une
        # erreur HTTP, pour que le frontend traite la mission
        # comme créée avec succès (rafraîchit la liste, ferme le
        # formulaire) et affiche seulement un avertissement.
        #
        # Sans ça, l'utilisateur voit une erreur alors que la
        # mission existe déjà, et risque d'en recréer une en
        # double en réessayant.
        mission.drive_sync_warning = (
            "La synchronisation Google Drive a échoué : "
            f"{exc}. Retentez-la depuis les paramètres de "
            "la mission une fois la connexion rétablie."
        )

    # --------------------------------------------------------
    # Réponse
    # --------------------------------------------------------

    out = MissionOut.model_validate(
        mission
    )

    out.entity_name = (
        mission.entity.name
        if mission.entity
        else None
    )

    out.progress = 0.0

    return out


# ============================================================
# RÉCUPÉRER UNE MISSION
# ============================================================

@router.get(
    "/{mission_id}",
    response_model=MissionOut,
)
def get_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne une mission uniquement si l'utilisateur
    est autorisé à la consulter.
    """

    mission = (
        db.query(Mission)
        .filter(
            Mission.id == mission_id
        )
        .first()
    )

    if not mission:
        raise HTTPException(
            status_code=404,
            detail="Mission introuvable",
        )

    _ensure_mission_access(
        mission,
        current_user,
    )

    out = MissionOut.model_validate(
        mission
    )

    out.entity_name = (
        mission.entity.name
        if mission.entity
        else None
    )

    out.progress = _mission_progress(
        db,
        mission_id,
    )

    return out


# ============================================================
# SUPPRIMER UNE MISSION
# ============================================================

@router.delete(
    "/{mission_id}",
    status_code=204,
)
def delete_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Supprime une mission.

    Seul un associé peut supprimer une mission.
    """

    if current_user.role != Role.associe:
        raise HTTPException(
            status_code=403,
            detail=(
                "Seul un associé peut supprimer "
                "une mission."
            ),
        )

    mission = (
        db.query(Mission)
        .filter(
            Mission.id == mission_id
        )
        .first()
    )

    if not mission:
        raise HTTPException(
            status_code=404,
            detail="Mission introuvable",
        )

    db.delete(mission)
    db.commit()

    return None


# ============================================================
# LISTE DES MEMBRES D'UNE MISSION
# ============================================================

@router.get(
    "/{mission_id}/members"
)
def list_mission_members(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne les membres ayant accès à une mission.
    """

    mission = (
        db.query(Mission)
        .filter(
            Mission.id == mission_id
        )
        .first()
    )

    if not mission:
        raise HTTPException(
            status_code=404,
            detail="Mission introuvable",
        )

    _ensure_mission_access(
        mission,
        current_user,
    )

    return [
        {
            "id": member.user.id,
            "email": member.user.email,
            "first_name": member.user.first_name,
            "last_name": member.user.last_name,
            "role": member.user.role,
            "is_active": member.user.is_active,
        }
        for member in mission.members
        if member.user
    ]


# ============================================================
# MODIFICATION DES MEMBRES
# ============================================================

@router.put(
    "/{mission_id}/members"
)
def update_mission_members(
    mission_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Synchronise les membres d'une mission.

    Règles :
    - Tous les associés actifs ont toujours accès.
    - Les autres membres sont ceux sélectionnés.
    - Les doublons sont ignorés.
    - Les membres retirés sont supprimés.
    - Les permissions Google Drive sont synchronisées
      avec la nouvelle liste.
    """

    # --------------------------------------------------------
    # Vérification du rôle
    # --------------------------------------------------------

    if current_user.role != Role.associe:
        raise HTTPException(
            status_code=403,
            detail=(
                "Seul un associé peut modifier "
                "les accès à une mission."
            ),
        )

    # --------------------------------------------------------
    # Recherche de la mission
    # --------------------------------------------------------

    mission = (
        db.query(Mission)
        .filter(
            Mission.id == mission_id
        )
        .first()
    )

    if not mission:
        raise HTTPException(
            status_code=404,
            detail="Mission introuvable",
        )

    # --------------------------------------------------------
    # 1. Nettoyage des IDs reçus
    # --------------------------------------------------------

    raw_ids = payload.get(
        "member_ids"
    ) or []

    if not isinstance(raw_ids, list):
        raise HTTPException(
            status_code=400,
            detail=(
                "member_ids doit être une liste."
            ),
        )

    selected_ids = {
        str(uid).strip()
        for uid in raw_ids
        if uid is not None
        and str(uid).strip()
    }

    # --------------------------------------------------------
    # 2. Associés actifs obligatoires
    # --------------------------------------------------------

    associates = (
        db.query(User)
        .filter(
            User.role == Role.associe,
            User.is_active == True,
        )
        .all()
    )

    associate_ids = {
        user.id
        for user in associates
    }

    # --------------------------------------------------------
    # 3. Membres désirés
    # --------------------------------------------------------

    desired_ids = associate_ids.copy()

    # --------------------------------------------------------
    # 4. Utilisateurs sélectionnés
    # --------------------------------------------------------

    if selected_ids:

        selected_users = (
            db.query(User)
            .filter(
                User.id.in_(selected_ids),
                User.is_active == True,
            )
            .all()
        )

        for user in selected_users:

            if user.role != Role.associe:
                desired_ids.add(
                    user.id
                )

    # --------------------------------------------------------
    # 5. Membres actuels
    # --------------------------------------------------------

    existing_members = {
        member.user_id: member
        for member in mission.members
    }

    # --------------------------------------------------------
    # 6. Suppression des anciens membres
    # --------------------------------------------------------

    removed_members = []

    for user_id, member in list(
        existing_members.items()
    ):

        if user_id not in desired_ids:

            # On garde l'utilisateur pour pouvoir
            # éventuellement journaliser/debugger
            # avant suppression.
            if member.user:
                removed_members.append(
                    member.user
                )

            db.delete(member)

    # --------------------------------------------------------
    # 7. Ajout des nouveaux membres
    # --------------------------------------------------------

    for user_id in desired_ids:

        if user_id not in existing_members:

            user = (
                db.query(User)
                .filter(
                    User.id == user_id,
                    User.is_active == True,
                )
                .first()
            )

            if user:

                db.add(
                    MissionMember(
                        mission_id=mission.id,
                        user_id=user.id,
                        role=user.role,
                    )
                )

        else:

            # Le membre existe déjà.
            # On synchronise son rôle.
            existing_member = (
                existing_members[user_id]
            )

            user = (
                db.query(User)
                .filter(
                    User.id == user_id
                )
                .first()
            )

            if user:
                existing_member.role = (
                    user.role
                )

    # --------------------------------------------------------
    # 8. Enregistrement
    # --------------------------------------------------------

    db.commit()
    db.refresh(mission)

    # --------------------------------------------------------
    # 9. Synchronisation Google Drive
    # --------------------------------------------------------
    #
    # mission.members représente maintenant exactement
    # les utilisateurs autorisés sur la mission.
    #
    # Les nouveaux membres :
    #     -> accès Drive
    #
    # Les membres retirés :
    #     -> suppression de l'accès Drive
    #
    # Les associés actifs :
    #     -> accès Drive obligatoire
    #

    drive_sync_warning = None

    try:

        sync_mission_permissions(
            mission,
            # mission.members est la table de liaison
            # (MissionMember), pas des utilisateurs : elle
            # n'a pas de champ email. sync_mission_permissions
            # attend de vrais User, d'où .user ici.
            [
                member.user
                for member in mission.members
                if member.user
            ],
        )

    except Exception as exc:

        # Même logique qu'à la création : les membres sont déjà
        # enregistrés en base, ce n'est pas un échec de la
        # requête. On le signale sans lever d'erreur HTTP.
        drive_sync_warning = (
            "Les membres ont été mis à jour, mais la "
            "synchronisation Google Drive a échoué : "
            f"{exc}. Retentez-la une fois la connexion "
            "rétablie."
        )

    # --------------------------------------------------------
    # 10. Réponse
    # --------------------------------------------------------

    return {
        "success": True,
        "drive_sync_warning": drive_sync_warning,
        "members": [
            {
                "id": member.user.id,
                "email": member.user.email,
                "first_name": member.user.first_name,
                "last_name": member.user.last_name,
                "role": member.user.role,
            }
            for member in mission.members
            if member.user
        ],
    }