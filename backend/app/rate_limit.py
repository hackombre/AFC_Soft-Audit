"""
Limitation de débit (anti brute-force) pour AFC Soft Audit.

Implémentation volontairement sans dépendance externe :
fenêtre glissante en mémoire, protégée par un verrou.

LIMITES CONNUES
---------------
Le compteur est stocké dans le processus.

- Avec plusieurs workers uvicorn, chaque worker possède son
  propre compteur (la limite effective est donc multipliée
  par le nombre de workers).
- Les compteurs sont remis à zéro au redémarrage de l'API.

Pour un cabinet de quelques dizaines d'utilisateurs, c'est
suffisant. En cas de montée en charge (plusieurs workers ou
plusieurs instances), remplacer le stockage par Redis en
gardant la même interface `enforce_rate_limit`.
"""

import threading
import time
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException, Request, status


# ============================================================
# STOCKAGE DES TENTATIVES
# ============================================================

# Clé : (nom de la règle, identifiant appelant)
# Valeur : liste des horodatages des tentatives récentes.
_ATTEMPTS: Dict[Tuple[str, str], List[float]] = {}

_LOCK = threading.Lock()

# Au-delà de ce nombre de clés, un nettoyage complet est
# déclenché afin d'éviter une croissance mémoire non bornée.
_CLEANUP_THRESHOLD = 10_000


# ============================================================
# IDENTIFICATION DE L'APPELANT
# ============================================================

def client_ip(request: Request) -> str:
    """
    Retourne l'adresse IP de l'appelant.

    X-Forwarded-For n'est pris en compte que si l'application
    est déployée derrière un reverse proxy de confiance
    (Nginx, Caddy, Render, Railway...).

    IMPORTANT :
    cet en-tête est falsifiable si l'API est exposée
    directement à Internet sans proxy. Dans ce cas,
    laisser TRUST_PROXY_HEADERS à False.
    """

    import os

    trust_proxy = os.getenv(
        "TRUST_PROXY_HEADERS",
        "false",
    ).strip().lower() in {"1", "true", "yes"}

    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for")

        if forwarded:
            # Le premier élément est l'IP cliente d'origine.
            return forwarded.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "inconnu"


# ============================================================
# NETTOYAGE
# ============================================================

def _cleanup(now: float, window_seconds: int) -> None:
    """
    Supprime les clés dont toutes les tentatives sont expirées.

    Appelé sous verrou.
    """

    expired_keys = [
        key
        for key, timestamps in _ATTEMPTS.items()
        if not timestamps
        or now - timestamps[-1] > window_seconds
    ]

    for key in expired_keys:
        _ATTEMPTS.pop(key, None)


# ============================================================
# APPLICATION D'UNE LIMITE
# ============================================================

def enforce_rate_limit(
    rule: str,
    identifier: str,
    max_attempts: int,
    window_seconds: int,
    message: Optional[str] = None,
) -> None:
    """
    Enregistre une tentative et refuse la requête si la limite
    est dépassée.

    Paramètres
    ----------
    rule
        Nom de la règle (ex. "login-ip", "login-compte").
    identifier
        Identifiant de l'appelant (IP ou email).
    max_attempts
        Nombre de tentatives autorisées dans la fenêtre.
    window_seconds
        Durée de la fenêtre glissante, en secondes.
    message
        Message renvoyé à l'utilisateur en cas de blocage.

    Lève
    ----
    HTTPException 429 lorsque la limite est atteinte.
    """

    if not identifier:
        identifier = "inconnu"

    key = (rule, identifier.lower())

    now = time.time()

    with _LOCK:

        if len(_ATTEMPTS) > _CLEANUP_THRESHOLD:
            _cleanup(now, window_seconds)

        timestamps = _ATTEMPTS.get(key, [])

        # On ne conserve que les tentatives encore dans
        # la fenêtre.
        timestamps = [
            moment
            for moment in timestamps
            if now - moment < window_seconds
        ]

        if len(timestamps) >= max_attempts:

            oldest = timestamps[0]

            retry_after = max(
                1,
                int(window_seconds - (now - oldest)),
            )

            # La tentative bloquée est tout de même
            # enregistrée : un attaquant qui insiste
            # prolonge son propre blocage.
            timestamps.append(now)
            _ATTEMPTS[key] = timestamps

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    message
                    or (
                        "Trop de tentatives. "
                        f"Réessayez dans {retry_after} secondes."
                    )
                ),
                headers={
                    "Retry-After": str(retry_after),
                },
            )

        timestamps.append(now)
        _ATTEMPTS[key] = timestamps


# ============================================================
# RÉINITIALISATION APRÈS SUCCÈS
# ============================================================

def reset_rate_limit(
    rule: str,
    identifier: str,
) -> None:
    """
    Efface le compteur d'une règle après une opération réussie.

    Évite qu'un utilisateur légitime reste pénalisé par
    quelques erreurs de frappe précédentes.
    """

    if not identifier:
        return

    key = (rule, identifier.lower())

    with _LOCK:
        _ATTEMPTS.pop(key, None)