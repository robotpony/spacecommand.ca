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
const MigrationRunner = require('../src/server/config/migration-runner');
const portManager = require('../src/server/utils/port-manager');

// Configuration
const PREFERRED_PORT = parseInt(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const PID_FILE = path.join(__dirname, '../server.pid');

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
 * Handle existing SpaceCommand instances and select an available port
 * @returns {Promise<number>} Available port number
 */
async function handleInstancesAndSelectPort() {
  console.log('🔍 Checking for existing SpaceCommand instances...');
  
  const existing = await portManager.checkExistingInstances(PID_FILE);
  
  if (existing.running) {
    console.log(`📍 Found existing SpaceCommand instance:`);
    console.log(`   PID: ${existing.pid}`);
    console.log(`   Port: ${existing.port || 'unknown'}`);
    
    if (NODE_ENV === 'development') {
      console.log('🔄 Development mode: Stopping existing instance...');
      const terminated = await portManager.terminateProcess(existing.pid);
      
      if (terminated) {
        console.log('✅ Previous instance stopped successfully');
        portManager.removePidFile(PID_FILE);
      } else {
        console.log('⚠️  Could not stop previous instance, finding alternative port...');
      }
    } else {
      console.log('🚫 Production mode: Cannot auto-stop existing instance');
      console.log('💡 Either stop the existing instance manually or use a different PORT environment variable');
      process.exit(1);
    }
  }
  
  // Check if preferred port is available
  console.log(`🔍 Checking port ${PREFERRED_PORT}...`);
  const isPreferredPortFree = await portManager.isPortFree(PREFERRED_PORT);
  
  if (isPreferredPortFree) {
    console.log(`✅ Port ${PREFERRED_PORT} is available`);
    return PREFERRED_PORT;
  }
  
  // Find alternative port
  console.log(`⚠️  Port ${PREFERRED_PORT} is busy, searching for alternatives...`);
  const availablePort = await portManager.findAvailablePort(PREFERRED_PORT + 1);
  console.log(`✅ Found available port: ${availablePort}`);
  
  return availablePort;
}

/**
 * Start HTTP server with enhanced error handling
 * @param {number} port - Port number to start server on
 * @returns {Promise<object>} HTTP server instance
 */
async function startHttpServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      // Write PID file for process tracking
      portManager.writePidFile(PID_FILE, process.pid);
      
      console.log(`🚀 SpaceCommand server running on port ${port}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`🌐 API Base URL: http://localhost:${port}/api`);
      
      if (NODE_ENV === 'development') {
        console.log(`🎮 Client URL: http://localhost:${port}`);
        console.log(`💊 Health Check: http://localhost:${port}/health`);
      }
      
      resolve(server);
    });
    
    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`❌ Port ${port} became busy during startup`);
        try {
          const newPort = await portManager.findAvailablePort(port + 1);
          console.log(`🔄 Retrying on port ${newPort}...`);
          resolve(await startHttpServer(newPort));
        } catch (portError) {
          reject(new Error(`Failed to find alternative port: ${portError.message}`));
        }
      } else {
        reject(error);
      }
    });
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
    const migrationRunner = new MigrationRunner();
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
  let selectedPort;
  let server;
  
  try {
    // Handle existing instances and select available port
    selectedPort = await handleInstancesAndSelectPort();
    
    // Initialize database first
    await initializeDatabase();
    
    // Initialize application services
    await initializeServices();
    
    // Start the HTTP server with enhanced error handling
    server = await startHttpServer(selectedPort);
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
          await database.close();
          portManager.removePidFile(PID_FILE);
          console.log('✅ Database connections closed');
          console.log('✅ PID file cleaned up');
          console.log('✅ Server shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('✗ Error during shutdown:', error.message);
          portManager.removePidFile(PID_FILE); // Ensure cleanup even on error
          process.exit(1);
        }
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    console.error('✗ Server startup failed:', error.message);
    
    // Clean up PID file on startup failure
    if (selectedPort) {
      portManager.removePidFile(PID_FILE);
    }
    
    // Provide helpful error context
    if (error.code === 'EADDRINUSE') {
      console.error('💡 This usually means another process is using the port.');
      console.error('💡 Try stopping other applications or setting a different PORT environment variable.');
    }
    
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