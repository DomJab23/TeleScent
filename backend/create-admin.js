// Script to create admin user with username/password
const { sequelize } = require('./models/database');
const User = require('./models/User');

async function createAdminUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync database (add username column if it doesn't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('   Username: admin');
      console.log('   Password: admin');
      console.log('   User ID:', existingAdmin.id);
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@telescent.com',
      password: 'admin', // Will be hashed by beforeCreate hook
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('   User ID:', adminUser.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
