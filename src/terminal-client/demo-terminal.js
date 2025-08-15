#!/usr/bin/env node

const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

// Function to check if we're in a real terminal
function isRealTerminal() {
  return process.stdout.isTTY && process.stdin.isTTY;
}

// Auto-detect and configure colors
function setupColors() {
  const colors = require('../modules/ux/utils/colors');
  
  if (process.env.FORCE_COLOR || isRealTerminal()) {
    colors.setColorSupport(true);
    return true;
  } else {
    colors.setColorSupport(false);
    return false;
  }
}

function main() {
  const hasColors = setupColors();
  
  console.log('SpaceCommand Terminal Client');
  console.log('============================');
  console.log(`Colors: ${hasColors ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Terminal: ${isRealTerminal() ? 'INTERACTIVE' : 'NON-INTERACTIVE'}`);
  console.log('');
  
  // Create UX instance
  const ux = createUX({ theme: 'retro' });
  const screenManager = new ScreenManager(ux);
  
  if (isRealTerminal()) {
    // Interactive mode
    console.log('Starting interactive mode...');
    console.log('Controls: Number keys for menu, Enter to select, ESC to go back, Ctrl+C to exit');
    console.log('Press any key to start...');
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let needsRender = true;
    
    function renderScreen() {
      if (!needsRender) return;
      
      const viewport = ux.updateViewport();
      const rendered = screenManager.render();
      
      // Clear screen and render
      process.stdout.write('\x1B[2J\x1B[H');
      
      for (let i = 0; i < Math.min(rendered.length, viewport.height); i++) {
        process.stdout.write(rendered[i]);
        if (i < rendered.length - 1) process.stdout.write('\n');
      }
      
      needsRender = false;
    }
    
    process.stdin.once('data', () => {
      renderScreen();
      
      process.stdin.on('data', (key) => {
        if (key === '\u0003') { // Ctrl+C
          process.stdout.write('\x1B[2J\x1B[H');
          console.log('Thanks for trying SpaceCommand!');
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
          needsRender = true;
          renderScreen();
        }
      });
    });
    
    // Handle cleanup
    process.on('exit', () => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
    });
    
  } else {
    // Non-interactive mode - show sample output
    console.log('Non-interactive mode - showing sample screens:');
    console.log('');
    
    // Show title screen
    console.log('1. TITLE SCREEN:');
    console.log('-'.repeat(80));
    let rendered = screenManager.render();
    rendered.forEach(line => console.log(line));
    
    console.log('');
    console.log('2. MAIN MENU (after pressing Enter):');
    console.log('-'.repeat(80));
    
    screenManager.handleInput('\r');
    rendered = screenManager.render();
    rendered.forEach(line => console.log(line));
    
    console.log('');
    console.log('Sample output complete!');
    console.log('');
    console.log('To run interactively, use a proper terminal:');
    console.log('  node src/terminal-client/demo-terminal.js');
  }
}

// Handle process cleanup
process.on('SIGINT', () => {
  if (isRealTerminal()) {
    process.stdout.write('\x1B[2J\x1B[H');
    console.log('Exiting...');
  }
  process.exit(0);
});

main();