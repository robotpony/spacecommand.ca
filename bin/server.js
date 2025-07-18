#!/usr/bin/env node

/**
 * SpaceCommand Server Entry Point
 * 
 * This file serves as the main entry point for the SpaceCommand application.
 * It imports the Express application from src/server/app.js and starts the server.
 */

require('dotenv').config();
const path = require('path');

// Import the main Express application
const app = require('../src/server/app');

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Serve static client files in development mode
 * In production, this should be handled by a reverse proxy (nginx)
 */
if (NODE_ENV === 'development') {
  const express = require('express');
  
  // Serve React client files
  app.use(express.static(path.join(__dirname, '../src/client')));
  
  // Serve React app for non-API routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src/client/index.html'));
  });
  
  // Fallback for React router (SPA)
  app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../src/client/index.html'));
    }
  });
}

/**
 * Start the server
 */
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`🚀 SpaceCommand server running on port ${PORT}`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    
    if (NODE_ENV === 'development') {
      console.log(`🎮 Client URL: http://localhost:${PORT}`);
      console.log(`💊 Health Check: http://localhost:${PORT}/health`);
    }
  });
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
  
  return server;
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;