#!/usr/bin/env python3
"""
TeleScent - Labeled Data Collection Script

Phase-aware collection with:
  - Session ID tracking
  - Stabilisation baseline capture
  - Timed exposure blocks (3 drops / 3 cm / 90 s)
  - 3-minute decontamination flush with baseline check
  - Contamination warning if gas_resistance deviates > 15% from baseline
"""

import requests
import time
import statistics
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────────────────
LOCAL_BACKEND  = "http://localhost:5001/api/sensor-data"   # labeled data saved here (local SQLite)
CLOUD_BACKEND  = "https://telescent-157735763503.europe-west1.run.app/api/sensor-data"  # Arduino sends data here
DEVICE_ID      = "eNose001"

VALID_LABELS = ["no_scent", "sweet_orange"]
VALID_PHASES = ["stabilisation", "exposure", "recovery"]

BASELINE_TOLERANCE   = 0.15   # ±15% gas_resistance deviation triggers warning
READINGS_STAB        = 10     # readings in stabilisation block
READINGS_EXPOSURE    = 30     # readings in exposure block  (~90 s at 3 s/reading)
READINGS_RECOVERY    = 10     # readings in recovery block
READING_INTERVAL_S   = 3      # seconds between readings
FLUSH_DURATION_S     = 180    # 3-minute decontamination flush


# ── Session setup ──────────────────────────────────────────────────────────────
def create_session_id(label: str) -> str:
    now = datetime.now()
    date_str = now.strftime("%Y%m%d_%H%M")
    run = input("  Session run number for today (e.g. 01): ").strip().zfill(2)
    return f"{date_str}_{label}_{run}"


# ── Sensor API helpers ─────────────────────────────────────────────────────────
def get_gas(reading: dict) -> float | None:
    val = reading.get("gas") or reading.get("gas_resistance")
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def fetch_latest_reading() -> dict | None:
    try:
        url = CLOUD_BACKEND
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and data:
                return data[-1]
            if isinstance(data, dict):
                return data
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Fetch error: {e}")
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
        # Save to LOCAL backend (persists to local SQLite for training)
        r = requests.post(LOCAL_BACKEND, json=payload, timeout=10)
        return r.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Send error: {e}")
        return False


# ── Collection blocks ──────────────────────────────────────────────────────────
def collect_block(label: str, phase: str, session_id: str, n: int,
                  baseline_gas: float | None = None) -> list[dict]:
    readings = []
    print(f"\n  ▶  {n} readings  |  phase={phase}  |  label={label}")
    print(f"  {'─' * 54}")

    for i in range(1, n + 1):
        reading = fetch_latest_reading()
        if reading is None:
            print(f"  [{i:02d}/{n}] ⚠️  No data — retrying in {READING_INTERVAL_S}s")
            time.sleep(READING_INTERVAL_S)
            continue

        gas = get_gas(reading)
        gas_str = f"{gas:>8.1f}" if gas is not None else "     N/A"

        flag = ""
        if baseline_gas and gas:
            dev = abs(gas - baseline_gas) / baseline_gas
            if dev > BASELINE_TOLERANCE:
                flag = f"  ⚠️  gas dev {dev*100:.0f}%"

        print(f"  [{i:02d}/{n}]  gas={gas_str}  voc={str(reading.get('voc')):>6}"
              f"  no2={str(reading.get('no2')):>6}"
              f"  eth={str(reading.get('ethanol')):>6}"
              f"  voc_raw={str(reading.get('voc_raw')):>7}{flag}")

        if not send_reading(label, phase, session_id, reading):
            print(f"         ❌ save failed")

        readings.append(reading)
        if i < n:
            time.sleep(READING_INTERVAL_S)

    return readings


def baseline_median(readings: list[dict]) -> float | None:
    vals = [get_gas(r) for r in readings if get_gas(r) is not None]
    return statistics.median(vals) if vals else None


def recovery_ok(readings: list[dict], baseline: float) -> bool:
    for r in readings:
        g = get_gas(r)
        if g is None:
            continue
        if abs(g - baseline) / baseline > BASELINE_TOLERANCE:
            print(f"  ⚠️  gas={g:.1f} is {abs(g-baseline)/baseline*100:.0f}% from baseline ({baseline:.1f})")
            return False
    return True


# ── UI helpers ─────────────────────────────────────────────────────────────────
def select_label() -> str | None:
    print(f"\n{'─' * 54}")
    print("  Select label for next exposure block:")
    for i, lbl in enumerate(VALID_LABELS, 1):
        print(f"    {i}. {lbl}")
    print(f"{'─' * 54}")
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
        print(f"  Invalid — enter 1–{len(VALID_LABELS)} or 'q'")


def countdown(seconds: int, label: str = ""):
    start = time.time()
    while True:
        elapsed = time.time() - start
        remaining = max(0, seconds - int(elapsed))
        print(f"  ⏱  {label}{remaining}s remaining...   ", end="\r")
        if remaining == 0:
            break
        time.sleep(5)
    print()


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "=" * 60)
    print("🌸  TeleScent Labeled Data Collection  🌸")
    print("=" * 60)
    print(f"\n  Backend (read) : {CLOUD_BACKEND}")
    print(f"  Backend (save) : {LOCAL_BACKEND}")
    print(f"  Device         : {DEVICE_ID}")
    print(f"\n  ⚠️  Sensor must have been running 5+ minutes before starting.")
    print(f"  ⚠️  Protocol per block:")
    print(f"      • 3 drops on fresh cotton pad → wait 45 s → hold 3 cm from intake")
    print(f"      • 90 s exposure → remove pad → 3 min flush → confirm baseline\n")

    # ── Session setup ────────────────────────────────────────────────────────
    label_hint = input("  Primary scent for this session (e.g. sweet_orange): ").strip() or "mixed"
    session_id = create_session_id(label_hint)
    print(f"\n  ✅ Session ID: {session_id}\n")

    # ── Stabilisation baseline ───────────────────────────────────────────────
    input(f"  Press ENTER when ready for stabilisation baseline\n"
          f"  (fan running, no scent near intake)...")

    stab = collect_block("no_scent", "stabilisation", session_id, READINGS_STAB)
    baseline = baseline_median(stab)
    if baseline:
        print(f"\n  📏 Baseline gas_resistance: {baseline:.2f} kΩ  (±{BASELINE_TOLERANCE*100:.0f}% tolerance)")
    else:
        print(f"\n  ⚠️  Could not compute baseline — gas values missing. Continuing without drift check.")

    # ── Exposure + recovery loop ─────────────────────────────────────────────
    block_num  = 0
    total_sent = len(stab)

    while True:
        exposure_label = select_label()
        if exposure_label is None:
            break

        block_num += 1
        print(f"\n  {'═' * 54}")
        print(f"  Block {block_num}  |  {exposure_label}")
        print(f"  {'═' * 54}")
        print(f"\n  Steps:")
        print(f"    1. Apply 3 drops to a fresh cotton pad")
        print(f"    2. Wait 45 seconds (let light compounds flash off)")
        print(f"    3. Hold pad at the 3 cm tape mark on the intake")
        input(f"\n  Press ENTER when pad is in position and 45 s wait is done...")

        # Exposure
        exp = collect_block(exposure_label, "exposure", session_id, READINGS_EXPOSURE,
                            baseline_gas=baseline)
        total_sent += len(exp)

        # Remove pad and flush
        print(f"\n  🌬️  Remove pad from intake NOW.")
        print(f"  Fan flush for {FLUSH_DURATION_S // 60} minutes. Prepare next pad during wait.")
        countdown(FLUSH_DURATION_S, label="Flush: ")
        print(f"  ✅ Flush complete.")

        # Recovery check
        rec = collect_block("no_scent", "recovery", session_id, READINGS_RECOVERY,
                            baseline_gas=baseline)
        total_sent += len(rec)

        if baseline and rec:
            if recovery_ok(rec, baseline):
                print(f"\n  ✅ Baseline restored — block {block_num} is valid.")
            else:
                print(f"\n  ❌ Baseline NOT restored after {FLUSH_DURATION_S // 60} min flush.")
                while True:
                    ans = input(f"  Wait 1 more minute and recheck? (y/n): ").strip().lower()
                    if ans != "y":
                        print(f"  ⚠️  Block {block_num} flagged. Review in QA before training.")
                        break
                    countdown(60, label="Extended flush: ")
                    recheck = collect_block("no_scent", "recovery", session_id, 5,
                                           baseline_gas=baseline)
                    total_sent += len(recheck)
                    if recovery_ok(recheck, baseline):
                        print(f"  ✅ Baseline restored after extended flush.")
                        break
                    print(f"  ❌ Still not restored.")

        print(f"\n  📊 Block {block_num} done  |  Session total: {total_sent} readings")

    # ── Session summary ──────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"✨ Session complete: {session_id}")
    print(f"   Total readings sent : {total_sent}")
    print(f"\n💾 Export to ML training CSV:")
    print(f"   cd ml && python3 export_db_to_csv.py")
    print(f"\n🔍 Filter this session only:")
    print(f"   python3 export_db_to_csv.py --session={session_id}")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

# Backend API configuration
BACKEND_URL = "http://localhost:5001/api/sensor-data"
DEVICE_ID = "eNose001"

# Valid scent labels
VALID_SCENTS = ["cinnamon", "ginger", "orange", "vanilla", "no_scent"]

def prompt_for_scent():
    """Prompt user to select a scent label"""
    print("\n" + "="*60)
    print("Available scent labels:")
    for i, scent in enumerate(VALID_SCENTS, 1):
        print(f"  {i}. {scent}")
    print("="*60)
    
    while True:
        choice = input("\nEnter scent number (or 'q' to quit): ").strip()
        
        if choice.lower() == 'q':
            return None
        
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(VALID_SCENTS):
                return VALID_SCENTS[idx]
            else:
                print(f"❌ Invalid choice. Please enter 1-{len(VALID_SCENTS)}")
        except ValueError:
            print("❌ Invalid input. Please enter a number or 'q'")

def get_latest_sensor_readings():
    """Fetch the latest sensor readings from backend API"""
    print("\n📊 Fetching latest sensor readings from backend...")
    
    try:
        # Fetch latest sensor data from backend
        response = requests.get(f"{BACKEND_URL.replace('/sensor-data', '')}/sensor-data", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Get the most recent reading
            if isinstance(data, list) and len(data) > 0:
                latest = data[-1]  # Get last item
            elif isinstance(data, dict):
                latest = data
            else:
                print("❌ No sensor data available")
                return None
            
            # Extract sensor values
            sensor_data = {
                "temperature": latest.get("temperature"),
                "humidity": latest.get("humidity"),
                "pressure": latest.get("pressure"),
                "gas": latest.get("gas"),
                "voc": latest.get("voc"),
                "no2": latest.get("no2"),
                "voc_raw": latest.get("voc_raw"),
                "nox_raw": latest.get("nox_raw"),
                "ethanol": latest.get("ethanol"),
                "co_h2": latest.get("co_h2")
            }
            
            print("✅ Latest sensor readings:")
            print(f"   Temperature: {sensor_data['temperature']}°C")
            print(f"   Humidity: {sensor_data['humidity']}%")
            print(f"   Pressure: {sensor_data['pressure']} kPa")
            print(f"   Gas: {sensor_data['gas']} Ω")
            print(f"   VOC: {sensor_data['voc']}")
            print(f"   NO2: {sensor_data['no2']}")
            
            return sensor_data
            
        else:
            print(f"❌ Failed to fetch sensor data: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error while fetching sensor data: {e}")
        return None

def send_labeled_data(scent_label, sensor_data):
    """Send labeled sensor data to backend API"""
    payload = {
        "device_id": DEVICE_ID,
        "timestamp": int(time.time() * 1000),  # milliseconds
        "scent": scent_label,  # Add scent label
        "temperature": sensor_data.get("temperature"),
        "humidity": sensor_data.get("humidity"),
        "pressure": sensor_data.get("pressure"),
        "gas": sensor_data.get("gas"),
        "voc_raw": sensor_data.get("voc_raw"),
        "nox_raw": sensor_data.get("nox_raw"),
        "no2": sensor_data.get("no2"),
        "ethanol": sensor_data.get("ethanol"),
        "voc": sensor_data.get("voc"),
        "co_h2": sensor_data.get("co_h2"),
        "sensorValues": [
            sensor_data.get("temperature"),
            sensor_data.get("humidity"),
            sensor_data.get("pressure"),
            sensor_data.get("gas"),
            sensor_data.get("voc"),
            sensor_data.get("no2")
        ]
    }
    
    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Data sent successfully!")
            print(f"   Scent label: {scent_label}")
            print(f"   Predicted: {result.get('prediction', {}).get('scent', 'N/A')}")
            print(f"   Confidence: {result.get('prediction', {}).get('confidence', 0)*100:.1f}%")
            return True
        else:
            print(f"❌ Failed to send data: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🌸  TeleScent Labeled Data Collection  🌸")
    print("="*60)
    print(f"\nBackend: {BACKEND_URL}")
    print(f"Device ID: {DEVICE_ID}")
    
    collection_count = 0
    
    while True:
        # Prompt for scent label
        scent = prompt_for_scent()
        
        if scent is None:
            print("\n👋 Exiting data collection...")
            break
        
        print(f"\n✅ Selected scent: {scent}")
        
        # Get latest sensor readings from backend
        sensor_data = get_latest_sensor_readings()
        
        if sensor_data is None:
            print("⚠️  No sensor data available. Make sure the eNose device is sending data.")
            retry = input("Try again? (y/n): ").strip().lower()
            if retry != 'y':
                continue
            else:
                continue
        
        # Confirm before sending
        print(f"\n📤 Ready to send labeled data:")
        print(f"   Scent: {scent}")
        print(f"   Sensors: {json.dumps(sensor_data, indent=2)}")
        
        confirm = input("\nSend this data? (y/n): ").strip().lower()
        
        if confirm == 'y':
            if send_labeled_data(scent, sensor_data):
                collection_count += 1
                print(f"\n📊 Total samples collected: {collection_count}")
            
            # Ask if user wants to collect more
            more = input("\nCollect another sample? (y/n): ").strip().lower()
            if more != 'y':
                break
        else:
            print("❌ Data not sent")
    
    print(f"\n✨ Collection session complete!")
    print(f"   Total samples: {collection_count}")
    print("\n💾 To export all data to CSV, run:")
    print("   python3 export_db_to_csv.py\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
