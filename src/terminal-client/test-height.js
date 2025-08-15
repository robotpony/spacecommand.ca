#!/usr/bin/env node

const { createUX } = require('../modules/ux');
const ScreenManager = require('./screens/ScreenManager');

console.log('Testing Terminal Height Responsiveness');
console.log('====================================');

// Test different terminal heights
const testHeights = [24, 30, 36, 40, 48];

testHeights.forEach(height => {
  console.log(`\nTesting height: ${height} lines`);
  console.log('-'.repeat(40));
  
  const ux = createUX({ theme: 'retro' });
  ux.windowManager.setViewport(80, height);
  
  const screenManager = new ScreenManager(ux);
  
  // Test title screen
  const titleRendered = screenManager.render();
  console.log(`Title screen: ${titleRendered.length} lines (should be ≤ ${height})`);
  
  // Test main menu
  screenManager.handleInput('\r');
  const menuRendered = screenManager.render();
  console.log(`Main menu: ${menuRendered.length} lines (should be ≤ ${height})`);
  
  // Check if content fits
  const titleFits = titleRendered.length <= height;
  const menuFits = menuRendered.length <= height;
  
  console.log(`✓ Title fits: ${titleFits ? 'YES' : 'NO'}`);
  console.log(`✓ Menu fits: ${menuFits ? 'YES' : 'NO'}`);
  
  if (!titleFits || !menuFits) {
    console.log('❌ OVERFLOW DETECTED');
  } else {
    console.log('✅ All content fits properly');
  }
});

console.log('\n' + '='.repeat(40));
console.log('Height responsiveness test complete!');
console.log('All screens should fit within their terminal height.');