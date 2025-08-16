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
    
    // Calculate available width for content
    const viewport = this.ux.getViewport();
    const contentPadding = 1;
    const availableWidth = viewport.width - (contentPadding * 2) - 2;
    
    // Create three-column layout with responsive widths
    const spacing = 2;
    const totalSpacing = spacing * 2;
    const usableWidth = availableWidth - totalSpacing;
    
    const leftColWidth = Math.floor(usableWidth * 0.32);
    const centerColWidth = Math.floor(usableWidth * 0.38);
    const rightColWidth = usableWidth - leftColWidth - centerColWidth;
    
    // Create buying table
    const buyingTable = this.createBuyingTable();
    content.push('BUYING:');
    content.push(...buyingTable.render());
    content.push('');

    // Create selling table  
    const sellingTable = this.createSellingTable();
    content.push('SELLING:');
    content.push(...sellingTable.render());
    
    // Create cargo info
    const cargoInfo = this.createCargoInfo();
    content.push(...cargoInfo.render());
    content.push('');
    

    
    content.push('');
    
    // Create a menu with prompt for trade actions
    const { Menu } = require('../../modules/ux/components/Menu');
    const tradeMenu = new Menu({
      items: [
        { key: 'Q', label: 'Quick Sell All', description: 'Sell all cargo at current prices' },
        { key: 'W', label: 'Optimal Buy', description: 'Buy recommended items' },
        { key: 'ESC', label: 'Back to Menu', description: 'Return to main menu' }
      ],
      title: 'Quick Actions:',
      showKeys: true,
      showDescriptions: true,
      itemSpacing: 0,
      prompt: {
        text: 'Enter selection or amount (e.g., "1 100" to buy 100 Food):',
        style: 'minimal',
        cursor: 'underline',
        blinking: true,
        spacing: 1
      }
    });
    
    content.push(...tradeMenu.render());
    
    return content;
  }

  createBuyingTable() {
    const Table = require('../../modules/ux/components/Table');
    
    const headers = ['', 'ITEM', 'PRICE', 'QTY'];
    const rows = this.marketGoods.map(good => [
      this.ux.colors.color(`[${good.id}]`, 'highlight'),
      good.name,
      `₡${good.price}`,
      `(${good.available})`
    ]);
    
    return new Table({
      headers,
      rows,
      columnAligns: ['left', 'left', 'right', 'right'],
      border: 'single',
      compact: false,
      borderColor: 'border',
      headerColor: 'title'
    });
  }

  createCargoInfo() {
    const { Window } = require('../../modules/ux/components/Window');
    
    const totalValue = this.cargo.reduce((sum, item) => {
      const marketGood = this.marketGoods.find(g => g.name === item.name);
      return sum + (marketGood ? item.quantity * marketGood.price : 0);
    }, 0);
    
    const cargoContent = [
      `Ship: ${this.gameState.ship}`,
      `Capacity: ${this.gameState.cargoCapacity.used}/${this.gameState.cargoCapacity.total}`,
      '',
      'Current Cargo:',
      ...this.cargo.map(item => `• ${item.name} ${item.quantity}u @ ₡${item.purchasePrice}`),
      '',
      `Est. Value: ₡${totalValue.toLocaleString()}`
    ];
    
    return new Window({
      title: 'CARGO BAY',
      content: cargoContent,
      height: cargoContent.length + 4,
      padding: 1,
      border: 'single',
      borderColor: 'border',
      titleColor: 'title'
    });
  }

  createSellingTable() {
    const Table = require('../../modules/ux/components/Table');
    
    const sellKeys = ['A', 'B', 'C', 'D'];
    const headers = ['', 'SELL', 'PROFIT'];
    const rows = [];
    
    let sellIndex = 0;
    this.cargo.forEach((item) => {
      const marketGood = this.marketGoods.find(g => g.name === item.name);
      if (marketGood && sellIndex < sellKeys.length) {
        const totalValue = item.quantity * marketGood.price;
        const purchaseValue = item.quantity * item.purchasePrice;
        const profit = totalValue - purchaseValue;
        const profitStr = profit >= 0 ? `+₡${profit}` : `-₡${Math.abs(profit)}`;
        const profitColor = profit >= 0 ? 'success' : 'error';
        
        rows.push([
          this.ux.colors.color(`[${sellKeys[sellIndex]}]`, 'highlight'),
          `${item.name} ${item.quantity}u`,
          { text: profitStr, color: profitColor }
        ]);
        sellIndex++;
      }
    });
    
    return new Table({
      headers,
      rows,
      columnAligns: ['left', 'left', 'right'],
      border: 'single',
      compact: false,
      borderColor: 'border',
      headerColor: 'title'
    });
  }

  truncateToWidth(text, maxWidth) {
    // Handle colored text by using the colors utility to measure actual display width
    const displayLength = this.ux.colors.length(text);
    if (displayLength <= maxWidth) {
      return text;
    }
    
    // Simple truncation for now - could be improved to handle color codes better
    return text.substring(0, maxWidth - 3) + '...';
  }

  padToWidth(text, targetWidth) {
    // Use the UX library's color-aware length calculation
    const displayLength = this.ux.colors.length(text);
    if (displayLength >= targetWidth) {
      return text;
    }
    
    const padding = targetWidth - displayLength;
    return text + ' '.repeat(padding);
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