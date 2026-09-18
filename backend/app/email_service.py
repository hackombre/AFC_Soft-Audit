"""
Service d'envoi d'e-mails pour AFC Soft Audit.

L'envoi utilise Gmail API avec OAuth 2.0.
Aucune clé de compte de service et aucun mot de passe SMTP
ne sont nécessaires.
"""

import base64
from email.message import EmailMessage

from googleapiclient.discovery import build

from .google_oauth import credentials_from_env


def _gmail_service():
    """
    Crée le client Gmail API avec les identifiants OAuth configurés
    dans les variables d'environnement.
    """
    credentials = credentials_from_env()

    return build(
        "gmail",
        "v1",
        credentials=credentials,
        cache_discovery=False,
    )


def send_email(to: str, subject: str, body: str) -> None:
    """
    Envoie un e-mail via Gmail API.

    La signature de cette fonction reste volontairement identique
    à l'ancienne version SMTP afin de ne pas avoir à modifier
    auth.py, users.py ou les autres fichiers qui l'utilisent.

    L'adresse expéditrice est le compte Google ayant autorisé
    l'application OAuth.
    """

    to = (to or "").strip()
    subject = subject or ""
    body = body or ""

    if not to:
        raise ValueError("L'adresse e-mail du destinataire est requise.")

    message = EmailMessage()

    message["To"] = to
    message["Subject"] = subject

    # Le compte OAuth utilisé par Gmail API est automatiquement
    # utilisé comme expéditeur avec userId="me".
    message.set_content(body)

    raw_message = base64.urlsafe_b64encode(
        message.as_bytes()
    ).decode("utf-8")

    gmail = _gmail_service()

    gmail.users().messages().send(
        userId="me",
        body={
            "raw": raw_message,
        },
    ).execute()