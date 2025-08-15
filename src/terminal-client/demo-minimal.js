#!/usr/bin/env node

// Minimal demo that should work in any terminal environment
const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

// Create UX and screen manager
const ux = createUX({ theme: 'retro' });
const screenManager = new ScreenManager(ux);

// Clear screen and display current screen only
function displayScreen() {
  process.stdout.write('\x1B[2J\x1B[H');
  
  // Hide cursor for static/menu screens, show for input screens
  const currentScreen = screenManager.getCurrentScreenName();
  if (currentScreen === 'title' || currentScreen === 'main-menu') {
    process.stdout.write('\x1B[?25l'); // Hide cursor
  } else {
    process.stdout.write('\x1B[?25h'); // Show cursor
  }
  
  const rendered = screenManager.render();
  
  if (Array.isArray(rendered)) {
    rendered.forEach(line => {
      process.stdout.write(line + '\n');
    });
  } else {
    process.stdout.write(rendered + '\n');
  }
}

// Show title screen
displayScreen();

process.stdin.once('data', () => {
  // Navigate to main menu
  screenManager.handleInput('\r');
  displayScreen();
});