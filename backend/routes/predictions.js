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

module.exports = router;
