# Game Startup Screen Design

**Feature**: Enhanced First-Time User Experience  
**Date**: 2025-07-20  
**Status**: Design Phase  

## Overview

The current startup screen is minimal - just a basic bordered box with the game title and two simple instructions. This design outlines an improved first-screen experience that will:

1. Create an immersive space-themed atmosphere
2. Provide clear guidance for new users
3. Give a quick command reference for returning users
4. Establish the game's tone and setting

## Current State Analysis

### Existing Welcome Banner (WebTerminal.js:106-122)
```
╔═══════════════════════════════════════════════════════════════╗
║                      SPACECOMMAND.CA                          ║
║                   Web Terminal Interface                      ║
║                                                               ║
║  Type 'help' for available commands                           ║
║  Type 'login <username>' to authenticate                      ║
╚═══════════════════════════════════════════════════════════════╝
```

### Issues with Current Design
- Too generic and technical-feeling 
- Lacks space/sci-fi atmosphere
- No introduction to the game world
- Limited command guidance
- No visual appeal beyond basic borders

## Design Goals

### Primary Goals
1. **Immersion**: Establish the space command center feeling immediately
2. **Onboarding**: Help new users understand what they can do
3. **Reference**: Provide quick command access for returning players
4. **Atmosphere**: Set the sci-fi tone with appropriate theming

### Secondary Goals
- Maintain terminal aesthetic consistency
- Keep text readable in monospace fonts
- Ensure fast loading and display
- Support both new and returning users

## Design Specification

### ASCII Art Requirements
- Simple space-themed graphic (star field, spacecraft, or space station)
- Maximum width: 65 characters (fits standard terminal)
- Maximum height: 15 lines (reasonable screen space)
- Uses basic ASCII characters (no extended Unicode)
- Maintains readability at all terminal sizes

### Content Structure
1. **ASCII Art Header** - Space-themed visual element
2. **Game Title & Tagline** - Clear branding and purpose
3. **Welcome Message** - Brief world/context introduction  
4. **Quick Commands** - Essential commands for immediate use
5. **Authentication Status** - Clear login guidance
6. **Footer** - Additional help reference

### Proposed ASCII Art Options

#### Option A: Starfield
```
    *  .     *       .       *    .    *  .     *
  .    *  .     .  *    .  *   .    .   *    .
*    .     *  .     *  .    .  *  .  *    .  *
  .  *    .   *  .     .  *    .     .  *  .
    .  *     .     *  .    *  .  *    .  .
*    .  *  .    .  *    .    .  *  .    *  .
  .     *    .  *  .  *    .  *    .  *    .
```

#### Option B: Simple Spacecraft
```
         .-..-. 
       __|=====|__
      (_|-----|_)
        |[###]|
      /==========\
     [=============]
      \==========/
```

#### Option C: Space Station (Preferred)
```
     * . . * . . . * . . *
   .   ╔═══════════════╗   .
 *     ║ SPACE COMMAND ║     *
   .   ║   STATION     ║   .
     * ╚═══════════════╝ *
   [████████████████████]
     * . . * . . . * . . *
```

### Content Text Design

#### Welcome Message
- Brief 2-3 line introduction to the game world
- Mentions being a space fleet commander
- Sets the strategic/command tone

#### Command Summary
- 6-8 most essential commands
- Grouped by function (Auth, Status, Actions)
- One-line descriptions for each

#### Authentication Flow
- Clear login instructions for new users
- Registration guidance
- Session status information

## Technical Implementation

### File Location
- Primary changes in: `src/client/web-terminal/WebTerminal.js`
- Function: `showWelcomeBanner()` (line 106)

### Color Scheme
- ASCII Art: Cyan (`#00ffff`) - matches current banner style
- Title: Bright white (`#ffffff`)
- Commands: Yellow (`#ffff00`) - matches current data display
- Descriptions: Light gray (`#aaaaaa`) - readable but not dominant
- Authentication: Green (`#00ff00`) for success, red (`#ff0000`) for actions needed

### Responsive Considerations
- Text wraps appropriately on narrow terminals
- ASCII art scales down gracefully
- Essential commands remain visible on all screen sizes

## User Experience Flow

### First-Time User
1. Sees immersive ASCII art and title
2. Reads welcome message explaining they're a fleet commander
3. Finds 'register' and 'login' commands clearly highlighted
4. Can reference other commands without overwhelming information

### Returning User  
1. Quick visual confirmation they're in the right place
2. Immediate command reference without scrolling
3. Clear authentication status
4. Can jump straight into gameplay commands

### Error States
- Connection failures: Maintain basic ASCII art but highlight reconnection
- Authentication errors: Emphasize login commands
- Server issues: Provide fallback text-only version

## Success Metrics

### Qualitative Goals
- New users understand this is a space strategy game within 5 seconds
- Users can find their next action without typing 'help'
- The interface feels more game-like and less technical
- Terminal aesthetic is preserved and enhanced

### Measurable Outcomes
- Reduced "help" command usage immediately after startup
- Faster progression from startup to first authentication
- Positive user feedback on atmosphere and usability
- No increase in startup display time

## Implementation Phases

### Phase 1: ASCII Art & Basic Layout
- Choose and implement ASCII art
- Update title presentation
- Restructure welcome banner function

### Phase 2: Content Enhancement
- Add welcome message content
- Implement command summary section
- Enhance authentication guidance

### Phase 3: Polish & Testing
- Color scheme implementation
- Responsive behavior testing
- User experience validation

## Implementation Status

### Completed Features ✅
- Space station ASCII art (Option C)
- Immersive welcome message and commander introduction
- Essential command summary with authentication guidance
- Themed color scheme (cyan art, blue info, gray help)
- **Interactive authentication flow** - Detects user state and provides personalized prompts
- **Guest viewing mode** - Allows spectating without authentication
- **Public game information** - 'about', 'spectate', 'view-status' commands
- **Numbered menu system** - Easy-to-read numbered options with proper whitespace
- **Dual input support** - Users can type numbers (1-8/1-11) or full command names

### Menu System Features
**Guest Menu (1-8):**
1. about - Game information and features
2. leaderboard - View empire rankings
3. spectate battles - Recent galactic conflicts  
4. spectate map - Galaxy overview
5. view-status - Public galaxy statistics
6. register - Create new account (requires parameters)
7. login - Access your empire (requires parameters)
8. reset-password - Reset forgotten password (requires parameters)

**Authenticated Menu (1-11):**
1. status - Your empire status
2. empire - Empire details  
3. resources - Resource levels
4. planets - Your planets
5. fleets - List your fleets
6. fleet - Fleet details (requires ID)
7. move - Move fleet (requires fleet ID and destination)
8. scan - Sector scan
9. attack - Initiate combat (requires fleet and target)
10. diplomacy relations - Diplomatic status
11. leaderboard - Empire rankings

## Future Enhancements

### Possible Additions (Not in Initial Scope)
- Dynamic ASCII art based on user's empire status
- Seasonal/event-based startup variations
- Real-time server stats display in guest mode
- Recent news or update information
- Expanded spectator features (live battle feeds)

### Integration Points
- Could connect with player empire data for personalization
- Might integrate with announcement system
- Could tie into tutorial system for new players
- Guest mode could show real server statistics