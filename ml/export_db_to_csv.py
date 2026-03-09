#!/usr/bin/env python3
"""
TeleScent - Export sensor data from SQLite to ML-ready training CSV.

Output column names match retrain_models.py feature expectations exactly:
  session_id, timestamp, phase, label,
  srawVoc, srawNox, NO2, ethanol, VOC_multichannel, COandH2
"""

import sqlite3
import csv
import sys
from datetime import datetime

DATABASE_PATH = "../backend/database.sqlite"
OUTPUT_FILE = "collected_sensor_data.csv"
PREVIEW_ROWS = 5

# Columns required by retrain_models.py (must all be non-null for a row to be ML-usable)
ML_FEATURE_COLS = ["srawVoc", "srawNox", "NO2", "ethanol", "VOC_multichannel", "COandH2"]

# Mapping: SQLite column → output CSV column name
COLUMN_MAP = {
    "sessionId":      "session_id",
    "timestamp":      "timestamp",
    "phase":          "phase",
    "scent":          "label",      # ground-truth label
    "vocRaw":         "srawVoc",
    "noxRaw":         "srawNox",
    "sensor5":        "NO2",        # sensor5 = no2 (legacy mapping)
    "ethanol":        "ethanol",
    "sensor4":        "VOC_multichannel",  # sensor4 = voc (legacy mapping)
    "coH2":           "COandH2",
}

# Named columns take priority; fall back to legacy sensor slots only when named column is NULL
PRIORITY_MAP = {
    "NO2":            ("sensor5", "no2_fallback"),
    "VOC_multichannel": ("sensor4", "voc_fallback"),
}


def export(session_filter: str | None = None, labeled_only: bool = True):
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    where_clauses = []
    params = []

    if labeled_only:
        where_clauses.append("scent IS NOT NULL AND scent != ''")

    if session_filter:
        where_clauses.append("sessionId = ?")
        params.append(session_filter)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    cursor.execute(f"""
        SELECT
            sessionId,
            timestamp,
            phase,
            scent,
            vocRaw,
            noxRaw,
            sensor5,    -- legacy NO2 slot
            ethanol,
            sensor4,    -- legacy VOC slot
            coH2,
            predictedScent,
            confidence,
            createdAt
        FROM sensor_data
        {where_sql}
        ORDER BY createdAt ASC
    """, params)

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        print("⚠️  No matching rows found in database.")
        return

    print(f"✅ Found {len(rows)} rows")

    output_rows = []
    incomplete = 0

    for row in rows:
        r = dict(row)

        # Resolve NO2: prefer named column, fall back to sensor5
        no2_val = r.get("ethanol")  # already named
        out = {
            "session_id":       r.get("sessionId") or "",
            "timestamp":        r.get("timestamp") or "",
            "phase":            r.get("phase") or "",
            "label":            r.get("scent") or "",
            "srawVoc":          r.get("vocRaw"),
            "srawNox":          r.get("noxRaw"),
            "NO2":              r.get("sensor5"),   # sensor5 = no2 in legacy schema
            "ethanol":          r.get("ethanol"),
            "VOC_multichannel": r.get("sensor4"),   # sensor4 = voc in legacy schema
            "COandH2":          r.get("coH2"),
        }

        # Count rows where any ML feature is missing
        missing = [k for k in ML_FEATURE_COLS if out.get(k) is None]
        if missing:
            incomplete += 1

        output_rows.append(out)

    fieldnames = ["session_id", "timestamp", "phase", "label"] + ML_FEATURE_COLS

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"📝 Exported {len(output_rows)} rows → {OUTPUT_FILE}")

    if incomplete:
        print(f"\n⚠️  {incomplete}/{len(output_rows)} rows have at least one NULL ML feature.")
        print(f"   Rows from before the DB fix will have NULL vocRaw/noxRaw/ethanol/coH2.")
        print(f"   These rows are still saved but will be imputed by SimpleImputer at training time.")
    else:
        print(f"✅ All rows have complete ML features.")

    # ── Label breakdown ──────────────────────────────────────────────────────
    label_counts: dict[str, int] = {}
    phase_counts: dict[str, int] = {}
    session_counts: dict[str, int] = {}
    for r in output_rows:
        l = r["label"] or "(unlabelled)"
        label_counts[l] = label_counts.get(l, 0) + 1
        p = r["phase"] or "(no phase)"
        phase_counts[p] = phase_counts.get(p, 0) + 1
        s = r["session_id"] or "(no session)"
        session_counts[s] = session_counts.get(s, 0) + 1

    print(f"\n📊 Label distribution:")
    for label, count in sorted(label_counts.items()):
        bar = "█" * (count // 5)
        print(f"   {label:<20} {count:>4}  {bar}")

    print(f"\n📊 Phase distribution:")
    for phase, count in sorted(phase_counts.items()):
        print(f"   {phase:<20} {count:>4}")

    print(f"\n📊 Sessions ({len(session_counts)} total):")
    for sid, count in sorted(session_counts.items()):
        print(f"   {sid:<35} {count:>4} rows")

    # ── Preview ──────────────────────────────────────────────────────────────
    print(f"\n🔍 First {PREVIEW_ROWS} rows:")
    header = " | ".join(f"{c:<18}" for c in fieldnames)
    print(f"  {header}")
    print(f"  {'─' * len(header)}")
    for row in output_rows[:PREVIEW_ROWS]:
        line = " | ".join(f"{str(row.get(c, '')):<18}" for c in fieldnames)
        print(f"  {line}")

    print(f"\n✨ Done → {OUTPUT_FILE}\n")


def main():
    print("\n" + "=" * 60)
    print("📊  TeleScent ML Training Data Export  📊")
    print("=" * 60 + "\n")

    session_filter = None
    labeled_only = True

    if "--all" in sys.argv:
        labeled_only = False
        print("ℹ️  Including unlabelled rows (--all flag)")

    for arg in sys.argv[1:]:
        if arg.startswith("--session="):
            session_filter = arg.split("=", 1)[1]
            print(f"ℹ️  Filtering to session: {session_filter}")

    export(session_filter=session_filter, labeled_only=labeled_only)


if __name__ == "__main__":
    main()
