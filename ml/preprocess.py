"""Preprocessing pipeline for smell detection using strong smell indicators.

Strong indicators (directly measure volatile chemicals):
  - gas_bme, srawVoc, VOC_multichannel, COandH2, srawNox, NO2, ethanol

Secondary context (modulate sensor response):
  - time_s, phase, trial_number
"""
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split
import joblib
import pandas as pd


# Feature definitions
STRONG_INDICATORS = ['gas_bme', 'srawVoc', 'VOC_multichannel', 'COandH2', 'srawNox', 'NO2', 'ethanol']
SECONDARY_CONTEXT = ['time_s', 'phase', 'trial_number']
ALL_FEATURES = STRONG_INDICATORS + SECONDARY_CONTEXT


def build_pipeline(numeric_cols, categorical_cols):
    """Build preprocessing pipeline with strong smell indicators."""
    num_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    cat_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    pre = ColumnTransformer([
        ('num', num_pipe, numeric_cols),
        ('cat', cat_pipe, categorical_cols)
    ], remainder='drop')
    return pre


def load_data_with_strong_indicators(data_path: str, test_size: float = 0.2):
    """Load data and select only strong smell indicator features."""
    df = pd.read_csv(data_path)
    
    # Select features
    feature_cols = [c for c in ALL_FEATURES if c in df.columns]
    X = df[feature_cols].copy()
    y = df['scent_id'].astype(int)
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    
    return X_train, X_test, y_train, y_test, feature_cols


def save_pipeline(pipe, path='ml/models/transformer.joblib'):
    joblib.dump(pipe, path)


def load_pipeline(path='ml/models/transformer.joblib'):
    return joblib.load(path)


if __name__ == '__main__':
    # Build and save pipeline from dataset
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True)
    args = p.parse_args()
    
    X_train, X_test, y_train, y_test, feature_cols = load_data_with_strong_indicators(args.data)
    
    print(f"Loaded {len(feature_cols)} strong indicator + context features:")
    print(f"  Strong Indicators: {STRONG_INDICATORS}")
    print(f"  Secondary Context: {SECONDARY_CONTEXT}")
    print(f"  Available features: {feature_cols}")
    
    numeric = [c for c in feature_cols if X_train[c].dtype in ['int64', 'float64']]
    categorical = [c for c in feature_cols if c not in numeric]
    
    print(f"\nNumeric: {numeric}")
    print(f"Categorical: {categorical}")
    
    pre = build_pipeline(numeric, categorical)
    save_pipeline(pre)
    print('\\nSaved transformer to ml/models/transformer.joblib')

