"""
Google Drive — stockage des documents AFC Soft Audit.

Authentification :
    OAuth 2.0 utilisateur Google Workspace.

Le compte Google autorisé doit avoir accès au Shared Drive utilisé
par AFC Soft Audit.

Gestion des accès :
    - Le dossier d'une mission possède ses propres permissions.
    - Seuls les utilisateurs ayant accès à la mission AFCsoft
      reçoivent une permission Google Drive.
    - Lorsqu'un utilisateur est retiré de la mission,
      sa permission Drive est supprimée.
"""

from __future__ import annotations

import io
import os
from functools import lru_cache
from typing import Optional

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import (
    MediaIoBaseUpload,
    MediaIoBaseDownload,
)

from .google_oauth import credentials_from_env


SCOPES = [
    "https://www.googleapis.com/auth/drive",
]

# ============================================================
# REPRISE SUR INCIDENT RÉSEAU TRANSITOIRE
# ============================================================
#
# googleapiclient sait déjà réessayer automatiquement un appel
# en cas de coupure de connexion, de délai d'attente ou d'erreur
# HTTP temporaire (429/5xx) — y compris l'erreur observée en
# pratique, une réinitialisation de connexion par l'hôte distant
# (ConnectionResetError ; WinError 10054 sous Windows, Errno 104
# ailleurs). Ce mécanisme existe dans la bibliothèque, mais reste
# désactivé par défaut (num_retries=0) : on l'active ici.
#
# Backoff exponentiel avec un peu d'aléa, géré en interne par la
# bibliothèque : 3 essais ≈ jusqu'à 2 s + 4 s + 8 s de pause
# cumulée avant le dernier essai, dans le pire des cas.
DRIVE_NUM_RETRIES = 3


# ============================================================
# SERVICE GOOGLE DRIVE
# ============================================================

@lru_cache(maxsize=1)
def drive_service():
    """
    Retourne le service Google Drive authentifié avec OAuth 2.0.

    Le refresh token est utilisé pour renouveler automatiquement
    l'access token lorsque cela est nécessaire.
    """

    credentials = credentials_from_env()

    return build(
        "drive",
        "v3",
        credentials=credentials,
        cache_discovery=False,
    )


# ============================================================
# SHARED DRIVE
# ============================================================

def _shared_drive_id() -> str:
    """
    Retourne l'identifiant du Shared Drive AFC Soft Audit.
    """

    value = os.getenv(
        "GOOGLE_SHARED_DRIVE_ID",
        "",
    ).strip()

    if not value:
        raise RuntimeError(
            "GOOGLE_SHARED_DRIVE_ID n'est pas configuré."
        )

    return value


# ============================================================
# RECHERCHE DE DOSSIER
# ============================================================

def _find_folder(
    name: str,
    parent_id: str,
) -> Optional[str]:
    """
    Recherche un dossier dans le Shared Drive.
    """

    escaped_name = (
        name
        .replace("\\", "\\\\")
        .replace("'", "\\'")
    )

    escaped_parent = (
        parent_id
        .replace("\\", "\\\\")
        .replace("'", "\\'")
    )

    q = (
        "trashed = false "
        "and mimeType = "
        "'application/vnd.google-apps.folder' "
        f"and name = '{escaped_name}' "
        f"and '{escaped_parent}' in parents"
    )

    result = (
        drive_service()
        .files()
        .list(
            q=q,
            spaces="drive",
            fields="files(id,name)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            corpora="drive",
            driveId=_shared_drive_id(),
            pageSize=10,
        )
        .execute(num_retries=DRIVE_NUM_RETRIES)
    )

    files = result.get("files", [])

    if not files:
        return None

    return files[0].get("id")


# ============================================================
# CRÉATION / RÉCUPÉRATION DE DOSSIER
# ============================================================

def ensure_folder(
    name: str,
    parent_id: str,
) -> str:
    """
    Recherche un dossier et le crée s'il n'existe pas.
    """

    existing = _find_folder(
        name,
        parent_id,
    )

    if existing:
        return existing

    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }

    created = (
        drive_service()
        .files()
        .create(
            body=metadata,
            fields="id",
            supportsAllDrives=True,
        )
        .execute(num_retries=DRIVE_NUM_RETRIES)
    )

    return created["id"]


# ============================================================
# DOSSIER DE MISSION
# ============================================================

def mission_folder(mission) -> str:
    """
    Retourne/crée l'arborescence :

    AFC Soft Audit
        └── Entité
            └── Mission
    """

    root = ensure_folder(
        "AFC Soft Audit",
        _shared_drive_id(),
    )

    entity_name = (
        mission.entity.sigle
        or mission.entity.name
    )

    entity = ensure_folder(
        entity_name,
        root,
    )

    return ensure_folder(
        mission.name,
        entity,
    )


# ============================================================
# DOSSIERS DOCUMENTS
# ============================================================

def document_folder(
    mission,
    node_id: str,
    category: str,
) -> str:
    """
    Retourne/crée :

    Mission
        ├── Documents reçus
        │   └── node_id
        │
        └── Travaux effectués
            └── node_id
    """

    mission_id = mission_folder(mission)

    category_name = (
        "Documents reçus"
        if category == "recus"
        else "Travaux effectués"
    )

    category_id = ensure_folder(
        category_name,
        mission_id,
    )

    return ensure_folder(
        str(node_id),
        category_id,
    )


# ============================================================
# PERMISSIONS GOOGLE DRIVE
# ============================================================

def _list_folder_permissions(
    folder_id: str,
) -> list[dict]:
    """
    Retourne les permissions du dossier de mission.
    """

    result = (
        drive_service()
        .permissions()
        .list(
            fileId=folder_id,
            fields=(
                "permissions("
                "id,"
                "type,"
                "role,"
                "emailAddress"
                ")"
            ),
            supportsAllDrives=True,
            useDomainAdminAccess=False,
        )
        .execute(num_retries=DRIVE_NUM_RETRIES)
    )

    return result.get("permissions", [])


def _find_user_permission(
    folder_id: str,
    email: str,
) -> Optional[dict]:
    """
    Recherche la permission correspondant à une adresse e-mail.
    """

    email = email.strip().lower()

    for permission in _list_folder_permissions(folder_id):
        permission_email = (
            permission.get("emailAddress") or ""
        ).strip().lower()

        if (
            permission.get("type") == "user"
            and permission_email == email
        ):
            return permission

    return None


def grant_mission_access(
    mission,
    email: str,
    role: str = "reader",
) -> dict:
    """
    Donne à un utilisateur l'accès au dossier Google Drive
    correspondant à la mission.

    role :
        reader
        writer
    """

    if not email or not email.strip():
        raise ValueError(
            "Une adresse e-mail est obligatoire."
        )

    folder_id = mission_folder(mission)

    email = email.strip()

    existing = _find_user_permission(
        folder_id,
        email,
    )

    # --------------------------------------------------------
    # La permission existe déjà
    # --------------------------------------------------------

    if existing:
        permission_id = existing.get("id")

        if (
            permission_id
            and existing.get("role") != role
        ):
            return (
                drive_service()
                .permissions()
                .update(
                    fileId=folder_id,
                    permissionId=permission_id,
                    body={
                        "role": role,
                    },
                    supportsAllDrives=True,
                )
                .execute(num_retries=DRIVE_NUM_RETRIES)
            )

        return existing

    # --------------------------------------------------------
    # Nouvelle permission
    # --------------------------------------------------------

    permission_body = {
        "type": "user",
        "role": role,
        "emailAddress": email,
    }

    try:

        return (
            drive_service()
            .permissions()
            .create(
                fileId=folder_id,
                body=permission_body,
                # Pas de notification quand un compte Google
                # existe déjà pour cette adresse : l'accès est
                # simplement accordé, sans e-mail.
                sendNotificationEmail=False,
                supportsAllDrives=True,
            )
            .execute(num_retries=DRIVE_NUM_RETRIES)
        )

    except HttpError as exc:

        # Google refuse une invitation silencieuse
        # (sendNotificationEmail=False) lorsqu'aucun compte
        # Google n'est associé à l'adresse — c'est le cas
        # observé en pratique avec des comptes internes qui
        # n'ont pas encore de compte Google Workspace actif.
        # Dans ce cas précis, Google exige la notification :
        # on la réactive pour ce seul appel plutôt que d'échouer.
        reason = None

        try:
            reason = exc.error_details[0].get("reason")
        except (AttributeError, IndexError, KeyError, TypeError):
            pass

        if reason != "invalidSharingRequest":
            raise

        return (
            drive_service()
            .permissions()
            .create(
                fileId=folder_id,
                body=permission_body,
                sendNotificationEmail=True,
                supportsAllDrives=True,
            )
            .execute(num_retries=DRIVE_NUM_RETRIES)
        )


def revoke_mission_access(
    mission,
    email: str,
) -> bool:
    """
    Retire à un utilisateur l'accès au dossier Drive
    de la mission.

    Retourne True si une permission a été supprimée.
    """

    if not email or not email.strip():
        return False

    folder_id = mission_folder(mission)

    permission = _find_user_permission(
        folder_id,
        email,
    )

    if not permission:
        return False

    permission_id = permission.get("id")

    if not permission_id:
        return False

    (
        drive_service()
        .permissions()
        .delete(
            fileId=folder_id,
            permissionId=permission_id,
            supportsAllDrives=True,
        )
        .execute(num_retries=DRIVE_NUM_RETRIES)
    )

    return True


def sync_mission_permissions(
    mission,
    users,
) -> None:
    """
    Synchronise les permissions Google Drive avec
    les utilisateurs autorisés sur la mission.

    users doit contenir les utilisateurs qui ont actuellement
    accès à la mission AFCsoft.

    Les utilisateurs présents dans users :
        -> reçoivent reader

    Les utilisateurs absents de users :
        -> perdent leur permission Drive

    Important :
        on ne supprime jamais les permissions non-utilisateur
        ni les permissions héritées du Shared Drive.
    """

    folder_id = mission_folder(mission)

    # --------------------------------------------------------
    # Utilisateurs autorisés AFCsoft
    # --------------------------------------------------------

    allowed_emails = {
        user.email.strip().lower()
        for user in users
        if user
        and user.email
        and user.is_active
    }

    # --------------------------------------------------------
    # Permissions actuelles du dossier
    # --------------------------------------------------------

    permissions = _list_folder_permissions(
        folder_id,
    )

    # --------------------------------------------------------
    # Ajout / mise à jour des utilisateurs autorisés
    # --------------------------------------------------------

    for user in users:

        if not user:
            continue

        if not user.is_active:
            continue

        if not user.email:
            continue

        grant_mission_access(
            mission,
            user.email,
            role="reader",
        )

    # --------------------------------------------------------
    # Suppression des utilisateurs qui n'ont plus accès
    # --------------------------------------------------------

    for permission in permissions:

        if permission.get("type") != "user":
            continue

        email = (
            permission.get("emailAddress") or ""
        ).strip().lower()

        if not email:
            continue

        if email in allowed_emails:
            continue

        permission_id = permission.get("id")

        if not permission_id:
            continue

        try:
            (
                drive_service()
                .permissions()
                .delete(
                    fileId=folder_id,
                    permissionId=permission_id,
                    supportsAllDrives=True,
                )
                .execute(num_retries=DRIVE_NUM_RETRIES)
            )

        except Exception:
            # Une permission héritée ou protégée peut ne pas
            # être supprimable directement depuis ce dossier.
            continue


# ============================================================
# UPLOAD
# ============================================================

def upload_bytes(
    mission,
    node_id: str,
    category: str,
    filename: str,
    content: bytes,
    content_type: str | None,
):
    """
    Envoie un fichier dans le Shared Drive.
    """

    parent = document_folder(
        mission,
        node_id,
        category,
    )

    metadata = {
        "name": filename,
        "parents": [parent],
    }

    media = MediaIoBaseUpload(
        io.BytesIO(content),
        mimetype=(
            content_type
            or "application/octet-stream"
        ),
        resumable=False,
    )

    return (
        drive_service()
        .files()
        .create(
            body=metadata,
            media_body=media,
            fields="id,name,webViewLink",
            supportsAllDrives=True,
        )
        .execute(num_retries=DRIVE_NUM_RETRIES)
    )


# ============================================================
# DOWNLOAD
# ============================================================

def download_bytes(file_id: str):
    """
    Télécharge un fichier depuis le Shared Drive.
    """

    request = (
        drive_service()
        .files()
        .get_media(
            fileId=file_id,
            supportsAllDrives=True,
        )
    )

    buffer = io.BytesIO()

    downloader = MediaIoBaseDownload(
        buffer,
        request,
    )

    done = False

    while not done:
        _, done = downloader.next_chunk(num_retries=DRIVE_NUM_RETRIES)

    buffer.seek(0)

    return buffer


# ============================================================
# SUPPRESSION
# ============================================================

def delete_file(file_id: str):
    """
    Supprime un fichier du Shared Drive.
    """

    (
        drive_service()
        .files()
        .delete(
            fileId=file_id,
            supportsAllDrives=True,
        )
        .execute(num_retries=DRIVE_NUM_RETRIES)
    )