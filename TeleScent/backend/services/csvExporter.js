// services/csvExporter.js
const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '../../collected_data');
const CSV_FILE = path.join(CSV_DIR, 'sensor_data.csv');

// CSV header
const CSV_HEADER = 'ID,Device ID,Scent,Timestamp,Sensor 0,Sensor 1,Sensor 2,Sensor 3,Sensor 4,Sensor 5,Predicted Scent,Confidence,Created At\n';

// Ensure CSV directory exists
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Append sensor data to CSV file
 * @param {Object} sensorData - Sensor data record
 */
async function appendToCsv(sensorData) {
  try {
    const fileExists = fs.existsSync(CSV_FILE);
    
    // Write header if file doesn't exist
    if (!fileExists) {
      fs.writeFileSync(CSV_FILE, CSV_HEADER);
    }
    
    // Create CSV row
    const row = [
      escapeCsvField(sensorData.id),
      escapeCsvField(sensorData.deviceId),
      escapeCsvField(sensorData.scent),
      escapeCsvField(sensorData.timestamp),
      escapeCsvField(sensorData.sensor0),
      escapeCsvField(sensorData.sensor1),
      escapeCsvField(sensorData.sensor2),
      escapeCsvField(sensorData.sensor3),
      escapeCsvField(sensorData.sensor4),
      escapeCsvField(sensorData.sensor5),
      escapeCsvField(sensorData.predictedScent),
      escapeCsvField(sensorData.confidence),
      escapeCsvField(sensorData.createdAt),
    ].join(',') + '\n';
    
    // Append to file
    fs.appendFileSync(CSV_FILE, row);
    
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
