#!/usr/bin/env python3
"""
Simple prediction script that can be called from Node.js backend
Usage: python predict_scent.py '{"temperature":24.18,"humidity":33.92,...}'
"""
import sys
import json
import joblib
import pandas as pd
import numpy as np

FEATURES = [
    'temperature', 'humidity', 'pressure', 'gas',
    'voc_raw', 'nox_raw', 'no2', 'ethanol', 'voc', 'co_h2'
]

def predict(sensor_data):
    # Load model
    pipeline = joblib.load('ml/model/scent_pipeline.joblib')
    le = joblib.load('ml/model/label_encoder.joblib')

    # Prepare features
    features = {f: sensor_data.get(f, np.nan) for f in FEATURES}
    df = pd.DataFrame([features], columns=FEATURES)

    # Predict
    pred_enc = pipeline.predict(df)[0]
    pred_proba = pipeline.predict_proba(df)[0]
    pred_label = le.inverse_transform([pred_enc])[0]

    return {
        'scent': pred_label,
        'confidence': float(pred_proba[pred_enc]),
        'probabilities': {
            le.classes_[i]: float(p) for i, p in enumerate(pred_proba)
        }
    }

if __name__ == '__main__':
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
        result = predict(data)
        print(json.dumps(result))
    else:
        print('{"error": "No input provided"}')
