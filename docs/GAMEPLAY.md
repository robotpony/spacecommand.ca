# SpaceCommand Gameplay Guide

## Overview

SpaceCommand is a turn-based multiplayer space trading and empire-building game inspired by classic BBS games. Players manage economic empires, engage in diplomacy, and compete for universal domination through various strategies.

## Core Game Loop

### Session Structure
- **Target Session Length**: < 20 minutes
- **Turn Cycles**: 2-4 hours (configurable per universe)
- **Asynchronous Play**: Log in, make moves, log out - the universe continues

### Daily Routine
1. **Check Status**: Review overnight changes via newspaper
2. **Plan Actions**: Queue limited strategic moves
3. **Execute**: Perform immediate local actions
4. **Log Off**: Let automation handle production
5. **Return Later**: See results and adapt strategy

## Time & Turn Mechanics

### Action System
- **Actions per Turn**: Limited number (configurable)
- **Turns per Period**: Limited allocation
- **Turn Costs**: 
  - Local system actions: 1-3 turns
  - Other systems: More turns based on distance
  - Inter-universe: Highest cost (late-game portal travel)

### Processing Cycles
- **Immediate**: Local actions show instant feedback
- **Queued**: Remote actions process at turn intervals
- **Scheduled Updates**:
  - Market prices update on economic cycle
  - Diplomatic agreements resolve on political cycle
  - Ship movements complete based on travel time

### Multi-Turn Actions
- Actions spanning multiple turns can be configured as cancellable or committed
- Travel progress tracked turn-by-turn
- Resource allocation locked during multi-turn operations

## Economic System

### Markets
- **Granular Goods**: 
  - Raw materials (ore, crystals, gases)
  - Manufactured (electronics, weapons, components)
  - Luxury (artwork, spices, entertainment)
  - Food materials
  - Ships and military items
- **Supply & Demand**: Each system tracks individual good prices
- **Information Asymmetry**: 
  - Full visibility of local market
  - Summary of other systems via daily newspaper
  - Market intelligence through alliances

### Production
- **Automatic Chains**: Build facility � automatic production
- **Maintenance**: Periodic investment required
- **No Micromanagement**: Set and forget, with occasional upkeep
- **Production Types**:
  - Mining operations (raw materials)
  - Refineries (processing)
  - Factories (manufacturing)
  - Specialized facilities (luxury goods)

### Trade
- **Buy Low, Sell High**: Core economic loop
- **Trade Routes**: Establish profitable paths between systems
- **Cargo Management**: Different ship types have varying capacities
- **Market Manipulation**: Advanced players influence prices
- **System Production**: More systems means more raw materials and potential manufacturing

## Space & Movement

### Universe Structure
- **System Count**: 5-25 per universe (configurable)
- **Procedural Generation**: Systems created from templates with:
  - Resource distributions
  - Population types
  - Security levels
  - Special features

### Travel Mechanics
- **Distance = Time**: Measured in turns
- **Variable Travel Times**: Each system pair has unique distance
- **Ship Types**:
  - **Transport**: High cargo, slow, vulnerable
  - **Military**: Combat-capable, moderate speed
  - **Diplomatic**: Fast, small cargo, special access
  - **Courier**: Fastest, minimal cargo

### Presence
- **Binary System**: You have presence or you don't
- **Establishing Presence**: Deploy ships or build facilities
- **Remote Actions**: Limited by communication delay
- **Multi-System Operations**: Manage empire across locations

## Diplomacy & Alliances

### Alliance Types
- **Trade Agreements**: Share market prices, preferential rates
- **Military Pacts**: Mutual defense, coordinated attacks
- **Information Networks**: Share intelligence, early warnings
- **Research Collaborations**: Technology sharing
- **Full Cooperation**: Combined victory conditions

### Agreement Mechanics
- **Escrow System**: Both parties deposit funds
- **Breaking Agreements**: Forfeit deposit, reputation damage
- **Diplomat Limits**: Finite diplomatic actions per period
- **Formation Costs**: Credits and turns to establish

### Communication
- **Messaging System**: 
  - Extremely limited and unreliable (fits space theme)
  - Multi-turn delivery delays
  - Character limits prevent spam
  - Strategic value in successful communication

### Propaganda
- **Newspaper Manipulation**: Plant stories for credits and turns
- **Market Confidence**: Influence economic sentiment
- **Military Posturing**: Psychological warfare

## Technology & Progression

### Technology Tiers
1. **Chemical**: Starting technology
2. **Nuclear**: First upgrade tier
3. **Antimatter**: Advanced operations
4. **Exotic Matter**: Endgame capabilities

### Acquisition Methods
- **Research**: Invest resources and turns
- **Purchase**: Buy from advanced players
- **Discovery**: Random finds on new planets
- **Trade**: Technology exchange agreements
- **Diplomacy**: Share through alliances
- **Espionage**: Steal (with consequences)

### Player Ranking
- **Fresh Start**: Each universe begins equal
- **Skill Ratings**: Track performance across games
- **Matchmaking**: Universes categorized by skill level
- **Future**: Voucher/bonus system for veteran rewards

## Combat & Conflict

### PvP Zones
- **Safe Period**: Initial turns prevent early aggression
- **Graduated Risk**: Core systems safer than frontier
- **Economic Warfare**: Market manipulation always possible
- **Military Combat**: Direct ship-to-ship battles

### Conflict Resolution
- **Turn-Based**: Battles resolve at processing time
- **Fleet Composition**: Ship types and numbers matter
- **Logistics**: Supply lines affect combat effectiveness
- **Consequences**: Destroyed ships, captured systems

## Victory Conditions

### Domination Paths
1. **Total Control**: 100% system ownership
2. **Economic Victory**: Highest wealth at time limit
3. **Diplomatic Victory**: 100% cooperation achieved
4. **Technological Supremacy**: Complete research tree first
5. **Coalition Victory**: Allied players share victory

### Endgame Mechanics
- **Universal Takeover Attempt**: 
  - Unlocked at max research + resource threshold
  - Random success chance influenced by:
    - Military strength
    - Economic power
    - Diplomatic standing
  - Other players can unite to prevent
- **Time Limit**: Configurable per universe
- **Composite Scoring**: Combination of wealth, systems, research, military

### Failure Recovery
- **Bankruptcy Protection**: "Corporate restructure" instead of elimination
- **Bailout Mechanics**:
  - Emergency loans (high interest)
  - Starter ship guarantee
  - Protected trade route
  - Tutorial missions with guaranteed profit
- **Failure Detection**:
  - Negative cash flow for 3+ turns
  - Cannot afford maintenance
  - Lost all ships
  - All routes unprofitable

## Universe Types

### Boot Camp (Beginner)
- Smaller universe (5-10 systems)
- Extended safe period
- Simplified economics
- AI assistance available
- Lower victory thresholds

### Corporals (Intermediate)
- Medium universe (10-15 systems)
- Standard rules
- Balanced player mix
- Full feature set

### Admirals (Advanced)
- Large universe (15-25 systems)
- Shortened safe period
- Complex economic chains
- Harsh failure penalties
- Competitive players only

## Golden Age Sci-Fi Atmosphere

### Factions
- **Terran Federation**: Diplomatic, balanced
- **Orion Syndicate**: Economic focus, shadowy
- **Centauri Republic**: Military strength, honor-bound

### Narrative Elements
- Procedurally generated sector backstories
- Random events (solar flares, pirate raids, discoveries)
- Emerging player-driven stories
- Newspaper chronicles major events

### Visual Style
- Classic BBS ASCII art
- Colorful, impactful screens
- Clear menus with keyboard shortcuts
- Status displays with essential information
- Retro-futuristic aesthetic

## Player Experience Goals

### Accessibility
- **Complexity Ladder**: Easy start, deep mastery
- **Multiple Paths**: Various viable strategies
- **Learn by Doing**: Minimal tutorial, intuitive mechanics

### Engagement
- **Quick Sessions**: Respect player time
- **Meaningful Choices**: Every action matters
- **Emergent Stories**: Player interactions create narrative
- **Progress Persistence**: Leave and return anytime

### Social Dynamics
- **Cooperation Incentives**: Alliances provide real benefits
- **Betrayal Consequences**: Reputation matters
- **Economic Interdependence**: Trade creates relationships
- **Shared Victories**: Collaboration rewarded