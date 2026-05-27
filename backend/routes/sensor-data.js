const express = require('express');
const router = express.Router();
const {
  sensorDataStore,
  predictionStore,
  storePrediction,
} = require('../services/dataStore');
const {
  EMITTER_OFF,
  emitterOff,
  sendError,
} = require('../services/sensorPayload');
const {
  getPrediction,
  scentToEmitterControl,
} = require('../services/predictionService');
const {
  detectVocNo2Drop,
  applyConsecutiveLogic,
  resetConsecutiveOnRise,
} = require('../services/scentDecision');
const { SensorData } = require('../models');
const { appendToCsv } = require('../services/csvExporter');

const MAX_READINGS_PER_DEVICE = 100;

const sseClients = [];

function buildDataEntry(body) {
  const deviceId = body.device_id || body.deviceId;
  return {
    deviceId,
    timestamp:   body.timestamp || Date.now(),
    temperature: body.temperature ?? null,
    humidity:    body.humidity ?? null,
    pressure:    body.pressure ?? null,
    gas:         body.gas ?? null,
    voc_raw:     body.voc_raw ?? null,
    nox_raw:     body.nox_raw ?? null,
    no2:         body.no2 ?? null,
    ethanol:     body.ethanol ?? null,
    voc:         body.voc ?? null,
    co_h2:       body.co_h2 ?? null,
    receivedAt:  new Date().toISOString(),
    userId:      'anonymous',
  };
}

function pushReading(deviceId, entry) {
  if (!sensorDataStore[deviceId]) sensorDataStore[deviceId] = [];
  sensorDataStore[deviceId].push(entry);
  if (sensorDataStore[deviceId].length > MAX_READINGS_PER_DEVICE) {
    sensorDataStore[deviceId].shift();
  }
}

async function persistReading(body, dataEntry, finalScent, finalConfidence) {
  const sensorValues = body.sensorValues || [
    dataEntry.temperature, dataEntry.humidity, dataEntry.pressure,
    dataEntry.gas, dataEntry.voc, dataEntry.no2,
  ];

  const dbRecord = await SensorData.create({
    deviceId: dataEntry.deviceId,
    scent: body.scent || null,
    timestamp: new Date(dataEntry.timestamp),
    sensorValues,
    sensor0: sensorValues[0] || null,
    sensor1: sensorValues[1] || null,
    sensor2: sensorValues[2] || null,
    sensor3: sensorValues[3] || null,
    sensor4: sensorValues[4] || null,
    sensor5: sensorValues[5] || null,
    ethanol: dataEntry.ethanol ?? null,
    coH2:    dataEntry.co_h2 ?? null,
    vocRaw:  dataEntry.voc_raw ?? null,
    noxRaw:  dataEntry.nox_raw ?? null,
    sessionId: body.session_id || null,
    phase:     body.phase || null,
    predictedScent: finalScent,
    confidence:     finalConfidence,
  });

  await appendToCsv({
    id: dbRecord.id,
    deviceId: dbRecord.deviceId,
    scent: dbRecord.scent || '',
    sessionId: dbRecord.sessionId || '',
    phase: dbRecord.phase || '',
    timestamp: dbRecord.timestamp,
    sensor0: dbRecord.sensor0,
    sensor1: dbRecord.sensor1,
    sensor2: dbRecord.sensor2,
    sensor3: dbRecord.sensor3,
    sensor4: dbRecord.sensor4,
    sensor5: dbRecord.sensor5,
    ethanol: dbRecord.ethanol ?? '',
    coH2: dbRecord.coH2 ?? '',
    vocRaw: dbRecord.vocRaw ?? '',
    noxRaw: dbRecord.noxRaw ?? '',
    predictedScent: dbRecord.predictedScent || '',
    confidence: dbRecord.confidence || '',
    createdAt: dbRecord.createdAt,
  });

  return dbRecord;
}

function broadcastSse(dataEntry) {
  const payload = JSON.stringify({ type: 'sensor', data: dataEntry });
  for (const clientRes of sseClients) {
    try {
      clientRes.write(`event: sensor\n`);
      clientRes.write(`data: ${payload}\n\n`);
    } catch (_) { /* ignore per-client errors */ }
  }
}

router.post('/', async (req, res) => {
  try {
    const dataEntry = buildDataEntry(req.body);
    if (!dataEntry.deviceId) {
      return sendError(res, 400, 'Missing required field: device_id');
    }

    pushReading(dataEntry.deviceId, dataEntry);

    const { dropped, rose } = detectVocNo2Drop(sensorDataStore[dataEntry.deviceId], dataEntry);
    if (rose) resetConsecutiveOnRise(dataEntry.deviceId);

    const isCollectionMode = !!req.body.scent;
    let prediction;
    let finalScent, finalConfidence, finalTopPredictions, forcedNoScent = false;

    if (isCollectionMode) {
      finalScent = req.body.scent;
      finalConfidence = 1.0;
      finalTopPredictions = [{ scent: req.body.scent, confidence: 1.0 }];
      prediction = { predicted_scent: finalScent, confidence: 1.0, top_predictions: finalTopPredictions };
    } else {
      prediction = await getPrediction(dataEntry);
      ({ finalScent, finalConfidence, finalTopPredictions, forcedNoScent } =
        applyConsecutiveLogic(dataEntry.deviceId, prediction, dropped));
    }

    const emitterControl = scentToEmitterControl(finalScent, finalConfidence);
    storePrediction(
      dataEntry.deviceId,
      { predicted_scent: finalScent, confidence: finalConfidence, top_predictions: finalTopPredictions },
      dataEntry,
      emitterControl,
      { forcedNoScent },
    );

    try {
      await persistReading(req.body, dataEntry, finalScent, finalConfidence);
    } catch (saveError) {
      console.error('Error saving to database/CSV:', saveError);
    }

    broadcastSse(dataEntry);

    res.status(200).json({
      message: 'Sensor data received and prediction updated',
      data: dataEntry,
      prediction,
      emitter_control: emitterControl,
    });
  } catch (error) {
    console.error('Error receiving sensor data:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(': connected\n\n');

  sseClients.push(res);
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

function findLatestPrediction() {
  let latest = null;
  let latestTime = null;
  let deviceId = null;
  for (const id of Object.keys(predictionStore)) {
    if (id.startsWith('_')) continue;
    const p = predictionStore[id];
    if (!p || !p.timestamp) continue;
    const t = new Date(p.timestamp);
    if (!latestTime || t > latestTime) {
      latestTime = t;
      latest = p;
      deviceId = id;
    }
  }
  return { latest, deviceId };
}

router.get('/emitter', (req, res) => {
  try {
    const { latest } = findLatestPrediction();
    res.json(latest?.emitter_control || emitterOff());
  } catch (error) {
    console.error('Error getting emitter control:', error);
    res.json(emitterOff());
  }
});

router.get('/:deviceId/emitter', (req, res) => {
  try {
    const prediction = predictionStore[req.params.deviceId];
    res.json(prediction?.emitter_control || emitterOff());
  } catch (error) {
    console.error('Error getting emitter control:', error);
    res.json(emitterOff());
  }
});

router.get('/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const deviceData = sensorDataStore[deviceId] || [];
    const latestData = deviceData.slice(-limit);
    res.json({
      message: 'Sensor data retrieved successfully',
      deviceId,
      dataCount: latestData.length,
      data: latestData,
    });
  } catch (error) {
    console.error('Error retrieving sensor data:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

function rowToLatestReading(row) {
  return {
    deviceId: row.deviceId,
    timestamp: row.timestamp ? new Date(row.timestamp).getTime() : null,
    temperature: row.sensor0,
    humidity: row.sensor1,
    pressure: row.sensor2,
    gas: row.sensor3,
    voc: row.sensor4,
    no2: row.sensor5,
    voc_raw: row.vocRaw,
    nox_raw: row.noxRaw,
    ethanol: row.ethanol,
    co_h2: row.coH2,
    receivedAt: row.createdAt,
  };
}

async function fillFromDatabase(summary) {
  const { Sequelize } = require('sequelize');
  const latestRecords = await SensorData.findAll({
    attributes: ['deviceId', [Sequelize.fn('MAX', Sequelize.col('id')), 'maxId']],
    group: ['deviceId'],
    raw: true,
  });

  await Promise.all(latestRecords.map(async ({ deviceId, maxId }) => {
    if (summary[deviceId]) return;
    const row = await SensorData.findByPk(maxId);
    if (!row) return;

    const latestReading = rowToLatestReading(row);
    if (row.predictedScent) {
      latestReading.ml_prediction = {
        scent: row.predictedScent,
        confidence: row.confidence || 0,
        top_predictions: [{ scent: row.predictedScent, confidence: row.confidence || 0 }],
        emitter_control: { ...EMITTER_OFF },
        timestamp: row.createdAt,
        source: 'database',
      };
    }
    summary[deviceId] = {
      lastUpdate: row.createdAt,
      dataCount: 1,
      latestReading,
      source: 'database',
    };
  }));
}

router.get('/', async (req, res) => {
  try {
    const summary = {};

    for (const deviceId of Object.keys(sensorDataStore)) {
      const data = sensorDataStore[deviceId];
      const latestReading = data[data.length - 1] || null;
      if (latestReading && predictionStore[deviceId]) {
        latestReading.ml_prediction = predictionStore[deviceId];
      }
      summary[deviceId] = {
        lastUpdate: latestReading?.receivedAt || null,
        dataCount: data.length,
        latestReading,
      };
    }

    try {
      await fillFromDatabase(summary);
    } catch (dbError) {
      console.warn('DB fallback failed:', dbError.message);
    }

    res.json({
      message: 'All devices data summary',
      devices: summary,
      totalDevices: Object.keys(summary).length,
    });
  } catch (error) {
    console.error('Error retrieving all sensor data:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

module.exports = router;
module.exports.sensorDataStore = sensorDataStore;
