


export class MarketOverview {
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
    
    // Clear existing windows
    this.ux.clear();
    
    // Create the standardized game screen
    const gameScreen = this.ux.standardGameScreen({
      width: viewport.width,
      height: viewport.height,
      x: 0,
      y: 0,
      screenTitle: 'MARKET OVERVIEW',
      gameState: this.gameState,
      content: this.buildMarketContent()
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

  buildMarketContent() {
    const content = [];
    
    // Add spacing for better layout
    content.push('');
    
    // Create table for commodities
    const marketTable = this.ux.table({
      headers: ['COMMODITY', 'PRICE', 'SUPPLY', 'DEMAND', '24H', '7D', 'MY CARGO'],
      columnWidths: [16, 10, 8, 8, 8, 6, 12],
      columnAligns: ['left', 'right', 'left', 'left', 'left', 'left', 'left'],
      compact: true,
      headerSeparator: true,
      rows: this.commodities.map(commodity => {
        const priceColor = this.getPriceColor(commodity.change24h);
        const trendIcon = commodity.trend;
        const changeColor = commodity.change24h > 0 ? 'success' : 
                           commodity.change24h < 0 ? 'error' : 
                           'warning';
        
        return [
          commodity.name,
          { text: `₡${commodity.price}`, color: priceColor },
          { text: commodity.supply, color: this.getSupplyColorName(commodity.supply) },
          { text: commodity.demand, color: this.getDemandColorName(commodity.demand) },
          { text: trendIcon + this.formatChange(commodity.change24h), color: changeColor },
          this.formatChange(commodity.change7d),
          commodity.cargo > 0 ? `${commodity.cargo} units` : '0 units'
        ];
      })
    });
    
    // Add table to content
    const tableLines = marketTable.render();
    tableLines.forEach(line => content.push(line));
    
    // Add market analysis
    content.push('');
    content.push('Market Analysis:');
    content.push('─'.repeat(16));
    content.push('• Ore shortage driving prices up - expect ₡500+ next turn');
    content.push('• Food oversupply from Centauri imports');
    content.push('• Weapons demand spike due to Orion conflict');
    
    content.push('');
    content.push(`${this.ux.colors.color('[T]', 'highlight')} Trade  ${this.ux.colors.color('[P]', 'highlight')} Price History  ${this.ux.colors.color('[R]', 'highlight')} Reports  ${this.ux.colors.color('[B]', 'highlight')} Back to Menu`);
    content.push('');
    content.push('Command:');
    
    return content;
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

export default MarketOverview;