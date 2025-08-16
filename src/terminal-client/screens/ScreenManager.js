const TitleScreen = require('./TitleScreen');
const MainMenu = require('./MainMenu');
const UniverseSelection = require('./UniverseSelection');
const MarketOverview = require('./MarketOverview');
const TradeCenter = require('./TradeCenter');
const FleetOverview = require('./FleetOverview');
const GalaxyMap = require('./GalaxyMap');
const ActionQueue = require('./ActionQueue');
const DailyNewspaper = require('./DailyNewspaper');

class ScreenManager {
  constructor(ux) {
    this.ux = ux;
    this.currentScreen = null;
    this.screenStack = [];
    this.gameState = {
      player: 'Captain Reynolds',
      location: 'Sol System',
      currentSystem: 'Sol',
      credits: 45750,
      turn: 47,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      messages: 3,
      fleet: { total: 3, trading: 2, idle: 1 },
      tradeProfit: 12500,
      reputation: 'Neutral',
      alliance: 'Independent',
      ship: 'SS Firefly',
      cargoCapacity: { used: 250, total: 500 },
      stardate: '2387.47',
      playerRank: 3
    };
    
    // Initialize screens
    this.screens = {
      'title': new TitleScreen(ux),
      'main-menu': new MainMenu(ux, this.gameState),
      'universe-selection': new UniverseSelection(ux),
      'market-overview': new MarketOverview(ux, this.gameState),
      'trade-center': new TradeCenter(ux, this.gameState),
      'fleet-overview': new FleetOverview(ux, this.gameState),
      'galaxy-map': new GalaxyMap(ux, this.gameState),
      'action-queue': new ActionQueue(ux, this.gameState),
      'daily-news': new DailyNewspaper(ux, this.gameState)
    };
    
    // Start with title screen
    this.setScreen('title');
  }

  setScreen(screenName) {
    if (this.screens[screenName]) {
      if (this.currentScreen) {
        this.screenStack.push(this.currentScreen);
      }
      this.currentScreen = screenName;
      return true;
    }
    return false;
  }

  goBack() {
    if (this.screenStack.length > 0) {
      this.currentScreen = this.screenStack.pop();
      return true;
    }
    return false;
  }

  render() {
    if (this.currentScreen && this.screens[this.currentScreen]) {
      return this.screens[this.currentScreen].render();
    }
    return 'No screen loaded';
  }

  handleInput(input) {
    if (!this.currentScreen || !this.screens[this.currentScreen]) {
      return null;
    }
    
    const screen = this.screens[this.currentScreen];
    const result = screen.handleInput(input);
    
    if (!result) {
      return null;
    }
    
    // Handle navigation commands
    switch(result) {
      case 'quit':
        return 'quit';
        
      case 'back':
        this.goBack();
        return 'refresh';
        
      case 'refresh':
        return 'refresh';
        
      case 'title':
      case 'main-menu':
      case 'universe-selection':
      case 'market-overview':
      case 'trade-center':
      case 'fleet-overview':
      case 'galaxy-map':
      case 'action-queue':
      case 'daily-news':
        this.setScreen(result);
        return 'refresh';
        
      default:
        // Handle commands with parameters (e.g., "join:boot-camp")
        if (result.includes(':')) {
          const [command, ...params] = result.split(':');
          return this.handleCommand(command, params);
        }
        
        // Try to navigate to the screen if it exists
        if (this.screens[result]) {
          this.setScreen(result);
          return 'refresh';
        }
        
        return result;
    }
  }

  handleCommand(command, params) {
    switch(command) {
      case 'join':
        // Handle joining a universe
        console.log(`Joining universe: ${params[0]}`);
        this.setScreen('main-menu');
        return 'refresh';
        
      case 'buy':
        // Handle buy command
        console.log(`Buying item ${params[0]}, quantity ${params[1]}`);
        return 'refresh';
        
      case 'sell':
        // Handle sell command
        console.log(`Selling item ${params[0]}`);
        return 'refresh';
        
      case 'jump':
        // Handle galaxy map jump
        console.log(`Jumping to system: ${params[0]}`);
        this.gameState.currentSystem = params[0];
        this.gameState.location = `${params[0]} System`;
        return 'refresh';
        
      case 'deploy':
      case 'trade-route':
      case 'maintenance':
      case 'upgrade':
        // Handle fleet commands
        console.log(`Fleet command ${command} for ship ${params[0]}`);
        return 'refresh';
        
      case 'cancel':
        // Handle canceling action from queue
        console.log(`Canceling action ${params[0]}`);
        return 'refresh';
        
      default:
        console.log(`Unknown command: ${command}`);
        return null;
    }
  }

  getCurrentScreenName() {
    return this.currentScreen;
  }

  getGameState() {
    return this.gameState;
  }

  updateGameState(updates) {
    this.gameState = { ...this.gameState, ...updates };
    
    // Update all screens with new game state
    Object.values(this.screens).forEach(screen => {
      if (screen.gameState) {
        screen.gameState = { ...screen.gameState, ...updates };
      }
    });
  }
}

module.exports = ScreenManager;