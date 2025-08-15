const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class DailyNewspaper {
  constructor(ux, gameState = {}) {
    this.ux = ux || createUX({ theme: 'retro' });
    this.gameState = {
      turn: 47,
      timeLeft: '2h 15m',
      stardate: '2387.47',
      playerRank: 3,
      playerCredits: 45750,
      ...gameState
    };
    
    this.articles = [
      {
        headline: 'ORE SHORTAGE GRIPS OUTER COLONIES',
        content: [
          'Proxima mining operations disrupted by equipment failures. Traders',
          'scrambling to secure ore supplies as prices surge past ₡450/ton.'
        ]
      },
      {
        headline: 'DIPLOMATIC NEWS',
        content: ['Centauri-Orion trade talks stall over tariff disputes']
      }
    ];
    
    this.marketWatch = [
      '• Ore up 15% at Sol',
      '• Food surplus at Centauri',
      '• Weapons demand spike at Orion'
    ];
    
    this.topTraders = [
      { rank: 1, name: 'Admiral Zhao', credits: 2500000 },
      { rank: 2, name: 'Captain Torres', credits: 1800000 },
      { rank: 3, name: 'You', credits: this.gameState.playerCredits }
    ];
    
    this.currentPage = 0;
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Calculate responsive layout
    const layoutCalc = new LayoutCalculator(viewport);
    const layout = layoutCalc.calculateMainMenuLayout();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create status bar
    const statusBar = this.ux.statusBar({
      width: viewport.width,
      title: 'GALACTIC DAILY NEWS',
      subtitle: `Turn ${this.gameState.turn} | ${this.gameState.timeLeft} left`,
      leftStatus: `Stardate ${this.gameState.stardate}`,
      rightStatus: ''
    });
    
    // Build content array with responsive considerations
    const content = [];
    
    // Newspaper masthead
    if (!layout.compactMode) {
      content.push('');
      content.push('╔═══════════════════════════════════════════════════════════════════╗');
      content.push('║' + this.ux.colors.color('            THE GALACTIC HERALD - YOUR SOURCE FOR NEWS             ', 'success', { bright: true }) + '║');
      content.push('╚═══════════════════════════════════════════════════════════════════╝');
      content.push('');
    } else {
      content.push('');
      content.push(this.ux.colors.color('THE GALACTIC HERALD', 'success', { bright: true }));
      content.push('');
    }
    
    // Main article
    const mainArticle = this.articles[0];
    content.push(this.ux.colors.color('BREAKING: ' + mainArticle.headline, 'highlight', { bright: true }));
    content.push('─'.repeat(Math.min(mainArticle.headline.length + 10, 70)));
    
    mainArticle.content.forEach(line => {
      content.push(line);
    });
    
    if (!layout.compactMode) {
      content.push('');
      
      // Market watch section
      content.push('MARKET WATCH          TOP TRADERS');
      content.push('─'.repeat(13) + '          ' + '─'.repeat(11));
      
      const maxRows = Math.max(this.marketWatch.length, this.topTraders.length);
      for (let i = 0; i < maxRows; i++) {
        const marketItem = this.marketWatch[i] || '';
        const trader = this.topTraders[i];
        
        let traderStr = '';
        if (trader) {
          const credits = trader.credits < 100000 ? 
            `₡${trader.credits.toLocaleString()}` : 
            `₡${(trader.credits / 1000000).toFixed(1)}M`;
          
          traderStr = `${trader.rank}. ${trader.name.padEnd(12)}${credits}`;
          
          if (trader.name === 'You') {
            traderStr = this.ux.colors.color(traderStr, 'success', { bright: true });
          }
        }
        
        const line = marketItem.padEnd(22) + traderStr;
        content.push(line);
      }
      
      // Secondary article
      if (this.articles[1]) {
        content.push('');
        const article = this.articles[1];
        content.push(this.ux.colors.color(article.headline + ':', 'info') + ' ' + article.content[0]);
      }
      
      // Advertisement
      content.push('');
      content.push(this.ux.colors.color('┌─────────────────────────────────────────────────────────────────┐', 'muted'));
      content.push(this.ux.colors.color('│ ADVERTISEMENT: Visit Orion Prime - Best weapons in the galaxy! │', 'muted'));
      content.push(this.ux.colors.color('└─────────────────────────────────────────────────────────────────┘', 'muted'));
    } else {
      // Compact mode - just show essentials
      content.push('');
      content.push('Top Trader: ' + this.ux.colors.color('You (#3)', 'success', { bright: true }));
    }
    
    // Controls
    if (!layout.compactMode) {
      content.push('');
      content.push(`${this.ux.colors.color('[P]', 'highlight')} Previous  ${this.ux.colors.color('[N]', 'highlight')} Next  ${this.ux.colors.color('[M]', 'highlight')} Market Details  ${this.ux.colors.color('[S]', 'highlight')} Submit Story  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
      content.push('');
      content.push('Command:');
    } else {
      content.push('');
      content.push(`${this.ux.colors.color('[P]', 'highlight')} Prev  ${this.ux.colors.color('[N]', 'highlight')} Next  ${this.ux.colors.color('[M]', 'highlight')} Market  ${this.ux.colors.color('[S]', 'highlight')} Submit  ${this.ux.colors.color('[ESC]', 'highlight')} Back`);
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
    
    switch(upper) {
      case 'P': 
        this.currentPage = Math.max(0, this.currentPage - 1);
        return 'refresh';
      case 'N': 
        this.currentPage++;
        return 'refresh';
      case 'M': return 'market-details';
      case 'S': return 'submit-story';
      case '\x1B': // ESC
        return 'main-menu';
      default: return null;
    }
  }
}

module.exports = DailyNewspaper;