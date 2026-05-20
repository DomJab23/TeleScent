"""
Feature engineering for the TeleScent classifier.

Implemented as a stateless scikit-learn transformer so the same code runs
during training and at inference (called from serve.py).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


# Canonical names used inside the feature transformer. Both training rows
# (CSV columns: Sensor 4, Sensor 5, Ethanol, CoH2, VocRaw, NoxRaw) and
# inference inputs (Arduino: voc, no2, ethanol, co_h2, voc_raw, nox_raw) are
# normalised onto these names before transformation.
CANONICAL = {
    "VOC_multichannel": ["VOC_multichannel", "Sensor 4", "voc", "VOC"],
    "NO2":             ["NO2", "Sensor 5", "no2"],
    "Ethanol":         ["Ethanol", "ethanol"],
    "CoH2":            ["CoH2", "COandH2", "co_h2"],
    "VocRaw":          ["VocRaw", "srawVoc", "voc_raw"],
    "NoxRaw":          ["NoxRaw", "srawNox", "nox_raw"],
}

ENV_COLS = {
    "Temperature": ["Sensor 0", "temperature", "Temperature"],
    "Humidity":    ["Sensor 1", "humidity", "Humidity"],
    "GasResist":   ["Sensor 3", "gas", "gas_resistance"],
}


def _canonicalise(df: pd.DataFrame) -> pd.DataFrame:
    """Rename whatever sensor columns are present to the canonical names."""
    out = pd.DataFrame(index=df.index)
    for canon, aliases in {**CANONICAL, **ENV_COLS}.items():
        for a in aliases:
            if a in df.columns:
                out[canon] = pd.to_numeric(df[a], errors="coerce")
                break
        else:
            out[canon] = np.nan
    return out


class ScentFeatureBuilder(BaseEstimator, TransformerMixin):
    """Add hand-crafted gas-chemistry features on top of raw sensor readings.

    Mirrors the engineered features that the legacy retrain_models.py used,
    extended with environmental ratios. Output column order is fixed, so the
    pipeline persisted as `pipeline.joblib` reproduces the same feature space
    at inference time.
    """

    OUT_COLS = [
        "VOC_multichannel", "NO2", "Ethanol", "CoH2", "VocRaw", "NoxRaw",
        # Temperature and Humidity intentionally NOT exposed as raw features:
        # they are near-constant within a session and drift between sessions,
        # so the model would learn session identity rather than scent.
        # GasResist stays — it responds to VOC exposure within a session.
        "GasResist",
        "voc_ratio", "ethanol_voc_ratio", "voc_balance",
        "nox_intensity", "nox_balance",
        "voc_no2_interaction", "ethanol_no2_ratio", "co_voc_ratio",
        "total_voc_intensity", "chemical_diversity", "gas_dominance",
        "vocraw_log", "noxraw_log",
        # Environmental interactions — MOX gas sensors are strongly affected
        # by humidity and temperature. Every feature here multiplies an env
        # channel with a gas channel, so it carries scent signal rather than
        # being a pure room-conditions fingerprint. `abs_humidity_proxy` is
        # deliberately excluded for that reason.
        "gas_temp_ratio", "gas_humidity_ratio",
        "voc_humidity_corrected", "voc_temp_corrected",
        "humidity_voc_interaction", "ethanol_humidity_ratio",
        "gasresist_log",
    ]

    def fit(self, X, y=None):  # noqa: D401 - sklearn API
        return self

    def transform(self, X):
        df = X if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        c = _canonicalise(df)

        eps = 1.0
        out = c.copy()
        out["voc_ratio"]         = c["VOC_multichannel"] / (c["VocRaw"] + eps)
        out["ethanol_voc_ratio"] = c["Ethanol"] / (c["VOC_multichannel"] + eps)
        out["voc_balance"]       = (c["VOC_multichannel"] - c["Ethanol"]) / \
                                   (c["VOC_multichannel"] + c["Ethanol"] + eps)

        out["nox_intensity"] = c["NO2"] / (c["NoxRaw"] + eps)
        out["nox_balance"]   = (c["NO2"] - c["NoxRaw"] / 100) / \
                               (c["NO2"] + c["NoxRaw"] / 100 + eps)

        out["voc_no2_interaction"] = c["VOC_multichannel"] * c["NO2"] / 1000
        out["ethanol_no2_ratio"]   = c["Ethanol"] / (c["NO2"] + eps)
        out["co_voc_ratio"]        = c["CoH2"] / (c["VOC_multichannel"] + eps)

        gases = c[["NO2", "Ethanol", "VOC_multichannel", "CoH2"]]
        out["total_voc_intensity"] = c["VOC_multichannel"] + c["Ethanol"] + c["VocRaw"] / 100
        out["chemical_diversity"]  = gases.std(axis=1)
        out["gas_dominance"]       = gases.max(axis=1) / (gases.mean(axis=1) + eps)

        out["vocraw_log"] = np.log1p(c["VocRaw"].clip(lower=0))
        out["noxraw_log"] = np.log1p(c["NoxRaw"].clip(lower=0))

        # Environmental physics — only features that mix env with a gas
        # channel survive, so they cannot encode session identity alone.
        t = c["Temperature"]
        rh = c["Humidity"]
        out["gas_temp_ratio"]      = c["GasResist"] / (t + eps)
        out["gas_humidity_ratio"]  = c["GasResist"] / (rh + eps)
        out["voc_humidity_corrected"] = c["VOC_multichannel"] / (rh + eps)
        out["voc_temp_corrected"]     = c["VOC_multichannel"] / (t + eps)
        out["humidity_voc_interaction"] = rh * c["VOC_multichannel"] / 1000
        out["ethanol_humidity_ratio"]   = c["Ethanol"] / (rh + eps)
        out["gasresist_log"] = np.log1p(c["GasResist"].clip(lower=0))

        out = out.replace([np.inf, -np.inf], np.nan)
        return out[self.OUT_COLS]

    def get_feature_names_out(self, input_features=None):
        return np.array(self.OUT_COLS)
