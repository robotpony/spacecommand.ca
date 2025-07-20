# SpaceCommand UI Design

## Terminal Interface Design

### Command Structure
```
spacecommand> command [subcommand] [options] [--flags]

Examples:
spacecommand> status
spacecommand> fleet create destroyer 5 --planet "Homeworld"
spacecommand> diplomacy propose trade-agreement player2 --resources "energy:1000"
spacecommand> attack fleet-001 --type orbital-bombardment
```

### Terminal Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ SpaceCommand Terminal v1.0                                      │
│ Connected to: spacecommand.ca                                   │
│ Player: CommanderX | Empire: Galactic Federation | Turn: 42    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ > status                                                        │
│                                                                 │
│ ═══ EMPIRE STATUS ═══                                          │
│ Empire: Galactic Federation                                     │
│ Turn: 42 | Action Points: 7/10                                │
│                                                                 │
│ ═══ RESOURCES ═══                                              │
│ Credits:        15,000  (+2,500/turn)                         │
│ Population:     50,000  (+1,200/turn)                         │
│ Energy:         12,000  (+800/turn)                           │
│ Raw Materials:   8,500  (+1,500/turn)                         │
│ Food:           25,000  (+3,000/turn)                         │
│ Tech Points:       750  (+150/turn)                           │
│                                                                 │
│ ═══ FLEETS ═══                                                │
│ Fleet Alpha: 5 Destroyers, 10 Fighters (Sector 23)           │
│ Fleet Beta:  3 Cruisers, 15 Frigates (Sector 31)             │
│                                                                 │
│ > _                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Command Categories

#### Authentication Commands
```
login <username> [password]     # Login to game
register <username> <email>     # Create new account
logout                          # End session
whoami                         # Show current user
```

#### Empire Management
```
status                         # Empire overview
empire                         # Detailed empire info
planets                        # List all planets
resources                      # Resource breakdown
build <type> <amount> [planet] # Construct buildings/ships
research <technology>          # Start research project
```

#### Fleet Operations
```
fleets                         # List all fleets
fleet <id>                     # Fleet details
create-fleet <ships> [planet]  # Create new fleet
move <fleet> <destination>     # Move fleet
merge <fleet1> <fleet2>        # Combine fleets
disband <fleet>                # Disband fleet
```

#### Combat Commands
```
attack <target> [--type]       # Attack enemy
retreat <fleet>                # Retreat from combat
scan <sector>                  # Sensor sweep
```

#### Exploration
```
explore <direction>            # Explore new sector
colonize <planet> <population> # Colonize planet
```

#### Diplomacy
```
diplomacy relations            # Show all relations
diplomacy propose <type> <player> # Make proposal
diplomacy respond <id> <accept|reject> # Respond to proposal
diplomacy message <player> <text> # Send private message
```

### Color Coding
- **Green**: Success messages, positive values
- **Red**: Error messages, negative values, warnings
- **Yellow**: Important information, pending actions
- **Blue**: Informational text, headers
- **Cyan**: Player names, empire names
- **White**: Default text
- **Gray**: Secondary information

## Web Interface Design

### Browser Terminal
```html
<!DOCTYPE html>
<html>
<head>
    <title>SpaceCommand Web Terminal</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="terminal-container">
        <div id="terminal-header">
            <span class="title">SpaceCommand</span>
            <span class="connection-status">Connected</span>
            <span class="player-info">CommanderX | Turn 42</span>
        </div>
        
        <div id="terminal-output">
            <!-- Command history and output -->
        </div>
        
        <div id="terminal-input">
            <span class="prompt">spacecommand> </span>
            <input type="text" id="command-input" autocomplete="off">
        </div>
    </div>
</body>
</html>
```

### CSS Styling (Retro Terminal)
```css
/* Terminal container */
#terminal-container {
    background: #0a0a0a;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.4;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    max-width: 1200px;
    margin: 20px auto;
}

/* Scanline effect */
#terminal-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(transparent 50%, rgba(0, 255, 0, 0.03) 50%);
    background-size: 100% 4px;
    pointer-events: none;
}

/* Header styling */
#terminal-header {
    border-bottom: 1px solid #00ff00;
    padding-bottom: 10px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
}

/* Output area */
#terminal-output {
    height: 500px;
    overflow-y: auto;
    margin-bottom: 20px;
    padding: 10px;
    border: 1px solid #004400;
    background: rgba(0, 255, 0, 0.02);
}

/* Input area */
#terminal-input {
    display: flex;
    align-items: center;
}

#command-input {
    background: transparent;
    border: none;
    color: #00ff00;
    font-family: inherit;
    font-size: inherit;
    outline: none;
    flex: 1;
    margin-left: 10px;
}

/* Color classes */
.success { color: #00ff00; }
.error { color: #ff4444; }
.warning { color: #ffaa00; }
.info { color: #4488ff; }
.player { color: #00ffff; }
.empire { color: #ff88ff; }
```

### Responsive Design
```css
/* Mobile adaptations */
@media (max-width: 768px) {
    #terminal-container {
        margin: 10px;
        padding: 15px;
        font-size: 12px;
    }
    
    #terminal-output {
        height: 300px;
    }
    
    #terminal-header {
        flex-direction: column;
        text-align: center;
    }
}

/* Touch interface */
.mobile-controls {
    display: none;
}

@media (max-width: 768px) {
    .mobile-controls {
        display: flex;
        margin-top: 10px;
        gap: 10px;
    }
    
    .mobile-button {
        padding: 8px 12px;
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid #00ff00;
        color: #00ff00;
        border-radius: 4px;
        font-size: 12px;
    }
}
```

### Interactive Features

#### Command History
- Up/Down arrows navigate command history
- Ctrl+R for reverse search
- History persisted in localStorage

#### Auto-completion
- Tab completion for commands
- Context-aware suggestions
- Parameter hints and validation

#### Visual Feedback
- Loading spinners for API calls
- Connection status indicators
- Error highlighting
- Success confirmations

### Accessibility Features
- Screen reader compatible
- High contrast mode option
- Keyboard navigation only
- Font size adjustment
- Color blind friendly options

## Mobile Interface Considerations

### Touch Optimizations
- Larger touch targets for buttons
- Swipe gestures for navigation
- Virtual keyboard optimization
- Pinch-to-zoom support

### Layout Adaptations
- Collapsible sections
- Tabbed interface for different views
- Simplified command entry
- Context menus for common actions

### Performance
- Lazy loading for large data sets
- Virtual scrolling for long outputs
- Offline capability with local cache
- Progressive web app features