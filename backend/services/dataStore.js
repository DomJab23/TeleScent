/**
 * Shared data stores for sensor data and predictions
 * This avoids circular dependency issues between modules
 */

// Store sensor data in memory (grouped by device ID)
const sensorDataStore = {};

// Store ML predictions separately (by device ID)
const predictionStore = {};

module.exports = {
  sensorDataStore,
  predictionStore
};
