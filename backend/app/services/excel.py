from pathlib import Path
from typing import Any

import pandas as pd


def parse_table(file_path: str) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Parse Excel/CSV file. Returns (rows, columns_meta)."""
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(file_path)
    elif suffix == ".csv":
        df = pd.read_csv(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

    df = df.dropna(how="all")
    df.columns = [str(c).strip() for c in df.columns]

    columns_meta = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        if "int" in dtype or "float" in dtype:
            kind = "number"
        elif "datetime" in dtype:
            kind = "date"
        else:
            kind = "text"
        columns_meta.append({"name": col, "type": kind})

    rows = df.where(pd.notnull(df), None).to_dict(orient="records")
    # Convert datetimes to iso strings for JSON
    for r in rows:
        for k, v in list(r.items()):
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
    return rows, columns_meta
