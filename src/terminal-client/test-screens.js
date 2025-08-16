#!/usr/bin/env node

const { createUX } = require('../modules/ux');
const ActionQueue = require('./screens/ActionQueue');
const MarketOverview = require('./screens/MarketOverview');
const GalaxyMap = require('./screens/GalaxyMap');
const DailyNewspaper = require('./screens/DailyNewspaper');
const fs = require('fs');
const path = require('path');

// Test each screen
async function testScreen(ScreenClass, name) {
  console.log(`\nTesting ${name}...`);
  
  const ux = createUX({ 
    theme: 'retro',
    width: 80,  // Fixed width for testing
    height: 24  // Fixed height for testing
  });
  
  const screen = new ScreenClass(ux);
  const rendered = screen.render();
  
  // Save to file for inspection
  const outputDir = path.join(__dirname, '../../tmp/test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `${name.toLowerCase().replace(/\s/g, '-')}.txt`);
  fs.writeFileSync(outputFile, rendered.join('\n'));
  
  console.log(`✓ ${name} rendered successfully`);
  console.log(`  Output saved to: ${outputFile}`);
  
  // Check for root window border
  const hasTopBorder = rendered[0] && rendered[0].includes('┌');
  const hasBottomBorder = rendered[rendered.length - 1] && rendered[rendered.length - 1].includes('└');
  console.log(`  Root window: ${hasTopBorder && hasBottomBorder ? '✓' : '✗'}`);
  
  return rendered;
}

async function main() {
  console.log('Testing terminal screens with UI fixes...\n');
  console.log('Terminal size: 80x24');
  
  try {
    await testScreen(ActionQueue, 'Action Queue');
    await testScreen(MarketOverview, 'Market Overview');
    await testScreen(GalaxyMap, 'Galaxy Map');
    await testScreen(DailyNewspaper, 'Daily News');
    
    console.log('\n✅ All screens tested successfully!');
    console.log('Check tmp/test-output/ for rendered output files');
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    process.exit(1);
  }
}

main();