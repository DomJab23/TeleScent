#!/usr/bin/env python3
"""
Quick visualization of master dataset structure
Run this to see dataset overview without opening the full notebook
"""
import sys
try:
    import pandas as pd
    import matplotlib.pyplot as plt
except ImportError:
    print("Error: pandas and matplotlib required")
    print("Install with: pip install pandas matplotlib")
    sys.exit(1)

# Load dataset
df = pd.read_csv('master_dataset1.csv')

print("="*80)
print("TELESCENT MASTER DATASET OVERVIEW")
print("="*80)
print(f"\nTotal samples: {len(df):,}")
print(f"Total columns: {len(df.columns)}")
print(f"\nDate range: {df['time_s'].min():.1f}s to {df['time_s'].max():.1f}s")

print("\n" + "="*80)
print("SCENTS (12 total)")
print("="*80)
scent_counts = df['scent_name'].value_counts().sort_index()
for scent, count in scent_counts.items():
    bar = '█' * (count // 20)
    print(f"{scent:12s} {count:4d} samples {bar}")

print("\n" + "="*80)
print("PHASES (4 total)")
print("="*80)
phase_counts = df['phase'].value_counts()
for phase, count in phase_counts.items():
    pct = (count / len(df)) * 100
    bar = '█' * (count // 100)
    print(f"{phase:18s} {count:4d} samples ({pct:5.1f}%) {bar}")

print("\n" + "="*80)
print("SENSOR FEATURES (10 total)")
print("="*80)
features = ['temp_C', 'humidity_pct', 'pressure_kPa', 'gas_bme', 
            'srawVoc', 'srawNox', 'NO2', 'ethanol', 'VOC_multichannel', 'COandH2']
for feat in features:
    print(f"{feat:20s} range: [{df[feat].min():8.2f} - {df[feat].max():8.2f}]  mean: {df[feat].mean():8.2f}")

print("\n" + "="*80)
print("SAMPLE DATA (first 5 rows)")
print("="*80)
print(df.head())

# Create visualization
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 1. Scent distribution
ax = axes[0, 0]
scent_counts.plot(kind='bar', ax=ax, color='steelblue')
ax.set_title('Samples per Scent', fontsize=14, fontweight='bold')
ax.set_xlabel('Scent')
ax.set_ylabel('Number of Samples')
ax.tick_params(axis='x', rotation=45)
ax.grid(axis='y', alpha=0.3)

# 2. Phase distribution
ax = axes[0, 1]
phase_counts.plot(kind='pie', ax=ax, autopct='%1.1f%%', startangle=90)
ax.set_title('Phase Distribution', fontsize=14, fontweight='bold')
ax.set_ylabel('')

# 3. Gas sensor over time for coffee
ax = axes[1, 0]
coffee_sample = df[(df['scent_name'] == 'coffee') & (df['sample_id'] == 1)]
for phase in ['baseline', 'exposure', 'recovery']:
    phase_data = coffee_sample[coffee_sample['phase'] == phase]
    ax.plot(phase_data['time_s'], phase_data['gas_bme'], marker='o', 
            markersize=3, label=phase, linewidth=2)
ax.set_title('Gas Sensor Response (Coffee)', fontsize=14, fontweight='bold')
ax.set_xlabel('Time (seconds)')
ax.set_ylabel('Gas Resistance (kΩ)')
ax.legend()
ax.grid(True, alpha=0.3)

# 4. Sensor ranges comparison
ax = axes[1, 1]
sensor_data = df[['gas_bme', 'NO2', 'ethanol', 'VOC_multichannel']].describe().loc[['min', 'max']].T
x = range(len(sensor_data))
ax.barh(x, sensor_data['max'] - sensor_data['min'], left=sensor_data['min'], 
        color='coral', alpha=0.7)
ax.set_yticks(x)
ax.set_yticklabels(sensor_data.index)
ax.set_title('Sensor Value Ranges', fontsize=14, fontweight='bold')
ax.set_xlabel('Value Range')
ax.grid(axis='x', alpha=0.3)

plt.tight_layout()
plt.savefig('dataset_overview.png', dpi=150, bbox_inches='tight')
print("\n✅ Visualization saved to: dataset_overview.png")
plt.show()

print("\n" + "="*80)
print("Ready to train! Run: jupyter notebook scentdetection.ipynb")
print("="*80)
