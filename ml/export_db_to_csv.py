#!/usr/bin/env python3
"""
Export sensor data directly from SQLite database to CSV
"""

import sqlite3
import csv
from datetime import datetime

DATABASE_PATH = "../backend/database.sqlite"
OUTPUT_FILE = "collected_sensor_data.csv"

def export_sensor_data_to_csv():
    """Export all sensor data from database to CSV"""
    try:
        # Connect to database
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row  # Access columns by name
        cursor = conn.cursor()
        
        # Get all sensor data
        cursor.execute("""
            SELECT 
                id,
                deviceId,
                scent,
                timestamp,
                sensorValues,
                sensor0,
                sensor1,
                sensor2,
                sensor3,
                sensor4,
                sensor5,
                predictedScent,
                confidence,
                createdAt,
                updatedAt
            FROM sensor_data
            ORDER BY createdAt ASC
        """)
        
        rows = cursor.fetchall()
        
        if not rows:
            print("⚠️  No data found in database")
            conn.close()
            return
        
        print(f"✅ Found {len(rows)} sensor readings in database")
        
        # Write to CSV
        with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as csvfile:
            # Define column names
            fieldnames = [
                'id', 'deviceId', 'scent', 'timestamp', 
                'sensorValues',
                'sensor0', 'sensor1', 'sensor2', 
                'sensor3', 'sensor4', 'sensor5',
                'predictedScent', 'confidence',
                'createdAt', 'updatedAt'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            # Write each row
            device_counts = {}
            for row in rows:
                writer.writerow(dict(row))
                device_id = row['deviceId']
                device_counts[device_id] = device_counts.get(device_id, 0) + 1
            
            print(f"\n📝 Exported {len(rows)} readings to {OUTPUT_FILE}")
            print(f"\n📊 Summary by device:")
            for device_id, count in sorted(device_counts.items()):
                print(f"   {device_id}: {count} readings")
        
        conn.close()
        print(f"\n✨ Done! Data saved to: {OUTPUT_FILE}\n")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("\n" + "="*60)
    print("📊  TeleScent Data Export from Database  📊")
    print("="*60 + "\n")
    
    export_sensor_data_to_csv()

if __name__ == "__main__":
    main()
