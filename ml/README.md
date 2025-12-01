# ML Module - Scent/Smell Classification

Machine-learning models for real-time scent detection using **strong smell indicators** (gas and VOC sensors).

**Model Approach**: Evidence-based feature selection using gas and VOC channels that directly measure volatile chemicals. This approach is grounded in electronic-nose literature, where these sensors are recognized as critical inputs for odor classification.

**Primary Interface**: Jupyter Notebooks (recommended for exploration)  
**Alternative**: Python scripts (for automation and CI/CD)

## Strong Smell Indicators (Features Used)

These features directly measure volatile chemicals and form the basis for predictions:

| Feature | Description | Importance |
|---------|-------------|-----------|
| `gas_bme` | Combined gas signal from Bosch-style sensor | Broad odor response |
| `srawVoc` | Raw VOC reading | Primary smell marker |
| `VOC_multichannel` | Multi-channel VOC pattern | Odor fingerprint |
| `COandH2` | Carbon monoxide & hydrogen | Combustion/smoke odors |
| `srawNox` | Nitrogen oxides | Exhaust/pollution smells |
| `NO2` | Nitrogen dioxide | Exhaust/pollution smells |
| `ethanol` | Ethanol concentration | Alcohol/solvent/fermentation |
| `time_s` | Measurement time | Dynamic response (secondary) |
| `phase` | Experimental phase | Exposure stage (secondary) |
| `trial_number` | Trial batch | Batch effects (secondary) |

**Excluded Features**: `pressure_kPa`, `temp_C`, `humidity_pct` (calibration-related, not smell determinants)

## Structure

### Jupyter Notebooks (Interactive - Recommended)
- `smell_detection_training.ipynb` - End-to-end training (EDA, preprocessing, tuning, evaluation)
- `feature_importance_analysis.ipynb` - Feature importance (permutation & SHAP)
- `inference_and_deployment.ipynb` - Real-time predictions & API examples
- `NOTEBOOKS_README.md` - Comprehensive guide for all notebooks

### Python Scripts
- `train_and_eval.py` - Comprehensive training with model comparison (strong indicators only)
- `serve.py` - FastAPI server for real-time inference
- `explore.py` - EDA focusing on strong smell indicators
- `preprocess.py` - Feature selection and preprocessing
- `train.py` - Simple training script using strong indicators
- `evaluate.py` - Model evaluation on test set
- `requirements.txt` - Python dependencies

### Data & Models
- `data/` - datasets (e.g., `initial-smell-dataset.csv`)
- `models/` - saved model artifacts (.joblib files)

## Quick Start

### Setup
```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Using Jupyter Notebooks (Recommended)
```powershell
jupyter notebook
```

Then open and run in sequence:
1. **smell_detection_training.ipynb** - Trains all models using strong indicators (~10-15 min)
2. **feature_importance_analysis.ipynb** - Analyzes feature importance (~5-10 min)
3. **inference_and_deployment.ipynb** - Tests real-time inference (~5 min)

See **NOTEBOOKS_README.md** for detailed guidance.

### Using Python Scripts
```powershell
# Explore dataset (focus on strong indicators)
python explore.py --data data/initial-smell-dataset.csv

# Train and evaluate
python train_and_eval.py --data data/initial-smell-dataset.csv

# Run FastAPI server for live predictions
uvicorn serve:app --reload --port 8001
```

Then POST to `http://localhost:8001/predict` with JSON sensor data.

## Performance

- **Best Model**: HistGradientBoosting (99.89% accuracy)
- **Training Data**: 9,069 samples, 12 scent classes (balanced)
- **Features**: 7 strong indicators + 3 secondary context features
- **All Models**: >99.7% accuracy on hold-out test set

## API Example

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "gas_bme": 100,
    "srawVoc": 50,
    "VOC_multichannel": 200,
    "COandH2": 75,
    "srawNox": 40,
    "NO2": 60,
    "ethanol": 30,
    "time_s": 10,
    "phase": "exposure",
    "trial_number": 1
  }'
```

Response:
```json
{
  "scent_id": 3,
  "confidence": 0.9987,
  "strong_indicators_used": ["gas_bme", "srawVoc", "VOC_multichannel", "COandH2", "srawNox", "NO2", "ethanol"]
}
```

## References

- Electronic-nose and gas-sensor literature: VOC and gas channels are critical inputs for odor classification
- Scikit-learn, FastAPI, pandas, joblib for implementation
- SHAP for feature interpretation (optional)