from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import AuditLog, Dataset, DatasetAccess, Role, User
from app.schemas import AccessGrant, AccessOut

router = APIRouter(prefix="/api/access", tags=["access"])


@router.get("/user/{user_id}", response_model=list[AccessOut])
def list_user_access(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    return (
        db.query(DatasetAccess)
        .filter(DatasetAccess.user_id == user_id)
        .all()
    )


@router.get("/dataset/{dataset_id}", response_model=list[AccessOut])
def list_dataset_access(
    dataset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    return (
        db.query(DatasetAccess)
        .filter(DatasetAccess.dataset_id == dataset_id)
        .all()
    )


@router.post("", response_model=AccessOut, status_code=201)
def grant_access(
    payload: AccessGrant,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    ds = db.query(Dataset).filter(Dataset.id == payload.dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if payload.permission not in ("view", "edit"):
        raise HTTPException(status_code=400, detail="Permission must be 'view' or 'edit'")

    existing = (
        db.query(DatasetAccess)
        .filter(
            DatasetAccess.user_id == payload.user_id,
            DatasetAccess.dataset_id == payload.dataset_id,
        )
        .first()
    )
    if existing:
        existing.permission = payload.permission
        existing.granted_by = admin.id
        db.commit()
        db.refresh(existing)
        return existing

    acc = DatasetAccess(
        user_id=payload.user_id,
        dataset_id=payload.dataset_id,
        permission=payload.permission,
        granted_by=admin.id,
    )
    db.add(acc)
    db.add(
        AuditLog(
            user_id=admin.id,
            action="grant_access",
            resource=f"user={target.email} ds={ds.name}",
            detail=payload.permission,
        )
    )
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{access_id}", status_code=204)
def revoke_access(
    access_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    acc = db.query(DatasetAccess).filter(DatasetAccess.id == access_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(acc)
    db.add(AuditLog(user_id=admin.id, action="revoke_access", resource=str(access_id)))
    db.commit()
