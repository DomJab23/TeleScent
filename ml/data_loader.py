"""
TeleScent dataset loader.

Loads the labelled CSV produced by `export_db_to_csv.py`, drops leakage columns,
and exposes session-aware splits for grouped cross-validation.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedGroupKFold


DEFAULT_CSV = Path(__file__).resolve().parent / "sensor_data.csv"

LABEL_COL = "Scent"
SESSION_COL = "Session ID"
PHASE_COL = "Phase"

RAW_SENSOR_COLS = [
    "Sensor 0", "Sensor 1", "Sensor 2", "Sensor 3", "Sensor 4", "Sensor 5",
    "Ethanol", "CoH2", "VocRaw", "NoxRaw",
]

LEAK_COLS = ["ID", "Device ID", "Timestamp", "Created At",
             "Predicted Scent", "Confidence"]

DEFAULT_CLASSES = ("no_scent", "sweet_orange", "peppermint")


@dataclass
class Dataset:
    X: pd.DataFrame
    y: pd.Series
    groups: pd.Series
    phase: pd.Series

    def __len__(self) -> int:
        return len(self.y)

    def class_counts(self) -> pd.Series:
        return self.y.value_counts().sort_index()


def load_dataset(csv_path: Path | str = DEFAULT_CSV,
                 classes: Iterable[str] = DEFAULT_CLASSES,
                 sensor_cols: Iterable[str] = RAW_SENSOR_COLS,
                 drop_empty_cols: bool = True) -> Dataset:
    """Load the labelled CSV, filter to the target classes, return a Dataset.

    - Coerces sensor columns to numeric (BME688 readings).
    - Drops sensor columns that are entirely empty (e.g. unused slot Sensor 2)
      when `drop_empty_cols` is True.
    """
    csv_path = Path(csv_path)
    df = pd.read_csv(csv_path)

    df = df[df[LABEL_COL].isin(classes)].copy()
    df = df.dropna(subset=[SESSION_COL, LABEL_COL])

    sensor_cols = [c for c in sensor_cols if c in df.columns]
    X = df[sensor_cols].apply(pd.to_numeric, errors="coerce")

    if drop_empty_cols:
        empty = [c for c in X.columns if X[c].isna().all()]
        if empty:
            X = X.drop(columns=empty)

    y = df[LABEL_COL].astype(str).reset_index(drop=True)
    groups = df[SESSION_COL].astype(str).reset_index(drop=True)
    phase = df[PHASE_COL].astype(str).reset_index(drop=True) if PHASE_COL in df.columns \
        else pd.Series(["unknown"] * len(df))
    X = X.reset_index(drop=True)

    return Dataset(X=X, y=y, groups=groups, phase=phase)


def holdout_test_sessions(ds: Dataset,
                          target_frac: float = 0.2,
                          random_state: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """Hold out one session per class for a final test set.

    Picks the session per class whose row count is closest to
    `target_frac * (per-class total)` so the test set is ~20% and balanced.
    Deterministic for a given dataset; `random_state` only breaks ties.
    """
    rng = np.random.default_rng(random_state)

    test_sessions: list[str] = []
    for cls in sorted(ds.y.unique()):
        cls_mask = (ds.y == cls)
        cls_sessions = ds.groups[cls_mask].value_counts()
        if cls_sessions.empty:
            continue
        target = max(1, int(round(cls_sessions.sum() * target_frac)))
        # Prefer the session whose count is closest to target; on ties prefer
        # the smaller (keeps the test set from accidentally dominating train).
        ranked = sorted(cls_sessions.items(),
                        key=lambda kv: (abs(kv[1] - target), kv[1], kv[0]))
        picked = ranked[0][0]
        # rng kept for API compatibility / future tie-breakers
        _ = rng
        test_sessions.append(picked)

    mask_test = ds.groups.isin(test_sessions).to_numpy()
    test_idx = np.where(mask_test)[0]
    train_idx = np.where(~mask_test)[0]
    return train_idx, test_idx


def grouped_cv_splitter(n_splits: int = 5,
                        random_state: int = 42) -> StratifiedGroupKFold:
    """StratifiedGroupKFold so that no `Session ID` appears in both folds."""
    return StratifiedGroupKFold(n_splits=n_splits, shuffle=True,
                                random_state=random_state)
