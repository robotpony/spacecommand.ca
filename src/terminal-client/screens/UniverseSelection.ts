


export class UniverseSelection {
  constructor(ux) {
    this.ux = ux;
    this.selectedIndex = 0;
    this.universes = [
      { 
        id: 'boot-camp',
        name: 'Boot Camp',
        description: 'Training universe for new commanders',
        players: '12/20',
        turn: 15,
        turnLength: '4 hours',
        status: 'Active',
        difficulty: 'Beginner'
      },
      {
        id: 'corporals',
        name: 'Corporals',
        description: 'Standard competitive universe',
        players: '45/50',
        turn: 127,
        turnLength: '3 hours',
        status: 'Active',
        difficulty: 'Standard'
      },
      {
        id: 'admirals',
        name: 'Admirals',
        description: 'Elite universe for veteran players',
        players: '28/30',
        turn: 89,
        turnLength: '2 hours',
        status: 'Active',
        difficulty: 'Expert'
      },
      {
        id: 'new-frontier',
        name: 'New Frontier',
        description: 'Fresh universe starting soon',
        players: '3/50',
        turn: 0,
        turnLength: '3 hours',
        status: 'Recruiting',
        difficulty: 'Standard'
      }
    ];
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create game state for universe selection
    const gameStateForSelection = {
      player: 'Universe Selection',
      location: 'Choose Your Destiny',
      credits: 0,
      turn: 0,
      timeLeft: '',
      actionPoints: { current: 0, max: 0 }
    };
    
    // Create the standardized game screen
    const gameScreen = this.ux.standardGameScreen({
      width: viewport.width,
      height: viewport.height,
      x: 0,
      y: 0,
      screenTitle: 'UNIVERSE SELECTION',
      gameState: gameStateForSelection,
      content: this.buildUniverseContent()
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

  buildUniverseContent() {
    const content = [];
    
    // Add spacing for better layout
    content.push('');
    
    content.push(this.ux.colors.color('SELECT UNIVERSE', 'success', { bright: true }));
    content.push(this.ux.colors.color('═'.repeat('SELECT UNIVERSE'.length), 'success'));
    
    // Universe list headers
    content.push(this.ux.colors.color(
      'UNIVERSE'.padEnd(20) + 
      'PLAYERS'.padEnd(12) + 
      'TURN'.padEnd(10) + 
      'CYCLE'.padEnd(12) + 
      'STATUS'.padEnd(12) +
      'LEVEL', 'muted'
    ));
    content.push('─'.repeat(76));
    
    // Universe list
    this.universes.forEach((universe, index) => {
      const isSelected = index === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const statusColor = this.getStatusColorSemantic(universe.status);
      const difficultyColor = this.getDifficultyColorSemantic(universe.difficulty);
      
      const line = prefix + 
        universe.name.padEnd(20) +
        universe.players.padEnd(12) +
        String(universe.turn).padEnd(10) +
        universe.turnLength.padEnd(12) +
        this.ux.colors.color(universe.status.padEnd(12), statusColor) +
        this.ux.colors.color(universe.difficulty, difficultyColor);
      
      if (isSelected) {
        content.push(this.ux.colors.color(line, 'success', { bright: true }));
      } else {
        content.push(line);
      }
    });
    
    // Selected universe details
    const selected = this.universes[this.selectedIndex];
    
    content.push('');
    content.push('Universe Details:');
    content.push('─'.repeat(17));
    content.push(`${selected.name}: ${selected.description}`);
    
    if (selected.status === 'Active') {
      content.push(`Current turn: ${selected.turn} | Next turn in: ~${selected.turnLength}`);
    } else if (selected.status === 'Recruiting') {
      content.push(`Waiting for players... (${selected.players} joined)`);
    }
    
    content.push(`Difficulty: ${selected.difficulty} | Turn cycle: ${selected.turnLength}`);
    
    // Controls
    content.push('');
    content.push(`${this.ux.colors.color('[↑↓]', 'highlight')} Navigate  ${this.ux.colors.color('[Enter]', 'highlight')} Join Universe  ${this.ux.colors.color('[C]', 'highlight')} Create New  ${this.ux.colors.color('[R]', 'highlight')} Refresh  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
    content.push('');
    content.push('Select universe:');
    
    return content;
  }

  getStatusColorSemantic(status) {
    switch(status) {
      case 'Active': return 'success';
      case 'Recruiting': return 'warning';
      case 'Full': return 'error';
      default: return 'muted';
    }
  }

  getDifficultyColorSemantic(difficulty) {
    switch(difficulty) {
      case 'Beginner': return 'info';
      case 'Standard': return 'highlight';
      case 'Expert': return 'error';
      default: return 'muted';
    }
  }

  handleInput(key) {
    switch(key) {
      case '\x1B[A': // Up arrow
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        return 'refresh';
      case '\x1B[B': // Down arrow
        this.selectedIndex = Math.min(this.universes.length - 1, this.selectedIndex + 1);
        return 'refresh';
      case '\r':
      case '\n':
        return `join:${this.universes[this.selectedIndex].id}`;
      case 'c':
      case 'C':
        return 'create-universe';
      case 'r':
      case 'R':
        return 'refresh';
      case '\x1B':
        return 'back';
      default:
        return null;
    }
  }
}

export default UniverseSelection;