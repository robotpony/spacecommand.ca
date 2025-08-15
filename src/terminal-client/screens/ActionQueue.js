const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class ActionQueue {
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
    
    // Calculate responsive layout
    const layoutCalc = new LayoutCalculator(viewport);
    const layout = layoutCalc.calculateActionQueueLayout();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create status bar
    const statusBar = this.ux.statusBar({
      width: viewport.width,
      title: 'ACTION QUEUE',
      subtitle: `Turn ${this.gameState.turn} | ${this.gameState.timeLeft} left`,
      leftStatus: `Pending Actions for Turn ${this.gameState.nextTurn}`,
      rightStatus: `Credits: ₡${this.gameState.credits.toLocaleString()}  AP: ${this.gameState.actionPoints.current}/${this.gameState.actionPoints.max}`
    });
    
    // Build content array with responsive considerations
    const content = [];
    
    if (!layout.compactMode) {
      content.push('');
    }
    
    // Build action list content
    content.push('#  ACTION                                    COST    STATUS    PRIORITY');
    content.push('═'.repeat(75));
    
    const totalCost = this.actions.reduce((sum, action) => sum + action.cost, 0);
    
    this.actions.forEach((action, index) => {
      const isSelected = index === this.selectedAction;
      const statusColor = action.status === 'Active' ? 'success' : 'warning';
      const priorityColor = action.priority === 'HIGH' ? 'error' : action.priority === 'LOW' ? 'muted' : 'info';
      
      let line = String(action.id).padEnd(3) +
        action.description.padEnd(40) +
        `${action.cost} AP`.padEnd(8) +
        this.ux.colors.color(action.status.padEnd(10), statusColor) +
        this.ux.colors.color(action.priority, priorityColor);
      
      if (isSelected) {
        line = this.ux.colors.color(line, 'highlight');
      }
      
      content.push(line);
    });
    
    content.push('');
    const apRemaining = this.gameState.actionPoints.max - totalCost;
    content.push('                                      Total: ' + 
               this.ux.colors.color(`${totalCost} AP`, 'highlight') + 
               ` (${apRemaining} AP remaining)`);
    
    if (!layout.compactMode) {
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
    } else {
      content.push('');
      content.push(`Next turn: ${this.gameState.timeLeft}`);
      content.push('');
      content.push(`${this.ux.colors.color('[1-5]', 'highlight')} Cancel  ${this.ux.colors.color('[P]', 'highlight')} Priority  ${this.ux.colors.color('[A]', 'highlight')} Add  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
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

module.exports = ActionQueue;