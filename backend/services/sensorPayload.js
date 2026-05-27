const EMITTER_OFF = Object.freeze({
  '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0,
});

const SENSOR_FIELDS = [
  'temperature', 'humidity', 'pressure', 'gas',
  'voc_raw', 'nox_raw', 'no2', 'ethanol', 'voc', 'co_h2',
];

function emitterOff() {
  return { ...EMITTER_OFF };
}

function extractSensorReading(reading) {
  const out = { deviceId: reading.deviceId };
  for (const k of SENSOR_FIELDS) out[k] = reading[k];
  return out;
}

function sendError(res, code, message, error) {
  const body = { message };
  if (error) body.error = error.message ?? String(error);
  return res.status(code).json(body);
}

module.exports = {
  EMITTER_OFF,
  SENSOR_FIELDS,
  emitterOff,
  extractSensorReading,
  sendError,
};
