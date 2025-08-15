#!/usr/bin/env node

const readline = require('readline');
const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Enable keypress events
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

// Create UX instance
const ux = createUX({ 
  theme: 'retro'
});

// Create screen manager
const screenManager = new ScreenManager(ux);

// Clear screen and show initial screen
function render() {
  // Update viewport for current terminal size
  ux.updateViewport();
  
  // Clear screen and reset cursor position
  process.stdout.write('\x1B[2J\x1B[H');
  
  // Hide cursor for static/menu screens, show for input screens
  const currentScreen = screenManager.getCurrentScreenName();
  if (currentScreen === 'title' || currentScreen === 'main-menu') {
    process.stdout.write('\x1B[?25l'); // Hide cursor
  } else {
    process.stdout.write('\x1B[?25h'); // Show cursor
  }
  
  // Get the rendered content and process it properly
  const rendered = screenManager.render();
  const viewport = ux.getViewport();
  
  if (Array.isArray(rendered)) {
    // Render each line, ensuring we don't exceed terminal height
    for (let i = 0; i < Math.min(rendered.length, viewport.height - 1); i++) {
      if (i < rendered.length) {
        process.stdout.write(rendered[i]);
      }
      if (i < Math.min(rendered.length, viewport.height - 1) - 1) {
        process.stdout.write('\n');
      }
    }
  } else {
    // Single string output
    process.stdout.write(rendered);
  }
  
  // Show current screen name in debug mode
  if (process.env.DEBUG) {
    const promptLine = Math.min(viewport.height - 1, rendered.length || 0);
    process.stdout.write(`\x1B[${promptLine + 1};1H[DEBUG] Current screen: ${screenManager.getCurrentScreenName()}`);
  }
}

// Handle keyboard input
process.stdin.on('keypress', (str, key) => {
  if (!key) return;
  
  // Handle Ctrl+C to quit
  if (key.ctrl && key.name === 'c') {
    console.clear();
    console.log('Exiting SpaceCommand...');
    process.exit(0);
  }
  
  let input = null;
  
  // Handle special keys
  if (key.name === 'escape') {
    input = '\x1B';
  } else if (key.name === 'return' || key.name === 'enter') {
    input = '\r';
  } else if (key.name === 'up') {
    input = '\x1B[A';
  } else if (key.name === 'down') {
    input = '\x1B[B';
  } else if (key.name === 'right') {
    input = '\x1B[C';
  } else if (key.name === 'left') {
    input = '\x1B[D';
  } else if (str) {
    input = str;
  }
  
  if (input) {
    const result = screenManager.handleInput(input);
    
    if (result === 'quit') {
      console.clear();
      console.log('Thanks for playing SpaceCommand!');
      process.exit(0);
    } else if (result === 'refresh') {
      render();
    }
  }
});

// Handle terminal resize
process.stdout.on('resize', () => {
  render();
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
    { delay: 3000, input: '\x1B', description: 'Back to Main Menu' },
    { delay: 2000, input: '5', description: 'Select Daily News' },
    { delay: 3000, input: '\x1B', description: 'Back to Main Menu' },
    { delay: 2000, input: '6', description: 'Select Action Queue' },
    { delay: 3000, input: '\x1B', description: 'Back to Main Menu' },
    { delay: 2000, input: '1', description: 'Select Trade Center' },
    { delay: 3000, input: '\x1B', description: 'Back to Main Menu' }
  ];
  
  let index = 0;
  
  function nextStep() {
    if (index >= demoSequence.length) {
      console.log('\n\nDemo complete! You can now interact with the screens manually.');
      console.log('Press Ctrl+C to exit.');
      return;
    }
    
    const step = demoSequence[index++];
    
    setTimeout(() => {
      if (process.env.DEBUG) {
        console.log(`\n[DEMO] ${step.description}`);
      }
      
      const result = screenManager.handleInput(step.input);
      if (result === 'refresh') {
        render();
      }
      
      nextStep();
    }, step.delay);
  }
  
  nextStep();
}

// Main execution
console.clear();
console.log('═'.repeat(80));
console.log('SPACECOMMAND TERMINAL CLIENT - DEMO MODE');
console.log('═'.repeat(80));
console.log('');
console.log('This demo will showcase all Phase 1 screens.');
console.log('');
console.log('Controls:');
console.log('  • Use number keys or letter keys to select menu options');
console.log('  • Arrow keys to navigate (in Galaxy Map and Universe Selection)');
console.log('  • Enter/Return to confirm selections');
console.log('  • ESC to go back to previous screen');
console.log('  • Ctrl+C to exit');
console.log('');
console.log('Starting in:');

let countdown = 3;
const countdownInterval = setInterval(() => {
  console.log(`  ${countdown}...`);
  countdown--;
  
  if (countdown === 0) {
    clearInterval(countdownInterval);
    
    // Clear everything and prepare clean terminal state
    console.clear();
    
    // Reset terminal state
    if (process.stdin.isTTY) {
      process.stdout.write('\x1B[2J\x1B[H'); // Clear screen and move cursor to home
      process.stdout.write('\x1B[?25l'); // Hide cursor initially
    }
    
    // Initial render
    render();
    
    // Run demo mode if specified
    if (process.argv.includes('--auto')) {
      setTimeout(() => {
        runDemoMode();
      }, 100); // Small delay to ensure render is complete
    }
  }
}, 1000);

// Handle process exit
process.on('exit', () => {
  // Reset terminal
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  rl.close();
});

process.on('SIGINT', () => {
  console.clear();
  console.log('Exiting SpaceCommand...');
  process.exit(0);
});