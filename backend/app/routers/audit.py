from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import AuditLog, Role, User

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def list_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    total = db.query(AuditLog).count()
    logs = (
        db.query(AuditLog, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "items": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_email": email,
                "action": log.action,
                "resource": log.resource,
                "detail": log.detail,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log, email in logs
        ],
    }
