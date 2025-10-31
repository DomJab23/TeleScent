// Minimal test server to isolate the issue
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/api', (req, res) => {
  console.log('API route hit!');
  res.json({ message: 'Test successful!' });
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
});