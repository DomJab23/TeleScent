#!/usr/bin/env python3
import sqlite3
import csv
import sys

DATABASE_PATH = "../backend/database.sqlite"
OUTPUT_FILE = "collected_sensor_data.csv"
PREVIEW_ROWS = 5

ML_FEATURE_COLS = ["srawVoc", "srawNox", "NO2", "ethanol", "VOC_multichannel", "COandH2"]

COLUMN_MAP = {
    "sessionId":      "session_id",
    "timestamp":      "timestamp",
    "phase":          "phase",
    "scent":          "label",
    "vocRaw":         "srawVoc",
    "noxRaw":         "srawNox",
    "sensor5":        "NO2",
    "ethanol":        "ethanol",
    "sensor4":        "VOC_multichannel",
    "coH2":           "COandH2",
}


def _build_where(session_filter: str | None, labeled_only: bool) -> tuple[str, list]:
    clauses, params = [], []
    if labeled_only:
        clauses.append("scent IS NOT NULL AND scent != ''")
    if session_filter:
        clauses.append("sessionId = ?")
        params.append(session_filter)
    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where_sql, params


def _row_to_output(row: dict) -> dict:
    return {
        "session_id":       row.get("sessionId") or "",
        "timestamp":        row.get("timestamp") or "",
        "phase":            row.get("phase") or "",
        "label":            row.get("scent") or "",
        "srawVoc":          row.get("vocRaw"),
        "srawNox":          row.get("noxRaw"),
        "NO2":              row.get("sensor5"),
        "ethanol":          row.get("ethanol"),
        "VOC_multichannel": row.get("sensor4"),
        "COandH2":          row.get("coH2"),
    }


def _print_distribution(title: str, counts: dict, bar_div: int | None = None):
    print(f"\n{title}")
    for key, count in sorted(counts.items()):
        bar = ("  " + "#" * (count // bar_div)) if bar_div else ""
        print(f"   {key:<35} {count:>4}{bar}")


def export(session_filter: str | None = None, labeled_only: bool = True):
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    where_sql, params = _build_where(session_filter, labeled_only)

    cursor.execute(f"""
        SELECT
            sessionId, timestamp, phase, scent,
            vocRaw, noxRaw, sensor5, ethanol, sensor4, coH2,
            predictedScent, confidence, createdAt
        FROM sensor_data
        {where_sql}
        ORDER BY createdAt ASC
    """, params)

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        print("No matching rows found in database.")
        return

    print(f"Found {len(rows)} rows")

    output_rows = [_row_to_output(dict(r)) for r in rows]
    incomplete = sum(1 for r in output_rows if any(r.get(k) is None for k in ML_FEATURE_COLS))

    fieldnames = ["session_id", "timestamp", "phase", "label"] + ML_FEATURE_COLS

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Exported {len(output_rows)} rows -> {OUTPUT_FILE}")

    if incomplete:
        print(f"\n{incomplete}/{len(output_rows)} rows have at least one NULL ML feature.")
        print(f"   Imputed by SimpleImputer at training time.")
    else:
        print(f"All rows have complete ML features.")

    label_counts: dict[str, int] = {}
    phase_counts: dict[str, int] = {}
    session_counts: dict[str, int] = {}
    for r in output_rows:
        label_counts[r["label"] or "(unlabelled)"] = label_counts.get(r["label"] or "(unlabelled)", 0) + 1
        phase_counts[r["phase"] or "(no phase)"]   = phase_counts.get(r["phase"] or "(no phase)", 0) + 1
        session_counts[r["session_id"] or "(no session)"] = session_counts.get(r["session_id"] or "(no session)", 0) + 1

    _print_distribution("Label distribution:", label_counts, bar_div=5)
    _print_distribution("Phase distribution:", phase_counts)
    _print_distribution(f"Sessions ({len(session_counts)} total):", session_counts)

    print(f"\nFirst {PREVIEW_ROWS} rows:")
    header = " | ".join(f"{c:<18}" for c in fieldnames)
    print(f"  {header}")
    print(f"  {'-' * len(header)}")
    for row in output_rows[:PREVIEW_ROWS]:
        line = " | ".join(f"{str(row.get(c, '')):<18}" for c in fieldnames)
        print(f"  {line}")

    print(f"\nDone -> {OUTPUT_FILE}\n")


def main():
    print("\n" + "=" * 60)
    print("TeleScent ML Training Data Export")
    print("=" * 60 + "\n")

    session_filter = None
    labeled_only = True

    if "--all" in sys.argv:
        labeled_only = False
        print("Including unlabelled rows (--all flag)")

    for arg in sys.argv[1:]:
        if arg.startswith("--session="):
            session_filter = arg.split("=", 1)[1]
            print(f"Filtering to session: {session_filter}")

    export(session_filter=session_filter, labeled_only=labeled_only)


if __name__ == "__main__":
    main()
