const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '../../collected_data');
const CSV_FILE = path.join(CSV_DIR, 'sensor_data.csv');

const CSV_HEADER = 'ID,Device ID,Scent,Session ID,Phase,Timestamp,Sensor 0,Sensor 1,Sensor 2,Sensor 3,Sensor 4,Sensor 5,Ethanol,CoH2,VocRaw,NoxRaw,Predicted Scent,Confidence,Created At\n';

const CSV_FIELDS = [
  'id', 'deviceId', 'scent', 'sessionId', 'phase', 'timestamp',
  'sensor0', 'sensor1', 'sensor2', 'sensor3', 'sensor4', 'sensor5',
  'ethanol', 'coH2', 'vocRaw', 'noxRaw',
  'predictedScent', 'confidence', 'createdAt',
];

if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function appendToCsv(sensorData) {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      fs.writeFileSync(CSV_FILE, CSV_HEADER);
    }
    const row = CSV_FIELDS.map((f) => escapeCsvField(sensorData[f])).join(',') + '\n';
    fs.appendFileSync(CSV_FILE, row);
    return true;
  } catch (error) {
    console.error('Error writing to CSV:', error);
    return false;
  }
}

module.exports = { appendToCsv };
