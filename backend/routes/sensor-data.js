const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { spawn } = require('child_process');
const path = require('path');

// Store sensor data in memory (for now - you can add database storage later)
const sensorDataStore = {};

/**
 * Call Python ML model for scent prediction
 * @param {Object} sensorReading - Sensor data in Arduino format
 * @returns {Promise<Object>} - Prediction result
 */
async function getPrediction(sensorReading) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../../ml/serve.py');
    // Detect if running in Docker and use appropriate Python path
    const isDocker = process.env.DOCKER_ENV === 'true';
    const pythonPath = isDocker ? '/app/venv/bin/python3' : '/home/klaus/TeleScent/.venv/bin/python3';
    const python = spawn(pythonPath, [pythonScript]);
    
    let outputData = '';
    let errorData = '';
    
    // Send sensor data to Python script via stdin
    python.stdin.write(JSON.stringify(sensorReading));
    python.stdin.end();
    
    // Collect output
    python.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python prediction error (exit code ' + code + '):');
        console.error('   stderr:', errorData);
        console.error('   stdout:', outputData);
        resolve({
          predicted_scent: 'error',
          confidence: 0.0,
          error: 'Prediction service unavailable'
        });
      } else {
        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (e) {
          console.error('❌ Failed to parse prediction:', e);
          console.error('   Output was:', outputData);
          resolve({
            predicted_scent: 'error',
            confidence: 0.0,
            error: 'Invalid prediction response'
          });
        }
      }
    });
  });
}

/**
 * POST /api/sensor-data
 * Receive sensor data from Arduino/ESP32
 * 
 * Expected JSON body (from Arduino):
 * {
 *   "device_id": "string",
 *   "timestamp": number (milliseconds),
 *   "temperature": number,
 *   "humidity": number,
 *   "pressure": number,
 *   "gas": number,
 *   "voc_raw": number,
 *   "nox_raw": number,
 *   "no2": number,
 *   "ethanol": number,
 *   "voc": number,
 *   "co_h2": number
 * }
 */
// NOTE: Authentication temporarily disabled for GSM testing
router.post('/', async (req, res) => {
  try {
    // Support both device_id (Arduino) and deviceId (camelCase)
    const deviceId = req.body.device_id || req.body.deviceId;
    
    // Extract all sensor values
    const {
      timestamp,
      temperature,
      humidity,
      pressure,
      gas,
      voc_raw,
      nox_raw,
      no2,
      ethanol,
      voc,
      co_h2
    } = req.body;

    // Validate required fields
    if (!deviceId) {
      return res.status(400).json({
        message: 'Missing required field: device_id',
        received: req.body
      });
    }

    // Create data entry with all sensor readings
    const dataEntry = {
      deviceId,
      timestamp: timestamp || Date.now(),
      temperature: temperature ?? null,
      humidity: humidity ?? null,
      pressure: pressure ?? null,
      gas: gas ?? null,
      voc_raw: voc_raw ?? null,
      nox_raw: nox_raw ?? null,
      no2: no2 ?? null,
      ethanol: ethanol ?? null,
      voc: voc ?? null,
      co_h2: co_h2 ?? null,
      receivedAt: new Date().toISOString(),
      userId: req.user?.id || 'anonymous' // Handle unauthenticated requests
    };

    console.log(`📊 Sensor data received from ${deviceId}:`, {
      temperature: dataEntry.temperature,
      humidity: dataEntry.humidity,
      pressure: dataEntry.pressure,
      gas: dataEntry.gas,
      voc: dataEntry.voc,
      no2: dataEntry.no2
    });

    // Get ML prediction for scent detection
    let prediction = null;
    try {
      prediction = await getPrediction(req.body);
      console.log(`🤖 ML Prediction: ${prediction.predicted_scent} (${(prediction.confidence * 100).toFixed(1)}%)`);
      
      // Add prediction to data entry
      dataEntry.ml_prediction = {
        scent: prediction.predicted_scent,
        confidence: prediction.confidence,
        top_predictions: prediction.top_predictions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('⚠️  ML prediction failed:', error.message);
      dataEntry.ml_prediction = {
        scent: 'error',
        confidence: 0.0,
        error: error.message
      };
    }

    // Store the data (grouped by device)
    if (!sensorDataStore[deviceId]) {
      sensorDataStore[deviceId] = [];
    }
    
    // Keep only last 100 readings per device
    sensorDataStore[deviceId].push(dataEntry);
    if (sensorDataStore[deviceId].length > 100) {
      sensorDataStore[deviceId].shift();
    }

    // Send acknowledgment with prediction
    res.status(200).json({
      message: 'Sensor data received successfully',
      data: dataEntry,
      ml_prediction: dataEntry.ml_prediction
    });

  } catch (error) {
    console.error('Error receiving sensor data:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/sensor-data/:deviceId
 * Get latest sensor data for a device
 * NOTE: Authentication temporarily disabled for testing
 */
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const deviceData = sensorDataStore[deviceId] || [];
    
    // Return only the requested limit of most recent data
    const latestData = deviceData.slice(-limit);

    res.json({
      message: 'Sensor data retrieved successfully',
      deviceId,
      dataCount: latestData.length,
      data: latestData
    });

  } catch (error) {
    console.error('Error retrieving sensor data:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/sensor-data
 * Get all devices and their latest data
 * NOTE: Authentication temporarily disabled for testing
 */
router.get('/', async (req, res) => {
  try {
    const summary = {};

    Object.keys(sensorDataStore).forEach(deviceId => {
      const data = sensorDataStore[deviceId];
      summary[deviceId] = {
        lastUpdate: data[data.length - 1]?.receivedAt || null,
        dataCount: data.length,
        latestReading: data[data.length - 1] || null
      };
    });

    res.json({
      message: 'All devices data summary',
      devices: summary,
      totalDevices: Object.keys(summary).length
    });

  } catch (error) {
    console.error('Error retrieving all sensor data:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
