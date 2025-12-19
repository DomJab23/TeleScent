#!/usr/bin/env python3
"""
Sensor Data Collection Script for TeleScent
Collects sensor readings and sends them to the backend API

Usage:
    python collect_sensor_data.py --device-id YOUR_DEVICE --scent banana --duration 60
    
Options:
    --device-id    Device identifier (default: test_device)
    --scent        Scent being collected (banana, orange, cinnamon, vanilla, no_scent)
    --duration     Collection duration in seconds (default: 30)
    --interval     Interval between readings in seconds (default: 1)
    --api-url      Backend API URL (default: http://localhost:5001)
"""

import argparse
import time
import random
import requests
import json
from datetime import datetime

# Default API endpoint
DEFAULT_API_URL = "http://localhost:5001"

# Simulated sensor ranges (replace with actual sensor readings)
SENSOR_RANGES = {
    'temperature': (20.0, 25.0),
    'humidity': (40.0, 60.0),
    'pressure': (100.0, 102.0),
    'gas': (10000, 50000),
    'voc_raw': (30000, 35000),
    'nox_raw': (25000, 30000),
    'no2': (100, 500),
    'ethanol': (50, 200),
    'voc': (100, 400),
    'co_h2': (50, 150)
}

# Scent-specific sensor value modifiers
SCENT_MODIFIERS = {
    'banana': {
        'voc': 1.5,
        'ethanol': 1.3,
        'VOC_multichannel': 1.5,
        'NO2': 1.1
    },
    'orange': {
        'voc': 1.4,
        'ethanol': 1.2,
        'VOC_multichannel': 1.4,
        'NO2': 1.2
    },
    'cinnamon': {
        'voc': 1.6,
        'co_h2': 1.3,
        'VOC_multichannel': 1.6,
        'NO2': 1.3
    },
    'vanilla': {
        'voc': 1.3,
        'ethanol': 1.4,
        'VOC_multichannel': 1.3,
        'NO2': 1.1
    },
    'no_scent': {
        # Baseline values - no modification
    }
}


def generate_sensor_reading(device_id, scent='no_scent'):
    """
    Generate a simulated sensor reading
    Replace this with actual sensor reading code for real hardware
    """
    # Base sensor values
    reading = {
        'device_id': device_id,
        'timestamp': int(time.time() * 1000),  # milliseconds
    }
    
    # Generate values for each sensor
    for sensor, (min_val, max_val) in SENSOR_RANGES.items():
        base_value = random.uniform(min_val, max_val)
        
        # Apply scent-specific modifiers
        if scent in SCENT_MODIFIERS:
            modifier = SCENT_MODIFIERS[scent].get(sensor, 1.0)
            base_value *= modifier
        
        reading[sensor] = round(base_value, 2)
    
    return reading


def send_sensor_data(api_url, reading):
    """Send sensor reading to the backend API"""
    try:
        response = requests.post(
            f"{api_url}/api/sensor-data",
            json=reading,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Data sent successfully")
            if 'predicted_scent' in result:
                print(f"   🔮 Predicted: {result['predicted_scent']} (confidence: {result.get('confidence', 0):.2%})")
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
        return False


def collect_data(device_id, scent, duration, interval, api_url):
    """
    Collect sensor data for a specified duration
    """
    print("=" * 60)
    print("🌸 TeleScent Data Collection Started")
    print("=" * 60)
    print(f"Device ID: {device_id}")
    print(f"Scent: {scent}")
    print(f"Duration: {duration}s")
    print(f"Interval: {interval}s")
    print(f"API URL: {api_url}")
    print("=" * 60)
    
    start_time = time.time()
    reading_count = 0
    success_count = 0
    
    try:
        while (time.time() - start_time) < duration:
            reading_count += 1
            
            # Generate sensor reading
            reading = generate_sensor_reading(device_id, scent)
            
            # Display reading info
            print(f"\n📊 Reading #{reading_count} at {datetime.now().strftime('%H:%M:%S')}")
            print(f"   VOC: {reading['voc']:.2f}, NO2: {reading['no2']:.2f}, Ethanol: {reading['ethanol']:.2f}")
            
            # Send to API
            if send_sensor_data(api_url, reading):
                success_count += 1
            
            # Wait for next reading
            time.sleep(interval)
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Collection stopped by user")
    
    finally:
        # Summary
        print("\n" + "=" * 60)
        print("📈 Collection Summary")
        print("=" * 60)
        print(f"Total readings: {reading_count}")
        print(f"Successful: {success_count}")
        print(f"Failed: {reading_count - success_count}")
        print(f"Success rate: {(success_count/reading_count*100):.1f}%" if reading_count > 0 else "N/A")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='Collect sensor data for TeleScent')
    parser.add_argument('--device-id', type=str, default='test_device',
                        help='Device identifier')
    parser.add_argument('--scent', type=str, default='no_scent',
                        choices=['banana', 'orange', 'cinnamon', 'vanilla', 'no_scent'],
                        help='Scent being collected')
    parser.add_argument('--duration', type=int, default=30,
                        help='Collection duration in seconds')
    parser.add_argument('--interval', type=float, default=1.0,
                        help='Interval between readings in seconds')
    parser.add_argument('--api-url', type=str, default=DEFAULT_API_URL,
                        help='Backend API URL')
    
    args = parser.parse_args()
    
    collect_data(
        device_id=args.device_id,
        scent=args.scent,
        duration=args.duration,
        interval=args.interval,
        api_url=args.api_url
    )


if __name__ == '__main__':
    main()
