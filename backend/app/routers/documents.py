from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Mission, MissionMember, Document, DocumentCategory, Role
from app.schemas import DocumentOut
from app.auth import get_current_user
from app.google_drive import upload_bytes, download_bytes, delete_file

router = APIRouter(prefix="/api/documents", tags=["documents"])


# ============================================================
# CONTRÔLE DES FICHIERS DÉPOSÉS
# ============================================================

# Extensions acceptées pour les pièces d'audit.
ALLOWED_EXTENSIONS = {
    # Documents bureautiques
    ".doc", ".docx", ".odt", ".rtf", ".txt",
    ".xls", ".xlsx", ".xlsm", ".ods", ".csv",
    ".ppt", ".pptx", ".odp",

    # Documents figés
    ".pdf",

    # Justificatifs numérisés / photos
    ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".heic",

    # Archives de pièces
    ".zip",
}


def _extension(filename: str) -> str:
    """Retourne l'extension du fichier, en minuscules."""

    filename = filename or ""

    if "." not in filename:
        return ""

    return "." + filename.rsplit(".", 1)[1].lower()


def _safe_filename(filename: str) -> str:
    """
    Neutralise un nom de fichier fourni par l'utilisateur.

    Retire les composants de chemin et les caractères pouvant
    casser l'en-tête Content-Disposition lors du téléchargement.
    """

    filename = (filename or "").strip()

    # Retire tout chemin (Windows comme Unix).
    filename = filename.replace("\\", "/").split("/")[-1]

    # Retire guillemets, sauts de ligne et caractères de
    # contrôle.
    filename = "".join(
        char
        for char in filename
        if char.isprintable() and char not in '"\r\n'
    )

    filename = filename.strip(". ")

    return filename or "document"


def _mission_or_404(db: Session, mission_id: str) -> Mission:
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission

def _check_access(mission: Mission, current_user: User):
    if current_user.role == Role.associe:
        return
    if not any(m.user_id == current_user.id for m in mission.members):
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette mission.")


@router.get("/missions/{mission_id}", response_model=list[DocumentOut])
def list_documents(mission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mission = _mission_or_404(db, mission_id)
    _check_access(mission, current_user)
    return db.query(Document).filter(Document.mission_id == mission_id).order_by(Document.uploaded_at.desc()).all()


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
    mission = _mission_or_404(db, mission_id)
    _check_access(mission, current_user)
    # Règle métier : seuls les nœuds « Documents reçus » sont classés dans
    # Documents reçus. Toute pièce jointe depuis le questionnaire est un travail.
    cat = DocumentCategory.recus if node_id.split(".")[-1] == "7" and node_id.split(".")[0] in {"1", "2"} else DocumentCategory.travaux
    # Les nœuds dynamiques des autres étapes utilisent leur dernier numéro.
    if node_id in {"3.6", "4.9", "5.3"}:
        cat = DocumentCategory.recus

    # --------------------------------------------------------
    # Contrôle du fichier déposé
    # --------------------------------------------------------

    filename = _safe_filename(file.filename)

    extension = _extension(filename)

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Format de fichier non autorisé. "
                "Formats acceptés : documents bureautiques, "
                "PDF, images numérisées et archives .zip."
            ),
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Le fichier sélectionné est vide.",
        )

    try:
        drive_file = upload_bytes(mission, node_id, cat.value, filename, content, file.content_type)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Impossible d'enregistrer le document dans le Drive partagé : {exc}") from exc

    doc = Document(
        mission_id=mission_id,
        node_id=node_id,
        question_id=question_id,
        category=cat,
        filename=filename,
        stored_path=None,
        drive_file_id=drive_file["id"],
        drive_web_url=drive_file.get("webViewLink"),
        content_type=file.content_type,
        size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    _check_access(doc.mission, current_user)
    if not doc.drive_file_id:
        raise HTTPException(status_code=404, detail="Fichier absent du Drive partagé")
    try:
        stream = download_bytes(doc.drive_file_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Fichier introuvable dans le Drive partagé") from exc
    return StreamingResponse(
        stream,
        media_type=doc.content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(doc.filename)}"'},
    )


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    _check_access(doc.mission, current_user)
    if doc.drive_file_id:
        try:
            delete_file(doc.drive_file_id)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Impossible de supprimer le fichier du Drive partagé : {exc}") from exc
    db.delete(doc)
    db.commit()
    return None