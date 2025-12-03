const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Store sensor data in memory (for now - you can add database storage later)
const sensorDataStore = {};

/**
 * POST /api/sensor-data
 * Receive sensor data from Arduino/ESP32
 * 
 * Expected JSON body:
 * {
 *   "deviceId": "string",
 *   "sensorType": "string" (e.g., "gas", "temperature", "humidity"),
 *   "value": number,
 *   "unit": "string" (e.g., "ppm", "°C", "%"),
 *   "timestamp": "ISO string" (optional)
 * }
 */
// NOTE: Authentication temporarily disabled for GSM testing
router.post('/', async (req, res) => {
  try {
    const { deviceId, sensorType, value, unit, timestamp } = req.body;

    // Validate required fields
    if (!deviceId || !sensorType || value === undefined) {
      return res.status(400).json({
        message: 'Missing required fields: deviceId, sensorType, value',
        received: req.body
      });
    }

    // Validate that value is a number
    if (typeof value !== 'number') {
      return res.status(400).json({
        message: 'Value must be a number',
        received: { value, type: typeof value }
      });
    }

    const dataEntry = {
      deviceId,
      sensorType,
      value,
      unit: unit || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      userId: req.user.id
    };

    console.log(`📊 Sensor data received:`, dataEntry);

    // Store the data (grouped by device)
    if (!sensorDataStore[deviceId]) {
      sensorDataStore[deviceId] = [];
    }
    
    // Keep only last 100 readings per device
    sensorDataStore[deviceId].push(dataEntry);
    if (sensorDataStore[deviceId].length > 100) {
      sensorDataStore[deviceId].shift();
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
 * GET /api/sensor-data/:deviceId
 * Get latest sensor data for a device
 */
router.get('/:deviceId', authenticateToken, async (req, res) => {
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
 */
router.get('/', authenticateToken, async (req, res) => {
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
