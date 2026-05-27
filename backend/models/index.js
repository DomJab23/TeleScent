const { sequelize } = require('./database');
const User = require('./User');
const SensorData = require('./SensorData');

const initializeDatabase = async () => {
  try {
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
