import json
from pathlib import Path
from typing import Any

import pandas as pd


SUPPORTED_EXTENSIONS = {".xlsx", ".xls", ".csv", ".tsv", ".txt", ".json", ".jsonl", ".ndjson", ".parquet"}


def parse_table(file_path: str) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Parse a tabular file. Supports Excel, CSV, TSV, JSON, JSONL, Parquet."""
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(file_path, sheet_name=0)
    elif suffix == ".csv":
        df = pd.read_csv(file_path)
    elif suffix in {".tsv", ".txt"}:
        df = pd.read_csv(file_path, sep="\t")
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

    rows = df.where(pd.notnull(df), None).to_dict(orient="records")
    for r in rows:
        for k, v in list(r.items()):
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
            elif isinstance(v, (bytes, bytearray)):
                r[k] = v.decode("utf-8", errors="replace")
    return rows, columns_meta


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
