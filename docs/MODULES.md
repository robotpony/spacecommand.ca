# Module Design

This document captures an overview of the various modules and tools that are part of this project.

## UX Module (`src/modules/ux/`)

The UX module provides a comprehensive terminal-based user interface system for SpaceCommand. It features:

### Core Components
- **UIComponent**: Base class for all UI elements with positioning, events, and rendering
- **Menu/Menu**: Interactive menus with keyboard navigation and theming
- **Window/Dialog**: Container components for organizing content and modal interactions
- **Decoration/Decoration**: ASCII art, logos, banners, and decorative elements

### Architecture
- **Component-based design**: Modular, reusable UI elements
- **Event-driven**: Components emit events for state changes and user interactions
- **Dual API**: High-level convenience API (`createUX`) and low-level component access

### Key Features
- **Theming system**: Built-in themes (default, retro, monochrome) with custom style support
- **Window management**: Layered windows with focus handling and z-ordering
- **ASCII art support**: Built-in game branding and decorative elements
- **Input handling**: Keyboard navigation and event routing
- **Responsive rendering**: Flexible sizing and positioning

### Usage Examples
```javascript
const ux = createUX({ theme: 'retro' });
ux.createTitleScreen('title', { subtitle: 'Space Trading Game' });
ux.createMenu('menu', menuItems, { title: 'Main Menu' });
ux.renderToConsole();
```

For detailed documentation, see [UX Module Guide](./UX.md).

## World Module (`src/modules/world/`)

*Documentation pending - module in development*

## Messaging Module (`src/modules/messaging/`)

*Documentation pending - module in development*