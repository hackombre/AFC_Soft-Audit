"""
Configuration de la base de données.

Par défaut, utilise SQLite (fichier local afcsoft.db), aucune configuration
requise pour démarrer. Pour utiliser PostgreSQL en production, définissez la
variable d'environnement DATABASE_URL, par exemple :

    DATABASE_URL=postgresql+psycopg2://user:password@host:5432/afcsoft
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./afcsoft.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
