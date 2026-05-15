#!/usr/bin/env python3
"""
TeleScent ML inference service.

Loads the pipeline trained by `scent_classification.ipynb` and returns a
prediction for one sensor reading. Reads a JSON object from stdin, writes
a JSON object to stdout. Called from the Node backend (see
`backend/services/predictionService.js`).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


# Make both `ml.features` and `features` importable regardless of cwd, so
# joblib can unpickle the pipeline either way.
_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))           # for `import features`
sys.path.insert(0, str(_HERE.parent))    # for `import ml.features`

try:
    import numpy as np
    import pandas as pd
    import joblib
except ImportError as e:
    print(json.dumps({
        "error": f"Missing Python dependency: {e}. "
                 "Run: pip install -r ml/requirements.txt",
        "predicted_scent": "error",
        "confidence": 0.0,
    }))
    sys.exit(1)

# Import under both names so whichever qualified path joblib stored is found.
try:
    from ml.features import ScentFeatureBuilder  # noqa: F401
except ModuleNotFoundError:
    from features import ScentFeatureBuilder  # noqa: F401


MODEL_DIR = Path(__file__).parent / "model"
PIPELINE_PATH = MODEL_DIR / "pipeline.joblib"
ENCODER_PATH  = MODEL_DIR / "label_encoder.joblib"


# Map Arduino field names to the raw column names the pipeline expects.
# The feature builder accepts both Arduino and CSV names natively, so this
# table is for documentation more than translation.
ARDUINO_FIELDS = {
    "voc":         "VOC_multichannel",
    "no2":         "NO2",
    "ethanol":     "Ethanol",
    "co_h2":       "CoH2",
    "voc_raw":     "VocRaw",
    "nox_raw":     "NoxRaw",
    "temperature": "Temperature",
    "humidity":    "Humidity",
    "gas":         "GasResist",
}


def _load():
    pipeline = joblib.load(PIPELINE_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    return pipeline, label_encoder


try:
    PIPELINE, LABEL_ENCODER = _load()
    print(f"✅ TeleScent pipeline loaded ({PIPELINE_PATH.name})", file=sys.stderr)
except Exception as e:
    PIPELINE = LABEL_ENCODER = None
    print(f"❌ Could not load pipeline: {e}", file=sys.stderr)


def predict_scent(sensor_reading: dict) -> dict:
    """Run one prediction. Accepts Arduino or CSV-style field names."""
    if PIPELINE is None or LABEL_ENCODER is None:
        return {
            "error": "Pipeline not loaded — run scent_classification.ipynb first.",
            "predicted_scent": "error",
            "confidence": 0.0,
        }

    try:
        # Single-row DataFrame; the feature builder handles aliasing & missing.
        row = pd.DataFrame([sensor_reading])

        pred_enc = PIPELINE.predict(row)[0]
        proba    = PIPELINE.predict_proba(row)[0]

        pred_label = str(LABEL_ENCODER.inverse_transform([pred_enc])[0])
        class_names = LABEL_ENCODER.classes_.tolist()
        probs = {str(c): float(proba[i]) for i, c in enumerate(class_names)}
        top3 = sorted(
            [{"scent": s, "confidence": p} for s, p in probs.items()],
            key=lambda d: d["confidence"], reverse=True,
        )[:3]

        return {
            "predicted_scent":  pred_label,
            "confidence":       float(proba[pred_enc]),
            "top_predictions":  top3,
            "all_probabilities": probs,
        }

    except Exception as e:
        return {
            "error": f"Prediction failed: {e}",
            "predicted_scent": "error",
            "confidence": 0.0,
        }


def main() -> None:
    try:
        sensor_reading = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Invalid JSON input: {e}",
            "predicted_scent": "error",
            "confidence": 0.0,
        }))
        sys.exit(1)

    result = predict_scent(sensor_reading)
    print(json.dumps(result, indent=2))
    sys.exit(0 if "error" not in result else 1)


if __name__ == "__main__":
    main()
