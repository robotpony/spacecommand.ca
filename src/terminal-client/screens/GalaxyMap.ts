


export class GalaxyMap {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      player: 'Captain Reynolds',
      currentSystem: 'Sol',
      credits: 45750,
      turn: 47,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      ...gameState
    };
    
    this.selectedSystem = 'Sol';
    this.cursorX = 25;
    this.cursorY = 10;
    
    // System positions and connections
    this.systems = {
      'Sol': { x: 25, y: 10, controlled: true, symbol: '●' },
      'Proxima': { x: 10, y: 8, controlled: true, symbol: '★' },
      'Alpha': { x: 20, y: 8, controlled: false, symbol: '○' },
      'Beta': { x: 33, y: 8, controlled: false, symbol: '○' },
      'Centauri': { x: 12, y: 4, controlled: true, symbol: '★' },
      'Vega': { x: 40, y: 5, controlled: false, symbol: '○' },
      'Orion': { x: 45, y: 9, controlled: true, symbol: '★' },
      'Tau': { x: 38, y: 11, controlled: false, symbol: '○' },
      'Ross': { x: 30, y: 14, controlled: false, symbol: '○' },
      'Barnard': { x: 20, y: 17, controlled: true, symbol: '★' }
    };
    
    this.connections = [
      ['Sol', 'Proxima'],
      ['Sol', 'Alpha'],
      ['Sol', 'Beta'],
      ['Sol', 'Ross'],
      ['Proxima', 'Centauri'],
      ['Alpha', 'Centauri'],
      ['Beta', 'Vega'],
      ['Beta', 'Tau'],
      ['Vega', 'Orion'],
      ['Tau', 'Orion'],
      ['Ross', 'Barnard']
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
      screenTitle: 'GALAXY MAP',
      gameState: this.gameState,
      content: this.buildGalaxyContent()
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

  buildGalaxyContent() {
    const content = [];
    
    // Create map grid
    const mapHeight = 15;
    const mapWidth = 50;
    const map = Array(mapHeight).fill(null).map(() => Array(mapWidth).fill(' '));
    
    // Draw connections
    this.connections.forEach(([from, to]) => {
      const fromSys = this.systems[from];
      const toSys = this.systems[to];
      this.drawConnection(map, fromSys, toSys);
    });
    
    // Draw systems
    Object.entries(this.systems).forEach(([name, sys]) => {
      if (sys.y < mapHeight && sys.x < mapWidth) {
        const isCurrentLocation = name === this.gameState.currentSystem;
        
        if (isCurrentLocation) {
          map[sys.y][sys.x] = '●';  // Current location
        } else if (sys.controlled) {
          map[sys.y][sys.x] = '★';  // Controlled system
        } else {
          map[sys.y][sys.x] = '○';  // Neutral system
        }
        
        // Add system name (if space permits)
        if (sys.x + name.length < mapWidth) {
          for (let i = 0; i < Math.min(name.length, mapWidth - sys.x - 2); i++) {
            if (sys.y - 1 >= 0) {
              map[sys.y - 1][sys.x + i] = name[i];
            }
          }
        }
      }
    });
    
    // Build map display with legend side by side
    content.push('');
    
    // Create two column layout: map on left, legend on right
    const mapLines = [];
    map.forEach((row, y) => {
      let line = '';
      row.forEach((char, x) => {
        // Check if this position is a system
        let isSystem = false;
        let systemName = null;
        Object.entries(this.systems).forEach(([name, sys]) => {
          if (sys.x === x && sys.y === y) {
            isSystem = true;
            systemName = name;
          }
        });
        
        if (isSystem) {
          const sys = this.systems[systemName];
          if (systemName === this.gameState.currentSystem) {
            line += this.ux.colors.color(char, 'success', { bright: true });
          } else if (sys.controlled) {
            line += this.ux.colors.color(char, 'success');
          } else {
            line += char;
          }
        } else if (char === '·' || char === '/') {
          line += this.ux.colors.color(char, 'muted');
        } else {
          line += char;
        }
      });
      mapLines.push(line);
    });
    
    // Build legend
    const legendLines = [
      'Legend:',
      '─'.repeat(7),
      this.ux.colors.color('●', 'success', { bright: true }) + ' You are here',
      this.ux.colors.color('★', 'success') + ' Controlled',
      '○ Neutral',
      this.ux.colors.color('·', 'muted') + ' Jump route',
      '',
      'Controls:',
      '─'.repeat(9),
      this.ux.colors.color('[↑↓←→]', 'highlight') + ' Navigate',
      this.ux.colors.color('[Enter]', 'highlight') + ' Jump',
      this.ux.colors.color('[I]', 'highlight') + ' System Info',
      this.ux.colors.color('[F]', 'highlight') + ' Fleet',
      this.ux.colors.color('[ESC]', 'highlight') + ' Back',
      '',
      `Selected: ${this.selectedSystem}`
    ];
    
    // Combine map and legend side by side
    const maxRows = Math.max(mapLines.length, legendLines.length);
    for (let i = 0; i < maxRows; i++) {
      const mapLine = (mapLines[i] || '').padEnd(mapWidth + 2);
      const legendLine = legendLines[i] || '';
      content.push(mapLine + legendLine);
    }
    
    content.push('');
    content.push(`Current Location: ${this.gameState.currentSystem} System`);
    
    return content;
  }

  drawConnection(map, from, to) {
    // Simple line drawing algorithm
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    for (let i = 1; i < steps; i++) {
      const x = Math.round(from.x + (dx * i / steps));
      const y = Math.round(from.y + (dy * i / steps));
      
      if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
        if (map[y][x] === ' ') {
          // Use different symbols for different connection types
          if (Math.abs(dx) > Math.abs(dy) * 2) {
            map[y][x] = '·';
          } else if (Math.abs(dy) > Math.abs(dx) * 2) {
            map[y][x] = '·';
          } else {
            map[y][x] = '·';
          }
        }
      }
    }
  }


  handleInput(key) {
    const upper = key.toUpperCase();
    
    switch(key) {
      case '\x1B[A': // Up arrow
        // Find nearest system up
        this.moveToNearestSystem(0, -1);
        return 'refresh';
      case '\x1B[B': // Down arrow
        // Find nearest system down
        this.moveToNearestSystem(0, 1);
        return 'refresh';
      case '\x1B[C': // Right arrow
        // Find nearest system right
        this.moveToNearestSystem(1, 0);
        return 'refresh';
      case '\x1B[D': // Left arrow
        // Find nearest system left
        this.moveToNearestSystem(-1, 0);
        return 'refresh';
      case '\r':
      case '\n':
        return `jump:${this.selectedSystem}`;
      case 'I':
      case 'i':
        return `system-info:${this.selectedSystem}`;
      case 'F':
      case 'f':
        return 'fleet-overview';
      case '\x1B': // ESC
        return 'main-menu';
      default:
        return null;
    }
  }

  moveToNearestSystem(dx, dy) {
    const currentSys = this.systems[this.selectedSystem];
    let nearest = null;
    let nearestDist = Infinity;
    
    Object.entries(this.systems).forEach(([name, sys]) => {
      if (name === this.selectedSystem) return;
      
      // Check if system is in the right direction
      const dirX = sys.x - currentSys.x;
      const dirY = sys.y - currentSys.y;
      
      if ((dx > 0 && dirX <= 0) || (dx < 0 && dirX >= 0)) return;
      if ((dy > 0 && dirY <= 0) || (dy < 0 && dirY >= 0)) return;
      
      const dist = Math.sqrt(dirX * dirX + dirY * dirY);
      if (dist < nearestDist) {
        nearest = name;
        nearestDist = dist;
      }
    });
    
    if (nearest) {
      this.selectedSystem = nearest;
    }
  }
}

export default GalaxyMap;