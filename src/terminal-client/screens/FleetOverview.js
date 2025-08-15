const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class FleetOverview {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      player: 'Captain Reynolds',
      credits: 45750,
      turn: 47,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      ...gameState
    };
    
    this.ships = [
      {
        id: 1,
        name: 'SS Firefly',
        class: 'Trader',
        location: 'Sol',
        status: 'Docked',
        cargo: { used: 250, total: 500 },
        health: 100,
        statusColor: 'success'
      },
      {
        id: 2,
        name: 'SS Nebula',
        class: 'Freighter',
        location: 'Centauri',
        status: 'Trading',
        cargo: { used: 800, total: 1000 },
        health: 95,
        statusColor: 'warning'
      },
      {
        id: 3,
        name: 'SS Comet',
        class: 'Scout',
        location: 'Sol→Proxima',
        status: 'In Transit',
        statusDetail: '(2 turns)',
        cargo: { used: 50, total: 100 },
        health: 100,
        statusColor: 'info'
      }
    ];
    
    this.selectedShip = 0;
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Calculate responsive layout
    const layoutCalc = new LayoutCalculator(viewport);
    const layout = layoutCalc.calculateFleetOverviewLayout();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create status bar
    const statusBar = this.ux.statusBar({
      width: viewport.width,
      title: 'FLEET COMMAND',
      subtitle: `Turn ${this.gameState.turn} | ${this.gameState.timeLeft} left`,
      leftStatus: `Total Fleet: ${this.ships.length} Ships`,
      rightStatus: `Credits: ₡${this.gameState.credits.toLocaleString()}  AP: ${this.gameState.actionPoints.current}/${this.gameState.actionPoints.max}`
    });
    
    // Build content array with responsive considerations
    const content = [];
    
    if (!layout.compactMode) {
      content.push('');
    }
    
    // Build fleet table content
    content.push('ID   NAME           CLASS      LOCATION    STATUS      CARGO    HEALTH');
    content.push('═'.repeat(75));
    
    this.ships.forEach((ship, index) => {
      const isSelected = index === this.selectedShip;
      const prefix = isSelected ? this.ux.colors.color('[', 'highlight') : '[';
      const suffix = isSelected ? this.ux.colors.color(']', 'highlight') : ']';
      
      const cargoStr = `${ship.cargo.used}/${ship.cargo.total}`;
      const healthStr = `${ship.health}%`;
      const healthColor = ship.health === 100 ? 'success' :
                         ship.health >= 75 ? 'warning' :
                         'error';
      
      let statusStr = ship.status;
      if (ship.statusDetail) {
        statusStr += ` ${ship.statusDetail}`;
      }
      
      const line = prefix + ship.id + suffix + '  ' +
        ship.name.padEnd(15) +
        ship.class.padEnd(11) +
        ship.location.padEnd(12) +
        this.ux.colors.color(statusStr, ship.statusColor).padEnd(12) +
        cargoStr.padEnd(9) +
        this.ux.colors.color(healthStr, healthColor);
      
      content.push(line);
    });
    
    // Add fleet summary if space allows
    if (layout.showSummary) {
      content.push('');
      content.push('Fleet Summary:');
      content.push('─'.repeat(14));
      content.push('Total Cargo Capacity: 1,600 tons');
      content.push('Maintenance Due: SS Nebula (3 turns)');
      content.push('Trade Routes: 2 active, generating ₡12,500/turn');
      content.push('Combat Rating: 15 (Minimal)');
    }
    
    if (!layout.compactMode) {
      content.push('');
      content.push('Ship Commands:');
      content.push(`${this.ux.colors.color('[1-3]', 'highlight')} Select Ship  ${this.ux.colors.color('[D]', 'highlight')} Deploy  ${this.ux.colors.color('[T]', 'highlight')} Trade Route  ${this.ux.colors.color('[M]', 'highlight')} Maintenance`);
      content.push(`${this.ux.colors.color('[U]', 'highlight')} Upgrade  ${this.ux.colors.color('[S]', 'highlight')} Sell  ${this.ux.colors.color('[N]', 'highlight')} Buy New Ship  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
      content.push('');
      content.push('Select ship or command:');
    } else {
      content.push('');
      content.push(`${this.ux.colors.color('[1-3]', 'highlight')} Select  ${this.ux.colors.color('[D]', 'highlight')} Deploy  ${this.ux.colors.color('[T]', 'highlight')} Trade  ${this.ux.colors.color('[M]', 'highlight')} Maintenance  ${this.ux.colors.color('[N]', 'highlight')} Buy  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
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


  handleInput(key) {
    const upper = key.toUpperCase();
    
    // Ship selection
    if (/^[1-3]$/.test(key)) {
      const shipIndex = parseInt(key) - 1;
      if (shipIndex < this.ships.length) {
        this.selectedShip = shipIndex;
        return 'refresh';
      }
    }
    
    switch(upper) {
      case 'D': return `deploy:${this.ships[this.selectedShip].id}`;
      case 'T': return `trade-route:${this.ships[this.selectedShip].id}`;
      case 'M': return `maintenance:${this.ships[this.selectedShip].id}`;
      case 'U': return `upgrade:${this.ships[this.selectedShip].id}`;
      case 'S': return `sell:${this.ships[this.selectedShip].id}`;
      case 'N': return 'buy-ship';
      case '\x1B': // ESC
        return 'main-menu';
      default: return null;
    }
  }
}

module.exports = FleetOverview;