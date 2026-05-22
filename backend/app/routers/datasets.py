import io
import json
import os
import uuid
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import AuditLog, Dataset, DatasetRow, Role, User
from app.schemas import DatasetOut
from app.services.excel import SUPPORTED_EXTENSIONS, detect_source_type, parse_table

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("", response_model=list[DatasetOut])
def list_datasets(
    search: Optional[str] = None,
    department: Optional[str] = None,
    source_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.models import DatasetAccess, role_can_see_all
    q = db.query(Dataset).order_by(Dataset.id.desc())
    if not role_can_see_all(user.role):
        # Department-based access + explicit access grants
        granted_ids = (
            db.query(DatasetAccess.dataset_id)
            .filter(DatasetAccess.user_id == user.id)
            .subquery()
        )
        dept_filter = Dataset.department.is_(None)
        if user.department:
            dept_filter = dept_filter | (Dataset.department == user.department)
        q = q.filter(dept_filter | Dataset.id.in_(granted_ids))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Dataset.name.ilike(like), Dataset.description.ilike(like)))
    if department:
        q = q.filter(Dataset.department == department)
    if source_type:
        q = q.filter(Dataset.source_type == source_type)
    return q.all()


@router.post("/upload", response_model=DatasetOut, status_code=201)
async def upload(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str | None = Form(None),
    department: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin, Role.analyst, Role.manager)),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

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
        source_type=detect_source_type(suffix),
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
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base = db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id)
    total = base.count()
    rows = base.order_by(DatasetRow.row_index).offset(offset).limit(limit).all()
    data = [r.data for r in rows]
    if search:
        needle = search.lower()
        data = [r for r in data if any(needle in str(v).lower() for v in r.values())]
    return {"total": total, "rows": data}


@router.get("/{dataset_id}/export")
def export_dataset(
    dataset_id: int,
    format: str = Query("csv", pattern="^(csv|excel|json)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Not found")

    rows = (
        db.query(DatasetRow.data)
        .filter(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index)
        .all()
    )
    data = [r[0] for r in rows]
    df = pd.DataFrame(data)

    safe = "".join(c for c in ds.name if c.isalnum() or c in "._- ").strip() or f"dataset_{ds.id}"

    if format == "csv":
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{safe}.csv"'},
        )
    if format == "excel":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Sheet1")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{safe}.xlsx"'},
        )
    # json
    payload = json.dumps(data, ensure_ascii=False, indent=2, default=str)
    return StreamingResponse(
        iter([payload]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{safe}.json"'},
    )


@router.patch("/{dataset_id}", response_model=DatasetOut)
def update_dataset(
    dataset_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin, Role.analyst)),
):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Not found")
    if name is not None:
        ds.name = name
    if description is not None:
        ds.description = description
    if department is not None:
        ds.department = department or None
    db.commit()
    db.refresh(ds)
    return ds


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.developer, Role.superadmin, Role.admin, Role.analyst)),
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
