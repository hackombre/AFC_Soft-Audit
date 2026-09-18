import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, DateTime, Date, ForeignKey, Text, Enum, UniqueConstraint, Boolean, Integer, LargeBinary
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:16]


class Role(str, enum.Enum):
    associe = "associe"
    directeur_mission = "directeur_mission"
    chef_mission = "chef_mission"
    auditeur_senior = "auditeur_senior"
    auditeur_junior = "auditeur_junior"


ROLE_LABELS = {
    Role.associe: "Associé",
    Role.directeur_mission: "Directeur de mission",
    Role.chef_mission: "Chef de mission",
    Role.auditeur_senior: "Auditeur senior",
    Role.auditeur_junior: "Auditeur junior",
}


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    hashed_password = Column(String, nullable=False)
    security_code_hash = Column(String, nullable=True)
    password_reset_code_hash = Column(String, nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Révocation globale des sessions.
    #
    # Chaque jeton émis porte la valeur courante. L'incrémenter
    # invalide instantanément TOUS les jetons existants de cet
    # utilisateur (changement de mot de passe, compromission,
    # départ d'un collaborateur).
    token_version = Column(Integer, default=0, nullable=False)

    mission_memberships = relationship("MissionMember", back_populates="user")


class Entity(Base):
    """Une entité auditée (société cliente) — doit exister avant de créer une mission."""
    __tablename__ = "entities"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)              # nom usuel de l'entité
    raison_sociale = Column(String, nullable=True)
    forme_juridique = Column(String, nullable=True)
    rccm = Column(String, nullable=True)
    niu = Column(String, nullable=True)
    sigle = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    missions = relationship("Mission", back_populates="entity")


class Mission(Base):
    __tablename__ = "missions"

    id = Column(String, primary_key=True, default=gen_id)
    entity_id = Column(String, ForeignKey("entities.id"), nullable=False)
    name = Column(String, nullable=False)              # ex: "AUDIT 2025"
    closing_date = Column(Date, nullable=False)         # date de clôture de l'exercice audité
    fiscal_year = Column(String, nullable=True)         # ex: "Exercice 2024" (optionnel)
    client_name = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    entity = relationship("Entity", back_populates="missions")
    members = relationship("MissionMember", back_populates="mission", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="mission", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="mission", cascade="all, delete-orphan")


class MissionMember(Base):
    __tablename__ = "mission_members"
    __table_args__ = (UniqueConstraint("mission_id", "user_id", name="uq_mission_user"),)

    id = Column(String, primary_key=True, default=gen_id)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(Role), nullable=False)

    mission = relationship("Mission", back_populates="members")
    user = relationship("User", back_populates="mission_memberships")


class Answer(Base):
    """Une réponse à une question du questionnaire, pour une mission donnée."""
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("mission_id", "question_id", name="uq_mission_question"),)

    id = Column(String, primary_key=True, default=gen_id)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=False)
    question_id = Column(String, nullable=False, index=True)  # ex: "A-1-1"
    value = Column(Text, nullable=True)  # JSON sérialisé (string, dict, list...)
    comment = Column(Text, nullable=True)  # commentaire libre de l'auditeur sur la question
    updated_by = Column(String, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mission = relationship("Mission", back_populates="answers")


class DocumentCategory(str, enum.Enum):
    recus = "recus"      # documents reçus (pièces justificatives du client)
    travaux = "travaux"  # travaux effectués (papiers de travail produits par l'équipe)


class Document(Base):
    """Un fichier importé, classé automatiquement dans le dossier de l'étape/
    sous-étape du questionnaire depuis laquelle il a été joint."""
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_id)
    mission_id = Column(String, ForeignKey("missions.id"), nullable=False)
    node_id = Column(String, nullable=False, index=True)  # id du noeud questionnaire, ex: "1.2.3"
    question_id = Column(String, nullable=True, index=True)  # question précise depuis laquelle il a été joint
    category = Column(Enum(DocumentCategory), nullable=False, default=DocumentCategory.recus)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=True)
    drive_file_id = Column(String, nullable=True, index=True)
    drive_web_url = Column(String, nullable=True)
    content_type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("Mission", back_populates="documents")

class GuideTemplate(Base):
    """Modèle de guide attaché à une sous-étape/sous-sous-étape.

    Le modèle appartient au module « Modèles de guides » et est stocké dans
    PostgreSQL. Il ne doit pas être copié dans le Shared Drive.
    """
    __tablename__ = "guide_templates"

    id = Column(String, primary_key=True, default=gen_id)
    node_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    content = Column(LargeBinary, nullable=False)
    content_type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class RevokedToken(Base):
    """
    Jetons JWT explicitement révoqués (déconnexion).

    Un JWT est autoporteur : sans registre, il reste valable
    jusqu'à son expiration même après une déconnexion. Cette
    table conserve l'identifiant unique (jti) des jetons
    révoqués jusqu'à leur date d'expiration naturelle.

    Le volume reste faible : une ligne par déconnexion, purgée
    automatiquement dès que le jeton aurait expiré de toute
    façon.

    Pour révoquer TOUTES les sessions d'un utilisateur d'un
    coup, on incrémente plutôt User.token_version.
    """

    __tablename__ = "revoked_tokens"

    # Identifiant unique du jeton (claim "jti").
    jti = Column(String, primary_key=True)

    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)

    # Date d'expiration naturelle du jeton : au-delà, la ligne
    # ne sert plus à rien et peut être purgée.
    expires_at = Column(DateTime, nullable=False, index=True)

    revoked_at = Column(DateTime, default=datetime.utcnow)