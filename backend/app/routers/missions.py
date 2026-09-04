from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Mission, MissionMember, Answer, Role, Entity
from app.schemas import MissionCreate, MissionOut
from app.auth import get_current_user
from app.questionnaire_utils import TOTAL_QUESTIONS

router = APIRouter(prefix="/api/missions", tags=["missions"])

# Rôles autorisés à créer une mission
CAN_CREATE_MISSION = {Role.associe, Role.directeur_mission}


def _mission_progress(db: Session, mission_id: str) -> float:
    if TOTAL_QUESTIONS == 0:
        return 0.0
    answered = (
        db.query(Answer)
        .filter(Answer.mission_id == mission_id, Answer.value.isnot(None), Answer.value != "")
        .count()
    )
    return round(100 * answered / TOTAL_QUESTIONS, 1)


@router.get("", response_model=list[MissionOut])
def list_missions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == Role.associe:
        missions = db.query(Mission).order_by(Mission.created_at.desc()).all()
    else:
        missions = (
            db.query(Mission)
            .join(MissionMember, MissionMember.mission_id == Mission.id)
            .filter(MissionMember.user_id == current_user.id)
            .order_by(Mission.created_at.desc())
            .all()
        )
    out = []
    for m in missions:
        item = MissionOut.model_validate(m)
        item.entity_name = m.entity.name if m.entity else None
        item.progress = _mission_progress(db, m.id)
        out.append(item)
    return out


@router.post("", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(
    payload: MissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CAN_CREATE_MISSION:
        raise HTTPException(
            status_code=403,
            detail="Seul un associé ou un directeur de mission peut créer une mission",
        )
    entity = db.query(Entity).filter(Entity.id == payload.entity_id).first()
    if not entity:
        raise HTTPException(status_code=400, detail="Entité introuvable — créez d'abord l'entité.")
    mission = Mission(
        entity_id=payload.entity_id,
        name=payload.name,
        closing_date=payload.closing_date,
        fiscal_year=payload.fiscal_year,
        client_name=payload.client_name,
        created_by=current_user.id,
    )
    db.add(mission)
    db.flush()
    db.refresh(mission)

    member_ids = set(payload.member_ids) | {current_user.id}
    for uid in member_ids:
        user = db.query(User).filter(User.id == uid).first()
        if user:
            db.add(MissionMember(mission_id=mission.id, user_id=user.id, role=user.role))

    db.commit()
    db.refresh(mission)
    out = MissionOut.model_validate(mission)
    out.entity_name = mission.entity.name if mission.entity else None
    out.progress = 0.0
    return out


@router.get("/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    out = MissionOut.model_validate(mission)
    out.entity_name = mission.entity.name if mission.entity else None
    out.progress = _mission_progress(db, mission_id)
    return out


@router.delete("/{mission_id}", status_code=204)
def delete_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CAN_CREATE_MISSION:
        raise HTTPException(
            status_code=403,
            detail="Seul un associé ou un directeur de mission peut supprimer une mission.",
        )
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    db.delete(mission)
    db.commit()
    return None
