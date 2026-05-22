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
