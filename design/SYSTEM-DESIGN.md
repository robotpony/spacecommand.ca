# SpaceCommand System Design

**Project**: SpaceCommand.ca  
**Version**: 1.0  
**Date**: 2025-07-20  
**Status**: Production Ready

## Overview

SpaceCommand is a production-quality web-based space strategy game with dual client interfaces (terminal + web). The system features turn-based gameplay, resource management, fleet combat, diplomacy, and territory expansion.

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

## Core Game Mechanics

### Turn Structure
- **Turn Length**: 24-hour cycles with 4-hour action phases
- **Action Points**: Each player gets 10 action points per turn
- **Phase Sequence**: Production → Movement → Combat → Diplomacy

### Resource System
- **Credits**: Universal currency (trade, construction, maintenance)
- **Population**: Workers (production, military recruitment, growth)
- **Energy**: Powers (shields, weapons, industrial facilities)
- **Raw Materials**: Mining output (ship/structure construction)
- **Food**: Sustains (population growth, military morale)
- **Technology Points**: Research advancement currency

### Victory Conditions
- **Domination**: Control 60% of galaxy sectors
- **Economic**: Achieve 1M total resource production
- **Diplomatic**: Form alliance controlling 40% of galaxy
- **Technology**: Research all tier-5 technologies

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

## API Design Standards

### Authentication
- Bearer token authentication
- 7-day sliding session windows
- Automatic session cleanup
- Redis-based session storage

### HTTP Methods & Status Codes
- **GET**: Retrieve resources (200 OK)
- **POST**: Create resources (201 Created)
- **PUT**: Replace resource (200 OK)
- **PATCH**: Partial update (200 OK)
- **DELETE**: Remove resource (204 No Content)

### Resource Naming
- Use nouns, not verbs: `/api/fleets`, `/api/planets`
- Nested resources: `/api/empires/:id/planets`
- Consistent plural forms

## Security Architecture

### Input Protection
- SQL injection prevention with allowlist validation
- CSRF protection with HMAC tokens
- Input sanitization and XSS prevention
- Resource authorization middleware

### Anti-Cheat Systems
- Action point validation
- Resource calculation verification
- Turn timing enforcement
- Database transaction atomicity

## Service Layer Components

### Core Services
- **TurnManager**: Turn progression and timing
- **ResourceCalculator**: Economic calculations
- **CombatResolver**: Battle mechanics and outcomes
- **DiplomacyProcessor**: Inter-player negotiations
- **TerritoryExpansion**: Exploration and colonization
- **GameBalanceEngine**: Balance validation and enforcement

### Design Principles
- Service-oriented architecture with clear interfaces
- Database transaction safety for all state changes
- Loose coupling for independent testing
- No direct database access from controllers

## Client Architecture

### Terminal Client
- Node.js readline interface
- Command-line argument parsing
- Shared API client with web interface
- Session persistence

### Web Client
- React-based modular components
- Terminal emulation interface
- Real-time command processing
- ES6 module system

### Shared Components
- **ApiClient**: HTTP request handling
- **CommandParser**: Command validation and parsing
- **SessionManager**: Authentication state management

## Development Standards

### Code Documentation
- All classes/models require JSDoc comments
- Public methods documented with @param/@returns
- Usage examples for complex methods
- Static constants and values documented

### File Organization
```
src/
├── server/         # Complete backend (40+ files)
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Authentication, validation
│   ├── models/      # Database layer
│   ├── routes/      # API endpoints
│   └── services/    # Business logic
├── client/         # Terminal + web clients
│   ├── terminal/    # Node.js CLI client
│   ├── web-terminal/ # Browser interface
│   └── shared/      # Common utilities
└── shared/         # Cross-platform code
```

## Performance Targets

### Phase 4 Success Metrics
- API response times < 200ms average
- Support 50+ concurrent users
- Memory usage stable over time
- Database queries optimized
- Client interfaces responsive

## Deployment

### Quick Start Commands
```bash
npm start              # Production server
npm run dev            # Development with hot reload
npm run terminal       # Terminal client
npm test               # Test suite
npm run lint           # Code quality check
node bin/game-init.js  # Initialize game state
```

### Health Monitoring
- Server health endpoint: `GET /health`
- API documentation in `src/server/routes/`
- Game commands: type `help` in any client