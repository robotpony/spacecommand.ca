const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class MainMenuV3 {
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
    
    // Calculate responsive layout
    const layoutCalc = new LayoutCalculator(viewport);
    const layout = layoutCalc.calculateMainMenuLayout();
    
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
    
    // Create main menu content
    const menuItems = [
      { key: '1', label: 'TRADE CENTER', description: 'Buy and sell goods across the galaxy' },
      { key: '2', label: 'FLEET OVERVIEW', description: 'View and manage your ships' },
      { key: '3', label: 'GALAXY MAP', description: 'Navigate star systems' },
      { key: '4', label: 'MARKET OVERVIEW', description: 'Current system prices and trends' },
      { key: '5', label: 'DAILY NEWS', description: 'Galactic events and market reports' },
      { key: '6', label: 'ACTION QUEUE', description: 'Review pending turn actions' }
    ];
    
    // Build menu content
    let menuContent = [];
    
    // Add title and menu items
    if (!layout.compactMode) {
      menuContent.push('');
      menuContent.push('                           COMMAND CENTER MENU');
      menuContent.push('                          ═════════════════════');
      menuContent.push('');
    }
    
    // Add menu items
    menuItems.forEach(item => {
      const keyStr = `[${item.key}]`;
      const labelStr = item.label.padEnd(20);
      if (layout.compactMode) {
        // Compact mode - shorter descriptions
        menuContent.push(`    ${this.ux.colors.color(keyStr, 'highlight')} ${labelStr}`);
      } else {
        // Full mode with descriptions
        menuContent.push(`    ${this.ux.colors.color(keyStr, 'highlight')} ${labelStr}${this.ux.colors.color(item.description, 'muted')}`);
      }
    });
    
    // Add secondary options
    if (!layout.compactMode) {
      menuContent.push('');
    }
    
    const secondaryLine = [
      `${this.ux.colors.color('[S]', 'highlight')} System Details`,
      `${this.ux.colors.color('[M]', 'highlight')} Messages (${this.gameState.messages} new)`
    ].join('      ');
    menuContent.push('    ' + secondaryLine);
    
    const tertiaryLine = [
      `${this.ux.colors.color('[H]', 'highlight')} Help`,
      `${this.ux.colors.color('[Q]', 'highlight')} Quit to Terminal`
    ].join('               ');
    menuContent.push('    ' + tertiaryLine);
    
    // Add quick stats if there's room
    if (layout.showStats && !layout.compactMode) {
      menuContent.push('');
      menuContent.push('  ┌─ Quick Stats ─────────────────────────────────────────────────────┐');
      menuContent.push(`  │ Fleet: ${this.gameState.fleet.total} ships (${this.gameState.fleet.trading} trading, ${this.gameState.fleet.idle} idle)                                │`);
      menuContent.push(`  │ Trade Routes: 2 active, ₡${this.gameState.tradeProfit.toLocaleString()} profit/turn                       │`);
      menuContent.push(`  │ Reputation: ${this.gameState.reputation} | Alliance: ${this.gameState.alliance}                       │`);
      menuContent.push('  └───────────────────────────────────────────────────────────────────┘');
    }
    
    // Adapt content to available space
    const adaptedContent = layoutCalc.adaptMenuContent(menuContent, layout.availableContentLines);
    
    // Create main window
    const mainWindow = this.ux.window({
      width: layout.mainWindow.width,
      height: layout.mainWindow.height,
      x: layout.mainWindow.x,
      y: layout.mainWindow.y,
      border: 'none',
      padding: layout.mainWindow.padding,
      content: adaptedContent
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

module.exports = MainMenuV3;