const express = require('express');
const router = express.Router();

// Import sensorDataStore directly - it will be shared across requires
const { sensorDataStore } = require('./sensor-data');

/**
 * GET /api/stats
 * Get statistics for all devices (JSON format)
 */
router.get('/', (req, res) => {
  try {
    const stats = {};
    const devices = Object.keys(sensorDataStore || {});
    
    devices.forEach(deviceId => {
      const readings = sensorDataStore[deviceId];
      
      if (readings && readings.length > 0) {
        const latest = readings[readings.length - 1];
        const first = readings[0];
        
        stats[deviceId] = {
          deviceId,
          totalReadings: readings.length,
          firstReading: first.receivedAt,
          lastReading: latest.receivedAt,
          latestData: {
            temperature: latest.temperature,
            humidity: latest.humidity,
            gas: latest.gas,
            voc: latest.voc,
            no2: latest.no2
          }
        };
      }
    });
    
    res.json({
      message: 'Statistics retrieved successfully',
      totalDevices: devices.length,
      devices: stats
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/stats/:deviceId
 * Get statistics for a specific device (JSON format)
 */
router.get('/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const readings = sensorDataStore[deviceId];
    
    if (!readings || readings.length === 0) {
      return res.status(404).json({
        message: `Device ${deviceId} not found`
      });
    }
    
    const latest = readings[readings.length - 1];
    const first = readings[0];
    
    res.json({
      message: 'Device statistics retrieved successfully',
      stats: {
        deviceId,
        totalReadings: readings.length,
        firstReading: first.receivedAt,
        lastReading: latest.receivedAt,
        latestData: latest
      }
    });
    
  } catch (error) {
    console.error('Error getting device stats:', error);
    res.status(500).json({
      message: 'Failed to retrieve device statistics',
      error: error.message
    });
  }
});

module.exports = router;
