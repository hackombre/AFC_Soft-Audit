"""
Configuration PostgreSQL / Supabase pour AFC Soft Audit.

SQLite n'est pas utilisé.

Cette configuration est conçue pour une base PostgreSQL distante
(Supabase) avec :

- connexions SSL obligatoires ;
- pool de connexions contrôlé ;
- détection des connexions mortes ;
- renouvellement périodique des connexions ;
- nouvelles connexions avec plusieurs tentatives ;
- invalidation automatique des connexions interrompues ;
- rollback systématique des sessions en erreur ;
- compatibilité avec les anciennes versions du schéma.

IMPORTANT :
Cette configuration ne supprime aucune donnée et ne recrée aucune table.
"""

import os
import time
from pathlib import Path

from sqlalchemy import create_engine, inspect, text, event
from sqlalchemy.exc import OperationalError, DBAPIError
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool


# ============================================================
# CHARGEMENT DU .ENV
# ============================================================

def _load_dotenv_file():
    """
    Charge backend/.env sans dépendre de python-dotenv.

    Les variables déjà présentes dans l'environnement
    restent prioritaires.
    """

    env_path = Path(__file__).resolve().parent.parent / ".env"

    if not env_path.exists():
        return

    try:
        content = env_path.read_text(
            encoding="utf-8-sig"
        )
    except OSError:
        return

    for raw_line in content.splitlines():

        line = raw_line.strip()

        if not line:
            continue

        if line.startswith("#"):
            continue

        if "=" not in line:
            continue

        key, value = line.split("=", 1)

        key = key.strip()
        value = value.strip()

        if not key:
            continue

        # Les variables déjà présentes dans Windows
        # ou dans l'environnement du processus sont prioritaires.
        if key in os.environ:
            continue

        # Retire les guillemets éventuels.
        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {"\"", "'"}
        ):
            value = value[1:-1]

        os.environ[key] = value


_load_dotenv_file()


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL est absent. "
        "Renseignez backend/.env avec l'URL PostgreSQL Supabase."
    )


# Conversion PostgreSQL classique → psycopg2.
if DATABASE_URL.startswith("postgresql://"):

    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg2://",
        1,
    )


if not DATABASE_URL.startswith(
    "postgresql+psycopg2://"
):

    raise RuntimeError(
        "DATABASE_URL doit être une URL PostgreSQL "
        "utilisant psycopg2."
    )


# ============================================================
# SSL SUPABASE
# ============================================================

if "sslmode=" not in DATABASE_URL.lower():

    separator = (
        "&"
        if "?" in DATABASE_URL
        else "?"
    )

    DATABASE_URL = (
        f"{DATABASE_URL}"
        f"{separator}"
        f"sslmode=require"
    )


# ============================================================
# PARAMÈTRES DE CONNEXION
# ============================================================

# Nombre de tentatives lorsqu'une NOUVELLE connexion
# PostgreSQL doit être établie.
DB_CONNECT_RETRIES = 3

# Délai entre les tentatives.
DB_RETRY_DELAY = 1.0

# Timeout de connexion PostgreSQL.
DB_CONNECT_TIMEOUT = 15

# Durée maximale d'utilisation d'une connexion du pool.
#
# Une connexion sera renouvelée après cette durée lorsqu'elle
# sera récupérée du pool.
DB_POOL_RECYCLE = 300


# ============================================================
# URL UTILISÉE PAR PSYCOPG2
# ============================================================

PSYCOPG2_DATABASE_URL = DATABASE_URL.replace(
    "postgresql+psycopg2://",
    "postgresql://",
    1,
)


# ============================================================
# CRÉATEUR DE CONNEXION AVEC RETRY
# ============================================================

def _connect_with_retry():
    """
    Établit une nouvelle connexion PostgreSQL avec plusieurs
    tentatives.

    Cette fonction est réellement utilisée par SQLAlchemy
    via le paramètre `creator`.

    IMPORTANT :
    ces retries concernent uniquement l'établissement
    d'une NOUVELLE connexion.

    Ils ne rejouent jamais automatiquement une requête métier.
    """

    import psycopg2

    last_error = None

    for attempt in range(
        1,
        DB_CONNECT_RETRIES + 1,
    ):

        try:

            connection = psycopg2.connect(
                PSYCOPG2_DATABASE_URL,
                connect_timeout=DB_CONNECT_TIMEOUT,
                sslmode="require",
                application_name="AFCsoft-Audit",
            )

            if attempt > 1:

                print(
                    "[AFCsoft][DB] "
                    f"Connexion PostgreSQL rétablie "
                    f"à la tentative {attempt}."
                )

            return connection

        except Exception as exc:

            last_error = exc

            print(
                "[AFCsoft][DB] "
                f"Échec connexion PostgreSQL "
                f"(tentative {attempt}/"
                f"{DB_CONNECT_RETRIES}) : "
                f"{exc}"
            )

            if attempt < DB_CONNECT_RETRIES:

                time.sleep(
                    DB_RETRY_DELAY * attempt
                )

    # Toutes les tentatives ont échoué.
    raise last_error


# ============================================================
# ENGINE SQLALCHEMY
# ============================================================

engine = create_engine(

    DATABASE_URL,

    # --------------------------------------------------------
    # CRÉATION DES CONNEXIONS
    # --------------------------------------------------------

    # On utilise notre créateur avec retry.
    #
    # Cela garantit que les nouvelles connexions disposent
    # réellement des tentatives définies plus haut.
    creator=_connect_with_retry,

    # --------------------------------------------------------
    # POOL
    # --------------------------------------------------------

    poolclass=QueuePool,

    # Nombre de connexions conservées dans le pool.
    pool_size=3,

    # Connexions supplémentaires autorisées temporairement.
    max_overflow=2,

    # Temps maximum d'attente pour obtenir une connexion.
    pool_timeout=30,

    # --------------------------------------------------------
    # PROTECTION CONTRE LES CONNEXIONS MORTES
    # --------------------------------------------------------

    # Avant de remettre une connexion du pool à une requête,
    # SQLAlchemy vérifie qu'elle est encore utilisable.
    #
    # Si Supabase a fermé la connexion, SQLAlchemy l'invalide
    # et demande une nouvelle connexion.
    pool_pre_ping=True,

    # --------------------------------------------------------
    # RENOUVELLEMENT PÉRIODIQUE
    # --------------------------------------------------------

    # Évite de conserver trop longtemps une même connexion
    # PostgreSQL distante.
    pool_recycle=DB_POOL_RECYCLE,

    # Utilise en priorité les connexions les plus récemment
    # utilisées.
    pool_use_lifo=True,

    # Lorsqu'une session rend sa connexion au pool,
    # SQLAlchemy effectue un rollback de sécurité.
    pool_reset_on_return="rollback",

    # --------------------------------------------------------
    # LOGS
    # --------------------------------------------------------

    echo=False,
)


# ============================================================
# ÉVÉNEMENTS DU POOL
# ============================================================

@event.listens_for(
    engine,
    "handle_error",
)
def _handle_database_error(exception_context):
    """
    Détecte les erreurs indiquant qu'une connexion PostgreSQL
    est probablement morte.

    SQLAlchemy invalide alors la connexion concernée.

    La requête ayant déjà échoué n'est PAS rejouée
    automatiquement.

    C'est volontaire :
    une écriture INSERT/UPDATE/DELETE ne doit jamais être
    rejouée aveuglément après une coupure réseau.
    """

    error = exception_context.original_exception

    if not isinstance(
        error,
        (OperationalError, DBAPIError),
    ):
        return

    message = str(error).lower()

    connection_errors = (
        "server closed",
        "connection reset",
        "connection refused",
        "connection timed out",
        "could not connect",
        "connection already closed",
        "terminating connection",
        "broken pipe",
        "network is unreachable",
        "name or service not known",
        "temporary failure in name resolution",
        "ssl syscall",
        "eof detected",
        "ssl connection has been closed unexpectedly",
        "connection not open",
    )

    if any(
        pattern in message
        for pattern in connection_errors
    ):

        print(
            "[AFCsoft][DB] "
            "Connexion PostgreSQL interrompue. "
            "La connexion sera invalidée et remplacée."
        )

        # Indique à SQLAlchemy qu'il s'agit d'une erreur
        # de connexion afin que la connexion soit invalidée.
        exception_context.is_disconnect = True


# ============================================================
# SESSION
# ============================================================

SessionLocal = sessionmaker(

    autocommit=False,

    autoflush=False,

    bind=engine,
)


# ============================================================
# BASE SQLALCHEMY
# ============================================================

Base = declarative_base()


# ============================================================
# TEST DE CONNEXION
# ============================================================

def check_database_connection(
    retries: int = 3,
) -> bool:
    """
    Vérifie que PostgreSQL est accessible.

    Effectue uniquement :

        SELECT 1

    Aucun changement de données n'est effectué.
    """

    last_error = None

    for attempt in range(
        1,
        retries + 1,
    ):

        try:

            with engine.connect() as connection:

                connection.execute(
                    text("SELECT 1")
                )

            print(
                "[AFCsoft][DB] "
                "Connexion Supabase PostgreSQL OK."
            )

            return True

        except Exception as exc:

            last_error = exc

            print(
                "[AFCsoft][DB] "
                f"Test PostgreSQL échoué "
                f"(tentative {attempt}/{retries}) : "
                f"{exc}"
            )

            if attempt < retries:

                time.sleep(
                    DB_RETRY_DELAY * attempt
                )

    print(
        "[AFCsoft][DB] "
        "Impossible de joindre PostgreSQL."
    )

    return False


# ============================================================
# COMPATIBILITÉ DU SCHÉMA
# ============================================================

def ensure_schema_compatibility():
    """
    Ajoute les colonnes introduites par les versions récentes
    sans supprimer ni écraser les données existantes.

    Les anciennes colonnes sont conservées.

    IMPORTANT :
    cette fonction ne supprime aucune donnée.
    """

    inspector = inspect(engine)

    tables = inspector.get_table_names()


    # ========================================================
    # USERS
    # ========================================================

    if "users" in tables:

        cols = {
            column["name"]
            for column in inspector.get_columns(
                "users"
            )
        }

        if "must_change_password" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN must_change_password
                        BOOLEAN NOT NULL DEFAULT FALSE
                        """
                    )
                )

        if "password_reset_code_hash" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN
                        password_reset_code_hash VARCHAR
                        """
                    )
                )

        if "password_reset_expires_at" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN
                        password_reset_expires_at TIMESTAMP
                        """
                    )
                )

        if "token_version" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN token_version
                        INTEGER NOT NULL DEFAULT 0
                        """
                    )
                )


    # ========================================================
    # ENTITIES
    # ========================================================

    if "entities" in tables:

        cols = {
            column["name"]
            for column in inspector.get_columns(
                "entities"
            )
        }

        if "sigle" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE entities
                        ADD COLUMN sigle VARCHAR
                        """
                    )
                )


    # ========================================================
    # DOCUMENTS
    # ========================================================

    if "documents" in tables:

        cols = {
            column["name"]
            for column in inspector.get_columns(
                "documents"
            )
        }

        if "drive_file_id" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE documents
                        ADD COLUMN drive_file_id VARCHAR
                        """
                    )
                )

        if "drive_web_url" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE documents
                        ADD COLUMN drive_web_url VARCHAR
                        """
                    )
                )


    # ========================================================
    # GUIDE TEMPLATES
    # ========================================================

    if "guide_templates" in tables:

        cols = {
            column["name"]
            for column in inspector.get_columns(
                "guide_templates"
            )
        }

        if "content" not in cols:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE guide_templates
                        ADD COLUMN content BYTEA
                        """
                    )
                )


# ============================================================
# DÉPENDANCE FASTAPI
# ============================================================

def get_db():
    """
    Fournit une session SQLAlchemy à FastAPI.

    La session est toujours fermée après la requête.

    En cas d'erreur :

    1. rollback de la transaction ;
    2. la connexion est rendue proprement au pool ;
    3. SQLAlchemy pourra remplacer une connexion invalidée.

    Aucune requête métier n'est rejouée automatiquement.
    """

    db = SessionLocal()

    try:

        yield db

    except Exception:

        try:
            db.rollback()
        except Exception:
            pass

        raise

    finally:

        try:
            db.close()
        except Exception:
            pass