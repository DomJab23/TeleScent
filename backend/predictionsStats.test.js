const request = require('supertest');
const app = require('./server');
const { predictionStore, sensorDataStore } = require('./services/dataStore');

// Helper to reset in-memory stores
function resetStores() {
  Object.keys(sensorDataStore).forEach((k) => delete sensorDataStore[k]);
  Object.keys(predictionStore).forEach((k) => delete predictionStore[k]);
}

describe('Predictions and Stats routes', () => {
  beforeEach(() => {
    resetStores();
  });

  test('GET /api/predictions returns empty when no data', async () => {
    const res = await request(app)
      .get('/api/predictions')
      .expect(200);

    expect(res.body.totalDevices).toBe(0);
    expect(res.body.predictions).toEqual({});
  });

  test('GET /api/predictions/:deviceId returns 404 when missing', async () => {
    await request(app)
      .get('/api/predictions/unknownDevice')
      .expect(404);
  });

  test('GET /api/predictions/:deviceId returns stored prediction', async () => {
    predictionStore['devPred'] = {
      scent: 'banana',
      confidence: 0.9,
      emitter_control: { "0": 200, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 },
      timestamp: new Date().toISOString()
    };

    const res = await request(app)
      .get('/api/predictions/devPred')
      .expect(200);

    expect(res.body.prediction.scent).toBe('banana');
  });

  test('GET /api/stats returns empty when no sensor data', async () => {
    const res = await request(app)
      .get('/api/stats')
      .expect(200);

    expect(res.body.totalDevices).toBe(0);
    expect(res.body.devices).toEqual({});
  });

  test('GET /api/stats/:deviceId returns 404 when missing', async () => {
    await request(app)
      .get('/api/stats/unknown')
      .expect(404);
  });

  test('GET /api/stats aggregates sensor data', async () => {
    const now = new Date().toISOString();
    sensorDataStore['devStats'] = [
      { deviceId: 'devStats', receivedAt: now, temperature: 10, humidity: 50, gas: 1, voc: 2, no2: 3 },
      { deviceId: 'devStats', receivedAt: now, temperature: 12, humidity: 55, gas: 1.1, voc: 2.1, no2: 3.1 }
    ];

    const resAll = await request(app)
      .get('/api/stats')
      .expect(200);
    expect(resAll.body.totalDevices).toBe(1);
    expect(resAll.body.devices.devStats.latestData.temperature).toBe(12);

    const resDevice = await request(app)
      .get('/api/stats/devStats')
      .expect(200);
    expect(resDevice.body.stats.totalReadings).toBe(2);
    expect(resDevice.body.stats.latestData.temperature).toBe(12);
  });
});
