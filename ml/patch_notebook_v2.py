import nbformat
from pathlib import Path

nb_path = Path('smell_detection_training.ipynb')
nb = nbformat.read(str(nb_path), as_version=4)
modified = False

for cell in nb.cells:
    if cell.get('cell_type') != 'code':
        continue
    src = cell.get('source')
    if isinstance(src, list):
        src_text = ''.join(src)
    else:
        src_text = src

    # Update sensor_cols: if the cell contains temp_C and humidity_pct and sensor_cols
    if 'sensor_cols' in src_text and 'temp_C' in src_text and 'humidity_pct' in src_text:
        print('Updating sensor_cols cell')
        new = (
"# Sensor columns (strong smell indicators only)\n"
"sensor_cols = ['gas_bme', 'srawVoc', 'VOC_multichannel', 'COandH2', 'srawNox', 'NO2', 'ethanol']\n\n"
"# Distribution plots\n"
"fig, axes = plt.subplots(3, 3, figsize=(15, 12))\n"
"axes = axes.flatten()\n\n"
"for idx, col in enumerate(sensor_cols):\n"
"    axes[idx].hist(df[col], bins=50, color='steelblue', edgecolor='black', alpha=0.7)\n"
"    axes[idx].set_title(f'{col} Distribution', fontweight='bold')\n"
"    axes[idx].set_xlabel(col)\n"
"    axes[idx].set_ylabel('Frequency')\n\n"
"plt.tight_layout()\n"
"plt.show()\n\n"
"print(f\"Analyzed {len(sensor_cols)} sensor features.\")\n"
        )
        cell['source'] = new
        modified = True

    # Update X drop to remove environmental vars
    if "X = df.drop(columns=['sample_id', 'scent_name', 'scent_id']" in src_text or "X = df.drop(columns=[\"sample_id\"" in src_text:
        print('Updating feature matrix cell')
        new2 = (
"# Define target variable (scent_id)\n"
"target = 'scent_id'\n"
"if target not in df.columns:\n"
"    raise RuntimeError(f\"Target column '{target}' not found in dataset\")\n\n"
"# Feature matrix: drop identifiers, scent_name, and environmental calibration vars\n"
"# Keep: trial_number, phase, time_s, and sensor readings (strong indicators only)\n"
"X = df.drop(columns=['sample_id', 'scent_name', 'scent_id', 'pressure_kPa', 'temp_C', 'humidity_pct'], errors='ignore')\n"
"y = df[target].astype(int)\n\n"
"print(f\"Feature matrix shape: {X.shape}\")\n"
"print(f\"Target shape: {y.shape}\")\n"
"print(f\"\\nFeatures:\\n{X.columns.tolist()}\")\n"
        )
        cell['source'] = new2
        modified = True

if modified:
    nbformat.write(nb, str(nb_path))
    print('Notebook updated and saved.')
else:
    print('No matching cells found; no changes made.')
