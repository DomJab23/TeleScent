"""Exploratory Data Analysis for smell detection.

Focuses on strong smell indicators:
  - gas_bme, srawVoc, VOC_multichannel, COandH2, srawNox, NO2, ethanol

Usage:
  python explore.py --data ml/data/initial-smell-dataset.csv
"""
import argparse
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


STRONG_INDICATORS = ['gas_bme', 'srawVoc', 'VOC_multichannel', 'COandH2', 'srawNox', 'NO2', 'ethanol']


def main(path):
    df = pd.read_csv(path)
    print("--- Dataset Overview ---")
    print(f"Shape: {df.shape}")
    print(f"\nData types:\n{df.dtypes}")
    print(f"\nMissing values:\n{df.isna().sum()}")
    print(f"\nClass distribution:\n{df['scent_id'].value_counts().sort_index()}")
    
    print("\n--- Strong Smell Indicators ---")
    print("Gas and VOC sensors that directly measure volatile chemicals:")
    for col in STRONG_INDICATORS:
        if col in df.columns:
            print(f"  {col}: min={df[col].min():.2f}, max={df[col].max():.2f}, mean={df[col].mean():.2f}")
    
    # Visualize strong indicators
    available = [c for c in STRONG_INDICATORS if c in df.columns]
    if available:
        fig, axes = plt.subplots(2, 4, figsize=(16, 8))
        axes = axes.flatten()
        
        for idx, col in enumerate(available):
            axes[idx].hist(df[col], bins=50, color='steelblue', edgecolor='black', alpha=0.7)
            axes[idx].set_title(f'{col}\\n(Strong Indicator)', fontweight='bold')
            axes[idx].set_xlabel(col)
            axes[idx].set_ylabel('Frequency')
        
        axes[-1].set_visible(False)
        plt.tight_layout()
        plt.savefig('eda_strong_indicators.png', dpi=150)
        print(f"\n✓ Plot saved: eda_strong_indicators.png")


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True, help='Path to CSV dataset')
    args = p.parse_args()
    main(args.data)
