// services/csvExporter.js
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

const CSV_DIR = path.join(__dirname, '../../collected_data');
const CSV_FILE = path.join(CSV_DIR, 'sensor_data.csv');

// Ensure CSV directory exists
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

// Create CSV writer
const csvWriter = createObjectCsvWriter({
  path: CSV_FILE,
  header: [
    { id: 'id', title: 'ID' },
    { id: 'deviceId', title: 'Device ID' },
    { id: 'scent', title: 'Scent' },
    { id: 'timestamp', title: 'Timestamp' },
    { id: 'sensor0', title: 'Sensor 0' },
    { id: 'sensor1', title: 'Sensor 1' },
    { id: 'sensor2', title: 'Sensor 2' },
    { id: 'sensor3', title: 'Sensor 3' },
    { id: 'sensor4', title: 'Sensor 4' },
    { id: 'sensor5', title: 'Sensor 5' },
    { id: 'predictedScent', title: 'Predicted Scent' },
    { id: 'confidence', title: 'Confidence' },
    { id: 'createdAt', title: 'Created At' },
  ],
  append: true, // Append to existing file
});

/**
 * Append sensor data to CSV file
 * @param {Object} sensorData - Sensor data record
 */
async function appendToCsv(sensorData) {
  try {
    // Check if file exists, if not write header
    if (!fs.existsSync(CSV_FILE)) {
      // First write - create file with header
      await csvWriter.writeRecords([sensorData]);
    } else {
      // Append to existing file
      await csvWriter.writeRecords([sensorData]);
    }
    
    console.log(`📝 Appended to CSV: ${CSV_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ Error writing to CSV:', error);
    return false;
  }
}

/**
 * Export all sensor data from database to CSV
 * @param {Array} sensorDataArray - Array of sensor data records
 */
async function exportAllToCsv(sensorDataArray) {
  try {
    const records = sensorDataArray.map(record => ({
      id: record.id,
      deviceId: record.deviceId,
      scent: record.scent || '',
      timestamp: record.timestamp,
      sensor0: record.sensor0,
      sensor1: record.sensor1,
      sensor2: record.sensor2,
      sensor3: record.sensor3,
      sensor4: record.sensor4,
      sensor5: record.sensor5,
      predictedScent: record.predictedScent || '',
      confidence: record.confidence || '',
      createdAt: record.createdAt,
    }));

    // Overwrite file with all data
    const fullCsvWriter = createObjectCsvWriter({
      path: CSV_FILE,
      header: csvWriter.header,
      append: false, // Overwrite
    });

    await fullCsvWriter.writeRecords(records);
    console.log(`✅ Exported ${records.length} records to ${CSV_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ Error exporting to CSV:', error);
    return false;
  }
}

/**
 * Get the CSV file path
 */
function getCsvFilePath() {
  return CSV_FILE;
}

module.exports = {
  appendToCsv,
  exportAllToCsv,
  getCsvFilePath,
};
