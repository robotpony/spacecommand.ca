#!/usr/bin/env node

const readline = require('readline');
const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');
const logger = require('./utils/logger');

// Pure BBS-style interface - no extra text, no scrolling
class BBSClient {
  constructor() {
    this.ux = createUX({ theme: 'retro' });
    this.screenManager = new ScreenManager(this.ux);
    this.running = false;
    
    logger.info('BBS Client starting');
  }

  start() {
    this.running = true;
    
    // Clear log file
    logger.clear();
    
    // Check if we can use raw mode
    if (!process.stdin.setRawMode) {
      logger.error('Raw mode not available, falling back to readline');
      this.startReadlineMode();
      return;
    }

    // Set up raw mode for immediate input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    // Initial render
    this.render();

    // Handle input
    process.stdin.on('data', (key) => this.handleInput(key));

    // Handle cleanup
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.quit());
  }

  render() {
    if (!this.running) return;

    try {
      const viewport = this.ux.updateViewport();
      const rendered = this.screenManager.render();

      // Clear screen and move to top-left
      process.stdout.write('\x1B[2J\x1B[H');
      
      // Hide cursor for static/menu screens, show for input screens
      const currentScreen = this.screenManager.getCurrentScreenName();
      if (currentScreen === 'title' || currentScreen === 'main-menu') {
        process.stdout.write('\x1B[?25l'); // Hide cursor
      } else {
        process.stdout.write('\x1B[?25h'); // Show cursor
      }

      // Render screen content
      if (Array.isArray(rendered)) {
        rendered.forEach((line, i) => {
          process.stdout.write(line);
          if (i < rendered.length - 1) {
            process.stdout.write('\n');
          }
        });
      } else {
        process.stdout.write(rendered);
      }

      logger.debug('Screen rendered', { 
        screen: this.screenManager.getCurrentScreenName(),
        lines: Array.isArray(rendered) ? rendered.length : 'string'
      });

    } catch (error) {
      logger.error('Render error', error.message);
    }
  }

  handleInput(key) {
    try {
      // Handle Ctrl+C
      if (key === '\u0003') {
        this.quit();
        return;
      }

      // Convert special keys
      let input = key;
      if (key === '\u001b') input = '\x1B';
      else if (key === '\r' || key === '\n') input = '\r';

      logger.debug('Input received', { key: JSON.stringify(key), input: JSON.stringify(input) });

      const result = this.screenManager.handleInput(input);

      if (result === 'quit') {
        this.quit();
      } else if (result === 'refresh' || result) {
        this.render();
      }

    } catch (error) {
      logger.error('Input handling error', error.message);
    }
  }

  startReadlineMode() {
    // Fallback for environments without raw mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.render();

    rl.on('line', (input) => {
      const trimmed = input.trim().toUpperCase();
      
      if (trimmed === 'Q' || trimmed === 'QUIT') {
        this.quit();
        return;
      }

      const mappedInput = trimmed === '' ? '\r' : trimmed;
      const result = this.screenManager.handleInput(mappedInput);

      if (result === 'quit') {
        this.quit();
      } else if (result === 'refresh' || result) {
        this.render();
      }
    });

    rl.on('close', () => this.quit());
  }

  quit() {
    if (!this.running) return;
    
    this.running = false;
    logger.info('BBS Client shutting down');

    // Clear screen
    process.stdout.write('\x1B[2J\x1B[H');
    
    this.cleanup();
    process.exit(0);
  }

  cleanup() {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  }
}

// Start the BBS client
const client = new BBSClient();
client.start();