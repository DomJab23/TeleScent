// backend/server.js - Production-ready for internet access
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initializeDatabase } = require('./models');
const { testConnection } = require('./models/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for internet access
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse allowed origins from environment variable or use defaults
const getAllowedOrigins = () => {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
  ];

  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }

  // In production, add ngrok and public domain URLs
  if (NODE_ENV === 'production') {
    defaultOrigins.push(/ngrok\.io$/); // Allow all ngrok subdomains
    defaultOrigins.push(process.env.PUBLIC_URL || '');
  }

  return defaultOrigins;
};

// CORS configuration for internet access
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, curl requests, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes FIRST - before static files
app.get('/api', (req, res) => {
  console.log('GET /api called');
  res.json({ 
    message: 'Hello from the TeleScent backend!',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Debug middleware for API routes
app.use('/api', (req, res, next) => {
  console.log(`API request: ${req.method} ${req.path}`);
  next();
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Serve static files from the React app build directory (after API routes)
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS error',
      message: 'Your origin is not allowed to access this resource',
      origin: req.get('origin')
    });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

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

// Start server - listen on all interfaces for internet access
const server = app.listen(PORT, HOST, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 TeleScent Server is running!`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);
  console.log(`=================================================`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`Network Access: http://<your-ip>:${PORT}`);
  console.log(`\nTo access from internet via SIM card:`);
  console.log(`  1. Option 1 (Quick test): Use ngrok`);
  console.log(`  2. Option 2 (Home setup): Use port forwarding`);
  console.log(`  3. Option 3 (Production): Deploy to cloud`);
  console.log(`\nSee INTERNET_SETUP_GUIDE.md for detailed instructions`);
  console.log(`=================================================\n`);
  
  startServer();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
