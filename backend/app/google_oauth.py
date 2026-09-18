"""
Google OAuth 2.0 — AFC Soft Audit

Utilisé pour :
- Google Drive / Shared Drive
- Gmail API

Le même client OAuth Google est utilisé pour Drive et Gmail.

Le flux OAuth utilise PKCE :
- code_verifier conservé temporairement côté serveur
- code_challenge envoyé à Google
- code_verifier envoyé lors de l'échange du code
"""

import base64
import hashlib
import os
import secrets
import threading
import time
from typing import Dict, Tuple
from dotenv import load_dotenv

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

GOOGLE_OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/gmail.send",
]


# ============================================================
# STOCKAGE TEMPORAIRE PKCE
# ============================================================

_PKCE_STORE: Dict[str, Dict[str, object]] = {}

_PKCE_LOCK = threading.Lock()

_PKCE_TTL_SECONDS = 10 * 60


# ============================================================
# VARIABLES D'ENVIRONNEMENT
# ============================================================

def _get_env(name: str, required: bool = True) -> str:
    value = os.getenv(name, "").strip()

    if required and not value:
        raise RuntimeError(
            f"La variable d'environnement {name} n'est pas configurée."
        )

    return value


def _redirect_uri() -> str:
    return _get_env("GOOGLE_OAUTH_REDIRECT_URI")


# ============================================================
# CONFIGURATION GOOGLE
# ============================================================

def _client_config() -> dict:
    client_id = _get_env("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = _get_env("GOOGLE_OAUTH_CLIENT_SECRET")
    redirect_uri = _redirect_uri()

    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }


# ============================================================
# NETTOYAGE DES ÉTATS EXPIRÉS
# ============================================================

def _cleanup_pkce_store() -> None:
    now = time.time()

    with _PKCE_LOCK:
        expired_states = [
            state
            for state, data in _PKCE_STORE.items()
            if now - float(data.get("created_at", 0))
            > _PKCE_TTL_SECONDS
        ]

        for state in expired_states:
            _PKCE_STORE.pop(state, None)


# ============================================================
# ENREGISTRER LE CODE VERIFIER
# ============================================================

def _store_pkce_verifier(
    state: str,
    code_verifier: str,
) -> None:
    _cleanup_pkce_store()

    with _PKCE_LOCK:
        _PKCE_STORE[state] = {
            "code_verifier": code_verifier,
            "created_at": time.time(),
        }


# ============================================================
# RÉCUPÉRER LE CODE VERIFIER
# ============================================================

def _pop_pkce_verifier(state: str) -> str:
    _cleanup_pkce_store()

    with _PKCE_LOCK:
        data = _PKCE_STORE.pop(state, None)

    if not data:
        raise RuntimeError(
            "Le code_verifier OAuth est introuvable ou a expiré. "
            "Relancez l'autorisation Google."
        )

    code_verifier = data.get("code_verifier")

    if not isinstance(code_verifier, str) or not code_verifier:
        raise RuntimeError(
            "Le code_verifier OAuth est invalide. "
            "Relancez l'autorisation Google."
        )

    return code_verifier


# ============================================================
# CRÉER LE CODE CHALLENGE PKCE
# ============================================================

def _create_pkce_pair() -> Tuple[str, str]:
    """
    Génère :
    - code_verifier
    - code_challenge SHA256 du verifier en base64url
    """

    code_verifier = secrets.token_urlsafe(64)

    digest = hashlib.sha256(
        code_verifier.encode("ascii")
    ).digest()

    code_challenge = (
        base64.urlsafe_b64encode(digest)
        .decode("ascii")
        .rstrip("=")
    )

    return code_verifier, code_challenge


# ============================================================
# CRÉER L'URL GOOGLE
# ============================================================

def create_authorization_url() -> Tuple[str, str]:
    """
    Crée une nouvelle autorisation Google avec PKCE.
    """

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GOOGLE_OAUTH_SCOPES,
        redirect_uri=_redirect_uri(),
    )

    code_verifier, code_challenge = _create_pkce_pair()

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )

    _store_pkce_verifier(
        state=state,
        code_verifier=code_verifier,
    )

    return authorization_url, state


# ============================================================
# CALLBACK GOOGLE
# ============================================================

def credentials_from_callback(
    code: str,
    state: str,
) -> Credentials:
    """
    Échange le code OAuth Google contre les credentials.

    Le code_verifier correspondant au state est récupéré
    puis transmis à Google.
    """

    if not code:
        raise RuntimeError(
            "Google n'a pas fourni de code OAuth."
        )

    if not state:
        raise RuntimeError(
            "Le paramètre state OAuth est manquant."
        )

    code_verifier = _pop_pkce_verifier(state)

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GOOGLE_OAUTH_SCOPES,
        state=state,
        redirect_uri=_redirect_uri(),
    )

    flow.fetch_token(
        code=code,
        code_verifier=code_verifier,
    )

    credentials = flow.credentials

    if not credentials:
        raise RuntimeError(
            "Impossible de récupérer les identifiants "
            "Google OAuth."
        )

    return credentials


# ============================================================
# CHARGER LES CREDENTIALS DEPUIS LE .ENV
# ============================================================

def credentials_from_env() -> Credentials:
    """
    Charge les credentials Google à partir du refresh token
    enregistré dans le fichier .env.
    """

    client_id = _get_env("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = _get_env("GOOGLE_OAUTH_CLIENT_SECRET")
    refresh_token = _get_env("GOOGLE_OAUTH_REFRESH_TOKEN")

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=GOOGLE_OAUTH_SCOPES,
    )

    if credentials.refresh_token and (not credentials.valid or credentials.expired):
        credentials.refresh(Request())

    if not credentials.valid:
        raise RuntimeError(
            "Les identifiants Google OAuth sont invalides "
            "ou impossibles à renouveler."
        )

    return credentials


# ============================================================
# EXTRAIRE LE REFRESH TOKEN
# ============================================================

def credentials_to_env_values(
    credentials: Credentials,
) -> dict:
    refresh_token = credentials.refresh_token

    if not refresh_token:
        raise RuntimeError(
            "Google n'a pas fourni de refresh token. "
            "Relancez l'autorisation avec consentement."
        )

    return {
        "GOOGLE_OAUTH_REFRESH_TOKEN": refresh_token
    }


# ============================================================
# ENREGISTREMENT DU REFRESH TOKEN CÔTÉ SERVEUR
# ============================================================

_ENV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    ".env",
)


def persist_refresh_token(
    credentials: Credentials,
) -> None:
    """
    Enregistre le refresh token Google directement dans
    backend/.env, côté serveur.

    Le token n'est JAMAIS renvoyé dans une réponse HTTP :
    il ne doit apparaître ni dans les journaux du serveur,
    ni dans l'historique du navigateur, ni chez un proxy
    intermédiaire.

    La variable est également injectée dans os.environ afin
    que l'autorisation soit effective immédiatement, sans
    redémarrage de l'API.
    """

    refresh_token = credentials.refresh_token

    if not refresh_token:
        raise RuntimeError(
            "Google n'a pas fourni de refresh token. "
            "Relancez l'autorisation avec consentement."
        )

    key = "GOOGLE_OAUTH_REFRESH_TOKEN"

    # --------------------------------------------------------
    # Lecture du fichier existant
    # --------------------------------------------------------

    lines = []

    if os.path.exists(_ENV_PATH):
        with open(
            _ENV_PATH,
            "r",
            encoding="utf-8-sig",
        ) as handle:
            lines = handle.read().splitlines()

    # --------------------------------------------------------
    # Remplacement de la ligne existante, sinon ajout
    # --------------------------------------------------------

    new_line = f"{key}={refresh_token}"

    replaced = False

    for index, line in enumerate(lines):

        stripped = line.strip()

        if stripped.startswith("#"):
            continue

        if "=" not in stripped:
            continue

        existing_key = stripped.split("=", 1)[0].strip()

        # L'ancienne version du fichier pouvait utiliser
        # une clé en minuscules.
        if existing_key.upper() == key:
            lines[index] = new_line
            replaced = True
            break

    if not replaced:
        lines.append(new_line)

    # --------------------------------------------------------
    # Écriture
    # --------------------------------------------------------

    with open(
        _ENV_PATH,
        "w",
        encoding="utf-8",
    ) as handle:
        handle.write("\n".join(lines) + "\n")

    # Permissions restrictives lorsque le système le permet
    # (sans effet sous Windows).
    try:
        os.chmod(_ENV_PATH, 0o600)
    except OSError:
        pass

    # Prise en compte immédiate.
    os.environ[key] = refresh_token


# ============================================================
# VÉRIFIER L'EXPIRATION
# ============================================================

def token_is_expired(
    credentials: Credentials,
) -> bool:
    return bool(
        credentials.expired
        and credentials.refresh_token
    )