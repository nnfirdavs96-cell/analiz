import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import AuditLog, Dataset, DatasetRow, Role, User
from app.schemas import DatasetOut
from app.services.excel import parse_table

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("", response_model=list[DatasetOut])
def list_datasets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Dataset).order_by(Dataset.id.desc())
    # department isolation for non-admin/analyst
    if user.role in (Role.manager, Role.employee) and user.department:
        q = q.filter((Dataset.department == user.department) | (Dataset.department.is_(None)))
    return q.all()


@router.post("/upload", response_model=DatasetOut, status_code=201)
async def upload(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str | None = Form(None),
    department: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.analyst, Role.manager)),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv"}:
        raise HTTPException(status_code=400, detail="Only .xlsx/.xls/.csv supported")

    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    full_path = os.path.join(settings.upload_dir, safe_name)

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    with open(full_path, "wb") as f:
        f.write(content)

    try:
        rows, cols = parse_table(full_path)
    except Exception as e:
        os.remove(full_path)
        raise HTTPException(status_code=400, detail=f"Parse error: {e}")

    ds = Dataset(
        name=name,
        description=description,
        source_type="excel" if suffix in {".xlsx", ".xls"} else "csv",
        file_path=full_path,
        columns_meta=cols,
        row_count=len(rows),
        department=department or user.department,
        owner_id=user.id,
    )
    db.add(ds)
    db.flush()
    for i, row in enumerate(rows):
        db.add(DatasetRow(dataset_id=ds.id, data=row, row_index=i))

    db.add(AuditLog(user_id=user.id, action="upload_dataset", resource=name, detail=f"rows={len(rows)}"))
    db.commit()
    db.refresh(ds)
    return ds


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Not found")
    return ds


@router.get("/{dataset_id}/rows")
def get_rows(
    dataset_id: int,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(DatasetRow)
        .filter(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index)
        .offset(offset)
        .limit(min(limit, 1000))
        .all()
    )
    return [r.data for r in rows]


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.analyst)),
):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Not found")
    if ds.file_path and os.path.exists(ds.file_path):
        try:
            os.remove(ds.file_path)
        except OSError:
            pass
    db.delete(ds)
    db.add(AuditLog(user_id=user.id, action="delete_dataset", resource=ds.name))
    db.commit()
