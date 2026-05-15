## Plan: E-Nose Dataset Collection Protocol & Pipeline Fix

Two parallel tracks. **Track A** is a protocol — step-by-step rules Dominik follows when sitting at the hardware. **Track B** is a code fix — the existing pipeline silently drops 4 of the 6 ML features before saving to the DB, making any data collected today useless for retraining. Both must be done before a single new sample is collected.

**Scent classes (Phase 1):** `no_scent`, `sweet_orange`
**Delivery method:** Cotton pad with essential oil held near fan air intake
**Hardware:** BME688 (or equivalent MOX VOC sensor) in a fan-ventilated enclosure

---

### Architecture: Cloud Run vs Local

```
Arduino (live)  ──POST──→  Cloud Run backend (predictions, ephemeral DB)
                                ↑
collect_labeled_data.py         │ GET latest reading
                                │
                           POST labeled copy
                                ↓
                      localhost:5001 → local SQLite (training data)
                                ↓
                      export_db_to_csv.py → ML training CSV
```

- **Cloud Run** = live predictions for the Arduino. Ephemeral DB (wiped on cold start).
- **Local backend** = data collection only. Persistent SQLite. Must be running during collection.
- `collect_labeled_data.py` reads from Cloud Run, saves to localhost.

---

### Critical Pre-Work: Fix the Data Persistence Gap

**The problem:** In [backend/models/SensorData.js](backend/models/SensorData.js), `sensor0–5` maps to `[temperature, humidity, pressure, gas, voc, no2]`. The fields `ethanol`, `co_h2`, `voc_raw`, and `nox_raw` are received by the route, used for prediction, then discarded — never written to SQLite or the CSV. The training pipeline requires all 6 named features (`srawVoc`, `srawNox`, `NO2`, `ethanol`, `VOC_multichannel`, `COandH2`).

**Fix required (5 files):**

1. **[backend/models/SensorData.js](backend/models/SensorData.js)** — add 4 new Sequelize columns: `ethanol` (FLOAT), `coH2` (FLOAT), `vocRaw` (FLOAT), `noxRaw` (FLOAT), plus `sessionId` (STRING) and `phase` (STRING, enum: `stabilisation | exposure | recovery`)

2. **[backend/routes/sensor-data.js](backend/routes/sensor-data.js)** — persist the 4 missing fields (`req.body.ethanol`, `req.body.co_h2`, `req.body.voc_raw`, `req.body.nox_raw`) when calling `SensorData.create()`. **Skip ML prediction when ground-truth `scent` label is provided** (collection mode) — the old model doesn't know new scent classes and would produce wrong `predictedScent` values.

3. **[backend/services/csvExporter.js](backend/services/csvExporter.js)** — extend CSV header and row builder with the 6 new columns

4. **[backend/models/index.js](backend/models/index.js)** — change `sync()` to `sync({ alter: true })` so new columns auto-migrate on restart

5. **[ml/export_db_to_csv.py](ml/export_db_to_csv.py)** — update the export query and column rename map so the output CSV uses training column names: `voc → VOC_multichannel`, `vocRaw → srawVoc`, `noxRaw → srawNox`, `no2 → NO2`, `ethanol → ethanol`, `coH2 → COandH2`, plus `session_id`, `phase`, `label` (from `scent`)

---

### Track A: Collection Protocol

#### Scent Delivery Method

The sensor is a heated MOX (metal-oxide) surface. Too little oil = weak signal; too much = sensor surface saturation that takes hours to clear.

- **Drops per pad:** Use **3 drops** of sweet orange essential oil per session. 2 drops risks a weak signal on low-humidity days (slower evaporation); 4+ drops risks saturating the MOX surface, extending decontamination time significantly.
- **Wait after applying oil to pad:** After applying drops, wait **45 seconds** before bringing the pad near the intake. This lets the lightest carrier/solvent compounds flash off, so the sensor sees a more stable headspace composition rather than an initial spike.
- **Distance from intake:** Hold the pad **3 cm from the fan air intake**, fixed position. Mark this distance on the box with tape. Inconsistent distance is a direct cause of amplitude variation between sessions.
- **Fresh pad each session:** Always use a **fresh cotton pad** for each exposure block. A used pad loses lighter terpene fractions first (limonene evaporates faster than linalool), so a reused pad has a chemically shifted profile that produces inconsistent readings.
- **Exposure duration:** Hold the pad at the marked distance for **90 seconds** per block (30 readings at ~3 s intervals). Do not move it in and out.

#### Sensor Stabilisation (fixes failure point 1)

- **Warm-up rule:** Power on sensor, wait **5 minutes** before recording anything. During this window the VOC Index will drift as the heater stabilises — these readings are noise, not signal.
- **Stabilisation check:** Sample `gas_resistance` every 10 seconds. When the variance across 5 consecutive readings is < 5% of the mean, the sensor is stable.
- **Save a `stabilisation` phase record:** Take 10 readings (`phase = stabilisation`, `label = no_scent`) immediately before each session. These are your per-session baseline fingerprint — kept in the dataset for drift detection.

#### Decontamination / Fan Flush (fixes failure point 2)

- Remove scent source from air intake
- Let fan run **3 minutes minimum**
- **Confirm return to baseline:** `gas_resistance` must return to within ±15% of the stabilisation-phase value. If not by 3 min, wait in 60-second increments
- Record a `recovery` phase: 10 readings (`phase = recovery`, `label = no_scent`). If still elevated, discard the preceding exposure block entirely

#### New CSV Structure

```
session_id, timestamp, phase, label,
srawVoc, srawNox, NO2, ethanol, VOC_multichannel, COandH2
```

- `session_id` format: `YYYYMMDD_HHmm_sweetorange_01`
- `phase`: `stabilisation | exposure | recovery`
- `label`: `no_scent | sweet_orange` — adding Phase 2 classes means adding a new `label` value only, no schema change
- Environmental columns (`temperature`, `humidity`, `pressure`) captured in DB but excluded from ML export

#### Collection Session Workflow (step-by-step)

**Before starting:**
1. Confirm sensor is sending data on the live dashboard
2. Power on sensor → wait 5 minutes
3. Prepare cotton pad: apply **3 drops** of sweet orange oil, set aside for **45 seconds**
4. Start new session ID in `collect_labeled_data.py` (date + scent name + run number)

**`no_scent` baseline:**
5. Fan running, no source near intake
6. Record 10 readings (`phase = stabilisation`, `label = no_scent`)
7. Confirm variance is low before proceeding

**`sweet_orange` exposure:**
8. Set label → `sweet_orange`, phase → `exposure`
9. Bring prepared pad to the **3 cm tape mark**
10. Hold steady for **90 seconds**, collect 30 readings
11. Remove pad from intake

**Decontamination:**
12. Set phase → `recovery`, label → `no_scent`
13. Wait 3 minutes (prepare next fresh pad + 3 drops during this time)
14. Record 10 readings — confirm `gas_resistance` within ±15% of stabilisation value
15. If not restored, wait 1 more minute and repeat check

**Repeat:** Steps 8–15 can be done 3–5 times per sitting.

**Saving:**
16. Run updated `export_db_to_csv.py`
17. Verify all 6 feature columns are non-null in the exported CSV

---

### Track B: Updated `collect_labeled_data.py`

[ml/collect_labeled_data.py](ml/collect_labeled_data.py) changes:

1. **Session ID prompt** at startup — generates ID from date, label, run number
2. **Phase selection** — CLI toggle: `stabilisation / exposure / recovery`
3. **Label list** → `["no_scent", "sweet_orange"]` for Phase 1; new class = add one string
4. **Baseline reference capture** — stores median `gas_resistance` of stabilisation phase, warns if recovery readings are > 15% above it
5. **Per-session CSV preview** — print 5-row sample after export to confirm all 6 feature columns populated
6. **Read from Cloud Run, save to localhost** — Arduino pushes to Cloud Run; script GETs latest reading from there, POSTs labeled copy to local backend
7. **Deduplication** — tracks Cloud Run `lastUpdate` timestamp; waits for Arduino to push a new reading before saving. Prevents duplicate rows when script polls faster than Arduino sends (~3s poll vs ~30s Arduino interval)

---

### Dataset Size & ML Readiness

| Target | Minimum | Comfortable |
|---|---|---|
| Samples per class | 150 | 300 |
| Sessions per class | 5 | 10+ |
| Total rows (Phase 1, 2 classes) | 300 | 600 |

- 150 samples per class is the practical minimum for Random Forest with 19 features
- `no_scent` and `sweet_orange` must be within 10% of each other in count; `stabilisation` and `recovery` readings count toward `no_scent`
- **Train/val split:** 80/20 stratified by `session_id` (not by row) — prevents same-session leakage
- **Phase 2:** Retrain from scratch with full dataset; [ml/retrain_models.py](ml/retrain_models.py) handles multi-class without modification

---

### Data Quality Checks

- **Outlier detection:** Z-score > 3 on any feature within a session → flag. > 20% of block flagged → discard block
- **Cross-session consistency:** Plot per-class median `VOC_multichannel` across sessions. Drift > 20% between first and last session = sensor conditioning issue
- **Contamination signature:** `gas_resistance` during exposure lower than stabilisation baseline → decontamination was incomplete, discard block

---

### Verification

- After DB fixes: collect one test session, export CSV, confirm all 6 columns non-null
- Run `retrain_models.py` against exported CSV — confirm no `KeyError` on feature names
- After 5 sessions (≥ 150 samples/class): train model, confirm cross-val accuracy > 85%. If not, first suspects are the 45s pre-wait being too short or a 3-minute flush being insufficient for the room

---

### Decisions

- Phase/session stored in DB — enables future retraining without re-exporting
- Recovery readings kept as `no_scent` — real states, free class balance
- 3 drops / fresh pad / 3 cm / 45s pre-wait — standardises delivery to reduce inter-session amplitude variance
- `gas_resistance` as decontamination sentinel — most sensitive fast-responding feature on BME688
- Labels use underscores, lowercase (`sweet_orange`, `no_scent`) — prevents the `ginger`/`gingerbread` mismatch class of bugs
- **Skip ML prediction during collection** — old model doesn't know new classes; saves CPU and avoids confusing `predictedScent` values
- **Deduplication via Cloud Run timestamp** — Arduino pushes every ~30s; script polls every 3s; only save when `lastUpdate` changes
- **Read Cloud Run → save localhost** — keeps collection independent of Arduino network config
