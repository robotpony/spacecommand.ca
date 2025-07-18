# Terminal REPL Client Design

## Overview

The Terminal REPL Client provides a command-line interface for playing SpaceCommand, offering a retro terminal experience that captures the feel of commanding a spaceship from a computer terminal. This client serves as both a testing tool for the API and a fully functional game client.

## Architecture

### Core Components

```
src/client/terminal/
├── main.js              # Entry point and REPL initialization
├── parser/
│   ├── CommandParser.js # Command parsing and validation
│   ├── CommandRegistry.js # Command definitions and help
│   └── AutoComplete.js  # Tab completion and suggestions
├── api/
│   ├── ApiClient.js     # HTTP client with authentication
│   ├── WebSocketClient.js # Real-time event handling
│   └── ResponseFormatter.js # Format API responses for terminal
├── session/
│   ├── SessionManager.js # Authentication and state persistence
│   ├── GameState.js     # Local game state caching
│   └── ConfigManager.js # Client configuration
├── display/
│   ├── Terminal.js      # Terminal interface and formatting
│   ├── ColorScheme.js   # Color coding and themes
│   └── ProgressBar.js   # Progress indicators
└── utils/
    ├── Logger.js        # Debug and error logging
    └── InputValidator.js # Input validation and sanitization
```

## Command System

### Command Categories

1. **Authentication Commands**
   - `login <username> [password]` - Authenticate with server
   - `logout` - End current session
   - `register <username> <email> [password]` - Create new account
   - `whoami` - Show current user info

2. **Empire Management Commands**
   - `status` - Empire overview with resources and stats
   - `empire` - Detailed empire information
   - `planets` - List all planets with production
   - `resources` - Resource inventory and projections
   - `buildings <planet_id>` - Manage planet buildings

3. **Fleet Operations Commands**
   - `fleets` - List all fleets and their status
   - `fleet <fleet_id>` - Detailed fleet information
   - `create-fleet <planet_id> <ships>` - Create new fleet
   - `move <fleet_id> <destination>` - Move fleet to location
   - `merge <fleet_id1> <fleet_id2>` - Merge two fleets
   - `disband <fleet_id>` - Disband fleet

4. **Combat Commands**
   - `attack <fleet_id> <target>` - Initiate combat
   - `raid <fleet_id> <target>` - Quick raid attack
   - `bombard <fleet_id> <planet_id>` - Orbital bombardment
   - `combat-log [limit]` - View recent combat history
   - `retreat <combat_id>` - Attempt to retreat from combat

5. **Diplomacy Commands**
   - `diplomacy` - Overview of diplomatic relations
   - `propose <player> <type> [terms]` - Send diplomatic proposal
   - `respond <proposal_id> <accept|reject>` - Respond to proposal
   - `message <player> <text>` - Send diplomatic message
   - `relations <player>` - View detailed relations with player

6. **Territory Commands**
   - `scan [sector]` - Scan current or specified sector
   - `explore <direction>` - Explore adjacent sectors
   - `colonize <planet_id> <specialization>` - Colonize planet
   - `trade-route <planet1> <planet2>` - Establish trade route
   - `map` - Show local galaxy map

7. **Game State Commands**
   - `turn` - Current turn information and time remaining
   - `events [limit]` - Recent game events and notifications
   - `leaderboard` - Empire rankings
   - `stats` - Personal game statistics

8. **Utility Commands**
   - `help [command]` - Show help for commands
   - `history [limit]` - Show command history
   - `clear` - Clear terminal screen
   - `config <key> [value]` - View/set configuration
   - `quit` / `exit` - Exit the client

### Command Parsing

**Input Format**: `<command> [subcommand] [arguments] [--flags]`

**Examples**:
```bash
login admiral_kirk
fleet 123 --verbose
attack 456 planet_789 --confirm
propose empire_42 trade metal=100 energy=50
```

**Features**:
- Tab completion for commands and arguments
- Command aliases (e.g., `q` for `quit`, `s` for `status`)
- Flag support for command modifiers
- Input validation and error suggestions
- Command history with up/down arrow navigation

## User Experience Design

### Terminal Interface

**Prompt Design**:
```
[SpaceCommand] Admiral Kirk @ Turn 42 (8h 23m) > 
```

**Output Formatting**:
- **Success**: Green text with ✓ symbols
- **Errors**: Red text with ✗ symbols  
- **Warnings**: Yellow text with ⚠ symbols
- **Info**: Blue text with ℹ symbols
- **Resources**: Color-coded by type (metal=gray, energy=yellow, research=blue)
- **Status**: Empire health indicators (●○○ = 1/3 health)

**Table Formatting**:
```
FLEETS
┌─────┬──────────────┬──────────┬────────┬──────────┐
│ ID  │ Name         │ Location │ Ships  │ Status   │
├─────┼──────────────┼──────────┼────────┼──────────┤
│ 123 │ Alpha Fleet  │ Sol-3    │ 15     │ Ready    │
│ 456 │ Beta Strike  │ Tau-7    │ 8      │ Moving   │
└─────┴──────────────┴──────────┴────────┴──────────┘
```

**Progress Indicators**:
```
Building Construction: [████████░░] 80% (2h 15m)
Fleet Movement:       [████████░░] 80% (45m)
```

### Real-time Updates

**Event Notifications**:
```
⚡ [COMBAT] Your fleet "Alpha Strike" is under attack at Rigel-4!
📡 [DIPLOMACY] Empire "Klingons" has proposed a trade agreement
🌟 [TURN] New turn has begun! You have 10 action points available
🏭 [PRODUCTION] Planet "Mining Station Alpha" completed Ore Refinery
```

**Auto-refresh**: 
- Resource counts update every 30 seconds
- Fleet movements update in real-time
- Combat events pushed immediately
- Turn changes announced with countdown

## API Integration

### HTTP Client Design

**Base Configuration**:
```javascript
const apiClient = {
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
  retries: 3,
  authentication: 'Bearer token'
}
```

**Request Pipeline**:
1. Command validation and preprocessing
2. Authentication token injection
3. Request execution with timeout
4. Retry logic for transient failures
5. Response parsing and validation
6. Error handling and user notification
7. Response formatting for terminal display

**Error Handling**:
- Network errors: Auto-retry with exponential backoff
- Authentication errors: Prompt for re-login
- Validation errors: Show specific field errors
- Server errors: Display user-friendly messages
- Rate limiting: Show cooldown timers

### WebSocket Integration

**Connection Management**:
- Automatic connection on login
- Reconnection with exponential backoff
- Heartbeat/ping to maintain connection
- Graceful degradation if WebSocket fails

**Event Types**:
```javascript
{
  'turn.started': { turn: 43, actionPoints: 10 },
  'combat.initiated': { combatId: 789, fleets: [...] },
  'diplomacy.proposal': { from: 'empire_42', type: 'trade' },
  'fleet.arrived': { fleetId: 123, location: 'Sol-3' },
  'resource.updated': { metal: 1500, energy: 800 },
  'empire.attacked': { attacker: 'Klingons', planet: 'Earth' }
}
```

**Event Display**:
- Push notifications appear immediately
- Events queued during command execution
- Optional sound notifications (configurable)
- Event history accessible via `events` command

## Session Management

### Authentication Flow

1. **Login Process**:
   ```
   > login admiral_kirk
   Password: ********
   ✓ Authenticated as Admiral Kirk (Empire: Federation)
   ✓ Connected to SpaceCommand server
   ✓ Real-time updates enabled
   ```

2. **Session Persistence**:
   - JWT token stored in secure local file
   - Automatic token refresh before expiration
   - Session validation on startup
   - Graceful handling of expired sessions

3. **Configuration Storage**:
   ```json
   {
     "server": "http://localhost:3000",
     "username": "admiral_kirk",
     "theme": "classic",
     "notifications": true,
     "autoRefresh": 30,
     "aliases": {
       "s": "status",
       "f": "fleets"
     }
   }
   ```

### Local State Caching

**Cached Data**:
- Empire basic information
- Resource counts (with timestamps)
- Fleet locations and status
- Planet list and specializations
- Recent command history
- Diplomatic relations summary

**Cache Strategy**:
- Lazy loading with TTL expiration
- Invalidation on state-changing commands
- Background refresh for frequently accessed data
- Offline mode with cached data display

## Testing Strategy

### Unit Testing

**Command Parser Tests**:
```javascript
describe('CommandParser', () => {
  test('parses basic commands', () => {
    expect(parse('status')).toEqual({
      command: 'status',
      args: [],
      flags: {}
    });
  });

  test('handles complex commands with flags', () => {
    expect(parse('attack 123 planet_456 --confirm --force'))
      .toEqual({
        command: 'attack',
        args: ['123', 'planet_456'],
        flags: { confirm: true, force: true }
      });
  });
});
```

**API Client Tests**:
```javascript
describe('ApiClient', () => {
  test('handles authentication', async () => {
    const client = new ApiClient();
    await client.login('user', 'pass');
    expect(client.isAuthenticated()).toBe(true);
  });

  test('retries failed requests', async () => {
    // Mock network failure and recovery
    // Verify retry logic works correctly
  });
});
```

### Integration Testing

**Mock Server Setup**:
- Express server with predefined responses
- Configurable delays and failures
- WebSocket mock for real-time events
- Database state simulation

**End-to-End Scenarios**:
1. **Complete Game Flow**: Login → Status → Create Fleet → Attack → Logout
2. **Error Handling**: Network failures, invalid commands, authentication expiry
3. **Real-time Events**: Turn changes, combat notifications, diplomatic messages
4. **Session Recovery**: Reconnection after network interruption

### Performance Testing

**Load Testing**:
- Concurrent command execution
- WebSocket connection stability
- Memory usage during long sessions
- Command completion responsiveness

**Metrics**:
- Command response time (target: <500ms)
- WebSocket message latency (target: <100ms)
- Memory usage (target: <50MB for 4-hour session)
- Connection recovery time (target: <5 seconds)

## Implementation Plan

### Phase 2.1: Core Terminal Infrastructure
1. Basic REPL with command parsing
2. HTTP API client with authentication
3. Simple command execution framework
4. Basic error handling and display

### Phase 2.2: Command Implementation
1. Authentication commands (login, logout, register)
2. Empire management commands (status, empire, resources)
3. Fleet commands (fleets, fleet, create-fleet, move)
4. Utility commands (help, history, clear, quit)

### Phase 2.3: Advanced Features
1. WebSocket integration for real-time updates
2. Tab completion and command history
3. Progress indicators and enhanced formatting
4. Configuration management and persistence

### Phase 2.4: Combat and Diplomacy
1. Combat commands (attack, retreat, combat-log)
2. Diplomacy commands (propose, respond, relations)
3. Territory commands (scan, explore, colonize)
4. Advanced display formatting and colors

### Phase 2.5: Testing and Polish
1. Comprehensive test suite
2. Performance optimization
3. Error handling improvements
4. Documentation and help system

## Success Criteria

1. **Functional Completeness**: All core game actions accessible via terminal
2. **User Experience**: Intuitive commands with helpful error messages
3. **Real-time Responsiveness**: Live updates for game events
4. **Reliability**: Handles network issues and server errors gracefully
5. **Performance**: Sub-second response times for most commands
6. **Testability**: 90%+ test coverage with comprehensive integration tests

This terminal client will serve as both a testing tool for the API and a fully functional retro-style game interface, providing the foundation for the web-based client in Phase 3.