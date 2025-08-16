# SpaceCommand Testing Guide

This document provides instructions for running tests and demonstrations in the SpaceCommand project.

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (auto-rerun on changes)
```bash
npm run test:watch
```

### Specific Test Files
```bash
npm test UIComponent.test.js
npm test Menu.test.js
npm test UIControlDemo.test.js
```

## UI Control Demonstrations

### Running the UI Control Demo Test

The `UIControlDemo.test.js` file contains comprehensive demonstrations of all UI components. Run it with:

```bash
npm test UIControlDemo.test.js
```

This test demonstrates:

#### Core Components
- **Menu**: Navigation menus with keyboard shortcuts, descriptions, and styling
- **ContextMenu**: Right-click style menus with separators and shortcuts  
- **Window**: Bordered content containers with titles
- **Dialog**: Modal dialogs for confirmations and alerts
- **Decoration**: ASCII art and decorative elements
- **TitleScreen**: Game title screens with branding

#### Features Demonstrated
- **Navigation**: Arrow keys, direct key activation, menu selection
- **Styling**: Theme switching (retro, classic, modern), custom styles
- **Layout**: Multi-window scenes, positioning, centering
- **Input Handling**: Event capture, input validation, error handling
- **Edge Cases**: Empty menus, invalid input, boundary conditions

#### Sample Output

The demo will show visual output like:
```
=== Menu Demo ===
╔══════════════════════════════════════════════════════════╗
║                    Main Command Center                   ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  [t] Trade Center          Buy and sell goods            ║
║ >[s] Ship Status           View ship information         ║
║  [m] Galaxy Map            Navigate the stars            ║
║  [c] Communications        Send/receive messages         ║
║  [q] Exit Game             Quit to main menu             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Interactive UX Demo

For a live interactive demonstration, run:

```bash
node src/modules/ux/demo.js
```

This shows:
1. Title screen animation
2. Main menu navigation  
3. Dialog boxes
4. Context menus
5. Multi-window layouts
6. API usage examples

### Component-Specific Tests

#### UIComponent Base Class
```bash
npm test UIComponent.test.js
```
Tests core functionality: positioning, sizing, focus, parent/child relationships.

#### Menu System
```bash
npm test Menu.test.js  
```
Tests menu navigation, item selection, keyboard shortcuts, and styling options.

## Test Structure

```
src/modules/ux/components/__tests__/
├── UIComponent.test.js     # Base component tests
├── Menu.test.js           # Menu system tests  
└── UIControlDemo.test.js  # Visual demos of all components
```

## Writing New Tests

When adding new UI components:

1. Create test file in `__tests__/` directory
2. Import required components from `../../index.js`
3. Test both functionality and visual output
4. Include edge cases and error handling
5. Add demo section to show component usage

Example test structure:
```javascript
const { ComponentName } = require('../../index');

describe('ComponentName', () => {
  describe('functionality', () => {
    // Test component behavior
  });
  
  describe('visual demo', () => {
    // Test and display visual output
  });
});
```

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Single Test
```bash
npm test -- --testNamePattern="Menu Component Demo"
```

### Coverage Report
```bash
npm test -- --coverage
```

## Visual Testing

The UI control demo test captures console output to verify visual rendering. Check the test output for:

- Component layout and borders
- Text positioning and alignment  
- Color codes and styling
- Interactive behavior

This helps ensure UI components render correctly across different terminal environments.