import json
import copy
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Answer, Mission, GuideTemplate, Role
from app.schemas import AnswerIn, AnswerOut
from app.auth import get_current_user
from app.data.questionnaire_data import QUESTIONNAIRE
from app.questionnaire_utils import ALL_QUESTIONS_BY_ID, TOTAL_QUESTIONS


router = APIRouter(
    prefix="/api/questionnaire",
    tags=["questionnaire"],
)


# ============================================================================
# ACCÈS AUX MISSIONS
# ============================================================================

def _check_access(mission: Mission, current_user: User):
    if current_user.role == Role.associe:
        return

    if not any(
        m.user_id == current_user.id
        for m in mission.members
    ):
        raise HTTPException(
            status_code=403,
            detail="Vous n'avez pas accès à cette mission.",
        )


# ============================================================================
# NORMALISATION DES IDENTIFIANTS
# ============================================================================

def _normalise_node_id(value) -> str:
    """
    Normalise un identifiant de nœud.

    Exemples :

        2.1.1          -> 2.1.1
        " 2.1.1 "      -> 2.1.1
        B-2.1.1        -> B-2.1.1
        B-2.1.1-1      -> B-2.1.1-1
    """
    if value is None:
        return ""

    return str(value).strip()


def _node_id_variants(value) -> set[str]:
    """
    Retourne plusieurs variantes d'un identifiant afin de rendre
    la liaison des modèles de guides robuste.

    L'objectif est notamment de faire correspondre :

        2.1.1
        B-2.1.1
        B-2.1.1-1

    lorsque ces valeurs représentent le même emplacement logique.
    """

    raw = _normalise_node_id(value)

    if not raw:
        return set()

    variants: set[str] = {raw}

    # Variante sans espaces
    compact = re.sub(r"\s+", "", raw)
    variants.add(compact)

    # ------------------------------------------------------------------
    # Suppression éventuelle d'un préfixe alphabétique :
    #
    # B-2.1.1 -> 2.1.1
    # C-2.1.1 -> 2.1.1
    # ------------------------------------------------------------------

    numeric_match = re.search(
        r"(\d+(?:\.\d+)+)",
        compact,
    )

    if numeric_match:
        numeric_part = numeric_match.group(1)
        variants.add(numeric_part)

        # Ex :
        # B-2.1.1-1 -> 2.1.1
        #
        # On récupère aussi le préfixe avant le dernier "-nombre"
        # si celui-ci existe.
        before_suffix = re.match(
            r"^(.*?)(?:-\d+)$",
            compact,
        )

        if before_suffix:
            base = before_suffix.group(1)

            numeric_base = re.search(
                r"(\d+(?:\.\d+)+)",
                base,
            )

            if numeric_base:
                variants.add(numeric_base.group(1))

    # ------------------------------------------------------------------
    # Variante sans suffixe "-1", "-2", etc.
    # ------------------------------------------------------------------

    no_last_number = re.sub(
        r"-\d+$",
        "",
        compact,
    )

    if no_last_number:
        variants.add(no_last_number)

    return {
        item
        for item in variants
        if item
    }


def _ids_match(left, right) -> bool:
    """
    Vérifie si deux identifiants représentent le même emplacement
    logique du questionnaire.
    """

    left_variants = _node_id_variants(left)
    right_variants = _node_id_variants(right)

    if not left_variants or not right_variants:
        return False

    return bool(left_variants.intersection(right_variants))


# ============================================================================
# QUESTIONS « GUIDE »
# ============================================================================

def _is_guide_question(question: dict) -> bool:
    """
    Détermine si une question représente une zone Guide.

    Exemples acceptés :

        a) Guide
        b) Guide
        Guide
        A) Guide
    """

    label = str(
        question.get("label", "")
    ).strip().lower()

    if question.get("type") != "label":
        return False

    return "guide" in label


# ============================================================================
# CONSTRUCTION DES FICHIERS GUIDE
# ============================================================================

def _guide_file_from_template(template: GuideTemplate) -> dict:
    """
    Transforme un GuideTemplate SQLAlchemy en objet utilisable
    directement par le frontend.
    """

    download_url = (
        f"/api/guide-templates/{template.id}/download"
    )

    return {
        "id": str(template.id),
        "label": template.filename,
        "url": download_url,
        "download_url": download_url,
        "content_type": template.content_type,
        "size": template.size,
    }


# ============================================================================
# INDEX DES MODÈLES
# ============================================================================

def _build_templates_by_node(
    rows: list[GuideTemplate],
) -> dict[str, list[dict]]:
    """
    Construit un index des modèles par identifiant de nœud.

    On conserve plusieurs variantes de chaque node_id afin que :

        2.1.1
        B-2.1.1
        B-2.1.1-1

    puissent être retrouvés.
    """

    templates_by_node: dict[str, list[dict]] = {}

    for row in rows:
        node_id = _normalise_node_id(
            getattr(row, "node_id", None)
        )

        if not node_id:
            continue

        guide_file = _guide_file_from_template(row)

        variants = _node_id_variants(node_id)

        for variant in variants:
            templates_by_node.setdefault(
                variant,
                [],
            ).append(
                copy.deepcopy(guide_file)
            )

    # Évite les doublons lorsqu'un même modèle est accessible
    # via plusieurs variantes.
    for key, files in templates_by_node.items():
        unique = []
        seen = set()

        for item in files:
            item_id = str(item.get("id", ""))

            if item_id in seen:
                continue

            seen.add(item_id)
            unique.append(item)

        templates_by_node[key] = unique

    return templates_by_node


# ============================================================================
# RECHERCHE DES MODÈLES POUR UN NŒUD
# ============================================================================

def _templates_for_node(
    node_id,
    templates_by_node: dict[str, list[dict]],
) -> list[dict]:
    """
    Recherche les modèles associés à un nœud.

    La recherche utilise toutes les variantes de l'identifiant.
    """

    variants = _node_id_variants(node_id)

    if not variants:
        return []

    result = []
    seen = set()

    for variant in variants:
        for guide in templates_by_node.get(
            variant,
            [],
        ):
            guide_id = str(
                guide.get("id", "")
            )

            if guide_id in seen:
                continue

            seen.add(guide_id)
            result.append(
                copy.deepcopy(guide)
            )

    return result


# ============================================================================
# INJECTION DES MODÈLES
# ============================================================================

def _inject_guide_templates(
    nodes,
    templates_by_node,
):
    """
    Injecte les modèles dans les zones « a) Guide ».

    La fonction parcourt récursivement tout le questionnaire.

    Si le modèle correspond directement au node :
        node.id

    il est ajouté aux questions Guide du node.

    Si aucune question Guide n'existe dans le node, une question
    « a) Guide » est créée automatiquement.
    """

    if not nodes:
        return

    for node in nodes:
        node_id = _normalise_node_id(
            node.get("id")
        )

        # --------------------------------------------------------------
        # Modèles associés directement au nœud
        # --------------------------------------------------------------

        guides = _templates_for_node(
            node_id,
            templates_by_node,
        )

        questions = node.setdefault(
            "questions",
            [],
        )

        guide_questions = [
            question
            for question in questions
            if _is_guide_question(question)
        ]

        if guides:

            # ----------------------------------------------------------
            # Cas normal : une ou plusieurs zones Guide existent
            # ----------------------------------------------------------

            if guide_questions:
                for question in guide_questions:
                    question["guide_files"] = copy.deepcopy(
                        guides
                    )

            # ----------------------------------------------------------
            # Cas de sécurité : aucune zone Guide
            # ----------------------------------------------------------

            else:
                questions.append(
                    {
                        "id": (
                            f"{node_id}-guide-modeles"
                        ),
                        "label": "a) Guide",
                        "type": "label",
                        "bold": True,
                        "guide_files": copy.deepcopy(
                            guides
                        ),
                    }
                )

        # --------------------------------------------------------------
        # Parcours récursif des enfants
        # --------------------------------------------------------------

        children = node.get("children") or []

        if children:
            _inject_guide_templates(
                children,
                templates_by_node,
            )


# ============================================================================
# FALLBACK : RECHERCHE DANS TOUT LE QUESTIONNAIRE
# ============================================================================

def _inject_templates_by_question_id(
    nodes,
    templates_by_node,
):
    """
    Deuxième niveau de sécurité.

    Si le node_id du modèle correspond à l'identifiant d'une question
    Guide plutôt qu'à celui du nœud, on injecte quand même le modèle.

    Exemple :

        modèle : B-2.1.1-1
        question : B-2.1.1-1
        node : 2.1.1
    """

    if not nodes:
        return

    for node in nodes:

        questions = node.setdefault(
            "questions",
            [],
        )

        for question in questions:

            if not _is_guide_question(question):
                continue

            question_id = _normalise_node_id(
                question.get("id")
            )

            if not question_id:
                continue

            guides = _templates_for_node(
                question_id,
                templates_by_node,
            )

            if not guides:
                continue

            existing = question.get(
                "guide_files",
                [],
            )

            existing_ids = {
                str(item.get("id", ""))
                for item in existing
            }

            for guide in guides:
                guide_id = str(
                    guide.get("id", "")
                )

                if guide_id not in existing_ids:
                    existing.append(
                        copy.deepcopy(guide)
                    )
                    existing_ids.add(guide_id)

            question["guide_files"] = existing

        children = node.get("children") or []

        if children:
            _inject_templates_by_question_id(
                children,
                templates_by_node,
            )


# ============================================================================
# FALLBACK GLOBAL PAR ID NUMÉRIQUE
# ============================================================================

def _inject_templates_by_numeric_path(
    nodes,
    templates_by_node,
):
    """
    Dernier niveau de sécurité pour les cas où :

        modèle = B-2.1.1-1
        node    = 2.1.1
        question = autre identifiant

    On utilise le chemin numérique commun.
    """

    if not nodes:
        return

    for node in nodes:

        node_id = _normalise_node_id(
            node.get("id")
        )

        node_variants = _node_id_variants(
            node_id
        )

        guides = []

        for variant in node_variants:
            guides.extend(
                templates_by_node.get(
                    variant,
                    [],
                )
            )

        unique_guides = []
        seen = set()

        for guide in guides:
            guide_id = str(
                guide.get("id", "")
            )

            if guide_id in seen:
                continue

            seen.add(guide_id)
            unique_guides.append(
                copy.deepcopy(guide)
            )

        if unique_guides:

            questions = node.setdefault(
                "questions",
                [],
            )

            for question in questions:

                if not _is_guide_question(question):
                    continue

                existing = question.setdefault(
                    "guide_files",
                    [],
                )

                existing_ids = {
                    str(item.get("id", ""))
                    for item in existing
                }

                for guide in unique_guides:
                    guide_id = str(
                        guide.get("id", "")
                    )

                    if guide_id not in existing_ids:
                        existing.append(
                            copy.deepcopy(guide)
                        )
                        existing_ids.add(guide_id)

        children = node.get("children") or []

        if children:
            _inject_templates_by_numeric_path(
                children,
                templates_by_node,
            )


# ============================================================================
# DOCUMENTS REÇUS
# ============================================================================

def _add_documents_received(sections):
    """
    Ajoute la zone « Documents reçus » à chaque étape principale.
    """

    for section in sections:

        existing = [
            child
            for child in section.get(
                "children",
                [],
            )
            if child.get("label") != "Documents reçus"
        ]

        section["children"] = existing

        sid = _normalise_node_id(
            section.get("id")
        )

        nums = []

        for child in existing:
            try:
                nums.append(
                    int(
                        str(
                            child.get(
                                "id",
                                "",
                            )
                        ).split(".")[-1]
                    )
                )
            except (
                ValueError,
                TypeError,
            ):
                continue

        next_num = (
            max(nums) + 1
            if nums
            else 1
        )

        next_id = f"{sid}.{next_num}"

        section["children"].append(
            {
                "id": next_id,
                "label": "Documents reçus",
                "layout": "standard",
                "questions": [
                    {
                        "id": f"{next_id}.1",
                        "label": "Documents reçus",
                        "type": "file",
                        "document_category": "recus",
                    }
                ],
                "children": [],
            }
        )


# ============================================================================
# STRUCTURE DU QUESTIONNAIRE
# ============================================================================

@router.get("/structure")
def get_structure(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne la structure complète du questionnaire.

    Les modèles de guides sont automatiquement injectés dans
    les zones « a) Guide » correspondantes.
    """

    # ------------------------------------------------------------------
    # 1. Copie indépendante du questionnaire
    # ------------------------------------------------------------------

    sections = copy.deepcopy(
        QUESTIONNAIRE
    )

    # ------------------------------------------------------------------
    # 2. Récupération de TOUS les modèles
    # ------------------------------------------------------------------

    rows = (
        db.query(GuideTemplate)
        .order_by(
            GuideTemplate.uploaded_at.asc()
        )
        .all()
    )

    # ------------------------------------------------------------------
    # 3. Construction de l'index
    # ------------------------------------------------------------------

    templates_by_node = (
        _build_templates_by_node(rows)
    )

    # ------------------------------------------------------------------
    # 4. Injection principale
    # ------------------------------------------------------------------

    _inject_guide_templates(
        sections,
        templates_by_node,
    )

    # ------------------------------------------------------------------
    # 5. Injection par ID de question Guide
    # ------------------------------------------------------------------

    _inject_templates_by_question_id(
        sections,
        templates_by_node,
    )

    # ------------------------------------------------------------------
    # 6. Injection par chemin numérique
    # ------------------------------------------------------------------

    _inject_templates_by_numeric_path(
        sections,
        templates_by_node,
    )

    # ------------------------------------------------------------------
    # 7. Ajout des documents reçus
    # ------------------------------------------------------------------

    _add_documents_received(
        sections
    )

    # ------------------------------------------------------------------
    # 8. Retour API
    # ------------------------------------------------------------------

    return {
        "sections": sections,
        "total_questions": TOTAL_QUESTIONS,
    }


# ============================================================================
# RÉCUPÉRATION DES RÉPONSES
# ============================================================================

@router.get(
    "/missions/{mission_id}/answers",
    response_model=list[AnswerOut],
)
def get_answers(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    _check_access(
        mission,
        current_user,
    )

    rows = (
        db.query(Answer)
        .filter(
            Answer.mission_id == mission_id
        )
        .all()
    )

    out = []

    for row in rows:

        try:
            value = (
                json.loads(row.value)
                if row.value is not None
                else None
            )

        except (
            TypeError,
            ValueError,
        ):
            value = row.value

        out.append(
            AnswerOut(
                question_id=row.question_id,
                value=value,
                comment=row.comment,
                updated_at=row.updated_at,
                updated_by=row.updated_by,
            )
        )

    return out


# ============================================================================
# ENREGISTREMENT DES RÉPONSES
# ============================================================================

@router.put(
    "/missions/{mission_id}/answers/{question_id}",
    response_model=AnswerOut,
)
def save_answer(
    mission_id: str,
    question_id: str,
    payload: AnswerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    _check_access(
        mission,
        current_user,
    )

    if question_id not in ALL_QUESTIONS_BY_ID:
        raise HTTPException(
            status_code=400,
            detail="Question inconnue",
        )

    row = (
        db.query(Answer)
        .filter(
            Answer.mission_id == mission_id,
            Answer.question_id == question_id,
        )
        .first()
    )

    serialized = json.dumps(
        payload.value,
        ensure_ascii=False,
    )

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