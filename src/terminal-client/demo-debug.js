#!/usr/bin/env node

// Force color support for testing
process.env.FORCE_COLOR = '1';

const readline = require('readline');
const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

console.log('='.repeat(80));
console.log('SPACECOMMAND DEBUG MODE');
console.log('='.repeat(80));

// Test color support detection
const colors = require('../modules/ux/utils/colors');
console.log('Color support status:');
console.log('- isColorSupported():', colors.isColorSupported());
console.log('- TERM:', process.env.TERM);
console.log('- FORCE_COLOR:', process.env.FORCE_COLOR);
console.log('- stdout.isTTY:', process.stdout.isTTY);

// Force enable colors explicitly
colors.setColorSupport(true);
console.log('- Colors manually enabled:', colors.isColorSupported());

console.log('');
console.log('Testing basic ANSI output:');
process.stdout.write(colors.color('This should be green text', 'success') + '\n');
process.stdout.write(colors.color('This should be bright green text', 'primary') + '\n');

console.log('');
console.log('Press any key to test the UI...');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.once('data', () => {
  console.clear();
  
  // Create UX with forced colors
  const ux = createUX({ theme: 'retro' });
  ux.colors.setColorSupport(true);
  
  const screenManager = new ScreenManager(ux);
  
  // Test render output
  const rendered = screenManager.render();
  console.log('Rendered screen (first 3 lines):');
  rendered.slice(0, 3).forEach((line, i) => {
    console.log(`Line ${i}: ${JSON.stringify(line)}`);
    process.stdout.write(`Display: ${line}\n`);
  });
  
  console.log('');
  console.log('Full screen output:');
  console.log('='.repeat(80));
  
  // Try to render properly
  rendered.forEach(line => {
    process.stdout.write(line + '\n');
  });
  
  console.log('='.repeat(80));
  console.log('');
  console.log('Debug complete. Press Ctrl+C to exit.');
  
  process.stdin.on('data', (key) => {
    if (key === '\u0003') {
      process.exit(0);
    }
  });
});