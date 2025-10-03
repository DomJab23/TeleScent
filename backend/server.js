// backend/server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Catch all handler: send back React's index.html file for any non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
