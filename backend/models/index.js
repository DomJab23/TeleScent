const { sequelize } = require('./database');
const User = require('./User');
const SensorData = require('./SensorData');

// Initialize all models
const initializeDatabase = async () => {
  try {
    // alter: true adds new columns to existing tables without dropping data
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  SensorData,
  initializeDatabase,
};