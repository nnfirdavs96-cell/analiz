from collections import defaultdict
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Dataset, DatasetRow, User
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

    result = []
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
        else:
            raise HTTPException(status_code=400, detail="Unknown agg")
        result.append(AggregateRow(label=label, value=v))

    result.sort(key=lambda x: x.value, reverse=True)
    return result[:50]


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    datasets = db.query(Dataset).all()
    total_rows = sum(d.row_count or 0 for d in datasets)
    return {
        "datasets_count": len(datasets),
        "total_rows": total_rows,
        "by_source": _group(datasets, lambda d: d.source_type),
        "by_department": _group([d for d in datasets if d.department], lambda d: d.department),
    }


def _group(items, key):
    out: dict[str, int] = defaultdict(int)
    for it in items:
        out[key(it) or "—"] += 1
    return out
