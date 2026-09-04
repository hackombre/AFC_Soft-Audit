from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app.models import User, Role
from app.auth import hash_password
from app.routers import auth, users, missions, questionnaire, documents, entities

Base.metadata.create_all(bind=engine)


def seed_default_associate():
    """Crée le premier compte Associé au tout premier démarrage, s'il n'existe
    aucun utilisateur. C'est ce compte qui pourra ensuite créer tous les autres
    utilisateurs depuis l'application (aucun back-office séparé nécessaire)."""
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(
                User(
                    email="associe@afcsoft.com",
                    first_name="Associé",
                    last_name="Principal",
                    role=Role.associe,
                    hashed_password=hash_password("Afcsoft2024!"),
                )
            )
            db.commit()
            print(
                "\n[AFCsoft] Compte associé par défaut créé :\n"
                "  email    : associe@afcsoft.com\n"
                "  mot de passe : Afcsoft2024!\n"
                "  -> à changer immédiatement après la première connexion.\n"
            )
    finally:
        db.close()


seed_default_associate()

app = FastAPI(title="AFCsoft Audit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en production, restreindre au domaine du frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(entities.router)
app.include_router(missions.router)
app.include_router(questionnaire.router)
app.include_router(documents.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
