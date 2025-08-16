# SpaceCommand Screens & Menus Specification

## Design Requirements

### Layout Specifications

- **Minimum terminal size**: 80 columns width
- **Adaptive layout**: Screens adapt to terminal size with reasonable limits
- **Positioning**: Elements can be left/right aligned, top/bottom, or centered
- **Persistent status bar**: Always visible across all screens

### User Interface Elements

- **Modal dialogs**: Used for cancellations (diplomatic envoys, agreements, selling resources)
- **No context menus**: Actions accessed through main menus only
- **Paginated displays**: For long lists (keeping page counts low)
- **Screen refresh**: Updates on user actions (no real-time requirements initially)

### Complexity Management

- **Progressive disclosure**: Complex screens unlock with technology/resource advancement
- **No special beginner handling**: Natural progression through game mechanics
- **Simple workflows**: Direct source/destination selection for trade routes (no wizards)

## Screen Inventory

### Core Navigation

1. **Title Screen**
   - Game logo and ASCII art
   - Version information
   - "Press any key to continue" prompt

2. **Main Menu**
   - Primary game hub after login
   - Access to all major game systems
   - Current turn and time remaining display

3. **Universe Selection**
   - List available universes (Boot Camp, Corporals, Admirals)
   - Player count and universe status
   - Join/create universe options

4. **Player Dashboard**
   - Overview of player empire status
   - Recent notifications and alerts
   - Quick access to urgent actions

### Economic System

5. **Market Overview**
   - Current system's goods and prices
   - Supply/demand indicators
   - Market trends visualization

6. **Trade Center**
   - Buy/sell interface with quantity selection
   - Profit calculations
   - Cargo capacity display

7. **Trade History**
   - Past transactions log
   - Profit/loss analysis
   - Trade route performance

8. **Production Facilities**
   - Build new facilities interface
   - Upgrade existing facilities
   - Maintenance scheduling
   - Production automation settings

9. **Cargo Management**
   - Ship inventory displays
   - Cargo transfer between ships
   - Loading/unloading interface

10. **Financial Status**
    - Current credits balance
    - Asset valuations
    - Cash flow analysis
    - Bankruptcy warning indicators

### Fleet & Ship Management

11. **Fleet Overview**
    - All ships with location and status
    - Maintenance requirements
    - Quick deployment options

12. **Ship Details**
    - Individual ship specifications
    - Current cargo manifest
    - Maintenance status
    - Travel history

13. **Shipyard**
    - Available ships for purchase
    - Ship class comparisons
    - Purchase interface

14. **Ship Deployment**
    - Assign ships to systems
    - Set up trade routes
    - Military positioning

15. **Travel Planning**
    - Route calculator
    - Travel time estimates
    - Fuel/resource requirements

### Galaxy Navigation

16. **Galaxy Map**
    - ASCII representation of systems
    - Connection paths
    - Player presence indicators
    - System ownership display

17. **System Details**
    - Local system information
    - Resource availability
    - Facilities present
    - Security status

18. **Travel Queue**
    - Ships in transit
    - Arrival times
    - Cancel movement options

19. **Exploration**
    - Unexplored systems
    - Discovery reports
    - Exploration costs

### Diplomacy & Communication

20. **Alliance Management**
    - Current alliances status
    - Agreement terms
    - Alliance benefits/costs

21. **Messaging System**
    - Compose diplomatic messages
    - Message inbox
    - Delivery status tracking

22. **Diplomatic Actions**
    - Propose new agreements
    - Modify existing treaties
    - Break agreements (with modal confirmation)

23. **Reputation Status**
    - Standing with other players
    - Faction relationships
    - Reputation history

24. **Propaganda Center**
    - Plant newspaper stories
    - Cost and effectiveness options
    - Counter-propaganda actions

### Military & Combat

25. **Military Overview**
    - Fleet strength summary
    - Defensive positions
    - Military readiness

26. **Combat Reports**
    - Battle outcomes
    - Casualty reports
    - Combat analysis

27. **Defense Planning**
    - System fortifications
    - Patrol routes
    - Defense spending

28. **Military Intelligence**
    - Known enemy positions
    - Threat assessments
    - Intelligence gathering options

### Information & News

29. **Daily Newspaper**
    - Market reports
    - Major events
    - Player actions
    - Propaganda stories

30. **Intelligence Reports**
    - Market data from other systems
    - Economic intelligence
    - Technology discoveries

31. **Event Log**
    - Recent player actions
    - System notifications
    - Turn processing results

32. **Turn Summary**
    - Actions completed last turn
    - Economic changes
    - Combat resolutions

### Technology & Research
33. **Research Center**
    - Technology tree display
    - Current research progress
    - Research point allocation

34. **Technology Market**
    - Available technologies for purchase
    - Technology trading interface
    - License agreements

35. **Research Progress**
    - Detailed research status
    - Time to completion
    - Research bonuses

### Game Administration

36. **Action Queue**
    - Pending actions for next turn
    - Action point costs
    - Cancel action options (with modal)

37. **Turn Status**
    - Time until next turn
    - Action points remaining
    - Turn limit warnings

38. **Game Settings**
    - Player preferences
    - Notification settings
    - Display options

39. **Help System**
    - Game rules reference
    - Control documentation
    - Tutorial access

### Endgame & Victory

40. **Victory Progress**
    - Domination metrics
    - Victory condition tracking
    - Time remaining

41. **Universe Standings**
    - Player rankings
    - Score comparisons
    - Achievement tracking

42. **Endgame Options**
    - Universal takeover interface
    - Coalition victory management
    - Game conclusion screens

## Implementation Priority

### Phase 1 (Core Gameplay)

- Title Screen
- Main Menu
- Universe Selection
- Market Overview
- Trade Center
- Fleet Overview
- Galaxy Map
- Action Queue
- Turn Status
- Daily Newspaper

### Phase 2 (Extended Features)

- Player Dashboard
- Production Facilities
- Ship Details
- System Details
- Alliance Management
- Messaging System
- Event Log

### Phase 3 (Advanced Systems)

- Military screens
- Research screens
- Propaganda Center
- Intelligence Reports
- Victory tracking
- Endgame Options

### Phase 4 (Polish & Enhancement)

- Financial analysis screens
- Trade optimization tools
- Advanced diplomatic options
- Comprehensive help system

## Notes for Implementation

- All screens should respect the persistent status bar showing credits, turn time, and action points
- Modal dialogs should be used sparingly, primarily for destructive actions requiring confirmation
- Pagination should default to 10-15 items per page where applicable
- Screen transitions should be instant with clear navigation paths back to main menu
- ASCII art and decorative elements should enhance but not overwhelm functional content