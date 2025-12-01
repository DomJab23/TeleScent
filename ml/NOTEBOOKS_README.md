# Smell Detection ML - Jupyter Notebooks Guide

## Overview

This folder contains three comprehensive Jupyter notebooks for smell/scent classification using multisensor environmental and gas data.

## Notebooks

### 1. **smell_detection_training.ipynb** — Main Training Pipeline
**Purpose**: End-to-end model training, evaluation, and comparison.

**Contents**:
- **Section 1**: Import libraries and dependencies
- **Section 2**: Load and explore data (EDA)
  - Dataset shape and distribution
  - Missing values check
  - Class balance analysis
  - Sensor feature distributions
- **Section 3**: Data preparation
  - Feature/target split
  - Feature type detection (numeric vs categorical)
  - Preprocessing pipeline (imputation, scaling, one-hot encoding)
  - Train/test split (stratified)
- **Section 4**: Model training with hyperparameter tuning
  - RandomForest model (with tuning)
  - HistGradientBoosting model (with tuning)
  - MLP Neural Network (with tuning)
  - Uses RandomizedSearchCV + 3-fold stratified cross-validation
- **Section 5**: Model evaluation
  - Accuracy, precision, recall, F1-score
  - Confusion matrices visualization
  - Model performance comparison
- **Section 6**: Feature importance (SHAP optional)
- **Section 7**: Save trained models to disk
- **Section 8**: Summary and recommendations

**Key Results**:
- HistGradientBoosting: **99.89% accuracy** (best model)
- RandomForest: 99.78% accuracy
- MLP: 99.72% accuracy

**How to run**:
```bash
jupyter notebook smell_detection_training.ipynb
# or
jupyter lab smell_detection_training.ipynb
```

**Time**: ~10-15 minutes (depends on hardware and iterations)

---

### 2. **feature_importance_analysis.ipynb** — Model Interpretability
**Purpose**: Understand which sensors and features drive predictions.

**Contents**:
- **Section 1**: Load trained models and data
- **Section 2**: Permutation importance analysis
  - Measures prediction performance drop when feature is shuffled
  - Identifies top 15 important features
  - Bar plots for visualization
- **Section 3**: SHAP (SHapley Additive exPlanations) analysis
  - Game-theoretic feature attribution
  - Global feature importance across test set
  - (Optional) Local SHAP values per prediction
- **Section 4**: Comparison of permutation vs SHAP rankings
- **Section 5**: Feature importance by sensor type
  - Gas sensors vs Environmental vs Temporal
  - Cumulative importance by group

**Key Insights**:
- **Most important**: Gas sensors (gas_bme, srawVoc, srawNox, NO2, ethanol)
- **Supporting**: Environmental factors (temp, humidity)
- **Context**: Temporal features (phase, time_s)

**How to run**:
```bash
jupyter notebook feature_importance_analysis.ipynb
```

**Prerequisites**:
- Trained models in `models/` folder
- (Optional) SHAP: `pip install shap`

**Time**: ~5-10 minutes

---

### 3. **inference_and_deployment.ipynb** — Real-time Predictions
**Purpose**: Use trained model for inference and API integration.

**Contents**:
- **Section 1**: Load saved model from disk
- **Section 2**: Load data and scent mapping (ID → name)
- **Section 3**: Batch prediction (6 samples)
  - Make predictions on new sensor data
  - Interpret predictions with scent names
  - Show confidence scores
- **Section 4**: Single sample real-time prediction
  - Example: predict from IoT sensor reading
- **Section 5**: JSON response formatting
  - API-ready prediction format
  - Confidence and probability distribution
- **Section 6**: FastAPI integration example
  - Code for deploying as REST API
  - Pydantic models for input validation
  - Example endpoint: `POST /predict`
- **Section 7**: Prediction logging and monitoring
  - Log predictions for drift detection
  - Track confidence distribution
- **Section 8**: Deployment best practices
  - Model versioning
  - Input validation
  - Error handling
  - Performance monitoring

**How to run**:
```bash
jupyter notebook inference_and_deployment.ipynb
```

**Dependencies**:
- Trained model: `models/histgradientboosting_model.joblib`
- Original data: `data/initial-smell-dataset.csv`

**Time**: ~5 minutes

---

## Quick Start

### Prerequisites
```bash
# Create venv and install dependencies
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell

# Install packages
pip install -r requirements.txt
```

### Run all notebooks in sequence
1. **Train**: `jupyter notebook smell_detection_training.ipynb`
   - Trains and saves models
   - Takes 10-15 min

2. **Interpret**: `jupyter notebook feature_importance_analysis.ipynb`
   - Analyzes feature importance
   - Takes 5-10 min

3. **Deploy**: `jupyter notebook inference_and_deployment.ipynb`
   - Tests inference
   - Takes 5 min

---

## File Structure

```
ml/
├── smell_detection_training.ipynb          # Main training notebook
├── feature_importance_analysis.ipynb       # Feature importance & SHAP
├── inference_and_deployment.ipynb          # Inference & API examples
├── train_and_eval.py                       # Original Python script (for reference)
├── serve.py                                # FastAPI server for deployment
├── models/                                 # Output folder
│   ├── rf_model.joblib                     # RandomForest model
│   ├── histgradientboosting_model.joblib   # HistGradientBoosting (best)
│   ├── mlp_model.joblib                    # MLP Neural Network
│   ├── confusion_*.png                     # Confusion matrix plots
│   └── training_report.txt                 # Performance metrics
├── data/
│   └── initial-smell-dataset.csv           # Input dataset (9069 samples, 12 scent classes)
├── requirements.txt                        # Base dependencies
├── requirements-extra.txt                  # Optional: SHAP, XGBoost
└── README.md                               # This file
```

---

## Key Features

### Preprocessing Pipeline
- **Numeric**: Median imputation → StandardScaler
- **Categorical**: Mode imputation → OneHotEncoder
- Handles unknown categories at inference time

### Model Selection
- **RandomForest**: 99.78% accuracy (good for feature importance)
- **HistGradientBoosting**: **99.89% accuracy** (best overall, fastest)
- **MLP**: 99.72% accuracy (robust to feature correlations)

### Evaluation Metrics
- Accuracy, Precision, Recall, F1-score (macro and weighted)
- Confusion matrices for all classes
- Per-class performance breakdown

### Feature Importance Methods
- **Permutation importance**: Model-agnostic feature shuffling
- **SHAP values**: Game-theoretic feature attribution (optional)

---

## Example Predictions

### Sample Output
```json
{
  "status": "success",
  "model": "HistGradientBoosting",
  "predictions": [
    {
      "sample_index": 0,
      "predicted_scent_id": 7,
      "predicted_scent_name": "apple",
      "phase": "exposure",
      "confidence": 0.9998
    }
  ]
}
```

---

## Deployment Options

### 1. **FastAPI Server** (Production)
```bash
uvicorn ml.serve:app --reload --port 8001
# POST http://localhost:8001/predict
```

### 2. **Batch Inference** (Offline)
```python
import joblib
import pandas as pd

model = joblib.load('ml/models/histgradientboosting_model.joblib')
data = pd.read_csv('new_sensor_data.csv')
predictions = model.predict(data)
```

### 3. **Embedded** (IoT)
- Save model to disk
- Load once at startup
- <100ms latency per prediction

---

## Monitoring & Maintenance

### Track These Metrics
- Prediction confidence (should be >0.90)
- Class distribution drift
- Sensor value ranges
- Latency per request

### Retrain When
- Accuracy drops >2% on validation set
- Sensor hardware changes/recalibrated
- New scent types added
- Quarterly (or per requirements)

### Logs to Collect
- Timestamp
- Input sensor values
- Predicted scent (ID + name)
- Prediction confidence
- Execution latency
- Errors/warnings

---

## Troubleshooting

### Issue: "FileNotFoundError: models/histgradientboosting_model.joblib"
**Solution**: Run `smell_detection_training.ipynb` first to train and save models.

### Issue: "ModuleNotFoundError: No module named 'shap'"
**Solution**: SHAP is optional. Install: `pip install shap`

### Issue: Low prediction confidence (<0.80)
**Solution**: 
- Check sensor calibration
- Verify input data matches training distribution
- Consider collecting more training data

### Issue: "Slow predictions (>500ms per sample)"
**Solution**:
- Batch predictions (vectorized)
- Use async endpoints
- Profile the preprocessing step

---

## References

- **Dataset**: 9,069 samples × 16 columns (12 scent classes)
- **Training time**: ~10-15 minutes (RandomizedSearchCV × 3 models)
- **Inference time**: ~1-5ms per sample
- **Model size**: 2.7 MB (HistGradientBoosting)

---

## Next Steps

1. ✅ Train models: `smell_detection_training.ipynb`
2. ✅ Analyze features: `feature_importance_analysis.ipynb`
3. ✅ Test inference: `inference_and_deployment.ipynb`
4. 🚀 Deploy API: `serve.py` (or FastAPI examples)
5. 📊 Monitor predictions: Add logging to `serve.py`

---

## Questions?

Refer to the detailed markdown cells and code comments in each notebook for explanations of each step.
