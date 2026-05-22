import os
import platform
import sys
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    AppSetting,
    AuditLog,
    Dataset,
    DatasetRow,
    Department,
    Role,
    User,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


DEFAULTS = {
    "site_name": "Analiz",
    "site_subtitle": "Корпоративная BI-платформа",
    "primary_color": "#3b82f6",
    "accent_color": "#8b5cf6",
    "logo_emoji": "📊",
    "allow_registration": False,
    "max_upload_mb": 100,
    "show_demo_data": True,
}


class SettingUpdate(BaseModel):
    value: Any
    description: str | None = None


@router.get("/public")
def public_settings(db: Session = Depends(get_db)):
    """Public branding settings, no auth required."""
    rows = db.query(AppSetting).all()
    data = dict(DEFAULTS)
    for r in rows:
        data[r.key] = r.value
    return {k: data[k] for k in ("site_name", "site_subtitle", "primary_color", "accent_color", "logo_emoji")}


@router.get("")
def list_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.developer, Role.superadmin)),
):
    rows = db.query(AppSetting).all()
    overrides = {r.key: r.value for r in rows}
    return [
        {"key": k, "value": overrides.get(k, v), "default": v, "overridden": k in overrides}
        for k, v in DEFAULTS.items()
    ]


@router.put("/{key}")
def update_setting(
    key: str,
    payload: SettingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.developer, Role.superadmin)),
):
    if key not in DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Unknown setting: {key}")

    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    if s:
        s.value = payload.value
        s.description = payload.description
    else:
        s = AppSetting(key=key, value=payload.value, description=payload.description)
        db.add(s)
    db.add(AuditLog(user_id=user.id, action="update_setting", resource=key, detail=str(payload.value)))
    db.commit()
    return {"key": key, "value": payload.value}


@router.delete("/{key}", status_code=204)
def reset_setting(
    key: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.developer, Role.superadmin)),
):
    s = db.query(AppSetting).filter(AppSetting.key == key).first()
    if s:
        db.delete(s)
        db.add(AuditLog(user_id=user.id, action="reset_setting", resource=key))
        db.commit()


@router.get("/system")
def system_info(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.developer, Role.superadmin)),
):
    users_count = db.query(func.count(User.id)).scalar() or 0
    datasets_count = db.query(func.count(Dataset.id)).scalar() or 0
    rows_count = db.query(func.count(DatasetRow.id)).scalar() or 0
    audit_count = db.query(func.count(AuditLog.id)).scalar() or 0
    departments_count = db.query(func.count(Department.id)).scalar() or 0

    upload_dir = os.environ.get("UPLOAD_DIR", "/app/uploads")
    upload_size = 0
    file_count = 0
    if os.path.exists(upload_dir):
        for root, _, files in os.walk(upload_dir):
            file_count += len(files)
            for f in files:
                try:
                    upload_size += os.path.getsize(os.path.join(root, f))
                except OSError:
                    pass

    return {
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "users_count": users_count,
        "datasets_count": datasets_count,
        "rows_count": rows_count,
        "audit_count": audit_count,
        "departments_count": departments_count,
        "upload_dir": upload_dir,
        "upload_size_mb": round(upload_size / 1024 / 1024, 2),
        "upload_file_count": file_count,
    }
