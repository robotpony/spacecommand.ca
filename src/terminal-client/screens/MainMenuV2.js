const { createUX } = require('../../modules/ux');

class MainMenuV2 {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      player: 'Captain Reynolds',
      location: 'Sol System',
      credits: 45750,
      turn: 47,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      messages: 3,
      fleet: { total: 3, trading: 2, idle: 1 },
      tradeProfit: 12500,
      reputation: 'Neutral',
      alliance: 'Independent',
      ...gameState
    };
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create status bar
    const statusBar = this.ux.statusBar({
      width: viewport.width,
      title: 'SPACE COMMAND',
      subtitle: `Turn ${this.gameState.turn} | ${this.gameState.timeLeft} left`,
      leftStatus: `${this.gameState.player} @ ${this.gameState.location}`,
      rightStatus: `Credits: ₡${this.gameState.credits.toLocaleString()}  AP: ${this.gameState.actionPoints.current}/${this.gameState.actionPoints.max}`
    });
    
    // Create main menu items
    const menuItems = [
      { key: '1', label: 'TRADE CENTER', description: 'Buy and sell goods across the galaxy' },
      { key: '2', label: 'FLEET OVERVIEW', description: 'View and manage your ships' },
      { key: '3', label: 'GALAXY MAP', description: 'Navigate star systems' },
      { key: '4', label: 'MARKET OVERVIEW', description: 'Current system prices and trends' },
      { key: '5', label: 'DAILY NEWS', description: 'Galactic events and market reports' },
      { key: '6', label: 'ACTION QUEUE', description: 'Review pending turn actions' }
    ];
    
    // Create main menu
    const mainMenu = this.ux.menu(menuItems, {
      title: 'COMMAND CENTER MENU',
      showKeys: true,
      keyColor: 'highlight',
      labelColor: 'title',
      descriptionColor: 'muted',
      width: Math.min(70, viewport.width - 10)
    });
    
    // Create secondary actions content
    const secondaryContent = [
      '',
      this.ux.colors.color('[S]', 'highlight') + ' System Details      ' + 
      this.ux.colors.color('[M]', 'highlight') + ` Messages (${this.gameState.messages} new)`,
      this.ux.colors.color('[H]', 'highlight') + ' Help               ' + 
      this.ux.colors.color('[Q]', 'highlight') + ' Quit to Terminal',
      ''
    ];
    
    // Create quick stats content
    const statsContent = [
      '┌─ Quick Stats ─────────────────────────────────────────────────────┐',
      `│ Fleet: ${this.gameState.fleet.total} ships (${this.gameState.fleet.trading} trading, ${this.gameState.fleet.idle} idle)                                │`,
      `│ Trade Routes: 2 active, ₡${this.gameState.tradeProfit.toLocaleString()} profit/turn                       │`,
      `│ Reputation: ${this.gameState.reputation} | Alliance: ${this.gameState.alliance}                       │`,
      '└───────────────────────────────────────────────────────────────────┘'
    ];
    
    // Create main content area
    const mainContent = [
      ...mainMenu.render(),
      ...secondaryContent,
      ...statsContent
    ];
    
    // Create main window
    const mainWindow = this.ux.window({
      width: viewport.width,
      height: viewport.height - 4, // Account for status bar and command prompt
      x: 0,
      y: 3, // Below status bar
      border: 'none',
      padding: 2,
      content: mainContent
    });
    
    // Create command prompt at bottom
    const promptContent = ['  Select option [1-6] or command key: _'];
    const promptWindow = this.ux.window({
      width: viewport.width,
      height: 1,
      x: 0,
      y: viewport.height - 1,
      border: 'none',
      padding: 0,
      content: promptContent
    });
    
    // Add windows to manager
    this.ux.windowManager.windows.set('status', {
      window: { render: () => statusBar.render(), x: 0, y: 0, width: viewport.width, height: 3 },
      zIndex: 0,
      visible: true,
      modal: false
    });
    
    this.ux.windowManager.windows.set('main', {
      window: mainWindow,
      zIndex: 1,
      visible: true,
      modal: false
    });
    
    this.ux.windowManager.windows.set('prompt', {
      window: promptWindow,
      zIndex: 2,
      visible: true,
      modal: false
    });
    
    // Render the complete screen
    return this.ux.render();
  }

  handleInput(key) {
    const keyUpper = key.toUpperCase();
    
    switch(keyUpper) {
      case '1': return 'trade-center';
      case '2': return 'fleet-overview';
      case '3': return 'galaxy-map';
      case '4': return 'market-overview';
      case '5': return 'daily-news';
      case '6': return 'action-queue';
      case 'S': return 'system-details';
      case 'M': return 'messages';
      case 'H': return 'help';
      case 'Q': return 'quit';
      case '\x1B': return 'quit'; // ESC key
      default: return null;
    }
  }
}

module.exports = MainMenuV2;