// Mock the prediction service BEFORE requiring the app
jest.mock('../services/predictionService', () => ({
  makePrediction: jest.fn().mockResolvedValue({
    scent: 'lavender',
    confidence: 0.85,
    status: 'success'
  }),
  getPrediction: jest.fn().mockResolvedValue({
    predicted_scent: 'lavender',
    confidence: 0.85,
    status: 'success'
  }),
  scentToEmitterControl: jest.fn((scent) => ({ "0": 100, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 }))
}));

const request = require('supertest');
const app = require('../server');
const { sensorDataStore, predictionStore } = require('../services/dataStore');

// Helper to reset in-memory stores
function resetStores() {
  Object.keys(sensorDataStore).forEach((k) => delete sensorDataStore[k]);
  Object.keys(predictionStore).forEach((k) => delete predictionStore[k]);
}

describe('Sensor Data routes', () => {
  beforeEach(() => {
    resetStores();
  });

  test('POST /api/sensor-data requires device_id', async () => {
    await request(app)
      .post('/api/sensor-data')
      .send({ temperature: 10 })
      .expect(400);
  });

  test('POST /api/sensor-data stores reading and trims to 100', async () => {
    // Add 101 readings
    for (let i = 0; i < 101; i++) {
      await request(app)
        .post('/api/sensor-data')
        .send({
          device_id: 'dev1',
          timestamp: Date.now() + i,
          temperature: i,
        })
        .expect(200);
    }

    expect(sensorDataStore['dev1']).toBeDefined();
    expect(sensorDataStore['dev1'].length).toBe(100);
    // First entry should be the second inserted (0 trimmed)
    expect(sensorDataStore['dev1'][0].temperature).toBe(1);
  });

  test('GET /api/sensor-data returns summary of devices', async () => {
    await request(app).post('/api/sensor-data').send({ device_id: 'dev2', temperature: 25 });

    const res = await request(app)
      .get('/api/sensor-data')
      .expect(200);

    expect(res.body.devices).toHaveProperty('dev2');
    expect(res.body.totalDevices).toBe(1);
  });

  test('GET /api/sensor-data/:deviceId respects limit', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/sensor-data').send({ device_id: 'dev3', temperature: i });
    }

    const res = await request(app)
      .get('/api/sensor-data/dev3?limit=5')
      .expect(200);

    expect(res.body.data.length).toBe(5);
    // latest entries preserved
    expect(res.body.data[4].temperature).toBe(9);
  });

  test('GET /api/sensor-data/emitter returns zeros when no predictions', async () => {
    const res = await request(app)
      .get('/api/sensor-data/emitter')
      .expect(200);

    expect(res.body).toMatchObject({ "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 });
  });

  test('GET /api/sensor-data/:deviceId/emitter returns stored control', async () => {
    predictionStore['devX'] = { emitter_control: { "0": 10, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 } };

    const res = await request(app)
      .get('/api/sensor-data/devX/emitter')
      .expect(200);

    expect(res.body["0"]).toBe(10);
  });
});
