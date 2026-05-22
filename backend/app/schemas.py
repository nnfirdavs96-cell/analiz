from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models import Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Role = Role.employee
    department: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: Optional[str]
    role: Role
    department: Optional[str]
    is_active: bool
    created_at: datetime


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    source_type: str
    row_count: int
    department: Optional[str]
    columns_meta: Optional[Any] = None
    owner_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: Optional[str] = None


class AggregateRequest(BaseModel):
    dataset_id: int
    group_by: str
    metric: str
    agg: str = "sum"  # sum, avg, count, min, max


class AggregateRow(BaseModel):
    label: str
    value: float


class DashboardKPI(BaseModel):
    label: str
    value: float
    trend: Optional[float] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[Role] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    color: Optional[str]
    created_at: datetime


class AccessGrant(BaseModel):
    user_id: int
    dataset_id: int
    permission: str = "view"


class AccessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    dataset_id: int
    permission: str
    granted_by: Optional[int]
    granted_at: datetime


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    starts_at: datetime
    ends_at: Optional[datetime] = None
    location: Optional[str] = None
    department: Optional[str] = None
    participant_ids: list[int] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[str] = None


class MeetingParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    response: str


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    starts_at: datetime
    ends_at: Optional[datetime]
    location: Optional[str]
    organizer_id: Optional[int]
    department: Optional[str]
    status: str
    created_at: datetime
    participants: list[MeetingParticipantOut] = []
