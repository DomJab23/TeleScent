const express = require('express');
const router = express.Router();
const { predictionStore } = require('../services/dataStore');

/**
 * GET /api/predictions
 * Get all predictions
 */
router.get('/', (req, res) => {
  try {
    res.json({
      message: 'All predictions retrieved successfully',
      predictions: predictionStore,
      totalDevices: Object.keys(predictionStore).length
    });
  } catch (error) {
    console.error('Error retrieving predictions:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/predictions/:deviceId
 * Get prediction for a specific device
 */
router.get('/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const prediction = predictionStore[deviceId];
    
    if (!prediction) {
      return res.status(404).json({
        message: 'No prediction found for this device',
        deviceId
      });
    }
    
    res.json({
      message: 'Prediction retrieved successfully',
      deviceId,
      prediction
    });
  } catch (error) {
    console.error('Error retrieving prediction:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/predictions/trigger
 * Manually trigger prediction processing for all devices with sensor data
 */
router.post('/trigger', async (req, res) => {
  try {
    const { processSensorData } = require('../services/predictionService');
    
    console.log('📢 Manual prediction trigger requested');
    
    // Trigger prediction processing
    await processSensorData();
    
    res.json({
      message: 'Prediction processing triggered successfully',
      timestamp: new Date().toISOString(),
      predictions: predictionStore
    });
  } catch (error) {
    console.error('Error triggering predictions:', error);
    res.status(500).json({
      message: 'Failed to trigger predictions',
      error: error.message
    });
  }
});

/**
 * POST /api/predictions/detect
 * Complete detection flow: process existing sensor data → predict
 * Body: { deviceId: string (optional, defaults to 'web-interface') }
 */
router.post('/detect', async (req, res) => {
  try {
    const { sensorDataStore } = require('../services/dataStore');
    const { processSensorData } = require('../services/predictionService');
    
    const deviceId = req.body.deviceId || 'web-interface';
    
    console.log(`🔍 Starting detection flow for device: ${deviceId}`);
    
    // Step 1: Check if we have sensor data from Arduino
    const deviceData = sensorDataStore[deviceId];
    
    if (!deviceData || deviceData.length === 0) {
      return res.status(400).json({
        message: 'No sensor data available for this device',
        deviceId,
        hint: 'Please ensure the Arduino e-nose is connected and sending data to POST /api/sensor-data with proper sensor readings'
      });
    }
    
    console.log(`📊 Found ${deviceData.length} sensor readings for ${deviceId}`);
    
    // Step 2: Process sensor data with ML
    console.log(`🤖 Running ML prediction...`);
    await processSensorData();
    
    // Step 3: Get the prediction result
    const prediction = predictionStore[deviceId];
    
    if (!prediction) {
      return res.status(500).json({
        message: 'Prediction failed to generate',
        deviceId,
        hint: 'Check if Python ML service is running and model files exist in ml/model/'
      });
    }
    
    console.log(`✅ Detection complete: ${prediction.scent} (${(prediction.confidence * 100).toFixed(1)}%)`);
    
    // Step 4: Return complete result
    res.json({
      message: 'Detection completed successfully',
      deviceId,
      timestamp: new Date().toISOString(),
      sensorData: prediction.sensorData,
      prediction: {
        scent: prediction.scent,
        confidence: prediction.confidence,
        top_predictions: prediction.top_predictions,
        emitter_control: prediction.emitter_control
      }
    });
    
  } catch (error) {
    console.error('Error in detection flow:', error);
    res.status(500).json({
      message: 'Detection flow failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
