/**
 * Comprehensive UX Demo for SpaceCommand
 * Demonstrates all UX components and their usage patterns
 */

const { createUX } = require('./index');
const { getSampleMenuItems, getSamplePlayerStatus } = require('./utils/branding');

console.clear();
console.log('='.repeat(80));
console.log('SpaceCommand UX Component Demonstration');
console.log('='.repeat(80));

// Create UX instance with retro theme
const ux = createUX({ 
  theme: 'retro',
  width: 80,
  height: 24
});

// Sample data from branding module
const menuItems = getSampleMenuItems();
const playerStatus = getSamplePlayerStatus();

/**
 * Demo 1: Title Screen
 */
function demoTitleScreen() {
  console.log('\n1. Title Screen Component:');
  ux.createTitleScreen('title', {
    subtitle: 'A Golden Age Space Trading Game',
    version: 'v0.1.0 Alpha',
    footer: 'Press any key to continue...'
  });
  ux.renderToConsole();
  return new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Demo 2: Main Menu
 */
function demoMainMenu() {
  ux.clear();
  console.log('\n2. Main Menu in Window:');
  ux.createMenu('mainMenu', menuItems, {
    title: 'Main Command Center',
    x: 10,
    y: 5,
    width: 60
  });
  ux.renderToConsole();
  return new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Demo 3: Dialog Box
 */
function demoDialog() {
  ux.clear();
  console.log('\n3. Dialog Box Component:');
  ux.createMessageBox('confirm', [
    'Are you sure you want to quit the game?',
    'All unsaved progress will be lost.'
  ], ['Yes', 'No'], {
    title: 'Confirm Exit'
  });
  ux.renderToConsole();
  return new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Demo 4: Context Menu
 */
function demoContextMenu() {
  ux.clear();
  console.log('\n4. Context Menu Component:');
  const contextItems = [
    { label: 'Buy Cargo', shortcut: 'Ctrl+B' },
    { label: 'Sell Cargo', shortcut: 'Ctrl+S' },
    { label: 'Ship Status', shortcut: 'Ctrl+I' },
    { label: 'Travel', shortcut: 'Ctrl+T' }
  ];
  
  ux.createContextMenu('context', contextItems, 30, 10);
  ux.renderToConsole();
  return new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Demo 5: Multiple Windows
 */
function demoMultipleWindows() {
  ux.clear();
  console.log('\n5. Multiple Windows Layout:');
  
  // Background status window
  ux.createWindow('background', {
    title: 'Status Monitor',
    x: 5,
    y: 2,
    width: 70,
    height: 20,
    content: [
      `Captain: ${playerStatus.name}`,
      `Faction: ${playerStatus.faction}`,
      `Credits: ₡${playerStatus.credits.toLocaleString()}`,
      `Ships: ${playerStatus.ships}`,
      `Turn: ${playerStatus.turn} (${playerStatus.timeLeft} remaining)`,
      '',
      'Market Activity:',
      '  Ore Prices: Rising',
      '  Food Supplies: Stable',
      '  Technology: High Demand'
    ]
  });

  // Foreground alert dialog
  ux.createDialog('alert', {
    title: 'Incoming Message',
    content: ['New transmission received from Captain Torres'],
    buttons: ['Read Message', 'Later'],
    width: 45,
    height: 8
  });

  ux.renderToConsole();
  return new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Demo 6: API Usage Examples
 */
function demoAPIUsage() {
  console.log('\n6. API Usage Examples:');
  console.log('');
  console.log('// Basic component creation:');
  console.log("const ux = createUX({ theme: 'retro' });");
  console.log("ux.createMenu('menu', items, { title: 'My Menu' });");
  console.log("ux.createDialog('dialog', { title: 'Alert', content: ['Message'] });");
  console.log("ux.createTitleScreen('title', { subtitle: 'Game Title' });");
  console.log('');
  console.log('// Styling and theming:');
  console.log("ux.setTheme('retro');");
  console.log("ux.defineStyle('menu.special', { keyColor: 'highlight' });");
  console.log('');
  console.log('// Window management:');
  console.log("ux.show('windowId');");
  console.log("ux.hide('windowId');");
  console.log("ux.center('windowId');");
  console.log('');
  console.log('// Rendering:');
  console.log('ux.renderToConsole();');
  console.log("const output = ux.renderToString();");
  return new Promise(resolve => setTimeout(resolve, 3000));
}

// Run all demos in sequence
async function runAllDemos() {
  await demoTitleScreen();
  await demoMainMenu();
  await demoDialog();
  await demoContextMenu();
  await demoMultipleWindows();
  await demoAPIUsage();
  await demoComponentComparison();
  
  console.log('\n8. Demo Complete!');
  console.log('Check the UX module documentation for detailed usage information.');
}

// Export for programmatic usage
module.exports = {
  demoTitleScreen,
  demoMainMenu,
  demoDialog,
  demoContextMenu,
  demoMultipleWindows,
  demoAPIUsage,
  demoComponentComparison,
  runAllDemos
};

// Run demos if called directly
if (require.main === module) {
  runAllDemos().catch(console.error);
}