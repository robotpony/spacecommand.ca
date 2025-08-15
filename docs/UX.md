# UX Module Documentation

The UX module provides a comprehensive set of components and utilities for creating terminal-based user interfaces in the SpaceCommand game. It features a component-based architecture with theming support, event handling, and a high-level API for rapid UI development.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Components](#components)
- [Theming and Styling](#theming-and-styling)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Migration Guide](#migration-guide)

## Overview

The UX module is designed around the philosophy of providing both low-level component control and high-level convenience APIs. It supports:

- **Component-based architecture**: Modular UI elements that can be composed
- **Event-driven interactions**: Components emit events for state changes
- **Flexible theming**: Color schemes and styling through the StyleEngine
- **Window management**: Layered windows with focus handling
- **ASCII art support**: Built-in decorations and branding elements

## Quick Start

```javascript
const { createUX } = require('./src/modules/ux');

// Create a UX instance
const ux = createUX({ 
  theme: 'retro',
  width: 80,
  height: 24
});

// Create a title screen
ux.createTitleScreen('title', {
  subtitle: 'A Golden Age Space Trading Game',
  version: 'v0.1.0 Alpha'
});

// Create a menu
const menuItems = [
  { key: '1', label: 'Trade Center', description: 'Buy and sell goods' },
  { key: '2', label: 'Fleet Command', description: 'Manage your ships' },
  { key: 'Q', label: 'Quit Game', description: 'Exit to terminal' }
];

ux.createMenu('mainMenu', menuItems, {
  title: 'Main Command Center',
  x: 10,
  y: 5,
  width: 60
});

// Render to console
ux.renderToConsole();
```

## Architecture

### Component Hierarchy

```
UIComponent (base class)
├── Decoration/DecorationV2 (logos, banners, dividers)
├── Menu/MenuV2 (interactive menus)
├── ContextMenu/ContextMenuV2 (popup menus)
├── Window (containers with borders)
└── Dialog (modal windows)
```

### Core Systems

- **UIComponent**: Base class providing positioning, sizing, visibility, and event handling
- **StyleEngine**: Manages themes, colors, and text styling
- **WindowManager**: Handles multiple windows, layering, and focus
- **Renderer**: Converts components to terminal output
- **LayoutEngine**: Manages component positioning and sizing

### File Structure

```
src/modules/ux/
├── components/           # UI component classes
│   ├── UIComponent.js   # Base component class
│   ├── Decoration.js    # V1 decoration components
│   ├── DecorationV2.js  # V2 decoration components
│   ├── Menu.js          # V1 menu components
│   ├── MenuV2.js        # V2 menu components
│   └── Window.js        # Window and dialog components
├── rendering/           # Rendering and styling system
│   ├── Renderer.js      # Terminal output renderer
│   ├── LayoutEngine.js  # Component layout management
│   └── StyleEngine.js   # Theme and style management
├── utils/               # Utility modules
│   ├── colors.js        # ANSI color handling
│   ├── ascii.js         # ASCII art and box drawing
│   ├── formatting.js    # Text formatting utilities
│   ├── branding.js      # Game branding assets
│   └── WindowManager.js # Window management system
├── demo.js              # Comprehensive demo
└── index.js             # Main module exports
```

## Components

### UIComponent (Base Class)

All UI components extend `UIComponent`, which provides:

- Position and size management
- Visibility and focus states
- Parent-child relationships
- Event emission for state changes
- Abstract `render()` method

```javascript
const component = new UIComponent({
  x: 10, y: 5,
  width: 40, height: 20,
  visible: true
});

component.setPosition(15, 10);
component.setSize(50, 25);
component.show();
component.hide();
```

### Decoration Components

Create decorative elements like logos, banners, and dividers.

**V1 (Legacy)**:
```javascript
const { Decoration, TitleScreen } = require('./src/modules/ux');

const banner = new Decoration({
  type: 'banner',
  content: 'SPACE COMMAND',
  colorTheme: 'primary'
});
```

**V2 (Recommended)**:
```javascript
const { DecorationV2, TitleScreenV2 } = require('./src/modules/ux');

const decoration = new DecorationV2({
  type: 'logo',
  styleSelector: 'text.title',
  styleEngine: myStyleEngine
});
```

### Menu Components

Interactive menus with keyboard navigation.

```javascript
const menuItems = [
  { key: '1', label: 'Option 1', description: 'First option' },
  { key: '2', label: 'Option 2', description: 'Second option' }
];

// V2 Menu (recommended)
const menu = new MenuV2({
  items: menuItems,
  styleSelector: 'menu.default',
  showDescriptions: true
});

// Handle menu events
menu.on('item-selected', (item, index) => {
  console.log(`Selected: ${item.label}`);
});

menu.on('item-activated', (item) => {
  console.log(`Activated: ${item.label}`);
});
```

### Window and Dialog Components

Container components for organizing content.

```javascript
const { Window, Dialog } = require('./src/modules/ux');

// Basic window
const window = new Window({
  title: 'Status Monitor',
  x: 5, y: 2,
  width: 70, height: 20,
  content: ['Line 1', 'Line 2', 'Line 3']
});

// Modal dialog
const dialog = new Dialog({
  title: 'Confirm Action',
  content: ['Are you sure you want to continue?'],
  buttons: ['Yes', 'No'],
  width: 45, height: 8
});
```

## Theming and Styling

### Built-in Themes

- `default`: Standard terminal colors
- `retro`: Green-on-black retro computing theme
- `monochrome`: Black and white theme

```javascript
// Set theme globally
ux.setTheme('retro');

// Define custom styles
ux.defineStyle('menu.special', {
  keyColor: 'highlight',
  labelColor: 'primary',
  selectedLabelColor: 'warning'
});
```

### Color System

The color system provides semantic color names:

- `primary`: Main accent color
- `secondary`: Secondary accent color
- `success`: Success/positive actions
- `warning`: Warnings and attention
- `danger`: Errors and destructive actions
- `info`: Informational content
- `muted`: Subdued/disabled content
- `highlight`: Emphasized content

### StyleEngine

The V2 components use the StyleEngine for consistent theming:

```javascript
const { StyleEngine } = require('./src/modules/ux');

const styleEngine = new StyleEngine();
styleEngine.setTheme('retro');

// Create styled text
const styledText = styleEngine.createStyledText(
  'Hello World',
  'text.title',
  { color: 'primary' }
);
```

## API Reference

### High-level UX API

The main UX class provides convenience methods for common tasks:

```javascript
const ux = createUX(options);

// Window management
ux.createWindow(id, options)
ux.createDialog(id, options)
ux.createMenu(id, items, options)
ux.createContextMenu(id, items, x, y, options)
ux.createTitleScreen(id, options)
ux.createMessageBox(id, message, buttons, options)

// Component creation
ux.menu(items, options)
ux.contextMenu(items, options)
ux.decoration(content, options)
ux.titleScreen(options)
ux.window(options)
ux.dialog(options)

// Style management
ux.setTheme(themeName)
ux.defineStyle(selector, properties)
ux.createStyledText(text, styleSelector, overrides)

// Window operations
ux.show(id)
ux.hide(id)
ux.close(id)
ux.focus(id)
ux.center(id)

// Rendering
ux.render()
ux.renderToString()
ux.renderToConsole()
ux.clear()

// Input handling
ux.handleInput(input)

// Utility access
ux.colors
ux.ascii
ux.formatting
```

### Branding Utilities

Shared branding assets and sample data:

```javascript
const { 
  getDefaultLogo,
  getCompactLogo,
  getSampleMenuItems,
  getSamplePlayerStatus
} = require('./src/modules/ux/utils/branding');

const logo = getDefaultLogo();
const menuItems = getSampleMenuItems();
const playerData = getSamplePlayerStatus();
```

## Examples

### Simple Menu Application

```javascript
const { createUX } = require('./src/modules/ux');
const { getSampleMenuItems } = require('./src/modules/ux/utils/branding');

const ux = createUX({ theme: 'retro' });
const menuItems = getSampleMenuItems();

// Create main menu
ux.createMenu('main', menuItems, {
  title: 'Space Command',
  x: 10, y: 5, width: 60
});

// Handle input
process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  }
  
  const handled = ux.handleInput(key.name);
  if (handled) {
    ux.renderToConsole();
  }
});

ux.renderToConsole();
```

### Multi-Window Layout

```javascript
// Background status window
ux.createWindow('status', {
  title: 'System Status',
  x: 0, y: 0, width: 80, height: 10,
  content: ['System Online', 'Players: 42', 'Turn: 156']
});

// Main content area
ux.createMenu('main', menuItems, {
  title: 'Main Menu',
  x: 5, y: 12, width: 70
});

// Popup dialog
ux.createDialog('popup', {
  title: 'Alert',
  content: ['New message received!'],
  buttons: ['Read', 'Dismiss'],
  width: 40, height: 8
});

// Focus the dialog
ux.focus('popup');
ux.renderToConsole();
```

### Custom Styled Components

```javascript
// Define custom styles
ux.defineStyle('menu.combat', {
  keyColor: 'danger',
  labelColor: 'warning',
  selectedLabelColor: 'highlight',
  descriptionColor: 'muted'
});

// Create menu with custom style
const combatMenu = ux.menu(combatOptions, {
  styleSelector: 'menu.combat',
  showDescriptions: true
});

// Render custom component
const lines = combatMenu.render();
lines.forEach(line => console.log(line));
```

## Migration Guide

### V1 to V2 Components

V2 components offer better styling integration and more consistent APIs:

**V1 (Legacy)**:
```javascript
const menu = new Menu({
  items: menuItems,
  title: 'My Menu',
  showKeys: true,
  keyStyle: 'brackets'
});
```

**V2 (Recommended)**:
```javascript
const menu = new MenuV2({
  items: menuItems,
  styleSelector: 'menu.default',
  keyStyle: 'brackets',
  styleEngine: myStyleEngine
});
```

### Key Differences

1. **Styling**: V2 uses StyleEngine instead of direct color handling
2. **Configuration**: More consistent option naming
3. **Events**: Improved event system with better data
4. **Performance**: Better rendering performance
5. **Extensibility**: Easier to customize and extend

### Compatibility

V1 components are still supported for backward compatibility, but new development should use V2 components. The high-level UX API automatically uses V2 components.

## Performance Considerations

- Use `renderToString()` for batch rendering instead of `renderToConsole()`
- Minimize frequent style changes - define styles once and reuse
- Use the WindowManager for complex layouts instead of manual positioning
- Cache rendered content when components don't change

## Terminal Display Best Practices

### Cursor Management

For screens that don't require user input (like title screens), hide the cursor to provide a cleaner display:

```javascript
// Hide cursor for static screens
process.stdout.write('\x1B[?25l');

// Show cursor for interactive screens
process.stdout.write('\x1B[?25h');
```

### Window Borders and Content Positioning

When designing screens with borders, ensure all content stays within the window boundaries:

```javascript
// Example: Proper prompt positioning within a bordered window
const promptLine = '│ Select option [1-6] or command key: _';
const paddedPromptLine = promptLine.padEnd(79) + '│';
lines.push(paddedPromptLine);
lines.push(this.renderFooter());
```

### Screen Height Management

For terminal screens with fixed dimensions (typically 80x24), ensure content fits properly:

- Account for top and bottom borders when calculating available content lines
- Use consistent spacing between sections
- Test with different terminal sizes when possible

## Troubleshooting

### Common Issues

1. **Colors not showing**: Ensure terminal supports ANSI colors
2. **Layout issues**: Check component sizes and positions
3. **Events not firing**: Verify event listener registration
4. **Styling not applied**: Confirm StyleEngine configuration
5. **Cursor visible on static screens**: Implement cursor hiding for non-interactive screens
6. **Content outside window borders**: Ensure proper padding and positioning within window boundaries

### Debugging

Enable debug output to trace component lifecycle:

```javascript
// Enable debug mode
ux.debug = true;

// Monitor events
ux.on('*', (eventName, ...args) => {
  console.log(`Event: ${eventName}`, args);
});
```

## Contributing

When adding new components:

1. Extend `UIComponent` base class
2. Implement the `render()` method
3. Add appropriate JSDoc documentation
4. Include examples in the demo file
5. Update this documentation

For styling improvements:
1. Test with all built-in themes
2. Ensure accessibility (contrast, readability)
3. Follow semantic color usage
4. Document any new style properties