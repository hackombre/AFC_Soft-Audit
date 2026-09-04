import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Mission, Document, DocumentCategory
from app.schemas import DocumentOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _mission_or_404(db: Session, mission_id: str) -> Mission:
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission


@router.get("/missions/{mission_id}", response_model=list[DocumentOut])
def list_documents(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _mission_or_404(db, mission_id)
    return (
        db.query(Document)
        .filter(Document.mission_id == mission_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )


@router.post("/missions/{mission_id}/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    mission_id: str,
    node_id: str = Form(...),
    category: str = Form("recus"),
    question_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _mission_or_404(db, mission_id)
    try:
        cat = DocumentCategory(category)
    except ValueError:
        cat = DocumentCategory.recus

    mission_dir = UPLOAD_DIR / mission_id / node_id
    mission_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    dest = mission_dir / safe_name

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    doc = Document(
        mission_id=mission_id,
        node_id=node_id,
        question_id=question_id,
        category=cat,
        filename=file.filename,
        stored_path=str(dest),
        content_type=file.content_type,
        size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not os.path.exists(doc.stored_path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(doc.stored_path, filename=doc.filename, media_type=doc.content_type)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    try:
        if os.path.exists(doc.stored_path):
            os.remove(doc.stored_path)
    except OSError:
        pass
    db.delete(doc)
    db.commit()
    return None
