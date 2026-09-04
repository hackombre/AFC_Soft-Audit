from datetime import datetime, date
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field

from app.models import Role


# ---- Auth ----

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Users ----

class UserOut(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    role: Role
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: Role
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8)


# ---- Entities ----

class EntityCreate(BaseModel):
    name: str
    raison_sociale: Optional[str] = None
    forme_juridique: Optional[str] = None
    rccm: Optional[str] = None
    niu: Optional[str] = None
    sigle: Optional[str] = None


class EntityOut(BaseModel):
    id: str
    name: str
    raison_sociale: Optional[str]
    forme_juridique: Optional[str]
    rccm: Optional[str]
    niu: Optional[str]
    sigle: Optional[str]
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Missions ----

class MissionCreate(BaseModel):
    entity_id: str
    name: str
    closing_date: date
    fiscal_year: Optional[str] = None
    client_name: Optional[str] = None
    member_ids: list[str] = []


class MissionOut(BaseModel):
    id: str
    entity_id: str
    entity_name: Optional[str] = None
    name: str
    closing_date: date
    fiscal_year: Optional[str]
    client_name: Optional[str]
    created_by: str
    created_at: datetime
    progress: float = 0.0

    class Config:
        from_attributes = True


# ---- Answers ----

class AnswerIn(BaseModel):
    question_id: str
    value: Any = None
    comment: Optional[str] = None


class AnswerOut(BaseModel):
    question_id: str
    value: Any
    comment: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


# ---- Documents ----

class DocumentOut(BaseModel):
    id: str
    mission_id: str
    node_id: str
    question_id: Optional[str]
    category: str
    filename: str
    content_type: Optional[str]
    size: Optional[int]
    uploaded_by: Optional[str]
    uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True
