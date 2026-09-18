from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Chargement de la configuration
# ---------------------------------------------------------------------------
# main.py se trouve dans :
#   backend/app/main.py
#
# Le fichier .env se trouve dans :
#   backend/.env
#
# On le charge AVANT les imports de l'application qui utilisent
# les variables d'environnement.
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

print(f"[AFCsoft] Fichier .env : {ENV_FILE}")
print(f"[AFCsoft] .env existe : {ENV_FILE.exists()}")


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from fastapi import Depends

from app.database import Base, engine, SessionLocal, ensure_schema_compatibility
from app.models import User, Role
from app.auth import hash_password, require_associe, COOKIE_SECURE

from app.routers import (
    auth,
    users,
    missions,
    questionnaire,
    documents,
    entities,
    guide_templates,
)

from app.google_oauth import (
    create_authorization_url,
    credentials_from_callback,
    persist_refresh_token,
)


# ---------------------------------------------------------------------------
# Vérification de la configuration d'authentification
# ---------------------------------------------------------------------------

import os

SECRET_KEY = os.getenv("AFCSOFT_SECRET_KEY") or os.getenv("SECRET_KEY")

print(
    "[AFCsoft AUTH] SECRET_KEY chargée :",
    bool(SECRET_KEY),
    "| longueur :",
    len(SECRET_KEY) if SECRET_KEY else 0,
)

if not SECRET_KEY:
    raise RuntimeError(
        "AFCSOFT_SECRET_KEY n'est pas configurée dans backend/.env"
    )


# ---------------------------------------------------------------------------
# Initialisation de la base de données
# ---------------------------------------------------------------------------

Base.metadata.create_all(bind=engine)

ensure_schema_compatibility()


# ---------------------------------------------------------------------------
# Création du compte associé par défaut
# ---------------------------------------------------------------------------

def seed_default_associate():
    """
    Crée le premier compte Associé au tout premier démarrage,
    s'il n'existe aucun utilisateur.
    """

    db = SessionLocal()

    try:
        if db.query(User).count() == 0:

            email = os.getenv(
                "AFCSOFT_BOOTSTRAP_EMAIL",
                "associe@afc-audit.com",
            ).strip().lower()

            # Le mot de passe n'est plus codé en dur : il est
            # soit fourni dans le .env, soit tiré au hasard et
            # affiché UNE SEULE FOIS dans la console du serveur.
            password = os.getenv(
                "AFCSOFT_BOOTSTRAP_PASSWORD",
                "",
            ).strip()

            generated = False

            if not password:
                import secrets
                import string

                alphabet = (
                    string.ascii_letters
                    + string.digits
                    + "!@#$%?"
                )

                password = "".join(
                    secrets.choice(alphabet)
                    for _ in range(16)
                )

                generated = True

            db.add(
                User(
                    email=email,
                    first_name="Associé",
                    last_name="Principal",
                    role=Role.associe,
                    hashed_password=hash_password(password),
                    must_change_password=True,
                )
            )

            db.commit()

            print(
                "\n[AFCsoft] Compte associé initial créé :\n"
                f"  email        : {email}\n"
                f"  mot de passe : {password}\n"
                + (
                    "  (généré aléatoirement — notez-le maintenant, "
                    "il ne sera plus affiché)\n"
                    if generated
                    else ""
                )
                + "  -> à changer obligatoirement à la première "
                "connexion.\n"
            )

    finally:
        db.close()


seed_default_associate()


# ---------------------------------------------------------------------------
# Application FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AFCsoft Audit API",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

# Les origines autorisées sont déclarées dans backend/.env :
#
#   CORS_ALLOWED_ORIGINS=https://audit.afc-audit.com,http://localhost:3000
#
# `*` combiné à allow_credentials=True est refusé par les
# navigateurs et ouvrirait l'API à n'importe quel site.

_raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000",
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in _raw_origins.split(",")
    if origin.strip() and origin.strip() != "*"
]

if not ALLOWED_ORIGINS:
    raise RuntimeError(
        "CORS_ALLOWED_ORIGINS ne contient aucune origine valide. "
        "Renseignez l'URL du frontend dans backend/.env "
        "(le joker '*' n'est pas accepté)."
    )

print(
    "[AFCsoft CORS] Origines autorisées :",
    ", ".join(ALLOWED_ORIGINS),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------------------------------------------------------------------------
# PROTECTION CSRF
# ---------------------------------------------------------------------------
#
# Le jeton voyageant désormais dans un cookie, le navigateur
# l'attache automatiquement. Il faut donc vérifier que les
# requêtes qui modifient des données proviennent bien de
# l'application.
#
# Deux barrières :
#
# 1. le cookie est SameSite=Lax : un formulaire POST hébergé sur
#    un autre site ne déclenche pas son envoi ;
# 2. l'en-tête Origin est comparé aux origines autorisées.
#
# Un formulaire HTML classique ne peut pas falsifier Origin, et
# une requête fetch depuis un site tiers serait bloquée par le
# CORS avant d'atteindre l'API.

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@app.middleware("http")
async def csrf_and_security_headers(request, call_next):

    # ----- Vérification CSRF sur les méthodes modifiantes -----

    if request.method not in SAFE_METHODS:

        origin = request.headers.get("origin")

        # Origin absent : cas des clients non navigateur
        # (scripts, tests) qui s'authentifient par en-tête
        # Authorization et ne sont pas exposés au CSRF.
        if origin and origin not in ALLOWED_ORIGINS:

            return JSONResponse(
                status_code=403,
                content={
                    "detail": (
                        "Origine non autorisée pour cette "
                        "requête."
                    )
                },
            )

    response = await call_next(request)

    # ----- En-têtes de sécurité -----
    #
    # Ils complètent, sans les remplacer, ceux posés par le
    # reverse proxy et par Next.js sur les pages HTML.

    headers = response.headers

    # Empêche le navigateur de deviner un type MIME : un
    # document déposé par un utilisateur ne sera pas réinterprété
    # comme du HTML exécutable.
    headers["X-Content-Type-Options"] = "nosniff"

    # Interdit l'affichage de l'API dans une iframe tierce.
    headers["X-Frame-Options"] = "DENY"

    # Ne fuite pas l'URL complète vers les sites externes.
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Coupe l'accès aux périphériques, non utilisés par l'API.
    headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), "
        "payment=(), usb=()"
    )

    # Les réponses de l'API contiennent des données d'audit :
    # aucune mise en cache intermédiaire.
    headers["Cache-Control"] = "no-store"

    # HSTS uniquement en HTTPS, sinon le navigateur l'ignore et
    # cela gênerait le développement local en http.
    if COOKIE_SECURE:
        headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    return response


# ---------------------------------------------------------------------------
# Routes API
# ---------------------------------------------------------------------------

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(entities.router)
app.include_router(missions.router)
app.include_router(questionnaire.router)
app.include_router(documents.router)


# ---------------------------------------------------------------------------
# Guide templates
# ---------------------------------------------------------------------------

app.include_router(
    guide_templates.router,
    prefix="/api",
)


# ---------------------------------------------------------------------------
# GOOGLE OAUTH — DÉMARRAGE
# ---------------------------------------------------------------------------

@app.get("/api/google/oauth/start")
def google_oauth_start(
    _: User = Depends(require_associe),
):
    """
    Génère l'URL Google permettant d'autoriser AFC Soft Audit
    à utiliser :

    - Google Drive
    - Google Gmail API

    SÉCURITÉ :
    réservé aux associés. C'est cette route qui enregistre le
    `state` PKCE ; sans elle, le callback ci-dessous ne peut
    aboutir.
    """

    authorization_url, state = create_authorization_url()

    return {
        "authorization_url": authorization_url,
        "state": state,
    }


# ---------------------------------------------------------------------------
# GOOGLE OAUTH — CALLBACK
# ---------------------------------------------------------------------------

@app.get("/api/google/oauth/callback")
def google_oauth_callback(
    code: str,
    state: str,
):
    """
    Reçoit la redirection de Google après l'autorisation OAuth.

    SÉCURITÉ
    --------
    Cette route ne peut pas exiger d'en-tête Authorization :
    c'est Google qui redirige le navigateur vers elle.

    Elle est donc protégée par le `state` PKCE :

    - le `state` n'existe que s'il a été créé par
      /api/google/oauth/start, réservé aux associés ;
    - il est imprévisible, à usage unique, et expire
      après 10 minutes ;
    - un `state` inconnu fait échouer l'échange du code.

    Le refresh token est enregistré côté serveur et n'est
    jamais renvoyé dans la réponse HTTP.
    """

    try:
        credentials = credentials_from_callback(
            code=code,
            state=state,
        )

        persist_refresh_token(credentials)

    except Exception as exc:

        # Le détail technique reste dans les journaux du
        # serveur ; le navigateur ne reçoit qu'un message
        # générique.
        print(
            "[AFCsoft][OAuth] Échec du callback Google :",
            exc,
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "L'autorisation Google a échoué ou a expiré. "
                "Relancez la procédure depuis l'application."
            ),
        )

    # L'autorisation est immédiatement effective : le cache du
    # service Drive est vidé pour qu'il utilise le nouveau token.
    try:
        from app.google_drive import drive_service

        drive_service.cache_clear()
    except Exception:
        pass

    return {
        "status": "success",
        "message": (
            "Autorisation Google réussie. "
            "L'accès Drive et Gmail est actif."
        ),
    }


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }