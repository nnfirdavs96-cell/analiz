from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, Enum,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Role(str, PyEnum):
    developer = "developer"
    superadmin = "superadmin"
    admin = "admin"
    analyst = "analyst"
    manager = "manager"
    employee = "employee"


ROLE_LEVEL = {
    Role.developer: 100,
    Role.superadmin: 80,
    Role.admin: 60,
    Role.analyst: 40,
    Role.manager: 30,
    Role.employee: 10,
}


def role_can_see_all(role: Role) -> bool:
    return ROLE_LEVEL.get(role, 0) >= 40


def role_can_manage_users(role: Role) -> bool:
    return ROLE_LEVEL.get(role, 0) >= 60


def role_can_upload(role: Role) -> bool:
    return ROLE_LEVEL.get(role, 0) >= 30


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(Role), default=Role.employee, nullable=False)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    datasets = relationship("Dataset", back_populates="owner")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(50), default="excel")  # excel, csv, sql, api, gsheets
    file_path = Column(String(500), nullable=True)
    columns_meta = Column(JSON, nullable=True)
    row_count = Column(Integer, default=0)
    department = Column(String(100), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="datasets")
    rows = relationship("DatasetRow", back_populates="dataset", cascade="all, delete-orphan")


class DatasetRow(Base):
    __tablename__ = "dataset_rows"

    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    data = Column(JSON, nullable=False)
    row_index = Column(Integer, default=0)

    dataset = relationship("Dataset", back_populates="rows")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)
    config = Column(JSON, nullable=True)
    schedule = Column(String(100), nullable=True)  # cron-like
    last_status = Column(String(50), nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DatasetAccess(Base):
    __tablename__ = "dataset_access"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    permission = Column(String(20), default="view")  # view, edit
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    granted_at = Column(DateTime, default=datetime.utcnow)


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    starts_at = Column(DateTime, nullable=False, index=True)
    ends_at = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"))
    department = Column(String(100), nullable=True)
    status = Column(String(20), default="scheduled")  # scheduled, ongoing, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    response = Column(String(20), default="pending")  # pending, accepted, declined
    created_at = Column(DateTime, default=datetime.utcnow)
