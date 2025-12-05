"""Train and evaluate classifiers for smell detection.

Usage:
  python train_and_eval.py --data ../ml/data/initial-smell-dataset.csv

This script performs EDA (brief), preprocessing, compares RandomForest and HistGradientBoosting
classifiers, does RandomizedSearchCV hyperparameter tuning, evaluates on a held-out test set,
saves the best model and transformer to `ml/models/` and writes metrics + a confusion matrix image.
"""
import argparse
import os
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

try:
    import shap
    HAS_SHAP = True
except Exception:
    HAS_SHAP = False


def brief_eda(df: pd.DataFrame):
    print("Dataset shape:", df.shape)
    print(df.dtypes)
    print(df.describe(include='all').transpose())
    print("Missing per column:\n", df.isna().sum())


def build_preprocessor(df: pd.DataFrame, numeric_features, categorical_features):
    num_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    cat_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('ohe', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer([
        ('num', num_pipe, numeric_features),
        ('cat', cat_pipe, categorical_features)
    ], remainder='drop')

    return preprocessor


def main(args):
    data_path = Path(args.data)
    out_dir = Path('ml/models')
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path)
    brief_eda(df)

    # Target and features
    target = 'scent_id'
    if target not in df.columns:
        raise RuntimeError(f"Target column '{target}' not found in dataset")

    # Strong smell indicators (directly measure volatile chemicals)
    strong_indicators = ['gas_bme', 'srawVoc', 'VOC_multichannel', 'COandH2', 'srawNox', 'NO2', 'ethanol']
    
    # Secondary context (dynamic response and batch effects)
    secondary_context = ['time_s', 'phase', 'trial_number']
    
    # All features to use
    feature_cols = [c for c in strong_indicators + secondary_context if c in df.columns]
    
    X = df[feature_cols].copy()
    y = df[target].astype(int)

    # Auto-detect categorical vs numeric
    categorical = [c for c in X.columns if X[c].dtype == 'object' or c in ('phase',)]
    numeric = [c for c in X.columns if c not in categorical]

    print('Numeric features:', numeric)
    print('Categorical features:', categorical)

    preprocessor = build_preprocessor(X, numeric, categorical)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    # Candidate models
    models = {
        'rf': RandomForestClassifier(n_jobs=-1, random_state=42),
        'hgb': HistGradientBoostingClassifier(random_state=42),
        'mlp': MLPClassifier(random_state=42, max_iter=500)
    }

    param_distributions = {
        'rf': {
            'model__n_estimators': [100, 200, 400],
            'model__max_depth': [None, 10, 20, 40],
            'model__min_samples_leaf': [1, 2, 4]
        },
        'hgb': {
            'model__learning_rate': [0.01, 0.05, 0.1],
            'model__max_iter': [100, 200, 400],
            'model__max_depth': [None, 10, 20]
        },
        'mlp': {
            'model__hidden_layer_sizes': [(100,), (100, 50), (200, 100)],
            'model__alpha': [1e-4, 1e-3, 1e-2]
        }
    }

    results = {}

    for name, estimator in models.items():
        print('\nTraining candidate:', name)
        pipe = Pipeline([
            ('pre', preprocessor),
            ('model', estimator)
        ])

        # Randomized search
        search = RandomizedSearchCV(
            pipe,
            param_distributions.get(name, {}),
            n_iter=10,
            cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=42),
            scoring='f1_macro',
            n_jobs=-1,
            random_state=42,
            verbose=1
        )

        search.fit(X_train, y_train)
        print('Best params for', name, search.best_params_)
        best = search.best_estimator_

        # Evaluate
        y_pred = best.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True)
        cm = confusion_matrix(y_test, y_pred)

        results[name] = {
            'estimator': best,
            'accuracy': acc,
            'report': report,
            'confusion_matrix': cm
        }

        # Save model
        model_path = out_dir / f'{name}_model.joblib'
        joblib.dump(best, model_path)
        print('Saved model to', model_path)

        # Save confusion matrix figure
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title(f'Confusion matrix ({name})')
        plt.xlabel('Predicted')
        plt.ylabel('True')
        figpath = out_dir / f'confusion_{name}.png'
        plt.savefig(figpath)
        plt.close()

        # SHAP (if available and model is tree-based)
        if HAS_SHAP and hasattr(best.named_steps['model'], 'predict_proba'):
            try:
                explainer = shap.Explainer(best.named_steps['model'])
                # Compute SHAP on a small subset of training data
                X_sample = preprocessor.transform(X_train.sample(min(len(X_train), 500), random_state=42))
                shap_values = explainer(X_sample)
                # summary plot
                shap_summary = out_dir / f'shap_summary_{name}.png'
                shap.summary_plot(shap_values, show=False)
                plt.savefig(shap_summary)
                plt.close()
            except Exception as e:
                print('SHAP failed for', name, str(e))

    # Write a small report
    report_lines = []
    for name, r in results.items():
        report_lines.append(f"Model: {name}")
        report_lines.append(f"  Accuracy: {r['accuracy']:.4f}")
        report_lines.append('  Classification report:')
        for k, v in r['report'].items():
            if k in ('accuracy', 'macro avg', 'weighted avg'):
                report_lines.append(f"    {k}: {v}")
        report_lines.append('\n')

    (out_dir / 'training_report.txt').write_text('\n'.join(report_lines))
    print('Done. Artifacts saved to', out_dir)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=str, default='ml/data/initial-smell-dataset.csv')
    args = parser.parse_args()
    main(args)
