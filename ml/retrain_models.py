#!/usr/bin/env python3
"""
Retrain and re-save all TeleScent ML models using the current scikit-learn version.
Run this whenever scikit-learn is upgraded to avoid version-mismatch errors.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score

print(f"scikit-learn version: {sklearn.__version__}")

DATA_FILE   = Path(__file__).parent / 'NATURAL_ML_Data_with_no_scent.xlsx'
MODEL_DIR   = Path(__file__).parent / 'model'
MODEL_DIR.mkdir(exist_ok=True)

RANDOM_STATE    = 42
TEST_SIZE       = 0.2
N_ESTIMATORS    = 100
MAX_DEPTH       = 20
BASE_FEATURES   = ['srawVoc', 'srawNox', 'NO2', 'ethanol', 'VOC_multichannel', 'COandH2']
FEATURES_SIMPLE = ['VOC_multichannel', 'NO2']
TARGET          = 'scent_name'


def engineer_features(raw_df):
    """Mirror the exact feature engineering in serve.py."""
    X = raw_df.copy()
    # VOC ratios
    X['voc_ratio']         = raw_df['VOC_multichannel'] / (raw_df['srawVoc'] + 1)
    X['ethanol_voc_ratio'] = raw_df['ethanol'] / (raw_df['VOC_multichannel'] + 1)
    X['voc_balance']       = (raw_df['VOC_multichannel'] - raw_df['ethanol']) / (raw_df['VOC_multichannel'] + raw_df['ethanol'] + 1)
    # NOx indicators
    X['nox_intensity'] = raw_df['NO2'] / (raw_df['srawNox'] + 1)
    X['nox_balance']   = (raw_df['NO2'] - raw_df['srawNox'] / 100) / (raw_df['NO2'] + raw_df['srawNox'] / 100 + 1)
    # Gas interactions
    X['voc_no2_interaction'] = raw_df['VOC_multichannel'] * raw_df['NO2'] / 1000
    X['ethanol_no2_ratio']   = raw_df['ethanol'] / (raw_df['NO2'] + 1)
    X['co_voc_ratio']        = raw_df['COandH2'] / (raw_df['VOC_multichannel'] + 1)
    # Chemical complexity
    X['total_voc_intensity'] = raw_df['VOC_multichannel'] + raw_df['ethanol'] + raw_df['srawVoc'] / 100
    X['chemical_diversity']  = raw_df[['NO2', 'ethanol', 'VOC_multichannel', 'COandH2']].std(axis=1)
    X['gas_dominance']       = raw_df[['NO2', 'ethanol', 'VOC_multichannel', 'COandH2']].max(axis=1) / \
                               (raw_df[['NO2', 'ethanol', 'VOC_multichannel', 'COandH2']].mean(axis=1) + 1)
    # Normalised raw sensors
    X['srawVoc_normalized'] = (raw_df['srawVoc'] - 30000) / 5001
    X['srawNox_normalized'] = (raw_df['srawNox'] - 25000) / 3001
    # Replace inf
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    return X


# ── Load data ────────────────────────────────────────────────────────────────
print(f"\n📖 Loading {DATA_FILE.name}…")
df = pd.read_excel(DATA_FILE)
print(f"   {len(df)} rows — classes: {sorted(df[TARGET].unique())}")

raw_X = df[BASE_FEATURES].apply(pd.to_numeric, errors='coerce')
X = engineer_features(raw_X)
print(f"   Feature count after engineering: {X.shape[1]}")
y = df[TARGET].copy()

label_encoder = LabelEncoder()
y_enc = label_encoder.fit_transform(y)

X_tr, X_te, y_tr, y_te = train_test_split(
    X, y_enc, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_enc
)

# ── Full 6-sensor pipeline ───────────────────────────────────────────────────
print("\n🌲 Training full 6-sensor pipeline…")
pipeline = Pipeline([
    ('imputer',    SimpleImputer(strategy='mean')),
    ('scaler',     StandardScaler()),
    ('classifier', RandomForestClassifier(
        n_estimators=N_ESTIMATORS, max_depth=MAX_DEPTH,
        random_state=RANDOM_STATE, n_jobs=-1,
    )),
])
pipeline.fit(X_tr, y_tr)

train_acc = accuracy_score(y_tr, pipeline.predict(X_tr))
test_acc  = accuracy_score(y_te, pipeline.predict(X_te))
cv        = cross_val_score(pipeline, X_tr, y_tr, cv=5, scoring='accuracy', n_jobs=-1)
print(f"   Train {train_acc:.4f}  Test {test_acc:.4f}  CV {cv.mean():.4f}±{cv.std():.4f}")

joblib.dump(pipeline,      MODEL_DIR / 'scent_pipeline.joblib')
joblib.dump(pipeline,      MODEL_DIR / 'scent_pipeline_best.joblib')
joblib.dump(label_encoder, MODEL_DIR / 'label_encoder.joblib')
joblib.dump(label_encoder, MODEL_DIR / 'label_encoder_best.joblib')
print("   ✅ scent_pipeline.joblib + label_encoder.joblib saved")

meta = {
    'model_type': 'RandomForestClassifier',
    'sklearn_version': sklearn.__version__,
    'n_estimators': N_ESTIMATORS, 'max_depth': MAX_DEPTH,
    'features': list(X.columns), 'target_column': TARGET,
    'classes': label_encoder.classes_.tolist(),
    'train_accuracy': float(train_acc), 'test_accuracy': float(test_acc),
    'cv_mean_accuracy': float(cv.mean()), 'cv_std_accuracy': float(cv.std()),
    'training_samples': len(X_tr), 'test_samples': len(X_te),
    'dataset': DATA_FILE.name,
}
(MODEL_DIR / 'model_metadata.json').write_text(json.dumps(meta, indent=2))
(MODEL_DIR / 'best_model_metadata.json').write_text(json.dumps({**meta, 'best_algorithm': 'Random Forest'}, indent=2))

# ── Simple 2-sensor model ────────────────────────────────────────────────────
print("\n🌿 Training simplified 2-sensor model (VOC + NO2)…")
X_s  = df[FEATURES_SIMPLE].apply(pd.to_numeric, errors='coerce')
s_enc = LabelEncoder()
y_s  = s_enc.fit_transform(y)

Xs_tr, Xs_te, ys_tr, ys_te = train_test_split(
    X_s, y_s, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_s
)
simple_model = RandomForestClassifier(
    n_estimators=200, max_depth=15, min_samples_split=5, min_samples_leaf=2,
    random_state=RANDOM_STATE, class_weight='balanced',
)
simple_model.fit(Xs_tr, ys_tr)
print(f"   Test accuracy: {accuracy_score(ys_te, simple_model.predict(Xs_te)):.4f}")

joblib.dump(simple_model, MODEL_DIR / 'simple_2sensor_model.joblib')
joblib.dump(s_enc,        MODEL_DIR / 'simple_2sensor_encoder.joblib')
print("   ✅ simple_2sensor_model.joblib + simple_2sensor_encoder.joblib saved")

print(f"\n🎉 Done — all models compatible with scikit-learn {sklearn.__version__}")
