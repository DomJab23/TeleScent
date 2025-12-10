const { spawn } = require('child_process');
const path = require('path');
const { sensorDataStore, predictionStore } = require('./dataStore');

// Scent to Emitter Mapping
const SCENT_EMITTER_MAP = {
  'banana': { channel: 0, intensity: 200 },
  'orange': { channel: 1, intensity: 200 },
  'coconut': { channel: 2, intensity: 200 },
  'pineapple': { channel: 3, intensity: 200 },
  'grape': { channel: 4, intensity: 200 },
  'icecream': { channel: 5, intensity: 200 },
  'strawberry': { channel: 6, intensity: 200 },
  'lemon': { channel: 7, intensity: 200 }
};

/**
 * Convert ML prediction to emitter control format
 * @param {string} scent - Predicted scent name
 * @param {number} confidence - Confidence level (0-1)
 * @returns {Object} Emitter control object {0:0, 1:0, 2:255, ...}
 */
function scentToEmitterControl(scent, confidence) {
  // Initialize all emitters to off
  const emitterControl = {
    "0": 0, "1": 0, "2": 0, "3": 0,
    "4": 0, "5": 0, "6": 0, "7": 0
  };
  
  // Get emitter configuration for this scent
  const emitterConfig = SCENT_EMITTER_MAP[scent.toLowerCase()];
  
  if (emitterConfig) {
    // Scale intensity by confidence (minimum 100 to be noticeable)
    const scaledIntensity = Math.max(100, Math.round(emitterConfig.intensity * confidence));
    emitterControl[emitterConfig.channel.toString()] = scaledIntensity;
  }
  
  return emitterControl;
}

/**
 * Call Python ML model for scent prediction
 * @param {Object} sensorReading - Sensor data in Arduino format
 * @returns {Promise<Object>} - Prediction result
 */
async function getPrediction(sensorReading) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../../ml/serve.py');
    // Detect if running in Docker and use appropriate Python path
    const isDocker = process.env.DOCKER_ENV === 'true';
    const pythonPath = isDocker ? '/app/venv/bin/python3' : '/home/klaus/TeleScent/.venv/bin/python3';
    const python = spawn(pythonPath, [pythonScript]);
    
    let outputData = '';
    let errorData = '';
    
    // Send sensor data to Python script via stdin
    python.stdin.write(JSON.stringify(sensorReading));
    python.stdin.end();
    
    // Collect output
    python.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python prediction error (exit code ' + code + '):');
        console.error('   stderr:', errorData);
        console.error('   stdout:', outputData);
        resolve({
          predicted_scent: 'error',
          confidence: 0.0,
          error: 'Prediction service unavailable'
        });
      } else {
        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (e) {
          console.error('❌ Failed to parse prediction:', e);
          console.error('   Output was:', outputData);
          resolve({
            predicted_scent: 'error',
            confidence: 0.0,
            error: 'Invalid prediction response'
          });
        }
      }
    });
  });
}

/**
 * Process sensor data and generate predictions
 */
async function processSensorData() {
  try {
    // Get all devices with sensor data
    const deviceIds = Object.keys(sensorDataStore);
    
    if (deviceIds.length === 0) {
      return; // No data to process
    }
    
    for (const deviceId of deviceIds) {
      const deviceData = sensorDataStore[deviceId];
      
      if (!deviceData || deviceData.length === 0) {
        continue;
      }
      
      // Get the latest sensor reading
      const latestReading = deviceData[deviceData.length - 1];
      
      // Check if we've already processed this reading
      const lastProcessedTime = predictionStore[deviceId]?.lastProcessedTime;
      if (lastProcessedTime && lastProcessedTime === latestReading.receivedAt) {
        continue; // Already processed this reading
      }
      
      // Run ML prediction
      console.log(`🔮 Running prediction for ${deviceId}...`);
      const prediction = await getPrediction(latestReading);
      console.log(`🤖 ML Prediction: ${prediction.predicted_scent} (${(prediction.confidence * 100).toFixed(1)}%)`);
      
      // Convert to emitter control format
      const emitterControl = scentToEmitterControl(prediction.predicted_scent, prediction.confidence);
      
      // Store the prediction
      predictionStore[deviceId] = {
        scent: prediction.predicted_scent,
        confidence: prediction.confidence,
        top_predictions: prediction.top_predictions,
        emitter_control: emitterControl,
        timestamp: new Date().toISOString(),
        lastProcessedTime: latestReading.receivedAt,
        sensorData: {
          deviceId: latestReading.deviceId,
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          pressure: latestReading.pressure,
          gas: latestReading.gas,
          voc_raw: latestReading.voc_raw,
          nox_raw: latestReading.nox_raw,
          no2: latestReading.no2,
          ethanol: latestReading.ethanol,
          voc: latestReading.voc,
          co_h2: latestReading.co_h2
        }
      };
      
      console.log(`✅ Prediction stored for ${deviceId}:`, emitterControl);
    }
    
  } catch (error) {
    console.error('⚠️  Error in prediction service:', error);
  }
}

/**
 * Start the prediction service with periodic processing
 * @param {number} intervalMs - Processing interval in milliseconds (default: 5000)
 */
function startPredictionService(intervalMs = 5000) {
  console.log(`🚀 Starting prediction service (checking every ${intervalMs}ms)`);
  
  // Initial run
  processSensorData();
  
  // Set up periodic processing
  const interval = setInterval(processSensorData, intervalMs);
  
  // Return control object to stop service if needed
  return {
    stop: () => {
      console.log('🛑 Stopping prediction service');
      clearInterval(interval);
    },
    processNow: processSensorData
  };
}

module.exports = {
  startPredictionService,
  processSensorData,
  // Exported for testing
  scentToEmitterControl,
  getPrediction
};
