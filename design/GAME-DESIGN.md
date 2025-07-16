# SpaceCommand game design

## Game spec

### Core Game Loop

- **Turn Structure**: Daily action phases with resource management
- **Victory Condition**: Domination through military/economic supremacy
- **Player Progression**: Empire expansion via conquest and colonization

### Core Systems
1. **Empire Management**
   - Population, military, economy balance
   - Maintenance costs and resource allocation
   - Planet specialization (mining, agricultural, industrial)

#### Resources
- **Credits**: Universal currency for trade and construction
- **Population**: Workers for production and military recruitment
- **Energy**: Powers shields, weapons, and industrial facilities
- **Raw Materials**: Mining output for ship/structure construction
- **Food**: Sustains population growth and military morale
- **Technology Points**: Research advancement currency

2. **Military & Combat**
   - Multiple attack types (conventional, covert, orbital bombardment)
   - Fleet composition and unit types
   - Defensive structures and shields

3. **Diplomacy & Politics**
   - Alliance systems and trade agreements
   - Espionage operations
   - Inter-faction politics

4. **Territory & Expansion**
   - Planet colonization mechanics
   - Resource extraction and trade routes
   - Sector control and influence

### Turn Mechanics
- **Turn Length**: 24-hour cycles with 4-hour action phases
- **Action Points**: Each player gets 10 action points per turn
- **Phase Structure**: Production → Movement → Combat → Diplomacy
- **Emergency Actions**: Limited override actions for critical situations

### Web REPL Interface
- **Terminal Simulation**: Browser-based command line interface
- **Core Commands**: 
  - `status` - Empire overview
  - `scan [sector]` - Sensor data
  - `move [fleet] [destination]` - Fleet movement
  - `attack [target]` - Combat initiation
  - `build [type] [location]` - Construction orders
  - `trade [player] [offer]` - Diplomatic proposals
  - `research [technology]` - Science advancement
- **Real-time Updates**: WebSocket notifications for events
- **Command History**: Persistent session with command recall

### RESTful API Endpoints
#### Empire Management
- `GET /api/empire` - Current empire status
- `GET /api/planets` - Controlled planets list
- `POST /api/planets/:id/specialize` - Set planet specialization
- `GET /api/resources` - Resource inventory

#### Military & Combat
- `GET /api/fleets` - Fleet status and locations
- `POST /api/fleets/:id/move` - Fleet movement orders
- `POST /api/combat/attack` - Initiate combat
- `GET /api/combat/:id` - Combat resolution status

#### Diplomacy & Politics
- `GET /api/diplomacy/relations` - Current diplomatic status
- `POST /api/diplomacy/propose` - Send diplomatic proposal
- `GET /api/diplomacy/messages` - Diplomatic communications
- `POST /api/espionage/mission` - Launch covert operation

#### Territory & Expansion
- `GET /api/sectors` - Galaxy map data
- `POST /api/colonize` - Colonization orders
- `GET /api/trade-routes` - Active trade connections
- `POST /api/trade-routes` - Establish new trade route

### Player Onboarding
1. **Tutorial Galaxy**: Safe 10-player environment for learning
2. **Guided Commands**: Interactive command tutorials
3. **AI Mentorship**: Automated advisor for first 7 days
4. **Progressive Unlock**: Advanced features unlock with experience
5. **Help System**: Contextual help with `help [command]`

### Database Schema
#### Core Tables
- `players` - Player accounts and authentication
- `empires` - Empire state and statistics
- `planets` - Planet data and specializations
- `fleets` - Ship formations and locations
- `combat_logs` - Battle history and outcomes
- `diplomatic_relations` - Inter-player relationships
- `trade_agreements` - Economic contracts
- `technologies` - Research progress tracking
- `galaxy_events` - Game-wide events and notifications

### Technical Architecture
- **State Management**: Turn-based with real-time notifications
- **Multiplayer**: Persistent world with 50-100 players per galaxy
- **Progression**: Seasonal resets with persistent achievements
- **Database**: PostgreSQL with Redis caching
- **Real-time**: WebSocket connections for live updates
- **Authentication**: JWT tokens with session management

Would you like me to expand any particular section, or shall I proceed with a complete focused specification based on this structure?