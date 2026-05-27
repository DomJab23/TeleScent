const express = require('express');
const router = express.Router();
const { sensorDataStore, predictionStore } = require('../services/dataStore');
const { processSensorData } = require('../services/predictionService');
const { sendError } = require('../services/sensorPayload');

router.get('/', (req, res) => {
  try {
    res.json({
      message: 'All predictions retrieved successfully',
      predictions: predictionStore,
      totalDevices: Object.keys(predictionStore).length,
    });
  } catch (error) {
    console.error('Error retrieving predictions:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.get('/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const prediction = predictionStore[deviceId];
    if (!prediction) {
      return sendError(res, 404, 'No prediction found for this device');
    }
    res.json({ message: 'Prediction retrieved successfully', deviceId, prediction });
  } catch (error) {
    console.error('Error retrieving prediction:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.post('/trigger', async (req, res) => {
  try {
    await processSensorData();
    res.json({
      message: 'Prediction processing triggered successfully',
      timestamp: new Date().toISOString(),
      predictions: predictionStore,
    });
  } catch (error) {
    console.error('Error triggering predictions:', error);
    sendError(res, 500, 'Failed to trigger predictions', error);
  }
});

router.post('/detect', async (req, res) => {
  try {
    const deviceId = req.body.deviceId || 'web-interface';
    const deviceData = sensorDataStore[deviceId];

    if (!deviceData || deviceData.length === 0) {
      return res.status(400).json({
        message: 'No sensor data available for this device',
        deviceId,
        hint: 'Please ensure the Arduino e-nose is connected and sending data to POST /api/sensor-data with proper sensor readings',
      });
    }

    await processSensorData();
    const prediction = predictionStore[deviceId];

    if (!prediction) {
      return res.status(500).json({
        message: 'Prediction failed to generate',
        deviceId,
        hint: 'Check if Python ML service is running and model files exist in ml/model/',
      });
    }

    res.json({
      message: 'Detection completed successfully',
      deviceId,
      timestamp: new Date().toISOString(),
      sensorData: prediction.sensorData,
      prediction: {
        scent: prediction.scent,
        confidence: prediction.confidence,
        top_predictions: prediction.top_predictions,
        emitter_control: prediction.emitter_control,
      },
    });
  } catch (error) {
    console.error('Error in detection flow:', error);
    res.status(500).json({
      message: 'Detection flow failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;
