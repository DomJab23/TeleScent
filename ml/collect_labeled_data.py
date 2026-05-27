#!/usr/bin/env python3
import requests
import time
import statistics
from datetime import datetime

LOCAL_BACKEND  = "http://localhost:5001/api/sensor-data"
CLOUD_BACKEND  = "https://telescent-157735763503.europe-west1.run.app/api/sensor-data"
DEVICE_ID      = "EnoseDevice001"

VALID_LABELS = ["no_scent", "sweet_orange", "peppermint"]
VALID_PHASES = ["stabilisation", "exposure", "recovery"]

BASELINE_TOLERANCE   = 0.15
READINGS_STAB        = 10
READINGS_EXPOSURE    = 30
READINGS_RECOVERY    = 10
READINGS_BASELINE    = 10
READING_INTERVAL_S   = 3
FLUSH_DURATION_S     = 180


def create_session_id(label: str) -> str:
    date_str = datetime.now().strftime("%Y%m%d_%H%M")
    run = input("  Session run number for today (e.g. 01): ").strip().zfill(2)
    return f"{date_str}_{label}_{run}"


def get_gas(reading: dict) -> float | None:
    val = reading.get("gas") or reading.get("gas_resistance")
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def gas_deviation(gas: float | None, baseline: float | None) -> float | None:
    if gas is None or not baseline:
        return None
    return abs(gas - baseline) / baseline


_last_cloud_timestamp: str | None = None


def fetch_latest_reading() -> dict | None:
    global _last_cloud_timestamp
    try:
        r = requests.get(CLOUD_BACKEND, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()

        if isinstance(data, dict) and "devices" in data:
            devices = data["devices"]
            if not devices:
                print("  No devices reporting to Cloud Run")
                return None
            for dev_id, dev_data in devices.items():
                reading = dev_data.get("latestReading")
                cloud_ts = dev_data.get("lastUpdate", "")
                if reading:
                    if cloud_ts and cloud_ts == _last_cloud_timestamp:
                        return None
                    _last_cloud_timestamp = cloud_ts
                    print(f"  New reading from {dev_id} @ {cloud_ts}")
                    return reading
            print("  Devices found but no latestReading")
            return None

        if isinstance(data, list) and data:
            return data[-1]
        if isinstance(data, dict):
            return data
    except requests.exceptions.RequestException as e:
        print(f"  Fetch error: {e}")
    return None


def send_reading(label: str, phase: str, session_id: str, reading: dict) -> bool:
    payload = {
        "device_id":   DEVICE_ID,
        "timestamp":   int(time.time() * 1000),
        "scent":       label,
        "phase":       phase,
        "session_id":  session_id,
        "temperature": reading.get("temperature"),
        "humidity":    reading.get("humidity"),
        "pressure":    reading.get("pressure"),
        "gas":         reading.get("gas"),
        "voc_raw":     reading.get("voc_raw"),
        "nox_raw":     reading.get("nox_raw"),
        "no2":         reading.get("no2"),
        "ethanol":     reading.get("ethanol"),
        "voc":         reading.get("voc"),
        "co_h2":       reading.get("co_h2"),
        "sensorValues": [
            reading.get("temperature"),
            reading.get("humidity"),
            reading.get("pressure"),
            reading.get("gas"),
            reading.get("voc"),
            reading.get("no2"),
        ],
    }
    try:
        r = requests.post(LOCAL_BACKEND, json=payload, timeout=10)
        return r.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"  Send error: {e}")
        return False


def collect_block(label: str, phase: str, session_id: str, n: int,
                  baseline_gas: float | None = None) -> list[dict]:
    readings = []
    print(f"\n  {n} readings  |  phase={phase}  |  label={label}")
    print(f"  {'-' * 54}")

    saved = 0
    retries = 0
    max_retries = n * 15

    while saved < n and retries < max_retries:
        reading = fetch_latest_reading()
        if reading is None:
            retries += 1
            if retries % 5 == 0:
                print(f"  ... waiting for new reading from Arduino ({saved}/{n} saved)")
            time.sleep(READING_INTERVAL_S)
            continue

        gas = get_gas(reading)
        gas_str = f"{gas:>8.1f}" if gas is not None else "     N/A"

        dev = gas_deviation(gas, baseline_gas)
        flag = f"  gas dev {dev*100:.0f}%" if dev is not None and dev > BASELINE_TOLERANCE else ""

        saved += 1
        print(f"  [{saved:02d}/{n}]  gas={gas_str}  voc={str(reading.get('voc')):>6}"
              f"  no2={str(reading.get('no2')):>6}"
              f"  eth={str(reading.get('ethanol')):>6}"
              f"  voc_raw={str(reading.get('voc_raw')):>7}{flag}")

        if not send_reading(label, phase, session_id, reading):
            print(f"         save failed")

        readings.append(reading)
        retries = 0

    return readings


def baseline_median(readings: list[dict]) -> float | None:
    vals = [get_gas(r) for r in readings if get_gas(r) is not None]
    return statistics.median(vals) if vals else None


def recovery_ok(readings: list[dict], baseline: float) -> bool:
    for r in readings:
        dev = gas_deviation(get_gas(r), baseline)
        if dev is not None and dev > BASELINE_TOLERANCE:
            g = get_gas(r)
            print(f"  gas={g:.1f} is {dev*100:.0f}% from baseline ({baseline:.1f})")
            return False
    return True


def select_label(class_counts: dict | None = None) -> str | None:
    print(f"\n{'-' * 54}")
    print("  Select label for next exposure block:")
    for i, lbl in enumerate(VALID_LABELS, 1):
        count_str = f"  ({class_counts.get(lbl, 0)} saved)" if class_counts else ""
        print(f"    {i}. {lbl}{count_str}")
    if class_counts:
        print(f"    ----------------------")
        print(f"    Total: {sum(class_counts.values())}")
    print(f"{'-' * 54}")
    while True:
        choice = input("  Enter number (or 'q' to end session): ").strip()
        if choice.lower() == "q":
            return None
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(VALID_LABELS):
                return VALID_LABELS[idx]
        except ValueError:
            pass
        print(f"  Invalid - enter 1-{len(VALID_LABELS)} or 'q'")


def countdown(seconds: int, label: str = ""):
    start = time.time()
    while True:
        remaining = max(0, seconds - int(time.time() - start))
        print(f"  {label}{remaining}s remaining...   ", end="\r")
        if remaining == 0:
            break
        time.sleep(5)
    print()


def main():
    print("\n" + "=" * 60)
    print("TeleScent Labeled Data Collection")
    print("=" * 60)
    print(f"\n  Backend (read) : {CLOUD_BACKEND}")
    print(f"  Backend (save) : {LOCAL_BACKEND}")
    print(f"  Device         : {DEVICE_ID}")
    print(f"\n  Sensor must have been running 5+ minutes before starting.")
    print(f"  Protocol per block:")
    print(f"      - 3 drops on fresh cotton pad -> wait 45 s -> hold 3 cm from intake")
    print(f"      - 90 s exposure -> remove pad -> 3 min flush -> confirm baseline\n")

    label_hint = input("  Primary scent for this session (e.g. sweet_orange): ").strip() or "mixed"
    session_id = create_session_id(label_hint)
    print(f"\n  Session ID: {session_id}\n")

    input(f"  Press ENTER when ready for stabilisation baseline\n"
          f"  (fan running, no scent near intake)...")

    stab = collect_block("no_scent", "stabilisation", session_id, READINGS_STAB)
    baseline = baseline_median(stab)
    if baseline:
        print(f"\n  Baseline gas_resistance: {baseline:.2f} kOhm  (+/-{BASELINE_TOLERANCE*100:.0f}% tolerance)")
    else:
        print(f"\n  Could not compute baseline - gas values missing. Continuing without drift check.")

    block_num  = 0
    total_sent = len(stab)
    class_counts = {lbl: 0 for lbl in VALID_LABELS}

    while True:
        exposure_label = select_label(class_counts)
        if exposure_label is None:
            break

        block_num += 1
        print(f"\n  {'=' * 54}")
        print(f"  Block {block_num}  |  {exposure_label}")
        print(f"  {'=' * 54}")
        print(f"\n  Steps:")
        print(f"    1. Apply 3 drops to a fresh cotton pad")
        print(f"    2. Wait 45 seconds (let light compounds flash off)")
        print(f"    3. Hold pad at the 3 cm tape mark on the intake")
        input(f"\n  Press ENTER when pad is in position and 45 s wait is done...")

        exp = collect_block(exposure_label, "exposure", session_id, READINGS_EXPOSURE,
                            baseline_gas=baseline)
        total_sent += len(exp)
        class_counts[exposure_label] = class_counts.get(exposure_label, 0) + len(exp)

        print(f"\n  Remove pad from intake NOW.")
        print(f"  Fan flush for {FLUSH_DURATION_S // 60} minutes. Prepare next pad during wait.")
        countdown(FLUSH_DURATION_S, label="Flush: ")
        print(f"  Flush complete.")

        rec = collect_block("no_scent", "recovery", session_id, READINGS_RECOVERY,
                            baseline_gas=baseline)
        total_sent += len(rec)

        if baseline and rec:
            if recovery_ok(rec, baseline):
                print(f"\n  Baseline restored - block {block_num} is valid.")
            else:
                print(f"\n  Baseline NOT restored after {FLUSH_DURATION_S // 60} min flush.")
                while True:
                    ans = input(f"  Wait 1 more minute and recheck? (y/n): ").strip().lower()
                    if ans != "y":
                        print(f"  Block {block_num} flagged. Review in QA before training.")
                        break
                    countdown(60, label="Extended flush: ")
                    recheck = collect_block("no_scent", "recovery", session_id, 5,
                                           baseline_gas=baseline)
                    total_sent += len(recheck)
                    if recovery_ok(recheck, baseline):
                        print(f"  Baseline restored after extended flush.")
                        break
                    print(f"  Still not restored.")

        if exposure_label != "no_scent":
            print(f"\n  Collecting {READINGS_BASELINE} clean-air baseline readings "
                  f"(no_scent / exposure) for balanced training data...")
            bl = collect_block("no_scent", "exposure", session_id, READINGS_BASELINE,
                               baseline_gas=baseline)
            total_sent += len(bl)
            class_counts["no_scent"] = class_counts.get("no_scent", 0) + len(bl)

        print(f"\n  Block {block_num} done  |  Session total: {total_sent} readings")
        print(f"     Class balance: {class_counts}")

    print(f"\n{'=' * 60}")
    print(f"Session complete: {session_id}")
    print(f"   Total readings sent : {total_sent}")
    print(f"\nExport to ML training CSV:")
    print(f"   cd ml && python3 export_db_to_csv.py")
    print(f"\nFilter this session only:")
    print(f"   python3 export_db_to_csv.py --session={session_id}")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
