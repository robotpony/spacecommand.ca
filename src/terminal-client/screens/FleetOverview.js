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
    
    // Clear existing windows
    this.ux.clear();
    
    // Update gameState with fleet-specific location info
    const gameStateWithFleet = {
      ...this.gameState,
      location: `Total Fleet: ${this.ships.length} Ships`
    };
    
    // Create the standardized game screen
    const gameScreen = this.ux.standardGameScreen({
      width: viewport.width,
      height: viewport.height,
      x: 0,
      y: 0,
      screenTitle: 'FLEET COMMAND',
      gameState: gameStateWithFleet,
      content: this.buildFleetContent()
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

  buildFleetContent() {
    const content = [];
    
    // Add spacing for better layout
    content.push('');
    
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
    
    // Add fleet summary
    content.push('');
    content.push('Fleet Summary:');
    content.push('─'.repeat(14));
    content.push('Total Cargo Capacity: 1,600 tons');
    content.push('Maintenance Due: SS Nebula (3 turns)');
    content.push('Trade Routes: 2 active, generating ₡12,500/turn');
    content.push('Combat Rating: 15 (Minimal)');
    
    content.push('');
    content.push('Ship Commands:');
    content.push(`${this.ux.colors.color('[1-3]', 'highlight')} Select Ship  ${this.ux.colors.color('[D]', 'highlight')} Deploy  ${this.ux.colors.color('[T]', 'highlight')} Trade Route  ${this.ux.colors.color('[M]', 'highlight')} Maintenance`);
    content.push(`${this.ux.colors.color('[U]', 'highlight')} Upgrade  ${this.ux.colors.color('[S]', 'highlight')} Sell  ${this.ux.colors.color('[N]', 'highlight')} Buy New Ship  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
    content.push('');
    content.push('Select ship or command:');
    
    return content;
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