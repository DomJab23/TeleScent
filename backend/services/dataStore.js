const { extractSensorReading } = require('./sensorPayload');

const sensorDataStore = {};
const predictionStore = {};

function storePrediction(deviceId, prediction, sensorReading, emitterControl, extras = {}) {
  predictionStore[deviceId] = {
    scent: prediction.predicted_scent,
    confidence: prediction.confidence,
    top_predictions: prediction.top_predictions,
    emitter_control: emitterControl,
    timestamp: new Date().toISOString(),
    lastProcessedTime: sensorReading.receivedAt,
    sensorData: extractSensorReading(sensorReading),
    ...extras,
  };
  return predictionStore[deviceId];
}

module.exports = {
  sensorDataStore,
  predictionStore,
  storePrediction,
};
