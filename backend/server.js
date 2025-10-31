// backend/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initializeDatabase } = require('./models');
const { testConnection } = require('./models/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes FIRST - before static files
app.get('/api', (req, res) => {
  console.log('GET /api called');
  res.json({ message: 'Hello from the TeleScent backend!' });
});

// Debug middleware
app.use('/api', (req, res, next) => {
  console.log(`API request: ${req.method} ${req.path}`);
  next();
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Serve static files from the React app build directory (after API routes)
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Initialize database
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Initialize database and sync models
    await initializeDatabase();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Catch all handler: send back React's index.html file for any non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startServer();
});
