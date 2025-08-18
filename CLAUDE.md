# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpaceCommand is a BBS-style multiplayer space trading and empire-building game for modern terminals and browsers. The game features turn-based gameplay with 2-4 hour cycles, economic simulation, fleet combat, diplomacy, and territory expansion.

## Architecture

The project follows a clean domain-driven architecture:

### Current Implementation
```text
src/
├── core/              # Game engine & business logic
│   └── entities/      # Core game entities (Player, Fleet, System, etc.)
├── infrastructure/    # Database and external services
│   └── database/      # Connection, migrations, seeding
├── modules/           
│   └── ux/            # Custom terminal UI toolkit
│       ├── components/    # UI components (Window, Menu, Table, etc.)
│       ├── rendering/     # Layout and rendering engines
│       └── utils/         # Colors, formatting, ASCII art
├── terminal-client/   # Terminal-based game client
│   ├── screens/       # Game screens (MainMenu, TradeCenter, etc.)
│   └── utils/         # Client utilities
└── shared/            # Shared types and interfaces
```

### Planned Architecture (Not Yet Implemented)
```text
src/
├── core/              # TO BE EXPANDED:
│   ├── economy/       # Market dynamics, trade routes
│   ├── military/      # Combat, fleet management
│   ├── diplomacy/     # Alliances, treaties, reputation
│   ├── resources/     # Mining, production, consumption
│   └── simulation/    # Turn processing, events
├── modules/           # TO BE EXPANDED:
│   ├── world/         # Shared world tools (data models)
│   └── messaging/     # Game and p2p messaging tools
├── api/               # REST endpoints + WebSocket (NOT YET IMPLEMENTED)
└── web-client/        # Retro web UI (NOT YET IMPLEMENTED)
```

## Key Architectural Patterns

- **Event-driven core**: Domain events (TradeCompleted, WarDeclared) for loose coupling
- **CQRS pattern**: Separate read/write models for queries vs mutations
- **Time-boxed turns**: 2-4 hour turn cycles (configurable per universe)
- **Plugin architecture**: Common interfaces for extensibility
- **API design**: REST for CRUD, WebSockets for live updates

## Development Status

The project is currently in early development after a reset (branch: recombobulated).

### What's Implemented
- Core entity models (Player, Fleet, System, Empire, Planet)
- Custom terminal UI toolkit (UX library)
- Terminal client screens (MainMenu, TradeCenter, GalaxyMap, etc.)
- Database schema and migrations
- Basic project structure and TypeScript configuration

### What's Not Yet Implemented
- Game logic (economy, combat, diplomacy)
- Turn processing system
- API endpoints
- Web client
- Multiplayer functionality
- Redis session management
- Actual database operations (migrations and seeding scripts exist but need implementation)

## Next Steps - Priority Order

### 1. Complete Database Layer (IMMEDIATE)
```bash
# Files to implement:
src/infrastructure/database/connection.ts  # Database connection manager
src/infrastructure/database/migrate.ts     # Migration runner
src/infrastructure/database/seed.ts        # Test data seeder
src/infrastructure/repositories/           # Repository pattern for entities
```

### 2. Turn Processing Engine (NEXT)
```bash
# Core turn processing:
src/core/simulation/TurnProcessor.ts       # Main turn processing engine
src/core/simulation/ActionQueue.ts         # Action queue management
src/core/simulation/ActionValidator.ts     # Action validation
src/core/entities/Turn.ts                  # Turn entity model
src/core/entities/Action.ts                # Action entity model
```

### 3. Connect UI to Real Data
```bash
# Update screens to use repositories:
src/terminal-client/screens/*.ts           # Replace mock data with DB queries
src/terminal-client/services/              # Create service layer for API calls
```

### 4. Implement Basic Economy
```bash
# Economic simulation:
src/core/economy/Market.ts                 # Market price calculations
src/core/economy/Trade.ts                  # Trade mechanics
src/core/economy/Supply.ts                 # Supply/demand simulation
```

## Game Design Philosophy

- **Golden age sci-fi atmosphere**: Asimov/Heinlein inspired with factions like Terran Federation, Orion Syndicate
- **Complexity ladder**: Beginner (simple trading) → Intermediate (production chains) → Advanced (corporations, warfare)
- **Multiple victory paths**: Economic dominance, military conquest, technological supremacy, or collaboration
- **Bankruptcy protection**: "Corporate restructure" rather than game over
- **Alliance mechanics**: Resource sharing, mutual defense, economic integration

## Database Setup (PostgreSQL)

### Local Development Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb spacecommand_dev
createdb spacecommand_test

# Configure .env file
cp .env.example .env
# Edit .env with:
# DATABASE_URL=postgresql://localhost/spacecommand_dev
# TEST_DATABASE_URL=postgresql://localhost/spacecommand_test
```

### Docker Alternative
```bash
# Use Docker for PostgreSQL
docker run -d \
  --name spacecommand-postgres \
  -e POSTGRES_DB=spacecommand_dev \
  -e POSTGRES_PASSWORD=development \
  -p 5432:5432 \
  postgres:15

# Then in .env:
# DATABASE_URL=postgresql://postgres:development@localhost/spacecommand_dev
```

## Common Development Tasks

### Setup Commands
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Database commands (NOT YET FUNCTIONAL - implementation needed):
# npm run db:migrate  # Needs migrate.ts implementation
# npm run db:seed     # Needs seed.ts implementation
```

### Development Commands
```bash
# Start development server with auto-reload
npm run dev

# Run the main terminal client (WORKING!)
npm run terminal

# Run tests
npm test
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
npm start
```

### Demo Commands

The project includes several demo and test programs to showcase the UI library:

```bash
# Run the main BBS-style demo (WORKING!)
npm run terminal

# Run other demo scripts directly
npx tsx src/terminal-client/test-screens.ts
npx tsx src/terminal-client/test-responsive.ts
npx tsx src/terminal-client/test-height.ts
npx tsx src/terminal-client/test-final.ts

# Run UI component tests (Jest)
npm test -- src/modules/ux/components/__tests__/UIComponent.test.ts
npm test -- src/modules/ux/components/__tests__/Window.test.ts

# Run all tests
npm test
```

#### Demo Descriptions

- **`npm run terminal`**: ✅ **WORKING** - Full BBS-style interface demo with screen navigation
- **`test-screens.ts`**: ✅ **WORKING** - Individual testing of all game screens (MainMenu, TradeCenter, GalaxyMap, etc.)
- **`test-responsive.ts`**: ✅ **WORKING** - Responsive design testing with different terminal sizes
- **`test-height.ts`**: ✅ **WORKING** - Terminal height handling and layout adaptation
- **`test-final.ts`**: ✅ **WORKING** - Comprehensive integration test of the UX library
- **Jest Tests**: ✅ **WORKING** - TypeScript unit tests for UI components with proper type safety

#### Quick Demo Test
```bash
# Run the main interactive BBS demo
npm run terminal

# Test individual UI components
npm test -- --testNamePattern="UIComponent"
```

**All demos now work!** The TypeScript conversion has been completed successfully with all import statements converted to ES6 syntax.

### Database Commands (Scripts defined but not yet implemented)
```bash
# These commands are defined in package.json but the underlying scripts need implementation:
# npm run db:migrate       # TODO: Implement src/infrastructure/database/migrate.ts
# npm run db:migrate reset # TODO: Add reset functionality to migrate.ts
# npm run db:seed          # TODO: Implement src/infrastructure/database/seed.ts
# npm run db:seed clear    # TODO: Add clear functionality to seed.ts

# Implementation templates needed:
# - migrate.ts should use pg driver to run SQL files in order
# - seed.ts should populate test data for development
# - Both should handle command line arguments
```

### Game Management (Scripts defined but not yet implemented)
```bash
# These commands are defined in package.json but the underlying scripts need implementation:
# npm run game:init        # Requires src/scripts/init-game.ts
# npm run turn:process     # Requires src/scripts/process-turn.ts
```

## Technology Stack

### Currently Installed & Configured
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Database**: PostgreSQL (pg driver installed)
- **Caching**: Redis (installed but not yet integrated)
- **Terminal UI**: Custom UX library (fully converted to TypeScript)
- **Authentication**: bcryptjs, jsonwebtoken (installed)
- **Validation**: Zod for schema validation
- **Logging**: Winston logger
- **Testing**: Jest (configured with TypeScript support, tests converted)
- **Linting**: ESLint with TypeScript support

### TypeScript Migration Status
- **✅ COMPLETED**: Full JavaScript to TypeScript conversion
- **UX Library**: 100% converted with proper type definitions
- **Terminal Client**: All screens and utilities converted to TypeScript  
- **Test Suite**: All tests converted to TypeScript (minor type errors remain but don't affect functionality)
- **Type Definitions**: Comprehensive interfaces in `src/modules/ux/types.ts`
- **Demo System**: All terminal demos working perfectly with TypeScript
- **Module System**: Full ES6 import/export syntax throughout codebase

### Planned but Not Implemented
- **API**: Express (installed but no endpoints created)
- **Web Client**: React or similar (not yet started)
- **Session Management**: Redis sessions (Redis installed but not configured)
- **Real-time Updates**: WebSockets (not yet implemented)

## Testing Status

### What's Tested
- ✅ UI Components (Window, Menu, Table, etc.) - Jest tests
- ✅ Terminal client demo screens - Manual testing via `npm run terminal`
- ✅ TypeScript compilation - `npm run typecheck`

### What Needs Testing
- ❌ Database operations (repositories, queries)
- ❌ Turn processing logic
- ❌ Economic simulation
- ❌ Game state management
- ❌ API endpoints
- ❌ WebSocket connections

## Important Notes

- The project uses a `.gitignore` configured for Node.js projects
- Environment variables are used for configuration (`.env` file)
- The project follows JSDoc documentation standards
- Focus on defensive security - no malicious code generation
- Emphasis on classic BBS ASCII art and colorful, impactful screens

## UI Development Guidelines

- **MANDATORY**: ALL terminal-client screens MUST use the UX library components (`src/modules/ux/`)
- Use `Window` component for consistent borders, layouts, and styling
- Never manually render ASCII borders or hardcode box-drawing characters
- Follow the component patterns established in the UX library for consistent behavior
- The UX library provides proper layout management, color handling, and responsive design

## Coding Guidelines

### Documentation Standards

#### Classes
- Every class MUST have a short explanation of its purpose at the top
- Document the class's responsibilities and main interactions
- Example:
```javascript
/**
 * Manages player trading operations and market interactions.
 * Handles buy/sell orders, validates transactions, and updates inventories.
 * Emits TradeCompleted events on successful trades.
 */
class TradingManager { }
```

#### Functions/Methods
- All public methods MUST have JSDoc comments explaining:
  - Purpose and use case
  - Parameters with types and descriptions
  - Return value
  - Side effects (state changes, events emitted)
  - Possible errors thrown or returned
- Example:
```javascript
/**
 * Executes a trade between player and station.
 * @param {string} playerId - UUID of the trading player
 * @param {TradeOrder} order - Trade details including item and quantity
 * @returns {TradeResult} Result object with success status or error
 * @throws {NetworkError} On connection failure
 * @emits TradeCompleted On successful trade
 * @sideEffect Updates player inventory and station stock
 */
async executeTrade(playerId, order) { }
```

#### Inline Comments
- Focus on the "why" not the "what"
- Explain complex algorithms and business logic
- Mark TODOs with context: `// TODO: [username] - Optimize for large fleets (>100 ships)`
- Use tactical comments to guide readers through multi-step algorithms

### Error Handling

- **Network/System Errors**: Use exceptions (try/catch)
  - HTTP failures, database connections, file I/O
  - Always include error context and recovery suggestions
- **Application Logic**: Return error objects
  - Use consistent format: `{ success: boolean, data?: T, error?: string, code?: string }`
  - Never throw for expected business logic failures (insufficient funds, invalid move)
- **Error boundaries**: Wrap external API calls with try/catch at service boundaries

### Naming Conventions

- **Classes**: PascalCase (`PlayerShip`, `MarketController`)
- **Methods/Functions**: camelCase (`calculateDistance`, `processOrder`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CARGO_CAPACITY`, `TURN_DURATION_MS`)
- **Private members**: Prefix with underscore (`_internalState`) or use # for true privacy
- **Interfaces**: Prefix with 'I' for contracts (`ITradeHandler`), no prefix for data shapes
- **Events**: PascalCase for event names (`TradeCompleted`, `ShipDestroyed`)
- **Files**: kebab-case for files (`trade-manager.ts`), match class name for single-class files

### File Organization

- **One class per file** (exceptions: small related utility classes)
- **File size warning**: Flag files over 300 lines for potential refactoring
- **Class size warning**: Flag classes over 200 lines as candidates for splitting
- **Module structure**:
  ```
  module/
  ├── index.ts           # Public exports only
  ├── types.ts           # Shared types/interfaces
  ├── constants.ts       # Module constants
  ├── class-name.ts      # Implementation files
  └── class-name.test.ts # Test files alongside implementation
  ```
- **Import order**:
  1. Node built-ins
  2. External dependencies
  3. Internal modules (absolute paths)
  4. Relative imports
  5. Type imports

## Known Issues & Technical Debt

### High Priority
- Database connection and operations not implemented
- No actual game logic (all screens show mock data)
- Turn processing system missing
- No authentication or session management

### Medium Priority
- Some TypeScript type warnings in tests
- Mock data hardcoded in screen files
- No error boundaries in UI components
- Missing loading states in screens

### Low Priority
- ASCII art could be more varied
- Color schemes could be configurable
- Terminal resize handling could be smoother
- Menu navigation could support vim keys

### TypeScript Guidelines

- **Types vs Interfaces**:
  - Use `type` for primitives, unions, and utility types
  - Use `interface` for object shapes and contracts that may be extended
- **Explicit return types**: Always specify return types for public methods
- **Strict mode**: Enable all strict checks
- **Avoid `any`**: Use `unknown` if type is truly unknown, then narrow
- **Generics**: Use meaningful names (`TPayload` not `T` when possible)

### Testing Standards

**Note**: All tests have been converted to TypeScript for better type safety and development experience.

#### TypeScript Testing Guidelines

- **Type Safety**: All test files use TypeScript with proper type annotations
- **Component Testing**: Use proper interfaces for component options and events
- **Example TypeScript test structure**:
```typescript
import { Window } from '../Window';
import { WindowOptions } from '../../types';

describe('Window Component', () => {
  let window: Window;
  
  beforeEach(() => {
    const options: WindowOptions = {
      title: 'Test Window',
      width: 60,
      height: 20
    };
    window = new Window(options);
  });
  
  it('should initialize with typed options', () => {
    expect(window.title).toBe('Test Window');
  });
});
```

#### Testing Patterns

- **Coverage goals**:
  - 100% class coverage (every class has a test file)
  - Focus on testing used code paths, not arbitrary line coverage
  - Critical game logic should approach 100% branch coverage
- **Test structure**: Arrange-Act-Assert pattern with TypeScript types
- **Test names**: Describe behavior, not implementation
  - Good: `"should deduct credits when purchase succeeds"`
  - Bad: `"should call updateBalance method"`
- **Mock sparingly**: Prefer real objects, mock only external dependencies
- **Type annotations**: Always provide types for test variables and parameters
- **Event testing**: Use proper typing for event handlers and payloads

### Async Code Patterns

- **Always use async/await** over raw promises or callbacks
- **Error handling**: Every async function should have try/catch or return error object
- **Concurrent operations**: Use `Promise.all()` for parallel operations
- **Avoid blocking**: Never use synchronous I/O operations
- **Timeouts**: Set reasonable timeouts for all external calls

### Game-Specific Patterns

#### State Management
- **Immutability**: Never mutate game state directly
- Create new state objects incorporating changes:
```javascript
// Good
const newState = {
  ...currentState,
  players: {
    ...currentState.players,
    [playerId]: updatedPlayer
  }
};

// Bad
currentState.players[playerId] = updatedPlayer;
```
- Consider using Immer for complex state updates

#### Event System
- **Global Event Bus**: Singleton or dependency-injected EventEmitter
- **Event naming**: PascalCase, past tense for completed actions
- **Event payload**: Always include timestamp and source
```javascript
eventBus.emit('TradeCompleted', {
  timestamp: Date.now(),
  source: 'TradingManager',
  playerId,
  trade: tradeDetails
});
```
- **Cleanup**: Always remove listeners when components are destroyed

#### Turn Processing
- **State Machine**: Define clear game phases
```javascript
enum GamePhase {
  COLLECTING_ORDERS = 'collecting_orders',
  PROCESSING_MOVEMENT = 'processing_movement',
  RESOLVING_COMBAT = 'resolving_combat',
  UPDATING_ECONOMY = 'updating_economy',
  SENDING_RESULTS = 'sending_results'
}
```
- **Command Pattern**: Encapsulate player actions as command objects
```javascript
interface GameCommand {
  type: CommandType;
  playerId: string;
  validate(): ValidationResult;
  execute(state: GameState): GameState;
  undo(state: GameState): GameState;  // For rollback support
}
```

### Performance Guidelines

- **Document complexity**: Add comments for O(n²) or worse operations
- **Lazy loading**: Load large datasets only when needed
- **Caching**: Cache expensive calculations with TTL
- **Database queries**: Use indexes, avoid N+1 queries
- **Memory management**: Clean up event listeners, clear caches periodically

### Code Quality

- **Pure functions**: Prefer pure functions for calculations and game logic
- **Side effects**: Isolate side effects to service boundaries
- **Magic values**: Extract all magic numbers/strings to named constants
- **Early returns**: Use guard clauses to reduce nesting
- **Function size**: Keep functions under 30 lines (flag for refactoring if larger)

### Data Validation

- **API boundaries**: Validate all inputs from external sources
- **Type guards**: Create type guard functions for runtime validation
- **Fail fast**: Validate early and provide clear error messages
- **Sanitization**: Always sanitize user input before storage or display

### Logging

- **Structured logging**: Use consistent format with metadata
```javascript
logger.info('Trade executed', {
  playerId,
  itemId,
  quantity,
  price,
  timestamp: Date.now()
});
```
- **Log levels**:
  - `debug`: Detailed execution flow
  - `info`: Important business events
  - `warn`: Recoverable issues
  - `error`: Errors requiring attention
- **No sensitive data**: Never log passwords, tokens, or personal data

### Git Workflow

- **Commit format**: Use conventional commits
  - `feat:` New features
  - `fix:` Bug fixes
  - `refactor:` Code restructuring
  - `docs:` Documentation only
  - `test:` Test additions/changes
  - `chore:` Build process, dependencies
- **Commit size**: Small, atomic commits that pass tests
- **Branch naming**: `feature/description`, `bugfix/description`

### Security Guidelines

- **Input validation**: Never trust user input
- **SQL injection**: Always use parameterized queries
- **Secrets**: Never commit secrets, use environment variables
- **Authentication**: Validate tokens on every request
- **Rate limiting**: Implement rate limits on all endpoints

### Common Patterns to Follow

- **Repository pattern**: For data access layer
- **Service layer**: For business logic
- **DTO pattern**: For API request/response shapes
- **Factory pattern**: For complex object creation
- **Observer pattern**: For reactive updates (via Event Bus)
