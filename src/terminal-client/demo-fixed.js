#!/usr/bin/env node

const readline = require('readline');
const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

// Create UX instance with automatic terminal width detection
const ux = createUX({ 
  theme: 'retro'
});

// Create screen manager
const screenManager = new ScreenManager(ux);

// Fixed screen rendering function
function renderScreen() {
  // Update viewport for current terminal size
  ux.updateViewport();
  
  // Get the rendered screen as lines
  const renderedLines = screenManager.render();
  const viewport = ux.getViewport();
  
  // Move cursor to top-left and clear screen
  process.stdout.write('\x1B[2J\x1B[H');
  
  // Hide cursor for static/menu screens, show for input screens
  const currentScreen = screenManager.getCurrentScreenName();
  if (currentScreen === 'title' || currentScreen === 'main-menu') {
    process.stdout.write('\x1B[?25l'); // Hide cursor
  } else {
    process.stdout.write('\x1B[?25h'); // Show cursor
  }
  
  // Render each line, ensuring we don't exceed terminal height
  for (let i = 0; i < Math.min(renderedLines.length, viewport.height); i++) {
    if (i < renderedLines.length) {
      process.stdout.write(renderedLines[i]);
    }
    if (i < viewport.height - 1) {
      process.stdout.write('\n');
    }
  }
  
  // Move cursor to bottom for input (but keep screen fixed)
  const promptLine = Math.min(viewport.height - 1, renderedLines.length);
  process.stdout.write(`\x1B[${promptLine + 1};1H`);
}

// Setup raw mode for immediate key detection
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Handle terminal resize
process.stdout.on('resize', () => {
  renderScreen();
});

// Handle keyboard input
process.stdin.on('data', (key) => {
  // Handle Ctrl+C to quit
  if (key === '\u0003') {
    process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
    console.log('Exiting SpaceCommand...');
    process.exit(0);
  }
  
  let input = null;
  
  // Convert key codes to appropriate input
  if (key === '\u001b') { // ESC
    input = '\x1B';
  } else if (key === '\r' || key === '\n') {
    input = '\r';
  } else if (key === '\u001b[A') { // Up arrow
    input = '\x1B[A';
  } else if (key === '\u001b[B') { // Down arrow
    input = '\x1B[B';
  } else if (key === '\u001b[C') { // Right arrow
    input = '\x1B[C';
  } else if (key === '\u001b[D') { // Left arrow
    input = '\x1B[D';
  } else {
    input = key;
  }
  
  if (input) {
    const result = screenManager.handleInput(input);
    
    if (result === 'quit') {
      process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
      console.log('Thanks for playing SpaceCommand!');
      process.exit(0);
    } else if (result === 'refresh' || result) {
      // Re-render screen in place
      renderScreen();
    }
  }
});

// Demo mode for automated navigation
function runDemoMode() {
  const demoSequence = [
    { delay: 2000, input: '\r', description: 'Press Enter on title screen' },
    { delay: 2000, input: '3', description: 'Select Galaxy Map' },
    { delay: 3000, input: '\x1B', description: 'Back to Main Menu' },
    { delay: 2000, input: '4', description: 'Select Market Overview' },
    { delay: 3000, input: 'T', description: 'Go to Trade Center' },
    { delay: 3000, input: '\x1B', description: 'Back to Market' },
    { delay: 2000, input: '\x1B', description: 'Back to Main Menu' },
    { delay: 2000, input: '2', description: 'Select Fleet Overview' },
    { delay: 3000, input: '\x1B', description: 'Back to Main Menu' }
  ];
  
  let index = 0;
  
  function nextStep() {
    if (index >= demoSequence.length) {
      // Show completion message at bottom
      const viewport = ux.getViewport();
      process.stdout.write(`\x1B[${viewport.height};1H`);
      console.log('\nDemo complete! You can now interact manually. Press Ctrl+C to exit.');
      return;
    }
    
    const step = demoSequence[index++];
    
    setTimeout(() => {
      if (process.env.DEBUG) {
        const viewport = ux.getViewport();
        process.stdout.write(`\x1B[${viewport.height};1H`);
        console.log(`[DEMO] ${step.description}`);
      }
      
      const result = screenManager.handleInput(step.input);
      if (result === 'refresh' || result) {
        renderScreen();
      }
      
      nextStep();
    }, step.delay);
  }
  
  nextStep();
}

// Show startup message
console.log('═'.repeat(80));
console.log('SPACECOMMAND TERMINAL CLIENT - FIXED SCREEN MODE');
console.log('═'.repeat(80));
console.log('');
console.log('This demo uses fixed-screen BBS-style rendering.');
console.log('');
console.log('Controls:');
console.log('  • Use number keys or letter keys for menu options');
console.log('  • Arrow keys to navigate (Galaxy Map, Universe Selection)');
console.log('  • Enter/Return to confirm selections');
console.log('  • ESC to go back');
console.log('  • Ctrl+C to exit');
console.log('');

if (process.argv.includes('--auto')) {
  console.log('Starting automated demo in 3 seconds...');
  setTimeout(() => {
    renderScreen();
    runDemoMode();
  }, 3000);
} else {
  console.log('Press any key to start...');
  process.stdin.once('data', () => {
    renderScreen();
  });
}

// Handle process cleanup
process.on('exit', () => {
  process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
  process.stdin.setRawMode(false);
});

process.on('SIGINT', () => {
  process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
  console.log('Exiting SpaceCommand...');
  process.exit(0);
});