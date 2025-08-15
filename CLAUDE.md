# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpaceCommand is a BBS-style multiplayer space trading and empire-building game for modern terminals and browsers. The game features turn-based gameplay with 2-4 hour cycles, economic simulation, fleet combat, diplomacy, and territory expansion.

## Architecture

The project follows a clean domain-driven architecture:

```text
src/
├── core/              # Game engine & business logic
│   ├── economy/       # Market dynamics, trade routes
│   ├── military/      # Combat, fleet management
│   ├── diplomacy/     # Alliances, treaties, reputation
│   ├── resources/     # Mining, production, consumption
│   └── simulation/    # Turn processing, events
├── modules/           
│   ├── ux/            # UX toolkit for shared features
│   ├── world/         # Shared world tools (data models)
│   └── messaging/     # Game and p2p messaging tools
├── api/               # REST endpoints + WebSocket
├── terminal-client/   # Curses/rich-based TUI
└── web-client/        # Retro web UI
```

## Key Architectural Patterns

- **Event-driven core**: Domain events (TradeCompleted, WarDeclared) for loose coupling
- **CQRS pattern**: Separate read/write models for queries vs mutations
- **Time-boxed turns**: 2-4 hour turn cycles (configurable per universe)
- **Plugin architecture**: Common interfaces for extensibility
- **API design**: REST for CRUD, WebSockets for live updates

## Development Status

The project is currently in early development after a reset (branch: recombobulated).

## Game Design Philosophy

- **Golden age sci-fi atmosphere**: Asimov/Heinlein inspired with factions like Terran Federation, Orion Syndicate
- **Complexity ladder**: Beginner (simple trading) → Intermediate (production chains) → Advanced (corporations, warfare)
- **Multiple victory paths**: Economic dominance, military conquest, technological supremacy, or collaboration
- **Bankruptcy protection**: "Corporate restructure" rather than game over
- **Alliance mechanics**: Resource sharing, mutual defense, economic integration

## Common Development Tasks

### Setup Commands
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:migrate

# Seed initial game data
npm run db:seed
```

### Development Commands
```bash
# Start development server with auto-reload
npm run dev

# Run the terminal client
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

### Database Commands
```bash
# Run migrations
npm run db:migrate

# Reset database (drop all tables and re-migrate)
npm run db:migrate reset

# Seed database with test data
npm run db:seed

# Clear seed data
npm run db:seed clear
```

### Game Management
```bash
# Initialize game universe
npm run game:init

# Process turn (for testing)
npm run turn:process
```

## Technology Stack (Based on Previous Implementation)

- **Backend**: Node.js with Express
- **Database**: PostgreSQL for game data, Redis for sessions
- **Frontend**: Terminal client (Node.js readline), Web client (React planned)
- **Testing**: Jest for unit tests, integration tests planned

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
