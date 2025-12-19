/**
 * Unit tests for predictionService helpers.
 */
jest.mock('child_process');

const { spawn } = require('child_process');
const { scentToEmitterControl, processSensorData, getPrediction } = require('../services/predictionService');
const { sensorDataStore, predictionStore } = require('../services/dataStore');

// Helper to reset in-memory stores
function resetStores() {
  Object.keys(sensorDataStore).forEach((k) => delete sensorDataStore[k]);
  Object.keys(predictionStore).forEach((k) => delete predictionStore[k]);
}

describe('predictionService utils', () => {
  beforeEach(() => {
    resetStores();
    jest.clearAllMocks();
  });

  test('scentToEmitterControl maps scent to correct channel and scales intensity', () => {
    const control = scentToEmitterControl('banana', 0.5);
    expect(control['5']).toBeGreaterThanOrEqual(100); // banana is on channel 5
    expect(control['0']).toBe(0);
    expect(control['1']).toBe(0);
  });

  test('scentToEmitterControl returns all zeros for unknown scent', () => {
    const control = scentToEmitterControl('unknown', 0.9);
    expect(Object.values(control).every((v) => v === 0)).toBe(true);
  });

  test('getPrediction handles non-zero exit code and returns fallback', async () => {
    // Mock spawn to emit stderr and close with code 1
    const stdoutListeners = [];
    const stderrListeners = [];
    spawn.mockReturnValue({
      stdin: { write: jest.fn(), end: jest.fn() },
      stdout: { on: (evt, cb) => stdoutListeners.push({ evt, cb }) },
      stderr: { on: (evt, cb) => stderrListeners.push({ evt, cb }) },
      on: (evt, cb) => {
        if (evt === 'close') {
          cb(1); // non-zero exit
        }
      }
    });

    const result = await getPrediction({ gas: 1 });
    expect(result.predicted_scent).toBe('error');
    expect(result.confidence).toBe(0);
  });

  test('processSensorData skips already processed reading', async () => {
    // Prepare store with one device and a processed reading marker
    sensorDataStore['dev1'] = [
      { deviceId: 'dev1', receivedAt: '2024-01-01T00:00:00Z', temperature: 10 }
    ];
    predictionStore['dev1'] = { lastProcessedTime: '2024-01-01T00:00:00Z' };

    const spyPrediction = jest.spyOn(require('../backend/services/predictionService'), 'getPrediction');

    await processSensorData();

    expect(spyPrediction).not.toHaveBeenCalled();
    spyPrediction.mockRestore();
  });
});
