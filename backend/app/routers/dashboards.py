from collections import defaultdict
from statistics import mean, median, pstdev

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Dataset, DatasetRow, Role, User
from app.schemas import AggregateRequest, AggregateRow

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


@router.post("/aggregate", response_model=list[AggregateRow])
def aggregate(req: AggregateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = db.query(DatasetRow.data).filter(DatasetRow.dataset_id == req.dataset_id).all()
    buckets: dict[str, list[float]] = defaultdict(list)
    for (data,) in rows:
        label = data.get(req.group_by)
        if label is None:
            continue
        raw = data.get(req.metric)
        if req.agg == "count":
            buckets[str(label)].append(1.0)
            continue
        try:
            val = float(raw)
        except (TypeError, ValueError):
            continue
        buckets[str(label)].append(val)

    result: list[AggregateRow] = []
    for label, values in buckets.items():
        if not values:
            continue
        if req.agg == "sum":
            v = sum(values)
        elif req.agg == "avg":
            v = mean(values)
        elif req.agg == "count":
            v = len(values)
        elif req.agg == "min":
            v = min(values)
        elif req.agg == "max":
            v = max(values)
        elif req.agg == "median":
            v = median(values)
        elif req.agg == "stddev":
            v = pstdev(values) if len(values) > 1 else 0.0
        elif req.agg == "distinct":
            v = len(set(values))
        else:
            raise HTTPException(status_code=400, detail="Unknown agg")
        result.append(AggregateRow(label=label, value=float(v)))

    result.sort(key=lambda x: x.value, reverse=True)
    return result[:100]


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import role_can_see_all
    q = db.query(Dataset)
    if not role_can_see_all(user.role) and user.department:
        q = q.filter((Dataset.department == user.department) | (Dataset.department.is_(None)))
    datasets = q.all()
    total_rows = sum(d.row_count or 0 for d in datasets)
    return {
        "datasets_count": len(datasets),
        "total_rows": total_rows,
        "by_source": _group(datasets, lambda d: d.source_type),
        "by_department": _group([d for d in datasets if d.department], lambda d: d.department),
        "recent": [
            {
                "id": d.id,
                "name": d.name,
                "row_count": d.row_count,
                "source_type": d.source_type,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in sorted(datasets, key=lambda x: x.created_at or 0, reverse=True)[:5]
        ],
    }


@router.get("/stats/{dataset_id}")
def stats(dataset_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = db.query(DatasetRow.data).filter(DatasetRow.dataset_id == dataset_id).all()
    cols_meta = ds.columns_meta or []

    out: dict[str, dict] = {}
    for col in cols_meta:
        name = col["name"]
        if col["type"] != "number":
            continue
        values: list[float] = []
        for (data,) in rows:
            raw = data.get(name)
            try:
                values.append(float(raw))
            except (TypeError, ValueError):
                continue
        if not values:
            continue
        out[name] = {
            "count": len(values),
            "sum": sum(values),
            "avg": mean(values),
            "min": min(values),
            "max": max(values),
            "median": median(values),
            "stddev": pstdev(values) if len(values) > 1 else 0.0,
        }
    return out


def _group(items, key):
    out: dict[str, int] = defaultdict(int)
    for it in items:
        out[key(it) or "—"] += 1
    return out
