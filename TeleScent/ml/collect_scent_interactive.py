#!/usr/bin/env python3
"""
Interactive Sensor Data Collection Script for TeleScent
Asks the user what scent they are collecting
"""

import requests
import time
import random
from datetime import datetime, timezone

API_URL = "http://localhost:5001/api/sensor-data"

def generate_sensor_reading():
    """Generate simulated sensor readings (6 gas sensors)"""
    return [
        random.uniform(100, 900),  # Sensor 0
        random.uniform(100, 900),  # Sensor 1
        random.uniform(100, 900),  # Sensor 2
        random.uniform(100, 900),  # Sensor 3
        random.uniform(100, 900),  # Sensor 4
        random.uniform(100, 900),  # Sensor 5
    ]

def collect_data(device_id, scent, duration, interval):
    """
    Collect sensor data for a specified duration
    
    Args:
        device_id: Unique device identifier
        scent: The scent being collected (e.g., 'banana', 'apple', 'none')
        duration: Total collection time in seconds
        interval: Time between readings in seconds
    """
    print(f"\n🌸 Starting data collection for '{scent}'")
    print(f"📱 Device ID: {device_id}")
    print(f"⏱️  Duration: {duration}s, Interval: {interval}s")
    print(f"🎯 Target: {duration // interval} readings\n")
    
    readings_sent = 0
    start_time = time.time()
    
    while (time.time() - start_time) < duration:
        # Generate sensor reading
        sensor_values = generate_sensor_reading()
        
        # Prepare payload
        payload = {
            "deviceId": device_id,
            "sensorValues": sensor_values,
            "scent": scent,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            # Send to backend
            response = requests.post(API_URL, json=payload)
            
            if response.status_code in [200, 201]:
                readings_sent += 1
                print(f"✅ Reading #{readings_sent} sent | Scent: {scent} | Sensors: {[f'{v:.1f}' for v in sensor_values]}")
            else:
                print(f"❌ Failed to send reading: {response.status_code}")
        
        except requests.exceptions.ConnectionError:
            print(f"⚠️  Connection error - is the backend running at {API_URL}?")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        time.sleep(interval)
    
    print(f"\n✨ Collection complete! Sent {readings_sent} readings for '{scent}'\n")

def interactive_mode():
    """Interactive mode - asks user for scent and collection parameters"""
    print("\n" + "="*60)
    print("🌸  TeleScent Data Collection - Interactive Mode  🌸")
    print("="*60)
    
    # Get device ID
    device_id = input("\n📱 Enter Device ID (press Enter for 'klaus_device'): ").strip()
    if not device_id:
        device_id = "klaus_device"
    
    while True:
        print("\n" + "-"*60)
        
        # Get scent
        print("\n🌺 What scent are you collecting?")
        print("   Examples: banana, apple, orange, rose, coffee, none")
        scent = input("   Scent: ").strip().lower()
        
        if not scent:
            print("⚠️  Scent name cannot be empty!")
            continue
        
        # Get duration
        duration_input = input("\n⏱️  Collection duration in seconds (press Enter for 60): ").strip()
        duration = int(duration_input) if duration_input else 60
        
        # Get interval
        interval_input = input("⏱️  Interval between readings in seconds (press Enter for 2): ").strip()
        interval = int(interval_input) if interval_input else 2
        
        # Confirm
        print(f"\n📋 Summary:")
        print(f"   Device: {device_id}")
        print(f"   Scent: {scent}")
        print(f"   Duration: {duration}s")
        print(f"   Interval: {interval}s")
        print(f"   Expected readings: {duration // interval}")
        
        confirm = input("\n✅ Start collection? (y/n): ").strip().lower()
        
        if confirm == 'y':
            collect_data(device_id, scent, duration, interval)
            
            # Ask if they want to collect more
            again = input("\n🔄 Collect another scent? (y/n): ").strip().lower()
            if again != 'y':
                print("\n👋 Thanks for using TeleScent Data Collection!\n")
                break
        else:
            print("\n❌ Collection cancelled.")
            retry = input("🔄 Try again? (y/n): ").strip().lower()
            if retry != 'y':
                print("\n👋 Goodbye!\n")
                break

def main():
    interactive_mode()

if __name__ == "__main__":
    main()
