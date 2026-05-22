import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


SUPPORTED_EXTENSIONS = {".xlsx", ".xls", ".csv", ".tsv", ".txt", ".json", ".jsonl", ".ndjson", ".parquet"}


def parse_table(file_path: str) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Parse a tabular file. Supports Excel, CSV, TSV, JSON, JSONL, Parquet."""
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(file_path, sheet_name=0)
    elif suffix == ".csv":
        df = _read_csv_auto(file_path)
    elif suffix in {".tsv", ".txt"}:
        df = pd.read_csv(file_path, sep="\t", encoding_errors="replace")
    elif suffix == ".json":
        df = _read_json(file_path)
    elif suffix in {".jsonl", ".ndjson"}:
        df = pd.read_json(file_path, lines=True)
    elif suffix == ".parquet":
        df = pd.read_parquet(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

    df = df.dropna(how="all")
    df.columns = [str(c).strip() for c in df.columns]

    columns_meta: list[dict[str, str]] = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        if "int" in dtype or "float" in dtype:
            kind = "number"
        elif "bool" in dtype:
            kind = "boolean"
        elif "datetime" in dtype:
            kind = "date"
        else:
            kind = "text"
        columns_meta.append({"name": col, "type": kind})

    # Convert to object dtype so that NaN/NaT become None rather than staying as float NaN
    df = df.astype(object).where(pd.notnull(df), None)
    rows = df.to_dict(orient="records")

    for r in rows:
        for k, v in list(r.items()):
            r[k] = _to_json_safe(v)

    return rows, columns_meta


def _to_json_safe(v: Any) -> Any:
    """Convert a value to a JSON-serializable Python native type."""
    if v is None:
        return None
    # numpy / pandas NA types
    try:
        if pd.isnull(v):
            return None
    except (TypeError, ValueError):
        pass
    # numpy integer
    if isinstance(v, np.integer):
        return int(v)
    # numpy float (includes NaN check)
    if isinstance(v, np.floating):
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else f
    # numpy bool
    if isinstance(v, np.bool_):
        return bool(v)
    # Python float NaN / Inf
    if isinstance(v, float):
        return None if math.isnan(v) or math.isinf(v) else v
    # datetime-like objects
    if hasattr(v, "isoformat"):
        try:
            return v.isoformat()
        except (ValueError, AttributeError):
            return None
    # bytes
    if isinstance(v, (bytes, bytearray)):
        return v.decode("utf-8", errors="replace")
    # native Python scalars are already JSON-safe
    if isinstance(v, (int, float, str, bool)):
        return v
    # fallback
    return str(v)


def _read_csv_auto(file_path: str) -> pd.DataFrame:
    """Try UTF-8 first, fall back to cp1251 (common for Russian Excel exports)."""
    for enc in ("utf-8", "utf-8-sig", "cp1251", "latin-1"):
        try:
            return pd.read_csv(file_path, encoding=enc)
        except (UnicodeDecodeError, Exception):
            continue
    return pd.read_csv(file_path, encoding="latin-1", encoding_errors="replace")


def _read_json(file_path: str) -> pd.DataFrame:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return pd.DataFrame(data)
    if isinstance(data, dict):
        for key in ("data", "rows", "items", "results"):
            if key in data and isinstance(data[key], list):
                return pd.DataFrame(data[key])
        return pd.DataFrame([data])
    raise ValueError("JSON must be an array or object with a data/rows/items array")


def detect_source_type(suffix: str) -> str:
    suffix = suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        return "excel"
    if suffix == ".csv":
        return "csv"
    if suffix in {".tsv", ".txt"}:
        return "tsv"
    if suffix in {".json", ".jsonl", ".ndjson"}:
        return "json"
    if suffix == ".parquet":
        return "parquet"
    return "unknown"
