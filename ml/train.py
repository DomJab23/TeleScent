"""Train smell detection model using strong smell indicators.

Strong indicators: gas_bme, srawVoc, VOC_multichannel, COandH2, srawNox, NO2, ethanol
Secondary context: time_s, phase, trial_number

Usage:
  python train.py --data ml/data/initial-smell-dataset.csv
"""
import argparse
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from preprocess import build_pipeline, load_data_with_strong_indicators


def train_smell_detector(data_path, test_size=0.2, random_state=42):
    """Train HistGradientBoosting model using strong smell indicators."""
    
    # Load data with strong indicators only
    X_train, X_test, y_train, y_test, feature_cols = load_data_with_strong_indicators(data_path, test_size)
    
    print(f"\n{'='*60}")
    print("Training Smell Detection Model (Strong Indicators Only)")
    print(f"{'='*60}")
    print(f"\nFeatures used ({len(feature_cols)}):")
    print(f"  {feature_cols}")
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    
    # Build preprocessor
    numeric = [c for c in X_train.columns if X_train[c].dtype in ['int64', 'float64']]
    categorical = [c for c in X_train.columns if c not in numeric]
    
    pre = build_pipeline(numeric, categorical)
    
    # Build and train pipeline
    model = HistGradientBoostingClassifier(random_state=random_state, learning_rate=0.05, max_iter=200)
    pipe = Pipeline([('pre', pre), ('model', model)])
    
    print(f"\nTraining HistGradientBoostingClassifier...")
    pipe.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"\n{'='*60}")
    print(f"Test Accuracy: {acc:.4f}")
    print(f"{'='*60}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save artifacts
    out_dir = Path('models')
    out_dir.mkdir(exist_ok=True)
    
    joblib.dump(pipe, out_dir / 'best_model.joblib')
    joblib.dump(pre, out_dir / 'preprocessor.joblib')
    print(f"\n✓ Model saved to {out_dir}/best_model.joblib")
    print(f"✓ Preprocessor saved to {out_dir}/preprocessor.joblib")
    
    # Save confusion matrix
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar_kws={'label': 'Count'})
    plt.title(f'Confusion Matrix - Test Accuracy: {acc:.4f}', fontweight='bold')
    plt.xlabel('Predicted Scent ID')
    plt.ylabel('True Scent ID')
    plt.tight_layout()
    cm_path = out_dir / 'confusion_matrix.png'
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"✓ Confusion matrix saved to {cm_path}")
    
    return pipe, acc


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True, help='Path to dataset CSV')
    args = p.parse_args()
    train_smell_detector(args.data)
