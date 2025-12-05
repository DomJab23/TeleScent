const { sequelize } = require('./database');
const User = require('./User');

// Initialize all models
const initializeDatabase = async () => {
  try {
    // Sync all models with database (don't alter existing tables)
    await sequelize.sync(); 
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  initializeDatabase,
};