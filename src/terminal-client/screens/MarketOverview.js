const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class MarketOverview {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      player: 'Captain Reynolds',
      location: 'Sol System - Terra Station',
      credits: 45750,
      turn: 47,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      ...gameState
    };
    
    this.commodities = [
      { name: 'Food', price: 125, supply: 'HIGH', demand: 'MED', change24h: 5, change7d: 12, cargo: 50, trend: '↑' },
      { name: 'Ore', price: 450, supply: 'LOW', demand: 'HIGH', change24h: 15, change7d: 45, cargo: 120, trend: '↑' },
      { name: 'Technology', price: 2250, supply: 'MED', demand: 'LOW', change24h: -8, change7d: -5, cargo: 0, trend: '↓' },
      { name: 'Luxury Goods', price: 850, supply: 'MED', demand: 'MED', change24h: 0, change7d: 3, cargo: 15, trend: '→' },
      { name: 'Weapons', price: 1500, supply: 'LOW', demand: 'HIGH', change24h: 22, change7d: 30, cargo: 0, trend: '↑' },
      { name: 'Medical', price: 650, supply: 'HIGH', demand: 'LOW', change24h: -12, change7d: -20, cargo: 25, trend: '↓' }
    ];
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Calculate responsive layout
    const layoutCalc = new LayoutCalculator(viewport);
    const layout = layoutCalc.calculateMarketOverviewLayout();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create status bar
    const statusBar = this.ux.statusBar({
      width: viewport.width,
      title: 'MARKET OVERVIEW',
      subtitle: `Turn ${this.gameState.turn} | ${this.gameState.timeLeft} left`,
      leftStatus: this.gameState.location,
      rightStatus: `Credits: ₡${this.gameState.credits.toLocaleString()}  AP: ${this.gameState.actionPoints.current}/${this.gameState.actionPoints.max}`
    });
    
    // Build content array with responsive considerations
    const content = [];
    
    if (!layout.compactMode) {
      content.push('');
    }
    
    // Build table content
    content.push('COMMODITY'.padEnd(18) + 'PRICE'.padEnd(9) + 'SUPPLY'.padEnd(9) + 'DEMAND'.padEnd(9) + '24H'.padEnd(10) + '7D'.padEnd(8) + 'MY CARGO');
    content.push('═'.repeat(75));
    
    this.commodities.forEach(commodity => {
      const priceColor = this.getPriceColor(commodity.change24h);
      const trendIcon = commodity.trend;
      const changeColor = commodity.change24h > 0 ? 'success' : 
                         commodity.change24h < 0 ? 'error' : 
                         'warning';
      
      const line = commodity.name.padEnd(18) +
        this.ux.colors.color(`₡${commodity.price}`, priceColor).padEnd(9) +
        this.ux.colors.color(commodity.supply, this.getSupplyColorName(commodity.supply)).padEnd(9) +
        this.ux.colors.color(commodity.demand, this.getDemandColorName(commodity.demand)).padEnd(9) +
        this.ux.colors.color(trendIcon + this.formatChange(commodity.change24h), changeColor).padEnd(10) +
        this.formatChange(commodity.change7d).padEnd(8) +
        (commodity.cargo > 0 ? `${commodity.cargo} units` : '0 units');
      
      content.push(line);
    });
    
    // Add market analysis if space allows
    if (layout.showAnalysis) {
      content.push('');
      content.push('Market Analysis:');
      content.push('─'.repeat(16));
      content.push('• Ore shortage driving prices up - expect ₡500+ next turn');
      content.push('• Food oversupply from Centauri imports');
      content.push('• Weapons demand spike due to Orion conflict');
    }
    
    if (!layout.compactMode) {
      content.push('');
      content.push(`${this.ux.colors.color('[T]', 'highlight')} Trade  ${this.ux.colors.color('[P]', 'highlight')} Price History  ${this.ux.colors.color('[R]', 'highlight')} Reports  ${this.ux.colors.color('[B]', 'highlight')} Back to Menu`);
      content.push('');
      content.push('Command:');
    } else {
      content.push('');
      content.push(`${this.ux.colors.color('[T]', 'highlight')} Trade  ${this.ux.colors.color('[P]', 'highlight')} History  ${this.ux.colors.color('[R]', 'highlight')} Reports  ${this.ux.colors.color('[B]', 'highlight')} Back`);
      content.push('Command:');
    }
    
    // Adapt content to available space
    const adaptedContent = layoutCalc.adaptMenuContent(content, layout.availableContentLines);
    
    // Create main window using layout coordinates
    const mainWindow = this.ux.window({
      width: layout.mainWindow.width,
      height: layout.mainWindow.height,
      x: layout.mainWindow.x,
      y: layout.mainWindow.y,
      border: 'single',
      padding: layout.mainWindow.padding,
      content: adaptedContent
    });
    
    // Add windows to manager (status + main)
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

  getPriceColor(change) {
    if (change > 10) return 'success';
    if (change > 0) return 'info';
    if (change < -10) return 'error';
    if (change < 0) return 'warning';
    return 'muted';
  }

  getSupplyColorName(supply) {
    switch(supply) {
      case 'HIGH': return 'success';
      case 'MED': return 'warning';
      case 'LOW': return 'error';
      default: return 'muted';
    }
  }

  getDemandColorName(demand) {
    switch(demand) {
      case 'HIGH': return 'success';
      case 'MED': return 'warning';
      case 'LOW': return 'muted';
      default: return 'muted';
    }
  }

  formatChange(change) {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%`;
  }

  handleInput(key) {
    const keyUpper = key.toUpperCase();
    
    switch(keyUpper) {
      case 'T': return 'trade-center';
      case 'P': return 'price-history';
      case 'R': return 'market-reports';
      case 'B': 
      case '\x1B': // ESC
        return 'main-menu';
      default: return null;
    }
  }
}

module.exports = MarketOverview;