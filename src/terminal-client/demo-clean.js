#!/usr/bin/env node

// Clean demo without any pre-screen text that might interfere
const readline = require('readline');
const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

// Create UX instance with retro theme (normal colors)
const ux = createUX({ theme: 'retro' });
const screenManager = new ScreenManager(ux);

function renderScreen() {
  const viewport = ux.updateViewport();
  const rendered = screenManager.render();
  
  // Clear screen and move to top
  process.stdout.write('\x1B[2J\x1B[H');
  
  // Hide cursor for static/menu screens, show for input screens
  const currentScreen = screenManager.getCurrentScreenName();
  if (currentScreen === 'title' || currentScreen === 'main-menu') {
    process.stdout.write('\x1B[?25l'); // Hide cursor
  } else {
    process.stdout.write('\x1B[?25h'); // Show cursor
  }
  
  // Render each line
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
  
  // Move cursor to bottom
  process.stdout.write(`\x1B[${viewport.height};1H`);
  process.stdout.write('Command: ');
}

// Check if we can use raw mode
if (process.stdin.setRawMode) {
  // Interactive mode
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  renderScreen();
  
  process.stdin.on('data', (key) => {
    if (key === '\u0003') { // Ctrl+C
      process.stdout.write('\x1B[2J\x1B[H');
      process.exit(0);
    }
    
    let input = key;
    if (key === '\u001b') input = '\x1B';
    else if (key === '\r' || key === '\n') input = '\r';
    
    const result = screenManager.handleInput(input);
    if (result === 'quit') {
      process.stdout.write('\x1B[2J\x1B[H');
      console.log('Thanks for playing SpaceCommand!');
      process.exit(0);
    } else if (result === 'refresh' || result) {
      renderScreen();
    }
  });
} else {
  // Fallback mode using readline
  console.log('SpaceCommand Terminal Client');
  console.log('Press Enter to start, Q to quit');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('', (input) => {
    if (input.toUpperCase() === 'Q') {
      process.exit(0);
    }
    
    console.clear();
    const rendered = screenManager.render();
    
    if (Array.isArray(rendered)) {
      rendered.forEach(line => console.log(line));
    } else {
      console.log(rendered);
    }
    
    rl.close();
  });
}

process.on('exit', () => {
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
});