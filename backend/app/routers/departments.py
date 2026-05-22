from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import AuditLog, Department, Role, User
from app.schemas import DepartmentCreate, DepartmentOut

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Department).order_by(Department.name).all()


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    if db.query(Department).filter(Department.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Department already exists")
    dep = Department(
        name=payload.name,
        description=payload.description,
        color=payload.color,
    )
    db.add(dep)
    db.add(AuditLog(user_id=admin.id, action="create_department", resource=payload.name))
    db.commit()
    db.refresh(dep)
    return dep


@router.patch("/{dep_id}", response_model=DepartmentOut)
def update_department(
    dep_id: int,
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    dep = db.query(Department).filter(Department.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Not found")
    dep.name = payload.name
    dep.description = payload.description
    dep.color = payload.color
    db.add(AuditLog(user_id=admin.id, action="update_department", resource=payload.name))
    db.commit()
    db.refresh(dep)
    return dep


@router.delete("/{dep_id}", status_code=204)
def delete_department(
    dep_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    dep = db.query(Department).filter(Department.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(dep)
    db.add(AuditLog(user_id=admin.id, action="delete_department", resource=dep.name))
    db.commit()
