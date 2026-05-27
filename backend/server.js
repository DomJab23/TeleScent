const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { initializeDatabase } = require('./models');
const { testConnection } = require('./models/database');
const authRoutes = require('./routes/auth');
const { startPredictionService } = require('./services/predictionService');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api', (req, res) => {
  console.log('GET /api called');
  res.json({ message: 'Hello from the TeleScent backend!' });
});

app.use('/api', (req, res, next) => {
  console.log(`API request: ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/sensor-data', require('./routes/sensor-data'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/ml/info', require('./routes/ml-info'));

const buildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('Serving frontend build files');
} else {
  console.log('Frontend build not found. Run "npm run build" in frontend directory.');
}

app.use('/visualizer', express.static(path.join(__dirname, 'public')));

async function startServer() {
  try {
    await testConnection();
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

app.use((req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      message: 'Frontend not built. API is available at /api endpoints.',
      apiEndpoints: ['/api', '/api/auth', '/api/sensor-data'],
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startServer();
    startPredictionService(5000);
  });
}

module.exports = app;
