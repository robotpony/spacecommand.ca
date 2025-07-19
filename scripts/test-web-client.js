/**
 * Simple test server for the web client
 * Serves static files and simulates basic API responses
 */
const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from client directory
app.use(express.static('src/client', {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper MIME types for ES6 modules
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

// Mock API endpoints for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    mock: true
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    mock: true
  });
});

// Mock auth endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    token: 'mock-jwt-token',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      empire: {
        name: 'Test Empire'
      }
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ success: true, message: 'User registered successfully' });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    empire: {
      name: 'Test Empire'
    }
  });
});

// Mock game endpoints
app.get('/api/empire', (req, res) => {
  res.json({
    name: 'Test Empire',
    power: 1000,
    planetCount: 5,
    fleetCount: 3
  });
});

app.get('/api/empire/details', (req, res) => {
  res.json({
    name: 'Test Empire',
    founded: '2025-01-01',
    population: 50000,
    techLevel: 5
  });
});

app.get('/api/fleets', (req, res) => {
  res.json([
    { id: 1, name: 'Alpha Fleet', shipCount: 10, location: 'Sector 1,1' },
    { id: 2, name: 'Beta Fleet', shipCount: 15, location: 'Sector 2,3' }
  ]);
});

app.get('/api/empire/planets', (req, res) => {
  res.json([
    { id: 1, name: 'Homeworld', type: 'Terrestrial', population: 10000 },
    { id: 2, name: 'Colony Alpha', type: 'Desert', population: 5000 }
  ]);
});

app.get('/api/empire/resources', (req, res) => {
  res.json({
    minerals: 1000,
    energy: 750,
    food: 500,
    research: 250
  });
});

// Catch-all for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not implemented in test server',
    path: req.path 
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Test web client server running at http://localhost:${port}`);
  console.log(`📁 Serving static files from: src/client`);
  console.log(`🔧 Mock API endpoints available`);
  console.log(`🌐 Open your browser to test the web terminal`);
});