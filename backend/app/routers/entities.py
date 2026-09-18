from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Entity, Mission, MissionMember, Role
from app.schemas import EntityCreate, EntityOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/entities", tags=["entities"])


# ============================================================
# PÉRIMÈTRE DE VISIBILITÉ DES ENTITÉS
# ============================================================

def _visible_entities_query(db: Session, current_user: User):
    """
    Construit la requête des entités visibles par l'utilisateur.

    Règle AFCsoft :

    - Un associé voit toutes les entités.
    - Tout autre utilisateur ne voit que les entités pour
      lesquelles il est membre d'au moins une mission.

    Un collaborateur non affecté ne doit pas pouvoir consulter
    le portefeuille clients du cabinet (raison sociale, RCCM,
    NIU).
    """

    query = db.query(Entity)

    if current_user.role == Role.associe:
        return query

    return (
        query
        .join(
            Mission,
            Mission.entity_id == Entity.id,
        )
        .join(
            MissionMember,
            MissionMember.mission_id == Mission.id,
        )
        .filter(
            MissionMember.user_id == current_user.id,
        )
        .distinct()
    )


def _ensure_entity_access(
    db: Session,
    entity_id: str,
    current_user: User,
) -> Entity:
    """
    Retourne l'entité si l'utilisateur a le droit de la voir.

    Un utilisateur hors périmètre reçoit 404 et non 403 : cela
    évite de lui confirmer l'existence d'un client du cabinet.
    """

    entity = (
        _visible_entities_query(db, current_user)
        .filter(Entity.id == entity_id)
        .first()
    )

    if not entity:
        raise HTTPException(
            status_code=404,
            detail="Entité introuvable",
        )

    return entity


@router.get("", response_model=list[EntityOut])
def list_entities(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        _visible_entities_query(db, current_user)
        .order_by(Entity.name)
        .all()
    )


@router.post("", response_model=EntityOut, status_code=201)
def create_entity(
    payload: EntityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value != "associe":
        raise HTTPException(status_code=403, detail="Seul un associé peut créer une entité.")
    entity = Entity(
        name=payload.name,
        raison_sociale=payload.raison_sociale,
        forme_juridique=payload.forme_juridique,
        rccm=payload.rccm,
        niu=payload.niu,
        sigle=payload.sigle,
        created_by=current_user.id,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


@router.get("/{entity_id}", response_model=EntityOut)
def get_entity(entity_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _ensure_entity_access(db, entity_id, current_user)


@router.delete("/{entity_id}", status_code=204)
def delete_entity(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value != "associe":
        raise HTTPException(status_code=403, detail="Seul un associé peut supprimer une entité.")
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entité introuvable")
    if entity.missions:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer une entité qui a des missions. Supprimez d'abord ses missions.",
        )
    db.delete(entity)
    db.commit()
    return None