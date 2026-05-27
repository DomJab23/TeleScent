const { spawn } = require('child_process');
const path = require('path');
const { sensorDataStore, predictionStore, storePrediction } = require('./dataStore');
const { emitterOff } = require('./sensorPayload');

const SCENT_EMITTER_MAP = {
  'no_scent':     { channel: -1, intensity: 0 },
  'sweet_orange': { channel: 2,  intensity: 200 },
  'peppermint':   { channel: 4,  intensity: 200 },
  'cinnamon':     { channel: 0, intensity: 200 },
  'gingerbread':  { channel: 1, intensity: 200 },
  'norange':      { channel: 2, intensity: 200 },
  'orange':       { channel: 2, intensity: 200 },
  'vanilla':      { channel: 3, intensity: 200 },
  'banana':       { channel: 5, intensity: 200 },
  'coconut':      { channel: 6, intensity: 200 },
  'pineapple':    { channel: 7, intensity: 200 },
};

function scentToEmitterControl(scent, confidence) {
  const emitterControl = emitterOff();

  if (scent.toLowerCase() === 'no_scent') {
    return emitterControl;
  }

  const cfg = SCENT_EMITTER_MAP[scent.toLowerCase()];
  if (cfg && cfg.channel >= 0) {
    const scaledIntensity = Math.max(100, Math.round(cfg.intensity * confidence));
    emitterControl[cfg.channel.toString()] = scaledIntensity;
  } else {
    console.warn(`No emitter mapping for scent: "${scent}"`);
  }

  return emitterControl;
}

function resolvePythonPath() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  return process.env.DOCKER_ENV === 'true'
    ? '/app/venv/bin/python3'
    : '/home/klaus/venv/bin/python3';
}

async function getPrediction(sensorReading) {
  return new Promise((resolve) => {
    const pythonScript = path.join(__dirname, '../../ml/serve.py');
    const python = spawn(resolvePythonPath(), [pythonScript]);

    let outputData = '';
    let errorData = '';

    python.stdin.write(JSON.stringify(sensorReading));
    python.stdin.end();

    python.stdout.on('data', (data) => { outputData += data.toString(); });
    python.stderr.on('data', (data) => { errorData += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python prediction error (exit ${code}): ${errorData}`);
        resolve({ predicted_scent: 'error', confidence: 0.0, error: 'Prediction service unavailable' });
        return;
      }
      try {
        resolve(JSON.parse(outputData));
      } catch (e) {
        console.error('Failed to parse prediction:', e, 'Output:', outputData);
        resolve({ predicted_scent: 'error', confidence: 0.0, error: 'Invalid prediction response' });
      }
    });
  });
}

async function processSensorData() {
  try {
    for (const deviceId of Object.keys(sensorDataStore)) {
      const deviceData = sensorDataStore[deviceId];
      if (!deviceData || deviceData.length === 0) continue;

      const latestReading = deviceData[deviceData.length - 1];
      const lastProcessedTime = predictionStore[deviceId]?.lastProcessedTime;
      if (lastProcessedTime && lastProcessedTime === latestReading.receivedAt) continue;

      const prediction = await getPrediction(latestReading);
      const emitterControl = scentToEmitterControl(prediction.predicted_scent, prediction.confidence);
      storePrediction(deviceId, prediction, latestReading, emitterControl);
    }
  } catch (error) {
    console.error('Error in prediction service:', error);
  }
}

function startPredictionService(intervalMs = 5000) {
  console.log(`Starting prediction service (checking every ${intervalMs}ms)`);
  processSensorData();
  const interval = setInterval(processSensorData, intervalMs);
  return {
    stop: () => {
      console.log('Stopping prediction service');
      clearInterval(interval);
    },
    processNow: processSensorData,
  };
}

module.exports = {
  startPredictionService,
  processSensorData,
  scentToEmitterControl,
  getPrediction,
};
