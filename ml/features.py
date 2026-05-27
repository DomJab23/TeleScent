from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


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
    OUT_COLS = [
        "VOC_multichannel", "NO2", "Ethanol", "CoH2", "VocRaw", "NoxRaw",
        # Temperature/Humidity excluded as raw features: near-constant within
        # a session, so the model would learn session identity. GasResist
        # stays — it responds to VOC exposure within a session.
        "GasResist",
        "voc_ratio", "ethanol_voc_ratio", "voc_balance",
        "nox_intensity", "nox_balance",
        "voc_no2_interaction", "ethanol_no2_ratio", "co_voc_ratio",
        "total_voc_intensity", "chemical_diversity", "gas_dominance",
        "vocraw_log", "noxraw_log",
        # Env interactions only mix env with a gas channel, never env alone.
        "gas_temp_ratio", "gas_humidity_ratio",
        "voc_humidity_corrected", "voc_temp_corrected",
        "humidity_voc_interaction", "ethanol_humidity_ratio",
        "gasresist_log",
    ]

    def fit(self, X, y=None):
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
