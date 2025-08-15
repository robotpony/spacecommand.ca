const { ANSI_CODES } = require('../../modules/ux/utils/colors');

class MainMenu {
  constructor(ux, gameState = {}) {
    this.ux = ux;
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
    const lines = [];
    const width = 80;
    
    // Header with status bar
    lines.push(this.renderHeader());
    lines.push(this.renderStatusBar());
    lines.push(this.renderSeparator());
    lines.push('');
    
    // Title
    const title = 'COMMAND CENTER MENU';
    const titlePadding = ' '.repeat((width - title.length) / 2);
    lines.push(titlePadding + ANSI_CODES.fgBrightGreen + title + ANSI_CODES.reset);
    
    const underline = '═'.repeat(title.length);
    const underlinePadding = ' '.repeat((width - underline.length) / 2);
    lines.push(underlinePadding + ANSI_CODES.fgGreen + underline + ANSI_CODES.reset);
    lines.push('');
    
    // Menu options
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
      const line = `    ${ANSI_CODES.fgBrightGreen}${keyStr}${ANSI_CODES.reset} ${labelStr}${ANSI_CODES.fgGray}${item.desc}${ANSI_CODES.reset}`;
      lines.push(line);
    });
    
    lines.push('');
    
    // Secondary options
    const secondaryOptions = [
      { key: 'S', label: 'System Details' },
      { key: 'M', label: `Messages (${this.gameState.messages} new)` },
    ];
    
    const secondaryLine = secondaryOptions.map(opt => 
      `${ANSI_CODES.fgGreen}[${opt.key}]${ANSI_CODES.reset} ${opt.label}`
    ).join('      ');
    lines.push('    ' + secondaryLine);
    
    const tertiaryOptions = [
      { key: 'H', label: 'Help' },
      { key: 'Q', label: 'Quit to Terminal' },
    ];
    
    const tertiaryLine = tertiaryOptions.map(opt => 
      `${ANSI_CODES.fgGreen}[${opt.key}]${ANSI_CODES.reset} ${opt.label}`
    ).join('               ');
    lines.push('    ' + tertiaryLine);
    
    lines.push('');
    
    // Quick stats box
    lines.push('  ┌─ Quick Stats ─────────────────────────────────────────────────────┐');
    lines.push(`  │ Fleet: ${this.gameState.fleet.total} ships (${this.gameState.fleet.trading} trading, ${this.gameState.fleet.idle} idle)                                │`);
    lines.push(`  │ Trade Routes: 2 active, ₡${this.gameState.tradeProfit.toLocaleString()} profit/turn                       │`);
    lines.push(`  │ Reputation: ${this.gameState.reputation} | Alliance: ${this.gameState.alliance}                       │`);
    lines.push('  └───────────────────────────────────────────────────────────────────┘');
    
    // Prompt line within the main window border (removed empty line to fit in 24 lines)
    const prompt = 'Select option [1-6] or command key: _';
    const promptLine = `│ ${prompt.padEnd(76)} │`;
    lines.push(promptLine);
    lines.push(this.renderFooter());
    
    return lines.join('\n');
  }

  renderHeader() {
    const left = '┌─[ SPACE COMMAND ]─';
    const middle = '─'.repeat(28);
    const right = `─[ Turn ${this.gameState.turn} | ${this.gameState.timeLeft} left ]─┐`;
    return left + middle + right;
  }

  renderStatusBar() {
    const player = `${this.gameState.player} @ ${this.gameState.location}`;
    const credits = `Credits: ₡${this.gameState.credits.toLocaleString()}`;
    const ap = `AP: ${this.gameState.actionPoints.current}/${this.gameState.actionPoints.max}`;
    
    const leftPart = player.padEnd(35);
    const rightPart = `${credits}  ${ap}`;
    
    return `│ ${leftPart}${rightPart.padStart(42)} │`;
  }

  renderSeparator() {
    return '├' + '─'.repeat(78) + '┤';
  }

  renderFooter() {
    return '└' + '─'.repeat(78) + '┘';
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