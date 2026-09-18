from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import GuideTemplate, User
from ..schemas import GuideTemplateOut

router = APIRouter(
prefix="/guide-templates",
tags=["guide-templates"],
)

ALLOWED_EXTENSIONS = {
# Word
".doc",
".docx",


# Documents
".odt",
".rtf",

# Excel
".xls",
".xlsx",
".ods",

# PowerPoint
".ppt",
".pptx",
".odp",


}

def _extension(filename: str) -> str:
    """Retourne l'extension du fichier en minuscules."""
    filename = filename or ""


    if "." not in filename:
        return ""

    return "." + filename.rsplit(".", 1)[1].lower()


def _require_associate(current_user: User) -> None:
    """Vérifie que l'utilisateur est un associé."""
    role = getattr(current_user, "role", None)


    if getattr(role, "value", role) != "associe":
        raise HTTPException(
            status_code=403,
            detail="Seul un associé peut gérer les modèles de guides.",
        )


def _serialize_template(template: GuideTemplate) -> dict:
    """Prépare un modèle pour la réponse API."""
    return {
        "id": template.id,
        "node_id": template.node_id,
        "filename": template.filename,
        "content_type": template.content_type,
        "size": template.size,
        "uploaded_by": template.uploaded_by,
        "uploaded_at": template.uploaded_at,
        "download_url": (
        f"/api/guide-templates/{template.id}/download"
        ),
    }

@router.get("", response_model=list[GuideTemplateOut])

def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste tous les modèles de guides."""
    _require_associate(current_user)


    templates = (
        db.query(GuideTemplate)
        .order_by(
            GuideTemplate.node_id.asc(),
            GuideTemplate.filename.asc(),
        )
        .all()
    )

    return [
        _serialize_template(template)
        for template in templates
    ]


@router.post("/upload", response_model=GuideTemplateOut)

async def upload_template(
    node_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ajoute un modèle de guide."""
    _require_associate(current_user)


    node_id = (node_id or "").strip()

    if not node_id:
        raise HTTPException(
            status_code=400,
            detail="L'identifiant de la question est obligatoire.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Le fichier sélectionné n'a pas de nom.",
        )

    extension = _extension(file.filename)

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Format de fichier non autorisé. "
                "Formats acceptés : "
                ".doc, .docx, .odt, .rtf, "
                ".xls, .xlsx, .ods, "
                ".ppt, .pptx, .odp."
            ),
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Le fichier sélectionné est vide.",
        )

    template = GuideTemplate(
        node_id=node_id,
        filename=file.filename,
        content=content,
        content_type=file.content_type,
        size=len(content),
        uploaded_by=current_user.id,
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return _serialize_template(template)


@router.get("/{template_id}/download")

def download_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ):
    """Télécharge un modèle de guide."""


    template = (
        db.query(GuideTemplate)
        .filter(GuideTemplate.id == template_id)
        .first()
    )

    if not template:
        raise HTTPException(
            status_code=404,
            detail="Modèle de guide introuvable.",
        )

    filename = template.filename or "modele-guide"

    # Neutralise le nom avant de le placer dans l'en-tête HTTP
    # (guillemets et sauts de ligne permettraient d'injecter
    # d'autres en-têtes).
    filename = filename.replace("\\", "/").split("/")[-1]

    filename = "".join(
        char
        for char in filename
        if char.isprintable() and char not in '"\r\n'
    ).strip(". ") or "modele-guide"

    content_type = (
        template.content_type
        or "application/octet-stream"
    )

    return Response(
        content=template.content,
        media_type=content_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )


@router.delete("/{template_id}")

def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ):
    """Supprime un modèle de guide."""
    _require_associate(current_user)


    template = (
        db.query(GuideTemplate)
        .filter(GuideTemplate.id == template_id)
        .first()
    )

    if not template:
        raise HTTPException(
            status_code=404,
            detail="Modèle de guide introuvable.",
        )

    db.delete(template)
    db.commit()

    return {
        "success": True,
        "message": "Modèle supprimé.",
    }