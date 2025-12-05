"""FastAPI service for smell detection using strong smell indicators.

Strong indicators: gas_bme, srawVoc, VOC_multichannel, COandH2, srawNox, NO2, ethanol

Run with:
  uvicorn serve:app --reload --port 8001

Test with:
  curl -X POST http://localhost:8001/predict \\
    -H "Content-Type: application/json" \\
    -d '{"gas_bme": 100, "srawVoc": 50, "VOC_multichannel": 200, "COandH2": 75, "srawNox": 40, "NO2": 60, "ethanol": 30, "time_s": 10, "phase": "baseline", "trial_number": 1}'
"""
from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
from pathlib import Path
import logging
import pandas as pd

app = FastAPI(
    title="Smell Detection API",
    description="Real-time scent classification using strong smell indicators"
)
log = logging.getLogger("smell_detector")

# Feature list
STRONG_INDICATORS = ['gas_bme', 'srawVoc', 'VOC_multichannel', 'COandH2', 'srawNox', 'NO2', 'ethanol']
SECONDARY_CONTEXT = ['time_s', 'phase', 'trial_number']
ALL_FEATURES = STRONG_INDICATORS + SECONDARY_CONTEXT


class SensorReading(BaseModel):
    """Sensor readings for prediction."""
    gas_bme: float
    srawVoc: float
    VOC_multichannel: float
    COandH2: float
    srawNox: float
    NO2: float
    ethanol: float
    time_s: float = 0.0
    phase: str = "baseline"
    trial_number: int = 0


class PredictionResponse(BaseModel):
    """Prediction response."""
    scent_id: int
    confidence: float
    strong_indicators_used: list


class BatchPredictionRequest(BaseModel):
    """Batch prediction request."""
    records: list  # List of dicts


@app.on_event('startup')
def load_model():
    """Load trained model on startup."""
    global model_pipeline
    model_pipeline = None
    
    models_dir = Path('models')
    model_file = models_dir / 'best_model.joblib'
    
    if model_file.exists():
        model_pipeline = joblib.load(model_file)
        log.info(f'Loaded model from {model_file}')
    else:
        log.warning(f'Model not found at {model_file}. Inference will not work.')


@app.get('/')
def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'service': 'Smell Detection API',
        'endpoints': ['/predict', '/batch-predict', '/info']
    }


@app.get('/info')
def info():
    """API information."""
    return {
        'strong_indicators': STRONG_INDICATORS,
        'secondary_context': SECONDARY_CONTEXT,
        'all_features': ALL_FEATURES,
        'model_loaded': model_pipeline is not None
    }


@app.post('/predict', response_model=PredictionResponse)
def predict(reading: SensorReading):
    """Make single prediction using strong smell indicators."""
    if model_pipeline is None:
        return {'error': 'Model not loaded'}
    
    # Prepare input
    data = pd.DataFrame([{
        'gas_bme': reading.gas_bme,
        'srawVoc': reading.srawVoc,
        'VOC_multichannel': reading.VOC_multichannel,
        'COandH2': reading.COandH2,
        'srawNox': reading.srawNox,
        'NO2': reading.NO2,
        'ethanol': reading.ethanol,
        'time_s': reading.time_s,
        'phase': reading.phase,
        'trial_number': reading.trial_number
    }])
    
    # Predict
    pred = model_pipeline.predict(data)[0]
    proba = model_pipeline.predict_proba(data)[0]
    conf = float(np.max(proba))
    
    return PredictionResponse(
        scent_id=int(pred),
        confidence=conf,
        strong_indicators_used=STRONG_INDICATORS
    )


@app.post('/batch-predict')
def batch_predict(request: BatchPredictionRequest):
    """Make batch predictions."""
    if model_pipeline is None:
        return {'error': 'Model not loaded'}
    
    try:
        df = pd.DataFrame(request.records)
        preds = model_pipeline.predict(df)
        return {
            'predictions': [int(p) for p in preds],
            'count': len(preds)
        }
    except Exception as e:
        return {'error': str(e)}
