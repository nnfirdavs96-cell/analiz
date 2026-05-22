from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import AuditLog, ROLE_LEVEL, Role, User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _ensure_lower_role(actor: User, target_role: Role) -> None:
    actor_level = ROLE_LEVEL.get(actor.role, 0)
    target_level = ROLE_LEVEL.get(target_role, 0)
    if target_level >= actor_level:
        raise HTTPException(
            status_code=403,
            detail=f"Невозможно назначить роль {target_role.value} — она выше или равна вашей",
        )


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    _ensure_lower_role(admin, payload.role)

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email уже используется")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
    )
    db.add(user)
    db.add(AuditLog(user_id=admin.id, action="create_user", resource=payload.email, detail=payload.role.value))
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    if ROLE_LEVEL.get(user.role, 0) >= ROLE_LEVEL.get(admin.role, 0) and user.id != admin.id:
        raise HTTPException(status_code=403, detail="Нельзя редактировать пользователя с равной или высшей ролью")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        if user.id == admin.id and payload.role != admin.role:
            raise HTTPException(status_code=400, detail="Нельзя менять свою роль")
        _ensure_lower_role(admin, payload.role)
        user.role = payload.role
    if payload.department is not None:
        user.department = payload.department or None
    if payload.is_active is not None:
        if user.id == admin.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Нельзя отключить свой аккаунт")
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    db.add(AuditLog(user_id=admin.id, action="update_user", resource=user.email))
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя")
    if ROLE_LEVEL.get(user.role, 0) >= ROLE_LEVEL.get(admin.role, 0):
        raise HTTPException(status_code=403, detail="Нельзя удалить пользователя с равной или высшей ролью")
    db.delete(user)
    db.add(AuditLog(user_id=admin.id, action="delete_user", resource=user.email))
    db.commit()
