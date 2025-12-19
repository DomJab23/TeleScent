// models/SensorData.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const SensorData = sequelize.define('SensorData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  scent: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  // Sensor values stored as JSON array [sensor0, sensor1, ..., sensor5]
  sensorValues: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: false,
    get() {
      const raw = this.getDataValue('sensorValues');
      return raw ? JSON.parse(raw) : [];
    },
    set(value) {
      this.setDataValue('sensorValues', JSON.stringify(value));
    },
  },
  // Individual sensor values for easy querying
  sensor0: DataTypes.FLOAT,
  sensor1: DataTypes.FLOAT,
  sensor2: DataTypes.FLOAT,
  sensor3: DataTypes.FLOAT,
  sensor4: DataTypes.FLOAT,
  sensor5: DataTypes.FLOAT,
  // ML prediction results
  predictedScent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  tableName: 'sensor_data',
  timestamps: true,
  indexes: [
    { fields: ['deviceId'] },
    { fields: ['scent'] },
    { fields: ['timestamp'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = SensorData;
