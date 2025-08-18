#!/usr/bin/env node

import * as readline from 'readline';
import { createUX } from '../modules/ux';
import ScreenManager from './screens/ScreenManager';
import logger from './utils/logger';

// Pure BBS-style interface - no extra text, no scrolling
class BBSClient {
  constructor() {
    this.ux = createUX({ theme: 'retro' });
    this.ux.setRootWindow(true); // Enable root window for all screens
    this.screenManager = new ScreenManager(this.ux);
    this.running = false;
    
    logger.info('BBS Client starting');
  }

  start() {
    this.running = true;
    
    // Clear log file
    logger.clear();
    
    // Check terminal capabilities
    const hasRawMode = !!process.stdin.setRawMode;
    const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
    
    logger.info(`Terminal check: hasRawMode=${hasRawMode}, isInteractive=${isInteractive}`);
    
    if (!hasRawMode || !isInteractive) {
      logger.info('Interactive mode not available, starting demo slideshow');
      this.startDemoMode();
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

  startDemoMode() {
    logger.info('Starting automatic demo slideshow');
    
    const screens = [
      { name: 'title', duration: 3000, description: 'Title Screen' },
      { name: 'main-menu', duration: 5000, description: 'Main Menu' },
      { name: 'trade-center', duration: 5000, description: 'Trade Center' },
      { name: 'market-overview', duration: 4000, description: 'Market Overview' },
      { name: 'fleet-overview', duration: 4000, description: 'Fleet Overview' },
      { name: 'galaxy-map', duration: 4000, description: 'Galaxy Map' },
      { name: 'daily-news', duration: 4000, description: 'Daily News' },
      { name: 'action-queue', duration: 3000, description: 'Action Queue' }
    ];
    
    let currentIndex = 0;
    
    const showNextScreen = () => {
      if (!this.running || currentIndex >= screens.length) {
        logger.info('Demo slideshow completed');
        this.quit();
        return;
      }
      
      const screen = screens[currentIndex];
      logger.info(`Showing ${screen.description} (${currentIndex + 1}/${screens.length})`);
      
      // Navigate to screen
      this.screenManager.setScreen(screen.name);
      
      // Render the screen
      this.render();
      
      // Show progress info
      console.log(`\n=== Demo: ${screen.description} (${currentIndex + 1}/${screens.length}) ===`);
      console.log(`Showing for ${screen.duration / 1000} seconds...`);
      
      currentIndex++;
      
      // Schedule next screen
      setTimeout(showNextScreen, screen.duration);
    };
    
    // Start the demo
    showNextScreen();
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
    if (this.rl) {
      this.rl.close();
    }
  }
}

// Start the BBS client
const client = new BBSClient();
client.start();