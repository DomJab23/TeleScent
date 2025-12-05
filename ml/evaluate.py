"""Evaluate smell detection model on test data.

Uses strong smell indicators only:
  - gas_bme, srawVoc, VOC_multichannel, COandH2, srawNox, NO2, ethanol

Usage:
  python evaluate.py --data ml/data/initial-smell-dataset.csv --model models/best_model.joblib
"""
import argparse
import pandas as pd
import joblib
from pathlib import Path
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from preprocess import load_data_with_strong_indicators


def evaluate_model(data_path, model_path='models/best_model.joblib'):
    """Evaluate trained model on test set."""
    
    # Load model
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model not found at {model_path}")
    
    model = joblib.load(model_path)
    
    # Load data
    X_train, X_test, y_train, y_test, feature_cols = load_data_with_strong_indicators(data_path)
    
    print(f"\n{'='*60}")
    print("Model Evaluation - Smell Detection (Strong Indicators)")
    print(f"{'='*60}")
    print(f"\nFeatures: {feature_cols}")
    print(f"Test samples: {len(X_test)}")
    
    # Evaluate
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"\n{'='*60}")
    print(f"Accuracy: {acc:.4f}")
    print(f"{'='*60}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Plot confusion matrix
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar_kws={'label': 'Count'})
    plt.title(f'Confusion Matrix - Accuracy: {acc:.4f}', fontweight='bold', fontsize=14)
    plt.xlabel('Predicted Scent ID', fontweight='bold')
    plt.ylabel('True Scent ID', fontweight='bold')
    plt.tight_layout()
    plt.savefig('evaluation_confusion_matrix.png', dpi=150)
    print(f"\n✓ Confusion matrix saved: evaluation_confusion_matrix.png")


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True, help='Path to dataset CSV')
    p.add_argument('--model', default='models/best_model.joblib', help='Path to model.joblib')
    args = p.parse_args()
    evaluate_model(args.data, args.model)
