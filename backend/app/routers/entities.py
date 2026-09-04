from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Entity
from app.schemas import EntityCreate, EntityOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("", response_model=list[EntityOut])
def list_entities(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Entity).order_by(Entity.name).all()


@router.post("", response_model=EntityOut, status_code=201)
def create_entity(
    payload: EntityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value not in ("associe", "directeur_mission"):
        raise HTTPException(
            status_code=403,
            detail="Seul un associé ou un directeur de mission peut créer une entité.",
        )
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
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entité introuvable")
    return entity


@router.delete("/{entity_id}", status_code=204)
def delete_entity(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value not in ("associe", "directeur_mission"):
        raise HTTPException(
            status_code=403,
            detail="Seul un associé ou un directeur de mission peut supprimer une entité.",
        )
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
