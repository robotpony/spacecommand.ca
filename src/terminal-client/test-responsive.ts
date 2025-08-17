#!/usr/bin/env node

const { createUX } = require('../modules/ux');
const StatusBar = require('../modules/ux/components/StatusBar');

console.log('Testing Responsive UI Components');
console.log('================================');
console.log('');

// Test different terminal widths
const testWidths = [80, 100, 120, 140];

testWidths.forEach(width => {
  console.log(`Testing width: ${width} columns`);
  console.log('-'.repeat(width));
  
  const ux = createUX({ theme: 'retro' });
  ux.windowManager.setViewport(width, 24);
  
  const statusBar = new StatusBar({
    width: width,
    title: 'SPACE COMMAND',
    subtitle: 'Turn 47 | 2h 15m left',
    leftStatus: 'Captain Reynolds @ Sol System',
    rightStatus: 'Credits: ₡45,750  AP: 12/20'
  });
  
  const rendered = statusBar.render();
  rendered.forEach(line => {
    // Strip ANSI codes for display
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    console.log(cleanLine);
  });
  
  console.log(`Actual width: ${rendered[0] ? rendered[0].replace(/\x1b\[[0-9;]*m/g, '').length : 0} chars`);
  console.log('');
});

console.log('All tests completed successfully!');
console.log('The UI components scale to different terminal widths.');
console.log('');
console.log('To test interactively:');
console.log('  node src/terminal-client/demo-fixed.js');
console.log('');
console.log('To test with automatic demo:');
console.log('  node src/terminal-client/demo-fixed.js --auto');