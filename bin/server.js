#!/usr/bin/env node

/**
 * SpaceCommand Server Entry Point
 * 
 * This file serves as the main entry point for the SpaceCommand application.
 * It imports the Express application from src/server/app.js and starts the server.
 */

require('dotenv').config();
const path = require('path');

// Import the main Express application and initialization function
const { app, initializeServices } = require('../src/server/app');
const database = require('../src/server/config/database');
const migrationRunner = require('../src/server/config/migration-runner');

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
 * Initialize database and run migrations
 */
async function initializeDatabase() {
  try {
    console.log('📡 Initializing database connection...');
    await database.initialize();
    console.log('✓ Database connection established');
    
    console.log('🔄 Running database migrations...');
    await migrationRunner.runMigrations();
    console.log('✓ Database migrations completed');
    
    // Check if we need to run seeds
    const seedCheck = await database.query('SELECT COUNT(*) FROM players');
    if (seedCheck.rows[0].count === '0') {
      console.log('🌱 Running database seeds...');
      const seedRunner = require('../src/server/config/seed-runner');
      await seedRunner.runSeeds();
      console.log('✓ Database seeds completed');
    }
    
    console.log('✓ Database initialization complete');
  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Start the server with full initialization
 */
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Initialize application services
    await initializeServices();
    
    // Start the HTTP server
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
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
          await database.close();
          console.log('✅ Database connections closed');
          console.log('✅ Server shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('✗ Error during shutdown:', error.message);
          process.exit(1);
        }
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    console.error('✗ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer, initializeDatabase };