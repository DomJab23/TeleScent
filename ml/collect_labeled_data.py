#!/usr/bin/env python3
"""
Interactive script to collect labeled sensor data from eNose device.
Prompts for scent label, then sends data to backend API with the label.
"""

import requests
import time
import json
from datetime import datetime

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
