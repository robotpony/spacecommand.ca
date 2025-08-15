# SpaceCommand Terminal Client

## Phase 1 Screens Implementation

This directory contains the terminal-based UI screens for SpaceCommand, implementing all Phase 1 screens as specified in `/docs/SCREENS.md`.

## Implemented Screens

1. **Title Screen** - ASCII art logo and game introduction
2. **Main Menu** - Central hub for game navigation (Updated with UI library)
3. **Universe Selection** - Server browser for joining game universes
4. **Market Overview** - Commodity prices and market trends
5. **Trade Center** - Buy/sell interface with cargo management
6. **Fleet Overview** - Ship management dashboard
7. **Galaxy Map** - ASCII star map with system navigation
8. **Action Queue** - Pending turn actions management
9. **Daily Newspaper** - In-game news and market reports

## Running the Demos

```bash
# Pure BBS-style interface with logging (RECOMMENDED)
node src/terminal-client/demo-bbs.js

# Interactive demo with readline fallback
node src/terminal-client/demo-interactive.js

# Interactive with automated navigation
node src/terminal-client/demo-interactive.js --demo

# Minimal demo (two screens only)
node src/terminal-client/demo-minimal.js

# Enable debug logging
DEBUG=1 node src/terminal-client/demo-bbs.js
```

## Controls

- **Number keys (1-9)** - Select menu options
- **Letter keys** - Quick commands (varies by screen)
- **Arrow keys** - Navigate in Galaxy Map and Universe Selection
- **Enter** - Confirm selections
- **ESC** - Return to previous screen
- **Ctrl+C** - Exit application

## Design Features

- **Retro Terminal Aesthetic**: Green phosphor CRT-style colors
- **Proper UI Library Integration**: Uses WindowManager and components for consistent rendering
- **Responsive Width**: Automatically adapts to terminal width (minimum 80 columns)
- **Fixed-Screen BBS Mode**: Screen stays in place, no scrolling (classic BBS behavior)
- **Proper Border Alignment**: Fixed line alignment issues using UI library components
- **Persistent Status Bar**: Always shows credits, turn time, and action points
- **Contextual Navigation**: Each screen has relevant command options

## Architecture

- **ScreenManager**: Handles navigation and screen stack
- **Individual Screen Classes**: Each screen is a self-contained module
- **Shared Game State**: Consistent data across all screens
- **Input Handling**: Per-screen input processing with navigation support

## Future Enhancements

- Real-time updates via WebSocket
- Sound effects for terminal beeps
- Animated transitions between screens
- Configurable color themes
- Save/load game state
- Multiplayer lobby integration