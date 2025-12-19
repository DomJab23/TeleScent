#!/usr/bin/env python3
"""
Export sensor data from backend API to CSV file
"""

import requests
import csv
import json
from datetime import datetime

API_URL = "http://localhost:5001/api/sensor-data"
OUTPUT_FILE = "collected_sensor_data.csv"

def fetch_sensor_data():
    """Fetch all sensor data from the backend API"""
    try:
        print(f"📡 Fetching data from {API_URL}...")
        response = requests.get(API_URL)
        
        if response.status_code == 200:
            data = response.json()
            
            # Handle case where API returns a message with data array
            if isinstance(data, dict) and 'data' in data:
                data = data['data']
            
            # Ensure data is a list
            if not isinstance(data, list):
                print(f"⚠️  Unexpected data format: {type(data)}")
                print(f"Response: {data}")
                return []
            
            print(f"✅ Fetched {len(data)} sensor readings")
            return data
        else:
            print(f"❌ Failed to fetch data: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        import traceback
        traceback.print_exc()
        return []

def export_to_csv(data, filename):
    """Export sensor data to CSV file"""
    if not data:
        print("⚠️  No data to export")
        return
    
    print(f"\n📝 Exporting to {filename}...")
    
    # Open CSV file for writing
    with open(filename, 'w', newline='') as csvfile:
        # Get all field names from the first record
        fieldnames = ['id', 'deviceId', 'scent', 'timestamp', 'createdAt']
        
        # Add sensor columns (sensor_0 through sensor_5)
        for i in range(6):
            fieldnames.append(f'sensor_{i}')
        
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Write each reading
        for reading in data:
            row = {
                'id': reading.get('id'),
                'deviceId': reading.get('deviceId'),
                'scent': reading.get('scent'),
                'timestamp': reading.get('timestamp'),
                'createdAt': reading.get('createdAt')
            }
            
            # Parse sensor values
            sensor_values = reading.get('sensorValues', [])
            if isinstance(sensor_values, str):
                sensor_values = json.loads(sensor_values)
            
            # Add each sensor value
            for i, value in enumerate(sensor_values):
                row[f'sensor_{i}'] = value
            
            writer.writerow(row)
        
        print(f"✅ Exported {len(data)} readings to {filename}")
        print(f"\n📊 Summary by scent:")
        
        # Count by scent
        scent_counts = {}
        for reading in data:
            scent = reading.get('scent', 'unknown')
            scent_counts[scent] = scent_counts.get(scent, 0) + 1
        
        for scent, count in sorted(scent_counts.items()):
            print(f"   {scent}: {count} readings")

def main():
    print("\n" + "="*60)
    print("📊  TeleScent Data Export to CSV  📊")
    print("="*60 + "\n")
    
    # Fetch data
    data = fetch_sensor_data()
    
    if data:
        # Export to CSV
        export_to_csv(data, OUTPUT_FILE)
        print(f"\n✨ Done! Data saved to: {OUTPUT_FILE}\n")
    else:
        print("\n⚠️  No data to export. Collect some sensor data first!\n")

if __name__ == "__main__":
    main()
