import { createUX } from '../../modules/ux';

export class ActionQueue {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      player: 'Captain Reynolds',
      credits: 45750,
      turn: 47,
      nextTurn: 48,
      timeLeft: '2h 15m',
      actionPoints: { current: 12, max: 20 },
      ...gameState
    };
    
    this.actions = [
      {
        id: 1,
        description: 'Buy 200 Ore @ Proxima',
        cost: 5,
        status: 'Pending',
        priority: 'HIGH',
        statusColor: 'warning',
        priorityColor: 'error'
      },
      {
        id: 2,
        description: 'Sell 50 Food @ Centauri',
        cost: 2,
        status: 'Pending',
        priority: 'NORMAL',
        statusColor: 'warning',
        priorityColor: 'muted'
      },
      {
        id: 3,
        description: 'Move SS Comet to Proxima',
        cost: 3,
        status: 'Active',
        priority: 'HIGH',
        statusColor: 'success',
        priorityColor: 'error'
      },
      {
        id: 4,
        description: 'Research: Improved Engines (Turn 2/5)',
        cost: 2,
        status: 'Active',
        priority: 'NORMAL',
        statusColor: 'success',
        priorityColor: 'muted'
      },
      {
        id: 5,
        description: 'Diplomatic: Send envoy to Orion',
        cost: 1,
        status: 'Pending',
        priority: 'LOW',
        statusColor: 'warning',
        priorityColor: 'muted'
      }
    ];
    
    this.selectedAction = 0;
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Clear existing windows
    this.ux.clear();
    
    // Update gameState with action queue specific location info
    const gameStateWithQueue = {
      ...this.gameState,
      location: `Pending Actions for Turn ${this.gameState.nextTurn}`
    };
    
    // Create the standardized game screen
    const gameScreen = this.ux.standardGameScreen({
      width: viewport.width,
      height: viewport.height,
      x: 0,
      y: 0,
      screenTitle: 'ACTION QUEUE',
      gameState: gameStateWithQueue,
      content: this.buildActionContent()
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

  buildActionContent() {
    const content = [];
    
    // Add spacing for better layout
    content.push('');
    
    // Create table for actions
    const actionTable = this.ux.table({
      headers: ['#', 'ACTION', 'COST', 'STATUS', 'PRIORITY'],
      columnWidths: [4, 42, 8, 10, 10],
      columnAligns: ['left', 'left', 'left', 'left', 'left'],
      compact: true,
      headerSeparator: true,
      rows: this.actions.map((action, index) => {
        const isSelected = index === this.selectedAction;
        return [
          String(action.id),
          action.description,
          `${action.cost} AP`,
          { text: action.status, color: action.status === 'Active' ? 'success' : 'warning' },
          { text: action.priority, color: action.priority === 'HIGH' ? 'error' : action.priority === 'LOW' ? 'muted' : 'info' }
        ];
      })
    });
    
    // Add table to content
    const tableLines = actionTable.render();
    tableLines.forEach(line => content.push(line));
    
    const totalCost = this.actions.reduce((sum, action) => sum + action.cost, 0);
    const apRemaining = this.gameState.actionPoints.max - totalCost;
    
    content.push('');
    content.push('                                      Total: ' + 
               this.ux.colors.color(`${totalCost} AP`, 'highlight') + 
               ` (${apRemaining} AP remaining)`);
    
    content.push('');
    content.push('Turn Processing Info:');
    content.push('─'.repeat(21));
    content.push(`Next turn processes in: ${this.gameState.timeLeft}`);
    content.push('All PENDING actions will execute automatically');
    content.push('Actions process in PRIORITY order');
    content.push('');
    content.push(`${this.ux.colors.color('[1-5]', 'highlight')} Cancel Action  ${this.ux.colors.color('[P]', 'highlight')} Change Priority  ${this.ux.colors.color('[A]', 'highlight')} Add New  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
    content.push('');
    content.push('Command:');
    
    return content;
  }


  handleInput(key) {
    const upper = key.toUpperCase();
    
    // Cancel action by number
    if (/^[1-5]$/.test(key)) {
      const actionId = parseInt(key);
      if (actionId <= this.actions.length) {
        return `cancel:${actionId}`;
      }
    }
    
    switch(upper) {
      case 'P': return 'change-priority';
      case 'A': return 'add-action';
      case '\x1B': // ESC
        return 'main-menu';
      default: return null;
    }
  }
}

export default ActionQueue;