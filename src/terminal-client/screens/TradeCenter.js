const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class TradeCenter {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      player: 'Captain Reynolds',
      location: 'Sol System - Terra Station',
      credits: 45750,
      turn: 47,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      ship: 'SS Firefly',
      cargoCapacity: { used: 250, total: 500 },
      ...gameState
    };
    
    this.marketGoods = [
      { id: 1, name: 'Food', price: 125, available: 500 },
      { id: 2, name: 'Ore', price: 450, available: 120 },
      { id: 3, name: 'Technology', price: 2250, available: 50 },
      { id: 4, name: 'Luxury', price: 850, available: 200 },
      { id: 5, name: 'Weapons', price: 1500, available: 75 },
      { id: 6, name: 'Medical', price: 650, available: 300 }
    ];
    
    this.cargo = [
      { name: 'Food', quantity: 50, purchasePrice: 100 },
      { name: 'Ore', quantity: 120, purchasePrice: 380 },
      { name: 'Luxury', quantity: 15, purchasePrice: 900 },
      { name: 'Medical', quantity: 25, purchasePrice: 720 }
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
      screenTitle: 'TRADE CENTER',
      gameState: this.gameState,
      content: this.buildTradeContent()
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

  buildTradeContent() {
    const content = [];
    
    // Add spacing for better layout
    content.push('');
    
    // Create three-column layout
    const leftColWidth = 35;
    const rightColWidth = 25;
    
    // Header row
    const headerRow = 
      'BUYING'.padEnd(leftColWidth) + 
      ' '.repeat(2) +
      'CARGO BAY'.padEnd(rightColWidth) + 
      ' '.repeat(2) +
      'SELLING';
    content.push(headerRow);
    content.push('═'.repeat(Math.min(80, leftColWidth + rightColWidth + 20)));
    
    // Build buying items
    const buyingItems = this.marketGoods.map(good => 
      `${this.ux.colors.color(`[${good.id}]`, 'highlight')} ${good.name.padEnd(12)}₡${String(good.price).padEnd(7)}/u (${good.available} avail)`
    );
    
    // Build cargo info
    const cargoItems = [
      `Ship: ${this.gameState.ship}`,
      `Capacity: ${this.gameState.cargoCapacity.used}/${this.gameState.cargoCapacity.total}`,
      '',
      'Current Cargo:',
      ...this.cargo.map(item => `• ${item.name} ${item.quantity}u @ ₡${item.purchasePrice}`)
    ];
    
    const totalValue = this.cargo.reduce((sum, item) => {
      const marketGood = this.marketGoods.find(g => g.name === item.name);
      return sum + (marketGood ? item.quantity * marketGood.price : 0);
    }, 0);
    
    cargoItems.push('');
    cargoItems.push(`Est. Value: ₡${totalValue.toLocaleString()}`);
    
    // Build selling items
    const sellKeys = ['A', 'B', 'C', 'D'];
    const sellingItems = [];
    let sellIndex = 0;
    
    this.cargo.forEach((item) => {
      const marketGood = this.marketGoods.find(g => g.name === item.name);
      if (marketGood) {
        const totalValue = item.quantity * marketGood.price;
        const purchaseValue = item.quantity * item.purchasePrice;
        const profit = totalValue - purchaseValue;
        const profitStr = profit >= 0 ? `+₡${profit.toLocaleString()}` : `-₡${Math.abs(profit).toLocaleString()}`;
        const profitColor = profit >= 0 ? 'success' : 'error';
        
        const line = `${this.ux.colors.color(`[${sellKeys[sellIndex]}]`, 'highlight')} ${item.name} ${item.quantity}u → ₡${totalValue.toLocaleString()} ${this.ux.colors.color(`(${profitStr})`, profitColor)}`;
        sellingItems.push(line);
        sellIndex++;
      }
    });
    
    // Combine columns row by row
    const maxRows = Math.max(buyingItems.length, cargoItems.length, sellingItems.length);
    
    for (let i = 0; i < maxRows; i++) {
      const leftCol = (buyingItems[i] || '').padEnd(leftColWidth);
      const rightCol = (cargoItems[i] || '').padEnd(rightColWidth);
      const centerCol = sellingItems[i] || '';
      
      const row = leftCol + '  ' + rightCol + '  ' + centerCol;
      content.push(row);
    }
    
    content.push('');
    content.push('Quick Actions:');
    content.push(`${this.ux.colors.color('[Q]', 'highlight')} Quick Sell All  ${this.ux.colors.color('[W]', 'highlight')} Optimal Buy  ${this.ux.colors.color('[ESC]', 'highlight')} Back to Menu`);
    content.push('');
    content.push('Enter selection or amount (e.g., "1 100" to buy 100 Food):');
    
    return content;
  }


  handleInput(input) {
    const upper = input.toUpperCase();
    
    // Check for buy commands (1-6)
    if (/^[1-6]/.test(input)) {
      const parts = input.split(' ');
      const itemId = parts[0];
      const quantity = parts[1] || '1';
      return `buy:${itemId}:${quantity}`;
    }
    
    // Check for sell commands (A-D)
    if (/^[A-D]/.test(upper)) {
      return `sell:${upper}`;
    }
    
    switch(upper) {
      case 'Q': return 'quick-sell';
      case 'W': return 'optimal-buy';
      case '\x1B': // ESC
        return 'main-menu';
      default: return null;
    }
  }
}

module.exports = TradeCenter;