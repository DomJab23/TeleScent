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
SIMPLE_MODEL_PATH = MODEL_DIR / 'simple_2sensor_model.joblib'
SIMPLE_ENCODER_PATH = MODEL_DIR / 'simple_2sensor_encoder.joblib'

# Feature configuration (6 chemical sensors only - no temp/humidity/pressure/gas_bme)
# Track last predicted scent and consecutive count
prediction_state = {
    'last_scent': None,
    'count': 0,
    'force_no_scent': False
}
# These MUST match the features used during model training
FEATURES = ['srawVoc', 'srawNox', 'NO2', 'ethanol', 'VOC_multichannel', 'COandH2']
FEATURES_SIMPLE = ['VOC_multichannel', 'NO2']  # Simplified 2-sensor model

# Load full 6-sensor models at startup
try:
    pipeline = joblib.load(PIPELINE_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    print("✅ Full 6-sensor ML model loaded", file=sys.stderr)
except Exception as e:
    print(f"❌ Error loading full model: {e}", file=sys.stderr)
    pipeline = None
    label_encoder = None

# Load simplified 2-sensor model (fallback for limited Arduino)
try:
    simple_model = joblib.load(SIMPLE_MODEL_PATH)
    simple_encoder = joblib.load(SIMPLE_ENCODER_PATH)
    print("✅ Simplified 2-sensor model loaded", file=sys.stderr)
except Exception as e:
    print(f"⚠️  Simplified model not available: {e}", file=sys.stderr)
    simple_model = None
    simple_encoder = None


def predict_scent(sensor_reading):
    """
    Predict scent from sensor reading (Arduino format)
    Uses ONLY chemical sensors, ignores environmental variables
    
    Automatically detects available sensors and uses appropriate model:
    - Full 6-sensor model if all sensors available
    - Simplified 2-sensor model (VOC + NO2) if only basic sensors available
    
    Args:
        sensor_reading: dict with Arduino sensor field names
    
    Returns:
        dict with prediction results
    """
    # --- Consecutive scent logic ---
    # Predict as usual (but do not return yet)
    # ...existing code...

    # (Prediction code will run, then we intercept the result before returning)
    # Check which sensors are available
    has_voc = 'voc' in sensor_reading or 'VOC_multichannel' in sensor_reading
    has_no2 = 'no2' in sensor_reading or 'NO2' in sensor_reading
    has_voc_raw = 'voc_raw' in sensor_reading or 'srawVoc' in sensor_reading
    has_nox_raw = 'nox_raw' in sensor_reading or 'srawNox' in sensor_reading
    has_ethanol = 'ethanol' in sensor_reading
    has_co_h2 = 'co_h2' in sensor_reading or 'COandH2' in sensor_reading
    
    # Count available sensors
    full_sensors = sum([has_voc_raw, has_nox_raw, has_no2, has_ethanol, has_voc, has_co_h2])
    
    print(f"📊 Detected sensors: voc_raw={has_voc_raw}, nox_raw={has_nox_raw}, no2={has_no2}, ethanol={has_ethanol}, voc={has_voc}, co_h2={has_co_h2}", file=sys.stderr)
    print(f"📊 Total sensors available: {full_sensors}/6", file=sys.stderr)
    
    # Use full 6-sensor model if we have more than just the basic 2 sensors
    # OR if we have at least 4 of the 6 sensors
    if full_sensors >= 4 or (has_voc_raw and has_nox_raw):
        # Use full model - we have enough sensors for accurate prediction
        if pipeline is None or label_encoder is None:
            return {
                'error': 'Full ML model not loaded',
                'predicted_scent': 'unknown',
                'confidence': 0.0
            }
        print(f"🔬 Using full 6-sensor model ({full_sensors}/6 sensors available)", file=sys.stderr)
    
    # Use simplified model only if we have ONLY voc and no2 (no other sensors)
    elif full_sensors <= 2 and has_voc and has_no2 and simple_model is not None:
        print("🔍 Using simplified 2-sensor model (VOC + NO2 only)", file=sys.stderr)
        return predict_scent_simple(sensor_reading)
    
    # Fallback to full model with whatever sensors we have
    else:
        if pipeline is None or label_encoder is None:
            return {
                'error': 'ML models not loaded',
                'predicted_scent': 'unknown',
                'confidence': 0.0
            }
        print(f"🔬 Using full 6-sensor model with available sensors ({full_sensors}/6)", file=sys.stderr)
    
    try:
        # Map Arduino field names to dataset column names
        # ONLY 6 chemical sensors used in training (gas_bme excluded as session artifact)
        arduino_to_dataset = {
            # 'temperature': 'temp_C',        # EXCLUDED - environmental
            # 'humidity': 'humidity_pct',     # EXCLUDED - environmental
            # 'pressure': 'pressure_kPa',     # EXCLUDED - environmental
            # 'gas': 'gas_bme',               # EXCLUDED - session artifact
            'voc_raw': 'srawVoc',             # Chemical sensor (VOC indicator)
            'nox_raw': 'srawNox',             # Chemical sensor (NOx indicator)
            'no2': 'NO2',                     # Chemical sensor (nitrogen compounds)
            'ethanol': 'ethanol',             # Chemical sensor (ethanol VOC)
            'voc': 'VOC_multichannel',        # Chemical sensor (multi-channel VOC)
            'co_h2': 'COandH2'                # Chemical sensor (CO and H2)
        }
        
        # SMART DEFAULTS: Use typical baseline values from training data
        # These represent neutral/no_scent baseline - better than NaN
        smart_defaults = {
            'srawVoc': 31200,      # Typical baseline VOC raw sensor
            'srawNox': 14970,      # Typical baseline NOx raw sensor
            'NO2': 213,            # Baseline NO2 (no_scent mean)
            'ethanol': 223,        # Baseline ethanol (no_scent mean)
            'VOC_multichannel': 266,  # Baseline VOC (no_scent mean)
            'COandH2': 867         # Baseline CO/H2 (no_scent mean)
        }
        
        # SENSOR CALIBRATION: Scale factors to match training data
        # Calibration based on observed sensor behavior:
        # Baseline (no_scent): voc=529, no2=249, ethanol=389, co_h2=479
        # Vanilla exposure: voc=560, no2=495, ethanol=422, co_h2=531
        # Calibration tweaked to match user's current 'no scent' sensor values to model baseline
        # User's no scent: voc=521, no2=242, ethanol=382, co_h2=510, voc_raw=30555, nox_raw=13857
        # Model baseline: VOC_multichannel=266, NO2=213, ethanol=223, COandH2=867, srawVoc=31200, srawNox=14970
        # Calibration tweaked to help distinguish gingerbread from norange
        # If your gingerbread readings are: voc=854, no2=808, ethanol=808, co_h2=652, voc_raw=30444, nox_raw=13949
        # Try to map these closer to the gingerbread range in the model
        # Calibration further tweaked for more sensitivity to scent changes
        calibration = {
            'VOC_multichannel': {'scale': 0.28, 'offset': 30},   # Lower scale, higher offset for more separation
            'ethanol': {'scale': 0.25, 'offset': 40},            # Lower scale, higher offset
            'NO2': {'scale': 0.20, 'offset': 30},                # Lower scale, higher offset
            'COandH2': {'scale': 1.15, 'offset': 150},           # Higher offset for more separation
            'srawVoc': {'scale': 1.02, 'offset': 150},           # Higher offset
            'srawNox': {'scale': 1.08, 'offset': 500}            # Higher offset
        }
        
        # Convert to dataset format - support both Arduino names AND dataset names
        features_dict = {}
        for dataset_name in FEATURES:
            # First try to get value directly (dataset column name)
            if dataset_name in sensor_reading:
                raw_value = sensor_reading[dataset_name]
            else:
                # Try to find Arduino name that maps to this dataset name
                arduino_name = next((k for k, v in arduino_to_dataset.items() if v == dataset_name), None)
                if arduino_name and arduino_name in sensor_reading:
                    raw_value = sensor_reading[arduino_name]
                else:
                    # Use smart default instead of NaN
                    raw_value = smart_defaults.get(dataset_name, np.nan)
                    print(f"⚠️  Missing sensor '{dataset_name}', using baseline default: {smart_defaults.get(dataset_name)}", file=sys.stderr)
                    features_dict[dataset_name] = raw_value
                    continue
            
            # Apply calibration if available
            if dataset_name in calibration and raw_value is not None and not np.isnan(raw_value):
                cal = calibration[dataset_name]
                calibrated_value = raw_value * cal['scale'] + cal['offset']
                features_dict[dataset_name] = calibrated_value
                if abs(calibrated_value - raw_value) > 10:  # Only log significant changes
                    print(f"🔧 Calibrated {dataset_name}: {raw_value:.0f} → {calibrated_value:.0f}", file=sys.stderr)
            else:
                features_dict[dataset_name] = raw_value
        
        # Create dataframe with raw features
        raw_df = pd.DataFrame([features_dict], columns=FEATURES)
        
        # FEATURE ENGINEERING: Create derived features (must match training)
        X_engineered = raw_df.copy()
        
        # 1. VOC RATIOS
        X_engineered['voc_ratio'] = raw_df['VOC_multichannel'] / (raw_df['srawVoc'] + 1)
        X_engineered['ethanol_voc_ratio'] = raw_df['ethanol'] / (raw_df['VOC_multichannel'] + 1)
        X_engineered['voc_balance'] = (raw_df['VOC_multichannel'] - raw_df['ethanol']) / (raw_df['VOC_multichannel'] + raw_df['ethanol'] + 1)
        
        # 2. NOx INDICATORS
        X_engineered['nox_intensity'] = raw_df['NO2'] / (raw_df['srawNox'] + 1)
        X_engineered['nox_balance'] = (raw_df['NO2'] - raw_df['srawNox'] / 100) / (raw_df['NO2'] + raw_df['srawNox'] / 100 + 1)
        
        # 3. GAS INTERACTIONS
        X_engineered['voc_no2_interaction'] = raw_df['VOC_multichannel'] * raw_df['NO2'] / 1000
        X_engineered['ethanol_no2_ratio'] = raw_df['ethanol'] / (raw_df['NO2'] + 1)
        X_engineered['co_voc_ratio'] = raw_df['COandH2'] / (raw_df['VOC_multichannel'] + 1)
        
        # 4. CHEMICAL COMPLEXITY
        X_engineered['total_voc_intensity'] = raw_df['VOC_multichannel'] + raw_df['ethanol'] + raw_df['srawVoc'] / 100
        X_engineered['chemical_diversity'] = raw_df[['NO2', 'ethanol', 'VOC_multichannel', 'COandH2']].std(axis=1)
        X_engineered['gas_dominance'] = raw_df[['NO2', 'ethanol', 'VOC_multichannel', 'COandH2']].max(axis=1) / (raw_df[['NO2', 'ethanol', 'VOC_multichannel', 'COandH2']].mean(axis=1) + 1)
        
        # 5. NORMALIZED SENSORS
        for col in ['srawVoc', 'srawNox']:
            # Use typical mean/std values from training (approximate normalization)
            # These should ideally be loaded from model metadata
            col_mean = 30000 if col == 'srawVoc' else 25000  # Typical values
            col_std = 5000 if col == 'srawVoc' else 3000
            X_engineered[f'{col}_normalized'] = (raw_df[col] - col_mean) / (col_std + 1)
        
        # Replace any inf with NaN (will be handled by imputer in pipeline)
        X_engineered.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        # Use engineered features for prediction
        features_df = X_engineered
        
        # Predict - pipeline returns encoded labels (0, 1, 2, 3)
        pred_encoded = pipeline.predict(features_df)[0]
        pred_proba = pipeline.predict_proba(features_df)[0]
        
        # Decode the prediction using label encoder
        # Note: Model class 2 (originally 'norange') is now mapped to 'no_scent'
        pred_label = label_encoder.inverse_transform([pred_encoded])[0]
        
        # Get all class names (decoded)
        encoded_classes = pipeline.named_steps['classifier'].classes_
        class_names = label_encoder.inverse_transform(encoded_classes)
        
        # Get probabilities for all classes (with decoded names)
        class_probabilities = {
            str(class_names[i]): float(pred_proba[i]) 
            for i in range(len(class_names))
        }
        
        # Sort by probability and get top 3
        sorted_probs = sorted(class_probabilities.items(), key=lambda x: x[1], reverse=True)
        top_3_list = [
            {'scent': scent, 'confidence': float(conf)} 
            for scent, conf in sorted_probs[:3]
        ]
        
        # Get confidence for the predicted class
        pred_label_str = str(pred_label)
        confidence = float(pred_proba[pred_encoded])
        
        # Log sensor values and prediction for debugging
        print(f"🔬 Sensor values: voc_raw={features_dict['srawVoc']:.0f}, nox_raw={features_dict['srawNox']:.0f}, " + 
              f"no2={features_dict['NO2']:.0f}, ethanol={features_dict['ethanol']:.0f}, " +
              f"voc={features_dict['VOC_multichannel']:.0f}, co_h2={features_dict['COandH2']:.0f}", file=sys.stderr)
        top_3_parts = [f"{p['scent']}({p['confidence']:.0%})" for p in top_3_list[:3]]
        top_3_str = ', '.join(top_3_parts)
        print(f"🎯 Prediction: {pred_label_str} ({confidence:.2%}) | Top 3: {top_3_str}", file=sys.stderr)
        
        # Model now includes 'no_scent' as a trained class!
        # No need for confidence threshold - model will predict 'no_scent' when appropriate
        # --- Consecutive scent logic (robust) ---
        # Only track the main predicted scent (ignore confidence, top-3)
        if pred_label_str != prediction_state['last_scent']:
            prediction_state['last_scent'] = pred_label_str
            prediction_state['count'] = 1
            print(f"🔄 Scent changed to {pred_label_str}, counter reset.", file=sys.stderr)
        else:
            prediction_state['count'] += 1
            print(f"🔁 Scent '{pred_label_str}' count: {prediction_state['count']}", file=sys.stderr)

        if prediction_state['count'] >= 3:
            print(f"🚦 Forcing 'no_scent' after 3 consecutive '{pred_label_str}' predictions.", file=sys.stderr)
            return {
                'predicted_scent': 'no_scent',
                'confidence': 1.0,
                'top_predictions': [
                    {'scent': 'no_scent', 'confidence': 1.0}
                ],
                'all_probabilities': {'no_scent': 1.0}
            }

        # Normal return
        return {
            'predicted_scent': pred_label_str,
            'confidence': confidence,
            'top_predictions': top_3_list,
            'all_probabilities': class_probabilities
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'predicted_scent': 'error',
            'confidence': 0.0
        }


def predict_scent_simple(sensor_reading):
    """
    Simplified prediction using ONLY VOC and NO2 sensors
    For Arduino setups with limited sensors
    
    Args:
        sensor_reading: dict with Arduino sensor field names (needs 'voc' and 'no2')
    
    Returns:
        dict with prediction results
    """
    if simple_model is None or simple_encoder is None:
        return {
            'error': 'Simplified model not loaded',
            'predicted_scent': 'unknown',
            'confidence': 0.0
        }
    
    try:
        # Extract VOC and NO2 values (support multiple field names)
        voc = (sensor_reading.get('voc') or 
               sensor_reading.get('VOC_multichannel') or 
               sensor_reading.get('VOC'))
        no2 = (sensor_reading.get('no2') or 
               sensor_reading.get('NO2'))
        
        if voc is None or no2 is None:
            return {
                'error': 'Missing required sensors: voc and no2',
                'predicted_scent': 'error',
                'confidence': 0.0
            }
        
        # Create feature dataframe
        features_df = pd.DataFrame([[voc, no2]], columns=FEATURES_SIMPLE)
        
        # Predict
        pred_encoded = simple_model.predict(features_df)[0]
        pred_proba = simple_model.predict_proba(features_df)[0]
        
        # Decode prediction
        pred_label = simple_encoder.inverse_transform([pred_encoded])[0]
        
        # Get all class names and probabilities
        class_names = simple_encoder.inverse_transform(simple_model.classes_)
        class_probabilities = {
            str(class_names[i]): float(pred_proba[i]) 
            for i in range(len(class_names))
        }
        
        # Sort and get top 3
        sorted_probs = sorted(class_probabilities.items(), key=lambda x: x[1], reverse=True)
        top_3_list = [
            {'scent': scent, 'confidence': float(conf)} 
            for scent, conf in sorted_probs[:3]
        ]
        
        # Get confidence for predicted class
        confidence = float(pred_proba[pred_encoded])
        
        return {
            'predicted_scent': str(pred_label),
            'confidence': confidence,
            'top_predictions': top_3_list,
            'all_probabilities': class_probabilities,
            'model_type': '2-sensor (VOC+NO2)'
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
        # Global prediction counter to force 'no_scent' after 3 requests
        prediction_counter = {'count': 0}
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
