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
    // --- Detect scent removal by VOC/NO2 drop ---
    // If VOC or NO2 drops by 7 or more compared to previous reading, force 'no_scent'
    let forceNoScentByDrop = false;
    const prev = sensorDataStore[deviceId]?.length > 1 ? sensorDataStore[deviceId][sensorDataStore[deviceId].length - 2] : null;
    if (prev) {
      // Use 'voc' and 'no2' fields (fall back to 0 if missing)
      const prevVOC = prev.voc ?? 0;
      const prevNO2 = prev.no2 ?? 0;
      const currVOC = dataEntry.voc ?? 0;
      const currNO2 = dataEntry.no2 ?? 0;
      if ((prevVOC - currVOC) >= 4 || (prevNO2 - currNO2) >= 4) {
        forceNoScentByDrop = true;
        console.log(`🚦 VOC or NO2 dropped by 4 or more (VOC: ${prevVOC}→${currVOC}, NO2: ${prevNO2}→${currNO2}), forcing 'no_scent'.`);
      }
      // If VOC or NO2 rises by 4 or more, reset consecutive prediction counter for this device
      if ((currVOC - prevVOC) >= 4 || (currNO2 - prevNO2) >= 4) {
        if (predictionStore._consecutiveState && predictionStore._consecutiveState[deviceId]) {
          predictionStore._consecutiveState[deviceId].lastScent = null;
          predictionStore._consecutiveState[deviceId].count = 0;
          console.log(`🔄 VOC or NO2 rose by 4 or more (VOC: ${prevVOC}→${currVOC}, NO2: ${prevNO2}→${currNO2}), counter reset for new scent.`);
        }
      }
    }
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

    // Log ALL chemical sensors for ML debugging
    console.log(`🔬 Chemical sensors (for ML):`, {
      voc_raw: dataEntry.voc_raw,
      nox_raw: dataEntry.nox_raw,
      no2: dataEntry.no2,
      ethanol: dataEntry.ethanol,
      voc: dataEntry.voc,
      co_h2: dataEntry.co_h2
    });

    // Store the data (grouped by device)
    if (!sensorDataStore[deviceId]) {
      sensorDataStore[deviceId] = [];
    }
    // Keep only last 100 readings per device
    sensorDataStore[deviceId].push(dataEntry);
    if (sensorDataStore[deviceId].length > 100) {
      sensorDataStore[deviceId].shift();
    }

    // Always run prediction for every POST (no caching)
    const { getPrediction, scentToEmitterControl } = require('../services/predictionService');
    console.log(`🔮 Running prediction for ${deviceId} (every POST)...`);
    const prediction = await getPrediction(dataEntry);
    console.log(`🤖 ML Prediction: ${prediction.predicted_scent} (${(prediction.confidence * 100).toFixed(1)}%)`);

    // --- Consecutive prediction logic (backend, per device) ---
    if (!predictionStore._consecutiveState) predictionStore._consecutiveState = {};
    if (!predictionStore._consecutiveState[deviceId]) {
      predictionStore._consecutiveState[deviceId] = { lastScent: null, count: 0 };
    }
    const state = predictionStore._consecutiveState[deviceId];
    let finalScent = prediction.predicted_scent;
    let finalConfidence = prediction.confidence;
    let finalTopPredictions = prediction.top_predictions;
    let forcedNoScent = false;

    // If VOC or NO2 dropped by 7, force no_scent
    if (forceNoScentByDrop) {
      finalScent = 'no_scent';
      finalConfidence = 1.0;
      finalTopPredictions = [{ scent: 'no_scent', confidence: 1.0 }];
      forcedNoScent = true;
      state.lastScent = 'no_scent';
      state.count = 0;
      console.log(`🚦 Forcing 'no_scent' due to VOC/NO2 drop.`);
    } else if (finalScent !== state.lastScent) {
      state.lastScent = finalScent;
      state.count = 1;
      console.log(`🔄 Scent changed to ${finalScent}, counter reset.`);
    } else {
      state.count += 1;
      console.log(`🔁 Scent '${finalScent}' count: ${state.count}`);
      if (state.count >= 3 && finalScent !== 'no_scent') {
        finalScent = 'no_scent';
        finalConfidence = 1.0;
        finalTopPredictions = [{ scent: 'no_scent', confidence: 1.0 }];
        forcedNoScent = true;
        state.lastScent = 'no_scent';
        state.count = 0; // Reset counter after forcing no_scent
        console.log(`🚦 Forcing 'no_scent' after 3 consecutive predictions. Counter reset.`);
      }
    }

    const emitterControl = scentToEmitterControl(finalScent, finalConfidence);

    // Store the prediction (overwrite for this device)
    predictionStore[deviceId] = {
      scent: finalScent,
      confidence: finalConfidence,
      top_predictions: finalTopPredictions,
      emitter_control: emitterControl,
      timestamp: new Date().toISOString(),
      lastProcessedTime: dataEntry.receivedAt,
      sensorData: {
        deviceId: dataEntry.deviceId,
        temperature: dataEntry.temperature,
        humidity: dataEntry.humidity,
        pressure: dataEntry.pressure,
        gas: dataEntry.gas,
        voc_raw: dataEntry.voc_raw,
        nox_raw: dataEntry.nox_raw,
        no2: dataEntry.no2,
        ethanol: dataEntry.ethanol,
        voc: dataEntry.voc,
        co_h2: dataEntry.co_h2
      },
      forcedNoScent
    };
    console.log(`✅ Prediction stored for ${deviceId}:`, emitterControl);

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

    // Send acknowledgment with prediction and emitter control
    res.status(200).json({
      message: 'Sensor data received and prediction updated',
      data: dataEntry,
      prediction: prediction,
      emitter_control: emitterControl
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
    console.log('📡 Emitter control requested (any device)');
    
    // Find the most recently updated prediction
    let latestPrediction = null;
    let latestTime = null;
    let deviceWithPrediction = null;
    
    Object.keys(predictionStore).forEach(deviceId => {
      const prediction = predictionStore[deviceId];
      if (prediction && prediction.timestamp) {
        const predictionTime = new Date(prediction.timestamp);
        
        if (!latestTime || predictionTime > latestTime) {
          latestTime = predictionTime;
          latestPrediction = prediction;
          deviceWithPrediction = deviceId;
        }
      }
    });
    
    // If no prediction found, return all zeros
    if (!latestPrediction || !latestPrediction.emitter_control) {
      console.log('⚠️  No prediction available, returning all zeros');
      return res.json({"0":0,"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0});
    }
    
    // Return the emitter control
    console.log(`✅ Sending emitter control for ${deviceWithPrediction}: ${latestPrediction.scent} (${(latestPrediction.confidence * 100).toFixed(1)}%)`);
    console.log('   Emitter bytes:', latestPrediction.emitter_control);
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
