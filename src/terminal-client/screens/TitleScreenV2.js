const { createUX } = require('../../modules/ux');
const LayoutCalculator = require('../../modules/ux/utils/LayoutCalculator');

class TitleScreenV2 {
  constructor(ux) {
    this.ux = ux || createUX({ theme: 'retro' });
  }

  render() {
    // Update viewport to current terminal size
    const viewport = this.ux.updateViewport();
    
    // Calculate responsive layout
    const layoutCalc = new LayoutCalculator(viewport);
    const layout = layoutCalc.calculateTitleScreenLayout();
    
    // Clear existing windows
    this.ux.clear();
    
    // Create the ASCII logo content
    const logoLines = [
      '        ███████╗██████╗  █████╗  ██████╗███████╗',
      '        ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝',
      '        ███████╗██████╔╝███████║██║     █████╗',
      '        ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝',
      '        ███████║██║     ██║  ██║╚██████╗███████╗',
      '        ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝',
      '',
      '     ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗',
      '    ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗',
      '    ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║',
      '    ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║',
      '    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝',
      '     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝'
    ];
    
    let logoContent = [];
    
    // Add spacing based on available height
    const logoHeight = logoLines.length;
    const additionalContent = 8; // subtitle, version, prompt, spacing
    const totalRequired = logoHeight + additionalContent;
    
    if (layout.availableContentLines >= totalRequired + 4) {
      // Plenty of space - add extra spacing
      logoContent.push('');
      logoContent.push('');
    } else if (layout.availableContentLines >= totalRequired + 2) {
      // Some space - minimal spacing
      logoContent.push('');
    }
    
    // Add logo (colored)
    logoLines.forEach(line => {
      logoContent.push(this.ux.colors.color(line, 'primary'));
    });
    
    // Add spacing and content based on available space
    if (layout.availableContentLines >= totalRequired) {
      logoContent.push('');
      logoContent.push('');
      logoContent.push(this.ux.colors.color('                    A Golden Age Space Trading Adventure', 'secondary'));
      logoContent.push('');
      logoContent.push('');
      logoContent.push(this.ux.colors.color('                              Version 0.1.0-alpha', 'muted'));
      logoContent.push('');
      logoContent.push('');
    } else {
      // Compact mode for small terminals
      logoContent.push('');
      logoContent.push(this.ux.colors.color('           A Golden Age Space Trading Adventure', 'secondary'));
      logoContent.push('');
    }
    
    logoContent.push(this.ux.colors.color('                         [ Press ENTER to Continue ]', 'highlight'));
    
    // Ensure content fits
    const adaptedContent = layoutCalc.adaptMenuContent(logoContent, layout.availableContentLines);

    // Create main title window
    const titleWindow = this.ux.window({
      width: layout.titleWindow.width,
      height: layout.titleWindow.height,
      x: layout.titleWindow.x,
      y: layout.titleWindow.y,
      border: 'single',
      padding: 1,
      content: adaptedContent,
      borderColor: 'border',
      titleColor: 'title'
    });

    // Add window to manager
    this.ux.windowManager.windows.set('title', {
      window: titleWindow,
      zIndex: 0,
      visible: true,
      modal: false
    });

    // Render the complete screen
    return this.ux.render();
  }

  handleInput(key) {
    if (key === '\r' || key === '\n') {
      return 'main-menu';
    }
    return null;
  }
}

module.exports = TitleScreenV2;