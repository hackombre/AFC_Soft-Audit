import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Answer, Mission
from app.schemas import AnswerIn, AnswerOut
from app.auth import get_current_user
from app.data.questionnaire_data import QUESTIONNAIRE
from app.questionnaire_utils import ALL_QUESTIONS_BY_ID, TOTAL_QUESTIONS

router = APIRouter(prefix="/api/questionnaire", tags=["questionnaire"])


@router.get("/structure")
def get_structure(current_user: User = Depends(get_current_user)):
    """Retourne l'arbre complet du questionnaire (sections > étapes > sous-étapes > questions)."""
    return {"sections": QUESTIONNAIRE, "total_questions": TOTAL_QUESTIONS}


@router.get("/missions/{mission_id}/answers", response_model=list[AnswerOut])
def get_answers(mission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    rows = db.query(Answer).filter(Answer.mission_id == mission_id).all()
    out = []
    for r in rows:
        try:
            value = json.loads(r.value) if r.value is not None else None
        except (TypeError, ValueError):
            value = r.value
        out.append(AnswerOut(
            question_id=r.question_id,
            value=value,
            comment=r.comment,
            updated_at=r.updated_at,
            updated_by=r.updated_by,
        ))
    return out


@router.put("/missions/{mission_id}/answers/{question_id}", response_model=AnswerOut)
def save_answer(
    mission_id: str,
    question_id: str,
    payload: AnswerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if question_id not in ALL_QUESTIONS_BY_ID:
        raise HTTPException(status_code=400, detail="Question inconnue")

    row = (
        db.query(Answer)
        .filter(Answer.mission_id == mission_id, Answer.question_id == question_id)
        .first()
    )
    serialized = json.dumps(payload.value, ensure_ascii=False)
    if row:
        row.value = serialized
        row.comment = payload.comment
        row.updated_by = current_user.id
    else:
        row = Answer(
            mission_id=mission_id,
            question_id=question_id,
            value=serialized,
            comment=payload.comment,
            updated_by=current_user.id,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return AnswerOut(
        question_id=row.question_id,
        value=payload.value,
        comment=row.comment,
        updated_at=row.updated_at,
        updated_by=row.updated_by,
    )
