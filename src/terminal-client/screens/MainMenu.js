const { createUX } = require('../../modules/ux');

class MainMenu {
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
    
    // Create the standardized game screen
    const gameScreen = this.ux.standardGameScreen({
      width: viewport.width,
      height: viewport.height,
      x: 0,
      y: 0,
      screenTitle: 'COMMAND CENTER MENU',
      gameState: this.gameState,
      content: this.buildMenuContent()
    });
    
    // Add to window manager
    this.ux.windowManager.windows.set('main', {
      window: gameScreen,
      zIndex: 0,
      visible: true,
      modal: false
    });
    
    return this.ux.render();
  }

  buildMenuContent() {
    const content = [];
    
    // Add spacing for better layout
    content.push('');
    
    // Menu options with consistent formatting
    const menuItems = [
      { key: '1', label: 'TRADE CENTER', desc: 'Buy and sell goods across the galaxy' },
      { key: '2', label: 'FLEET OVERVIEW', desc: 'View and manage your ships' },
      { key: '3', label: 'GALAXY MAP', desc: 'Navigate star systems' },
      { key: '4', label: 'MARKET OVERVIEW', desc: 'Current system prices and trends' },
      { key: '5', label: 'DAILY NEWS', desc: 'Galactic events and market reports' },
      { key: '6', label: 'ACTION QUEUE', desc: 'Review pending turn actions' },
    ];
    
    menuItems.forEach(item => {
      const keyStr = `[${item.key}]`;
      const labelStr = item.label.padEnd(20);
      const line = `    ${this.ux.colors.color(keyStr, 'highlight')} ${labelStr}${this.ux.colors.color(item.desc, 'muted')}`;
      content.push(line);
    });
    
    content.push('');
    
    // Secondary options
    const secondaryOptions = [
      { key: 'S', label: 'System Details' },
      { key: 'M', label: `Messages (${this.gameState.messages} new)` },
    ];
    
    const secondaryLine = secondaryOptions.map(opt => 
      `${this.ux.colors.color(`[${opt.key}]`, 'info')} ${opt.label}`
    ).join('      ');
    content.push('    ' + secondaryLine);
    
    const tertiaryOptions = [
      { key: 'H', label: 'Help' },
      { key: 'Q', label: 'Quit to Terminal' },
    ];
    
    const tertiaryLine = tertiaryOptions.map(opt => 
      `${this.ux.colors.color(`[${opt.key}]`, 'info')} ${opt.label}`
    ).join('               ');
    content.push('    ' + tertiaryLine);
    
    content.push('');
    content.push('');
    
    // Quick stats box using ASCII art but consistent with screen borders
    content.push('  ┌─ Quick Stats ─────────────────────────────────────────────────────┐');
    content.push(`  │ Fleet: ${this.gameState.fleet.total} ships (${this.gameState.fleet.trading} trading, ${this.gameState.fleet.idle} idle)                                │`);
    content.push(`  │ Trade Routes: 2 active, ₡${this.gameState.tradeProfit.toLocaleString()} profit/turn                       │`);
    content.push(`  │ Reputation: ${this.gameState.reputation} | Alliance: ${this.gameState.alliance}                       │`);
    content.push('  └───────────────────────────────────────────────────────────────────┘');
    content.push('');
    
    // Prompt
    content.push('Select option [1-6] or command key: _');
    
    return content;
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

module.exports = MainMenu;