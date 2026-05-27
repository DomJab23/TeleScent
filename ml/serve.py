#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path


_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE.parent))

try:
    import numpy as np  # noqa: F401
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

try:
    from ml.features import ScentFeatureBuilder  # noqa: F401
except ModuleNotFoundError:
    from features import ScentFeatureBuilder  # noqa: F401


MODEL_DIR             = Path(__file__).parent / "model"
PIPELINE_PATH         = MODEL_DIR / "pipeline.joblib"
ENCODER_PATH          = MODEL_DIR / "label_encoder.joblib"
PRODUCTION_JSON_PATH  = MODEL_DIR / "production.json"
SCENTNET_WEIGHTS_PATH = MODEL_DIR / "scentnet.pt"
SCENTNET_PRE_PATH     = MODEL_DIR / "scentnet_preprocessor.joblib"


def _error_response(message: str) -> dict:
    return {"error": message, "predicted_scent": "error", "confidence": 0.0}


def _read_production_config() -> dict:
    if not PRODUCTION_JSON_PATH.exists():
        return {"kind": "sklearn"}
    try:
        return json.loads(PRODUCTION_JSON_PATH.read_text())
    except Exception:
        return {"kind": "sklearn"}


class _SklearnBackend:
    kind = "sklearn"

    def __init__(self, pipeline, classes):
        self.pipeline = pipeline
        self.classes = list(classes)

    def predict(self, row_df):
        pred_enc = int(self.pipeline.predict(row_df)[0])
        proba = self.pipeline.predict_proba(row_df)[0]
        return pred_enc, proba


class _TorchBackend:
    kind = "torch"

    def __init__(self, preprocessor, model, classes):
        self.preprocessor = preprocessor
        self.model = model.eval()
        self.classes = list(classes)

    def predict(self, row_df):
        import torch
        import torch.nn.functional as F
        feats = self.preprocessor.transform(row_df).astype("float32")
        with torch.no_grad():
            logits = self.model(torch.tensor(feats))
            proba = F.softmax(logits, dim=1).cpu().numpy()[0]
        return int(proba.argmax()), proba


def _build_scentnet(arch):
    # The trained class wraps an nn.Sequential in self.net, so state_dict
    # keys are prefixed `net.*`. Mirror that for load_state_dict to succeed.
    import torch.nn as nn
    in_dim = arch["in_dim"]
    n_classes = arch["n_classes"]
    p = float(arch.get("p", 0.3))

    class ScentNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, 64),
                nn.BatchNorm1d(64),
                nn.ReLU(),
                nn.Dropout(p),
                nn.Linear(64, 32),
                nn.BatchNorm1d(32),
                nn.ReLU(),
                nn.Dropout(p),
                nn.Linear(32, n_classes),
            )

        def forward(self, x):
            return self.net(x)

    return ScentNet()


def _load_sklearn_backend(label_encoder):
    pipeline = joblib.load(PIPELINE_PATH)
    return _SklearnBackend(pipeline, label_encoder.classes_.tolist())


def _load_torch_backend():
    import torch
    preprocessor = joblib.load(SCENTNET_PRE_PATH)
    blob = torch.load(SCENTNET_WEIGHTS_PATH, map_location="cpu", weights_only=False)
    model = _build_scentnet(blob["arch"])
    model.load_state_dict(blob["state_dict"])
    return _TorchBackend(preprocessor, model, blob["class_names"])


def _load_backend():
    cfg = _read_production_config()
    kind = cfg.get("kind", "sklearn")
    label_encoder = joblib.load(ENCODER_PATH)

    if kind == "torch":
        try:
            return _load_torch_backend(), label_encoder
        except ImportError:
            print("production.json requests torch backend but PyTorch is not "
                  "installed; falling back to sklearn pipeline.joblib",
                  file=sys.stderr)
        except Exception as e:
            print(f"Failed to load PyTorch backend ({e}); "
                  "falling back to sklearn pipeline.joblib", file=sys.stderr)

    return _load_sklearn_backend(label_encoder), label_encoder


try:
    BACKEND, LABEL_ENCODER = _load_backend()
    print(f"TeleScent backend loaded ({BACKEND.kind})", file=sys.stderr)
except Exception as e:
    BACKEND = LABEL_ENCODER = None
    print(f"Could not load model: {e}", file=sys.stderr)


def predict_scent(sensor_reading: dict) -> dict:
    if BACKEND is None or LABEL_ENCODER is None:
        return _error_response("Model not loaded — run scent_classification.ipynb first.")

    try:
        row = pd.DataFrame([sensor_reading])
        pred_enc, proba = BACKEND.predict(row)

        class_names = BACKEND.classes
        pred_label = str(class_names[pred_enc])

        probs = {str(c): float(proba[i]) for i, c in enumerate(class_names)}
        top3 = sorted(
            [{"scent": s, "confidence": p} for s, p in probs.items()],
            key=lambda d: d["confidence"], reverse=True,
        )[:3]

        return {
            "predicted_scent":   pred_label,
            "confidence":        float(proba[pred_enc]),
            "top_predictions":   top3,
            "all_probabilities": probs,
            "backend":           BACKEND.kind,
        }

    except Exception as e:
        return _error_response(f"Prediction failed: {e}")


def main() -> None:
    try:
        sensor_reading = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps(_error_response(f"Invalid JSON input: {e}")))
        sys.exit(1)

    result = predict_scent(sensor_reading)
    print(json.dumps(result, indent=2))
    sys.exit(0 if "error" not in result else 1)


if __name__ == "__main__":
    main()
