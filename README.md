# SpaceCommand

A BBS-style multiplayer space trading and empire-building game for modern terminals and browsers. Experience the golden age of sci-fi gaming with turn-based gameplay, economic simulation, fleet combat, diplomacy, and territory expansion.

## 🚀 Project Status

**Early Development** - Currently implementing core database layer and game engine after architecture reset.

### What's Working
- ✅ Custom terminal UI toolkit with responsive design
- ✅ BBS-style terminal client with multiple game screens
- ✅ Complete TypeScript conversion with type safety
- ✅ Database schema and migration framework
- ✅ Core entity models (Player, Fleet, System, Empire, Planet)

### What's Coming Next
- 🔄 Database operations and repository layer
- 🔄 Turn processing engine
- 🔄 Economic simulation system
- 🔄 REST API and WebSocket support
- 🔄 Web client interface

## 🎮 Game Features

- **Turn-based gameplay** with 2-4 hour cycles
- **Economic simulation** with dynamic markets and trade routes
- **Fleet combat** and strategic warfare
- **Diplomacy system** with alliances and treaties
- **Territory expansion** and empire building
- **Multiple victory paths** - economic, military, technological, or collaborative

## 🛠 Technology Stack

- **Backend**: Node.js + TypeScript + PostgreSQL + Redis
- **Terminal Client**: Custom UX library with ASCII art and colors
- **Web Client**: Planned React-based retro interface
- **Architecture**: Domain-driven design with CQRS patterns

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis (optional, for sessions)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create databases
createdb spacecommand_dev
createdb spacecommand_test
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Try the Terminal Demo
```bash
# Run the interactive BBS-style demo
npm run terminal
```

## 🎯 Development Commands

### Core Development
```bash
npm run dev          # Development server with auto-reload
npm run terminal     # Run the main terminal client
npm test             # Run test suite
npm run typecheck    # TypeScript type checking
npm run lint         # Code linting
npm run build        # Production build
```

### Database Operations (Coming Soon)
```bash
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed development data
```

### Demo Programs
```bash
# Test individual UI components
npx tsx src/terminal-client/test-screens.ts
npx tsx src/terminal-client/test-responsive.ts
npx tsx src/terminal-client/test-final.ts

# Run component tests
npm test -- src/modules/ux/components/__tests__/
```

## 🏗 Project Architecture

```
src/
├── core/              # Game engine & business logic
│   └── entities/      # Core game entities
├── infrastructure/    # Database and external services
│   └── database/      # Connection, migrations, seeding
├── modules/           
│   └── ux/            # Custom terminal UI toolkit
├── terminal-client/   # Terminal-based game client
│   └── screens/       # Game screens (MainMenu, TradeCenter, etc.)
└── shared/            # Shared types and interfaces
```

### Planned Expansion
```
src/
├── core/
│   ├── economy/       # Market dynamics, trade routes
│   ├── military/      # Combat, fleet management
│   ├── diplomacy/     # Alliances, treaties
│   └── simulation/    # Turn processing, events
├── api/               # REST endpoints + WebSocket
└── web-client/        # Retro web interface
```

## 🎨 Game Design Philosophy

- **Golden age sci-fi** atmosphere inspired by Asimov and Heinlein
- **Complexity ladder** from beginner trading to advanced corporate warfare
- **No game over** - bankruptcy leads to "corporate restructure" 
- **Multiple victory conditions** encouraging different play styles
- **Rich alliance mechanics** with resource sharing and mutual defense

## 🧪 Testing

The project includes comprehensive TypeScript testing:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="UIComponent"
npm test -- src/modules/ux/components/__tests__/

# Watch mode for development
npm run test:watch
```

## 🤝 Contributing

This project follows clean architecture principles and comprehensive documentation standards:

- All public methods require JSDoc documentation
- TypeScript strict mode enabled
- Test coverage focus on critical game logic paths
- Conventional commit format required

## 📜 License

[License information to be added]

## 🌟 Inspiration

Built in the spirit of classic BBS games like TradeWars 2002 and Solar Realms Elite, modernized for today's terminals and web browsers with multiplayer persistence and rich ASCII art interfaces.

