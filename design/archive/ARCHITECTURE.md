# SpaceCommand Architecture

## System Overview
SpaceCommand is a production-quality web game built with Node.js/Express backend and dual client interfaces (terminal + web).

## Technology Stack

### Backend
- **Runtime**: Node.js with Express framework
- **Database**: PostgreSQL (primary) + Redis (sessions/cache)
- **Authentication**: JWT tokens with Redis session management
- **API**: RESTful endpoints with proper HTTP semantics

### Frontend
- **Terminal Client**: Node.js with readline interface
- **Web Client**: React with ES6 modules
- **Styling**: CSS Grid/Flexbox with retro terminal aesthetics

## Database Architecture

### PostgreSQL Schema
```sql
-- Core game tables
players          # User accounts and authentication
empires          # Player civilizations with resources
planets          # Colonized worlds with specializations
fleets           # Military units and compositions
combat_records   # Battle history and results
diplomacy_relations  # Inter-player agreements
game_sessions    # Turn state and timing
game_state       # Global game configuration
action_point_reservations  # Atomic action tracking
```

### Redis Cache Layer
- Session tokens and user state
- Real-time player online status
- Temporary game calculations
- Rate limiting counters

## API Design

### Authentication
- Bearer token authentication
- 7-day sliding session windows
- Automatic session cleanup
- Redis-based session storage

### Response Format
```json
// Success (200/201/204)
{
  "id": "uuid",
  "name": "Resource Name",
  "data": { /* resource fields */ }
}

// Error (400/401/403/404/409/500)
{
  "message": "Human readable error",
  "details": { /* error context */ }
}
```

### Endpoint Categories
- `/api/auth/*` - Authentication and user management
- `/api/empire/*` - Empire and resource management
- `/api/fleets/*` - Military unit operations
- `/api/combat/*` - Battle mechanics
- `/api/diplomacy/*` - Inter-player relations
- `/api/territory/*` - Exploration and colonization
- `/api/game/*` - Turn management and game state

## Security Architecture

### Input Validation
- SQL injection prevention with allowlists
- XSS protection via input sanitization
- CSRF protection with HMAC tokens
- Rate limiting by operation type

### Authorization
- Resource-level ownership validation
- Action point consumption tracking
- Atomic database transactions
- Anti-cheat validation systems

### Data Protection
- Password hashing with bcrypt
- Session token entropy from multiple sources
- No sensitive data in error messages
- Graceful error handling throughout

## Game Logic Services

### Core Services
- **TurnManager**: 24-hour turn cycles with action points
- **ResourceCalculator**: Production/consumption with bonuses
- **CombatResolver**: Battle mechanics with morale/experience
- **DiplomacyProcessor**: Trust levels and trade agreements
- **TerritoryExpansion**: Exploration and colonization
- **GameBalanceEngine**: Anti-cheat and validation

### Service Integration
- Database transaction support
- Real-time action point tracking
- Event-driven game state updates
- Performance optimization with caching

## Client Architecture

### Terminal Client
- **CommandParser**: Command validation and parsing
- **ApiClient**: HTTP communication with retry logic
- **Terminal**: Rich output formatting with colors
- **SessionManager**: Persistent config in `~/.spacecommand/`

### Web Client
- **WebTerminal**: React-based terminal component
- **ApiClient**: fetch()-based with error handling
- **SessionManager**: localStorage-based persistence
- **ES6 Modules**: Browser-compatible module system

### Shared Features
- Feature parity between clients
- Identical command structures
- Same authentication flow
- Consistent error handling

## Deployment Architecture

### Development
```
http://localhost:3000
├── /api/*          # REST API endpoints
├── /               # Web client (index.html)
└── terminal client # Separate Node.js process
```

### Production (Future)
```
https://spacecommand.ca
├── Load Balancer
├── Express Servers (N instances)
├── PostgreSQL Cluster
└── Redis Cluster
```

## File Structure
```
/
├── bin/                    # Executable scripts
├── src/
│   ├── server/            # Backend implementation
│   │   ├── models/        # Data models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Game logic
│   │   ├── middleware/    # Security & validation
│   │   ├── config/        # Database & environment
│   │   └── utils/         # Shared utilities
│   ├── client/            # Frontend implementations
│   │   ├── terminal/      # Node.js terminal client
│   │   ├── web-terminal/  # Browser web client
│   │   └── shared/        # Common client modules
│   └── shared/            # Universal utilities
├── tasks/                 # Project documentation
├── design/                # Architecture documents
└── tests/                 # Test suites
```

## Performance Considerations
- Database connection pooling
- Redis caching for hot data
- Efficient query optimization
- Transaction batching for atomic operations
- Rate limiting to prevent abuse

## Scalability Design
- Stateless API design for horizontal scaling
- Session data in Redis (not memory)
- Database read replicas for scaling reads
- Microservice-ready service layer
- Load balancer compatible architecture