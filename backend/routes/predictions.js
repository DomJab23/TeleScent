const express = require('express');
const router = express.Router();
const { predictionStore } = require('../services/dataStore');

/**
 * Build a prediction object from a DB record (latest reading per device)
 */
function predictionFromDbRecord(record) {
  return {
    scent: record.predictedScent || 'unknown',
    confidence: record.confidence || 0,
    top_predictions: record.predictedScent
      ? [{ scent: record.predictedScent, confidence: record.confidence || 0 }]
      : [],
    emitter_control: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
    timestamp: record.createdAt,
    source: 'database',
    sensorData: {
      deviceId: record.deviceId,
      temperature: record.sensor0,
      humidity: record.sensor1,
      pressure: record.sensor2,
      gas: record.sensor3,
      voc: record.sensor4,
      no2: record.sensor5,
    },
  };
}

/**
 * GET /api/predictions
 * Get all predictions – memory first, DB fallback for cold starts
 */
router.get('/', async (req, res) => {
  try {
    const { SensorData } = require('../models');
    const { Sequelize } = require('sequelize');

    // Collect device IDs that have no in-memory prediction
    const memoryDevices = Object.keys(predictionStore).filter(
      k => k !== '_consecutiveState' && predictionStore[k]?.scent
    );

    // Always fetch latest DB records (one per device) to fill gaps
    const latestRecords = await SensorData.findAll({
      attributes: [
        'deviceId',
        [Sequelize.fn('MAX', Sequelize.col('id')), 'maxId'],
      ],
      group: ['deviceId'],
      raw: true,
    });

    const merged = { ...predictionStore };

    await Promise.all(
      latestRecords.map(async ({ deviceId, maxId }) => {
        if (!merged[deviceId] || !merged[deviceId].scent) {
          const record = await SensorData.findByPk(maxId);
          if (record && record.predictedScent) {
            merged[deviceId] = predictionFromDbRecord(record);
          }
        }
      })
    );

    res.json({
      message: 'All predictions retrieved successfully',
      predictions: merged,
      totalDevices: Object.keys(merged).filter(k => k !== '_consecutiveState').length,
    });
  } catch (error) {
    console.error('Error retrieving predictions:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

/**
 * GET /api/predictions/:deviceId
 * Get prediction for a specific device – memory first, DB fallback
 */
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    let prediction = predictionStore[deviceId];

    if (!prediction || !prediction.scent) {
      // Fallback: load latest DB record for this device
      const { SensorData } = require('../models');
      const record = await SensorData.findOne({
        where: { deviceId },
        order: [['id', 'DESC']],
      });
      if (record && record.predictedScent) {
        prediction = predictionFromDbRecord(record);
      }
    }

    if (!prediction) {
      return res.status(404).json({ message: 'No prediction found for this device', deviceId });
    }

    res.json({ message: 'Prediction retrieved successfully', deviceId, prediction });
  } catch (error) {
    console.error('Error retrieving prediction:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
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
