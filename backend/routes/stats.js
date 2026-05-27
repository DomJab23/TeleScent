const express = require('express');
const router = express.Router();
const { sensorDataStore } = require('../services/dataStore');
const { sendError } = require('../services/sensorPayload');

function buildDeviceStats(deviceId, readings) {
  const latest = readings[readings.length - 1];
  const first = readings[0];
  return {
    deviceId,
    totalReadings: readings.length,
    firstReading: first.receivedAt,
    lastReading: latest.receivedAt,
    latestData: {
      temperature: latest.temperature,
      humidity: latest.humidity,
      gas: latest.gas,
      voc: latest.voc,
      no2: latest.no2,
    },
  };
}

router.get('/', (req, res) => {
  try {
    const stats = {};
    const devices = Object.keys(sensorDataStore || {});

    for (const deviceId of devices) {
      const readings = sensorDataStore[deviceId];
      if (readings && readings.length > 0) {
        stats[deviceId] = buildDeviceStats(deviceId, readings);
      }
    }

    res.json({
      message: 'Statistics retrieved successfully',
      totalDevices: devices.length,
      devices: stats,
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    sendError(res, 500, 'Failed to retrieve statistics', error);
  }
});

router.get('/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const readings = sensorDataStore[deviceId];

    if (!readings || readings.length === 0) {
      return sendError(res, 404, `Device ${deviceId} not found`);
    }

    res.json({
      message: 'Device statistics retrieved successfully',
      stats: {
        ...buildDeviceStats(deviceId, readings),
        latestData: readings[readings.length - 1],
      },
    });
  } catch (error) {
    console.error('Error getting device stats:', error);
    sendError(res, 500, 'Failed to retrieve device statistics', error);
  }
});

module.exports = router;
