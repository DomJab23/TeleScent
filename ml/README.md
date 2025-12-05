# TeleScent ML - Scent Detection Model

Machine learning model to detect scents from Arduino sensor readings.

## Overview

This module trains a Random Forest classifier to identify different scents based on 10 sensor features from the Arduino e-nose device.

### Sensor Features
- `temperature` - Temperature reading (°C)
- `humidity` - Humidity percentage (%)
- `pressure` - Atmospheric pressure (kPa)
- `gas` - Gas sensor resistance (kΩ)
- `voc_raw` - Raw VOC reading
- `nox_raw` - Raw NOx reading
- `no2` - NO2 concentration (ppb)
- `ethanol` - Ethanol concentration (ppm)
- `voc` - VOC index
- `co_h2` - CO/H2 concentration (ppm)

## Setup

### Install Dependencies

```bash
cd ml
pip install -r requirements.txt
```

## Usage

### Option 1: Jupyter Notebook (Recommended)

The complete workflow is in `scentdetection.ipynb`:

```bash
jupyter notebook scentdetection.ipynb
```

The notebook includes:
1. ✅ Data loading and exploration
2. ✅ Sample data generation (for testing)
3. ✅ Model training with Random Forest
4. ✅ Model evaluation and visualization
5. ✅ Prediction on Arduino sensor data
6. ✅ Model saving and deployment code

**Run all cells** to:
- Generate sample training data
- Train the model
- Evaluate performance
- Test predictions
- Save model artifacts to `ml/model/`

### Option 2: Python Scripts

#### Training

```bash
# Train with default data path (ml/data/sensor_readings.csv)
python train_model.py

# Train with custom data
python train_model.py --data /path/to/your/data.csv --out ./model
```

#### Prediction

Create `predict_scent.py` from the notebook (cell 11), then:

```bash
# Predict from command line
python predict_scent.py '{"temperature":24.18,"humidity":33.92,"pressure":100.95,"gas":1.15,"voc_raw":24218,"nox_raw":14243,"no2":788,"ethanol":913,"voc":889,"co_h2":513}'
```

## Master Dataset

The project includes `master_dataset1.csv` with **9,070 real sensor readings**:

- **12 scents**: apple, banana, coconut, coffee, grape, icecream, lavender, lemon, mango, melon, orange, pineapple
- **4 phases**: 
  - `baseline` - Initial state before scent (1,500 samples)
  - `exposure` - Scent getting stronger (4,440 samples)
  - `recovery` - Scent dissipating (2,997 samples)
  - `outside_protocol` - Additional measurements (132 samples)

See `DATASET_README.md` for detailed documentation.

### Dataset Format

```csv
sample_id,trial_number,scent_id,scent_name,phase,time_s,temp_C,humidity_pct,pressure_kPa,gas_bme,srawVoc,srawNox,NO2,ethanol,VOC_multichannel,COandH2
1,1,7,apple,baseline,0,23.48,32.58,100.94,113.87,30646,14583,223,371,394,855
1,1,7,apple,exposure,30.375,23.46,32.61,100.94,100.06,30763,14581,219,370,391,931
...
```

## Model Files

After training, these files are created in `ml/model/`:

- `scent_pipeline.joblib` - Complete ML pipeline (preprocessing + model)
- `label_encoder.joblib` - Encoder for scent labels
- `metrics.json` - Model performance metrics

## Integration with Backend

### Node.js Integration

```javascript
const { exec } = require('child_process');

function predictScent(sensorData) {
  return new Promise((resolve, reject) => {
    const cmd = `python ml/predict_scent.py '${JSON.stringify(sensorData)}'`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error);
      const prediction = JSON.parse(stdout);
      resolve(prediction);
    });
  });
}

// Usage in sensor-data route
router.post('/api/sensor-data', async (req, res) => {
  const sensorData = req.body;
  
  // Predict scent
  const prediction = await predictScent(sensorData);
  console.log(`Detected scent: ${prediction.scent} (${prediction.confidence}% confidence)`);
  
  // Store data with prediction
  // ... your storage logic
});
```

## Quick Start

1. **Open the notebook and train on master dataset**:
   ```bash
   cd ml
   jupyter notebook scentdetection.ipynb
   # Run all cells - will use master_dataset1.csv automatically
   ```

2. **Test prediction**:
   ```bash
   python predict_scent.py '{"temperature":24.18,"humidity":33.92,"pressure":100.95,"gas":1.15,"voc_raw":24218,"nox_raw":14243,"no2":788,"ethanol":913,"voc":889,"co_h2":513}'
   ```

3. **Integrate with backend** - The model is ready to classify live Arduino data

4. **Optional**: Add more data to `master_dataset1.csv` and retrain

## Model Performance

Check `ml/model/metrics.json` for:
- Overall accuracy across 12 scents
- Per-scent precision, recall, F1-score
- Confusion matrix
- Performance by phase (baseline/exposure/recovery)

Expected performance with master dataset: **85-95% accuracy**

Best performance during **exposure phase** when sensor response is strongest.

## Tips for Better Results

1. **Collect diverse data** - Multiple samples per scent in different conditions
2. **Balance classes** - Similar number of samples per scent
3. **Label consistently** - Use exact same labels for same scents
4. **Clean environment** - Let sensors stabilize between scent samples
5. **Baseline data** - Include "no_scent" class for ambient air

## Troubleshooting

**Import errors**: Install missing packages
```bash
pip install -r requirements.txt
```

**Model not found**: Run training first
```bash
python train_model.py
```

**Low accuracy**: 
- Collect more training data
- Ensure sensors are calibrated
- Check for overlapping scent profiles

## Next Steps

- Integrate prediction into backend API
- Deploy model to production
- Set up continuous model updates with new data
- Add confidence thresholds for uncertain predictions
