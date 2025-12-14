#!/usr/bin/env python3
"""
Train a SIMPLIFIED scent detection model using ONLY VOC and NO2
This matches the limited sensor data from your Arduino
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
from pathlib import Path

print("🔬 Training Simplified 2-Sensor Model (VOC + NO2 only)")
print("=" * 80)

# Load dataset
df = pd.read_excel('/home/klaus/TeleScent/TeleScent/ml/NATURAL_ML_Data_with_no_scent.xlsx')
print(f"✅ Loaded {len(df)} samples")

# Use ONLY the 2 sensors available from your Arduino
FEATURES_SIMPLE = ['VOC_multichannel', 'NO2']

# Prepare features and labels
X = df[FEATURES_SIMPLE].copy()
y = df['scent_name'].values

# Check for missing values
print(f"\n📊 Dataset info:")
print(f"   Features: {FEATURES_SIMPLE}")
print(f"   Samples per class:")
for scent in ['cinnamon', 'gingerbread', 'norange', 'vanilla', 'no_scent']:
    count = sum(y == scent)
    print(f"      {scent}: {count}")

# Encode labels
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

print(f"\n📦 Training set: {len(X_train)} samples")
print(f"   Test set: {len(X_test)} samples")

# Train Random Forest
print(f"\n🌲 Training Random Forest classifier...")
clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    class_weight='balanced'
)
clf.fit(X_train, y_train)

# Evaluate
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ Training complete!")
print(f"   Accuracy: {accuracy:.1%}")

# Classification report
print(f"\n📊 Classification Report:")
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

# Feature importance
print(f"\n🎯 Feature Importance:")
for feature, importance in zip(FEATURES_SIMPLE, clf.feature_importances_):
    print(f"   {feature}: {importance:.3f}")

# Save model
model_dir = Path('/home/klaus/TeleScent/TeleScent/ml/model')
model_dir.mkdir(exist_ok=True)

model_path = model_dir / 'simple_2sensor_model.joblib'
encoder_path = model_dir / 'simple_2sensor_encoder.joblib'

joblib.dump(clf, model_path)
joblib.dump(label_encoder, encoder_path)

print(f"\n💾 Model saved:")
print(f"   {model_path}")
print(f"   {encoder_path}")

print("\n" + "=" * 80)
print("✅ Simplified model training complete!")
print("\n⚠️  Note: This model uses ONLY 2 sensors and may have lower accuracy")
print("   than the full 6-sensor model, but it works with your Arduino!")
