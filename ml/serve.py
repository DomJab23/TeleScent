#!/home/klaus/TeleScent/.venv/bin/python3
"""
ML Inference Service for TeleScent
Loads trained scent detection model and provides predictions for real-time sensor data

NOTE: Run this from the ml/ directory or ensure PYTHONPATH includes ml/
NOTE: Uses virtual environment at /home/klaus/TeleScent/.venv
"""

import sys
import json
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
    import pandas as pd
    import joblib
    from pathlib import Path
except ImportError as e:
    # If dependencies not installed, return error message
    print(json.dumps({
        'error': f'Missing Python dependency: {e}. Please install: pip install pandas scikit-learn joblib numpy',
        'predicted_scent': 'error',
        'confidence': 0.0
    }), file=sys.stdout)
    sys.exit(1)

# Model directory
MODEL_DIR = Path(__file__).parent / 'model'
PIPELINE_PATH = MODEL_DIR / 'scent_pipeline.joblib'
ENCODER_PATH = MODEL_DIR / 'label_encoder.joblib'

# Feature configuration (6 chemical sensors only - no temp/humidity/pressure)
FEATURES = ['gas_bme', 'srawVoc', 'srawNox', 'NO2', 'ethanol', 'VOC_multichannel', 'COandH2']

# Load models at startup
try:
    pipeline = joblib.load(PIPELINE_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    print("✅ ML models loaded successfully", file=sys.stderr)
except Exception as e:
    print(f"❌ Error loading models: {e}", file=sys.stderr)
    pipeline = None
    label_encoder = None


def predict_scent(sensor_reading):
    """
    Predict scent from sensor reading (Arduino format)
    Uses ONLY chemical sensors, ignores environmental variables
    
    Args:
        sensor_reading: dict with Arduino sensor field names
    
    Returns:
        dict with prediction results
    """
    if pipeline is None or label_encoder is None:
        return {
            'error': 'ML models not loaded',
            'predicted_scent': 'unknown',
            'confidence': 0.0
        }
    
    try:
        # Map Arduino field names to dataset column names
        # ONLY chemical sensors - environmental variables excluded
        arduino_to_dataset = {
            # 'temperature': 'temp_C',        # EXCLUDED - environmental
            # 'humidity': 'humidity_pct',     # EXCLUDED - environmental
            # 'pressure': 'pressure_kPa',     # EXCLUDED - environmental
            'gas': 'gas_bme',                 # Chemical sensor
            'voc_raw': 'srawVoc',             # Chemical sensor (important)
            'nox_raw': 'srawNox',             # Chemical sensor
            'no2': 'NO2',                     # Chemical sensor
            'ethanol': 'ethanol',             # Chemical sensor (important)
            'voc': 'VOC_multichannel',        # Chemical sensor
            'co_h2': 'COandH2'                # Chemical sensor
        }
        
        # Convert Arduino format to dataset format
        features_dict = {}
        for arduino_name, dataset_name in arduino_to_dataset.items():
            features_dict[dataset_name] = sensor_reading.get(arduino_name, np.nan)
        
        # Create dataframe with correct column order (must match FEATURES)
        features_df = pd.DataFrame([features_dict], columns=FEATURES)
        
        # Predict
        pred_encoded = pipeline.predict(features_df)[0]
        pred_proba = pipeline.predict_proba(features_df)[0]
        
        # Decode prediction
        pred_label = label_encoder.inverse_transform([pred_encoded])[0]
        
        # Get probabilities for all classes (top 3)
        class_probabilities = {
            label_encoder.classes_[i]: float(prob) 
            for i, prob in enumerate(pred_proba)
        }
        
        # Sort by probability and get top 3
        sorted_probs = sorted(class_probabilities.items(), key=lambda x: x[1], reverse=True)
        top_3 = dict(sorted_probs[:3])
        
        return {
            'predicted_scent': pred_label,
            'confidence': float(pred_proba[pred_encoded]),
            'top_predictions': top_3,
            'all_probabilities': class_probabilities,
            'features_used': features_dict
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'predicted_scent': 'error',
            'confidence': 0.0
        }


def main():
    """
    Command-line interface for predictions
    Reads JSON from stdin, outputs prediction to stdout
    """
    try:
        # Read input JSON from stdin
        input_data = sys.stdin.read()
        sensor_reading = json.loads(input_data)
        
        # Make prediction
        result = predict_scent(sensor_reading)
        
        # Output JSON to stdout
        print(json.dumps(result, indent=2))
        
        # Exit with success
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        error_result = {
            'error': f'Invalid JSON input: {e}',
            'predicted_scent': 'error',
            'confidence': 0.0
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            'error': f'Prediction failed: {e}',
            'predicted_scent': 'error',
            'confidence': 0.0
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()
