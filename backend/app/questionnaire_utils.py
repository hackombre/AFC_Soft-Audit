"""Utilitaires pour parcourir l'arbre du questionnaire défini dans questionnaire_data.py."""
from app.data.questionnaire_data import QUESTIONNAIRE


def flatten_questions(nodes=None):
    """Retourne la liste de toutes les questions (dicts) de l'arbre, à plat."""
    if nodes is None:
        nodes = QUESTIONNAIRE
    out = []
    for node in nodes:
        out.extend(node.get("questions", []))
        out.extend(flatten_questions(node.get("children", [])))
    return out


ALL_QUESTIONS = flatten_questions()
ALL_QUESTIONS_BY_ID = {q["id"]: q for q in ALL_QUESTIONS}
TOTAL_QUESTIONS = len(ALL_QUESTIONS)
