#!/usr/bin/env python3
"""
ML Inference Service for TeleScent
Loads trained scent detection model and provides predictions for real-time sensor data

NOTE: Run this from the ml/ directory or ensure PYTHONPATH includes ml/
NOTE: Requires: pandas, scikit-learn, joblib, numpy
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
        
        # Convert to dataset format - support both Arduino names AND dataset names
        features_dict = {}
        for dataset_name in FEATURES:
            # First try to get value directly (dataset column name)
            if dataset_name in sensor_reading:
                features_dict[dataset_name] = sensor_reading[dataset_name]
            else:
                # Try to find Arduino name that maps to this dataset name
                arduino_name = next((k for k, v in arduino_to_dataset.items() if v == dataset_name), None)
                if arduino_name and arduino_name in sensor_reading:
                    features_dict[dataset_name] = sensor_reading[arduino_name]
                else:
                    features_dict[dataset_name] = np.nan
        
        # Create dataframe with correct column order (must match FEATURES)
        features_df = pd.DataFrame([features_dict], columns=FEATURES)
        
        # Predict - pipeline returns string labels directly (no encoding needed)
        pred_label = pipeline.predict(features_df)[0]
        pred_proba = pipeline.predict_proba(features_df)[0]
        
        # Get class names from the pipeline classifier
        class_names = pipeline.named_steps['classifier'].classes_
        
        # Get probabilities for all classes
        class_probabilities = {
            class_names[i]: float(prob) 
            for i, prob in enumerate(pred_proba)
        }
        
        # Sort by probability and get top 3
        sorted_probs = sorted(class_probabilities.items(), key=lambda x: x[1], reverse=True)
        top_3 = dict(sorted_probs[:3])
        
        # Get confidence for the predicted class
        pred_index = list(class_names).index(pred_label)
        confidence = float(pred_proba[pred_index])
        
        # Model now includes 'no_scent' as a trained class!
        # No need for confidence threshold - model will predict 'no_scent' when appropriate
        return {
            'predicted_scent': pred_label,
            'confidence': confidence,
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
