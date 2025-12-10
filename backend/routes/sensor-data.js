const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sensorDataStore, predictionStore } = require('../services/dataStore');

// SSE clients list
const sseClients = [];
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

    // Store the data (grouped by device) - prediction happens elsewhere
    if (!sensorDataStore[deviceId]) {
      sensorDataStore[deviceId] = [];
    }
    
    // Keep only last 100 readings per device
    sensorDataStore[deviceId].push(dataEntry);
    if (sensorDataStore[deviceId].length > 100) {
      sensorDataStore[deviceId].shift();
    }

    // Broadcast new reading to all connected SSE clients
    try {
      const payload = JSON.stringify({ type: 'sensor', data: dataEntry });
      sseClients.forEach(clientRes => {
        try {
          clientRes.write(`event: sensor\n`);
          clientRes.write(`data: ${payload}\n\n`);
        } catch (e) {
          // ignore per-client errors
        }
      });
    } catch (e) {
      console.error('Error broadcasting SSE:', e);
    }
    // Send acknowledgment
    res.status(200).json({
      message: 'Sensor data received successfully',
      data: dataEntry
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
 * GET /api/sensor-data/stream
 * Server-Sent Events stream that emits each incoming sensor reading as it arrives.
 */
router.get('/stream', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // Send an initial comment to establish the stream
  res.write(': connected\n\n');

  // Add to clients
  sseClients.push(res);

  // Remove client when connection closes
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

/**
 * GET /api/sensor-data/emitter
 * Get emitter control for the most recent prediction (any device)
 * Returns format: {"0":0,"1":0,"2":255,"3":0,"4":0,"5":0,"6":0,"7":0}
 */
router.get('/emitter', async (req, res) => {
  try {
    // Find the most recently updated prediction
    let latestPrediction = null;
    let latestTime = null;
    
    Object.keys(predictionStore).forEach(deviceId => {
      const prediction = predictionStore[deviceId];
      if (prediction && prediction.timestamp) {
        const predictionTime = new Date(prediction.timestamp);
        
        if (!latestTime || predictionTime > latestTime) {
          latestTime = predictionTime;
          latestPrediction = prediction;
        }
      }
    });
    
    // If no prediction found, return all zeros
    if (!latestPrediction || !latestPrediction.emitter_control) {
      return res.json({"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0});
    }
    
    // Return the emitter control
    res.json(latestPrediction.emitter_control);
    
  } catch (error) {
    console.error('Error getting emitter control:', error);
    res.json({"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0});
  }
});

/**
 * GET /api/sensor-data/:deviceId/emitter
 * Get emitter control for latest prediction
 * Returns format: {"0":0,"1":0,"2":255,"3":0,"4":0,"5":0,"6":0,"7":0}
 */
router.get('/:deviceId/emitter', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const prediction = predictionStore[deviceId];
    
    if (!prediction || !prediction.emitter_control) {
      return res.json({"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0});
    }
    
    // Return just the emitter control object
    res.json(prediction.emitter_control);
    
  } catch (error) {
    console.error('Error getting emitter control:', error);
    res.json({"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0});
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
 * Get all devices and their latest data with ML predictions
 * NOTE: Authentication temporarily disabled for testing
 */
router.get('/', async (req, res) => {
  try {
    const summary = {};

    Object.keys(sensorDataStore).forEach(deviceId => {
      const data = sensorDataStore[deviceId];
      const latestReading = data[data.length - 1] || null;
      
      // Attach ML prediction if available
      if (latestReading && predictionStore[deviceId]) {
        latestReading.ml_prediction = predictionStore[deviceId];
      }
      
      summary[deviceId] = {
        lastUpdate: latestReading?.receivedAt || null,
        dataCount: data.length,
        latestReading: latestReading
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
module.exports.sensorDataStore = sensorDataStore;
