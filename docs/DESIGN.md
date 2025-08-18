# DESIGN philosophy

This document describes the game design principles.

## Implementation Status

### Core Systems
- ✅ **Terminal UI**: Custom UX library complete with Window, Menu, Table components
- ✅ **Entity Models**: Player, Fleet, System, Empire, Planet classes defined
- ⚠️ **Database**: Schema defined, operations not implemented
- ❌ **Game Logic**: Economic, military, diplomatic systems not started
- ❌ **Turn Processing**: Engine design planned but not implemented
- ❌ **Networking**: API and WebSocket layers not started

## Language & Atmosphere

**Golden age sci-fi vibes** (think Asimov, Heinlein, early Star Trek):

- **Factions**: Terran Federation, Orion Syndicate, Centauri Republic
- **Technology tiers**: Chemical → Nuclear → Antimatter → Exotic matter
- **Economic goods**: Raw materials (ore, crystals), manufactured (electronics, weapons), luxury (artwork, spices)
- **Ship classes**: Courier, Freighter, Destroyer, Battlecruiser, Dreadnought
- **Events**: Solar flares disrupting communications, alien artifacts, pirate raids, diplomatic summits

**Narrative hooks**: Each sector has procedurally generated backstory. Players uncover lore through exploration and trading, creating emergent storytelling.

## Gameplay Balance

**Complexity ladder approach:**

**Beginner loop**: Buy low, sell high between 2-3 connected systems. Simple market fluctuations based on supply/demand.

**Intermediate**: 
- Production chains (mine ore → refine → manufacture → transport)
- Basic diplomacy (trade agreements affect prices)
- Light combat (pirates, not other players initially)

**Advanced**:
- Multi-system corporations with supply chains
- Player-vs-player economic warfare (market manipulation)
- Military campaigns with logistics considerations
- Technology research trees

**Multiplayer safety mechanisms:** [❌ NOT IMPLEMENTED]
- ❌ **Graduated PvP zones**: Core systems are safe, outer rim allows combat
- ❌ **Economic focus**: Destruction is expensive; profit margins reward cooperation over pure aggression
- ❌ **Alliance mechanics**: Smaller players can band together against economic giants
- ❌ **Bankruptcy protection**: Losing everything triggers a "corporate restructure" rather than game over

**Note**: These mechanics are designed but await implementation of the core game engine.

**Simulation complexity**: Each system tracks ~5-10 key resources with simple supply/demand curves. Player actions create ripple effects, but the math stays comprehensible. Think "complex enough to strategize, simple enough to calculate in your head."

The key is making economic mastery feel as rewarding as military conquest, with multiple viable paths to success. Thoughts on any of these directions?


## Visual appeal [✅ IMPLEMENTED]

**Classic BBS ASCII ART**: 

- ✅ **Colourful and impactful screens**: Terminal UI toolkit provides rich color support and ASCII art capabilities
- ✅ **Easy to read menus and stats**: Menu component with keyboard shortcuts implemented
- ✅ **Responsive layouts**: Window system adapts to terminal size (24-48 lines)

## Gameplay

### Primary Loops

**Daily Planning Loop**:

- Daily news
- Review overnight events/market changes
- Queue actions for next turn cycle
- Check messages/diplomacy
- Monitor competitors

**Trade Optimization Loop**:

- Analyze market balances
- Plan shipping routes and shipments
- Upgrade cargo capacity
- Establish trade agreements

**Expansion Loop (monthly)**:

- Research new technologies
- Build production facilities
- Explore new sectors
- Form/break alliances

#### Interesting Patterns

The "Supply Chain Cascade": One player's mining operation affects manufacturing costs three systems away, creating indirect competition between players who never directly interact. This emergent complexity from simple rules.
"Information Arbitrage": Early players profit from knowing which systems need what goods. Later, as more players fill gaps, advantage shifts to those who can predict future demands (new colonies, war preparations, etc.).
"Logistics Chess": Moving goods becomes a puzzle - do you use your fast courier to rush high-value cargo, or employ slow freighters for bulk goods? Ship positioning becomes strategic.
Questions for refinement:

Turn rhythm: How long between turn processing? Daily feels right for async play, but should some actions (like combat) resolve faster?
Failure states: When a trade route becomes unprofitable, what's the pivot strategy? Should there be "bailout" mechanics or let economic Darwinism play out?
Endgame: What does "winning" look like? Economic dominance? Territory control? Technology breakthroughs? Multiple victory conditions?
Social dynamics: How do you encourage cooperation without making it mandatory? Should there be mechanics that naturally create temporary alliances?

Which of these loops resonates most with your vision? And what would make defeat feel like a learning experience rather than just frustration?RetryBTurn rhythm: In this era, I think shorter cycles are better (every 2 or 4 hours? this should be configurable per universe/game).Failure states: Some amount of levelling of the playfield is a good idea. Let's start by detecting the failure states and offering a simple buy-back program by the universe.Endgame: we will start simple with domination of the universe through any means (force, collaboration, attrition, etc.)Social dynamics: yes, there should be an alliance mechanism that makes multiplayer interesting.EditExcellent direction. The 2-4 hour turn cycle creates much more dynamic gameplay - players can actually respond to each other's moves within the same day.
Turn Rhythm Implications
2-4 hour cycles fundamentally change strategy:

Reactive gameplay: Counter-moves become possible within a session
Information decay: Market intel expires quickly, reducing first-mover advantage
Coordination windows: Alliances can plan synchronized actions
Tension escalation: Conflicts develop over hours, not days

Implementation consideration: Stagger turn processing across universes to distribute server load. Universe A processes at :00, Universe B at :15, etc.
Failure State Detection & Recovery
Bankruptcy triggers I'd monitor:

Negative cash flow for 3+ consecutive turns
Unable to afford ship maintenance/crew wages
All trade routes become unprofitable simultaneously
Lost all ships to pirates/combat

"Corporate Bailout" mechanics:
- Emergency loan (high interest, secured against future earnings)
- Starter ship + basic trade route guarantee
- Temporary diplomatic immunity (anti-griefing)
- Tutorial mission chain with guaranteed profits
Alliance Architecture [❌ NOT IMPLEMENTED]
Key social dynamics to enable:
- ❌ Resource sharing pools: Members contribute to common funds for large purchases
- ❌ Information networks: Shared market data, early warning systems
- ❌ Mutual defense pacts: Automatic response triggers when attacked
- ❌ Economic integration: Preferential trade rates, joint ventures

Questions for the alliance system:

Trust mechanisms: How do you prevent alliance members from stealing shared resources? Reputation system? Graduated access levels?
Alliance lifecycle: Should there be formal founding costs? Maintenance requirements? Natural dissolution triggers?
Betrayal mechanics: Should leaving an alliance have consequences? How do you balance dramatic potential with griefing prevention?
Size limits: Cap alliance membership to prevent runaway dominance? Or let politics self-regulate?

What's your instinct on alliance permanence - should they be easily formed/dissolved for tactical flexibility, or have enough friction to encourage genuine long-term cooperation?

## UX Module Components [✅ IMPLEMENTED]

The UX module provides a consistent terminal interface toolkit for both the terminal client and web-based retro UI. **This module is fully implemented and working.**

### Core Components

**Decoration** ✅
- ✅ Title screens with ASCII art (AsciiArt utility)
- ✅ Section dividers and borders (Window component)
- ✅ Logo displays and faction emblems (supported)
- ✅ Visual separators between UI regions (Divider component)

**Menu** ✅
- ✅ List of possible actions with keyboard shortcuts
- ✅ Navigation options (numbered or lettered)
- ✅ Contextual actions based on game state
- ⚠️ Breadcrumb trail for nested menus (partial)

**Status Bar** ✅
- ✅ Status bar component implemented
- ⚠️ Turn/time display (needs game logic)
- ⚠️ Message indicators (needs messaging system)
- ❌ Connection status (needs WebSocket)
- ⚠️ Quick stats display (needs data source)

**Status Area** ✅
- ✅ Table component for tabular data
- ✅ ASCII formatting utilities
- ⚠️ Charts and graphs (basic support)
- ⚠️ Mini-maps (needs implementation)
- ✅ Progress bar support

**Menu Response** ✅
- ✅ Text rendering and formatting
- ✅ Color-coded messages
- ✅ Table layouts for results
- ✅ Modal dialogs for confirmations
- ✅ Error display support

### Additional Considerations

**Input Components**
- Command line for text input
- Form fields for complex actions
- Hotkey handlers for quick navigation
- Auto-complete for commands

**Notifications**
- Modal dialogs for critical decisions
- Toast messages for transient updates
- Alert panels for attacks/emergencies
- Event log with filtering

**Layout Management**
- Split panes for multi-view displays
- Scrollable regions for long content
- Tab navigation between screens
- Responsive layout for different terminal sizes

## Terminal Interface Architecture [✅ IMPLEMENTED]

### BBS-Style Fixed-Screen Behavior

SpaceCommand follows authentic BBS (Bulletin Board System) interface patterns. **The terminal interface system is fully operational.**

- **Fixed-screen display**: Content fills the terminal without scrolling
- **Reserved cursor line**: Bottom line always reserved for user input/cursor
- **In-place refresh**: Screen updates replace content rather than adding to it
- **Responsive sizing**: Adapts to terminal dimensions while maintaining layout integrity

### Terminal Sizing Constraints

**Supported Dimensions**:
- **Width**: Minimum 80 columns, responsive up to terminal width
- **Height**: 24-48 lines with automatic content adaptation
- **Effective Height**: Always `terminal_height - 1` (reserves bottom line)

**Height Adaptation**: Content automatically adjusts from minimal layout (24 lines) to expanded layout (48 lines), with optional elements shown/hidden based on available space.

### Color Usage

**Retro Terminal Aesthetic**:
- **Primary colors**: Bright green text on black background (classic phosphor terminal)
- **Accent colors**: Cyan for highlights, yellow for warnings, red for alerts
- **UI hierarchy**: Different color intensities distinguish UI elements (bright for interactive, dim for labels)
- **Information coding**: Consistent color meaning across screens (green=good, red=danger, yellow=caution)

**Accessibility Considerations**:
- **Fallback support**: Graceful degradation for terminals without color support
- **High contrast**: All text readable on monochrome displays
- **Color independence**: Information conveyed through text and symbols, not color alone