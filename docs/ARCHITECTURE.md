# Application Architecture

This document describes the application architecture at a high level.

**Clean separation with a domain-driven core:**

```text
src/
├── core/              # Game engine & business logic
│   ├── economy/       # Market dynamics, trade routes
│   ├── military/      # Combat, fleet management
│   ├── diplomacy/     # Alliances, treaties, reputation
│   ├── resources/     # Mining, production, consumption
│   └── simulation/    # Turn processing, events
├── modules/           # 
│   ├── ux/            # UX toolkit for shared features like menus, status bars, etc.
│   ├── world/         # Shared world tools (for shared data models) 
│   └── messaging/     # Shared messaging tools (for game messages, and p2p messages)
├── api/               # REST endpoints + WebSocket for real-time
├── terminal-client/   # Curses/rich-based TUI
└── web-client/        # Responsive and attractive retro web UI
```

**Key architectural decisions:**

- **Event-driven core**: Each core subsystem publishes domain events (TradeCompleted, WarDeclared, etc.) for loose coupling
- **CQRS pattern**: Separate read/write models since game state queries differ significantly from mutations
- **Time-boxed turns**: Async actions resolve at fixed intervals (daily turns), preventing real-time pressure while maintaining engagement
- **Plugin architecture**: Each major system (economy, military) implements common interfaces for extensibility
- **API design**: REST for CRUD operations, WebSockets for live updates (battles, market changes). Consider rate limiting per player to prevent automation abuse.