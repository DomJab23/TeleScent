// backend/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initializeDatabase } = require('./models');
const { testConnection } = require('./models/database');
const authRoutes = require('./routes/auth');
const { startPredictionService } = require('./services/predictionService');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration - allow specific origins with credentials
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5001',
    ];
    
    // Allow any ngrok URL
    if (origin.includes('ngrok-free.app') || origin.includes('ngrok-free.dev') || origin.includes('ngrok.io')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
};

// Middleware
app.use(cors(corsOptions));
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

// Sensor data routes (for WiFi and GSM devices)
const sensorDataRoutes = require('./routes/sensor-data');
app.use('/api/sensor-data', sensorDataRoutes);

// Statistics routes
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

// Predictions routes
const predictionsRoutes = require('./routes/predictions');
app.use('/api/predictions', predictionsRoutes);

// Serve static files from the React app build directory (after API routes)
const fs = require('fs');
const buildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('✅ Serving frontend build files');
} else {
  console.log('⚠️  Frontend build not found. Run "npm run build" in frontend directory.');
}

// Serve a small backend visualizer (EventSource + Chart.js)
app.use('/visualizer', express.static(path.join(__dirname, 'public')));

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

// Catch all handler: send back React's index.html file for any non-API routes (only if build exists)
app.use((req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      message: 'Frontend not built. API is available at /api endpoints.',
      apiEndpoints: ['/api', '/api/auth', '/api/sensor-data']
    });
  }
});

// Start server unless running tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startServer();
    
    // Start the prediction service (checks for new sensor data every 5 seconds)
    startPredictionService(5000);
  });
}

// Export app for testing
module.exports = app;
