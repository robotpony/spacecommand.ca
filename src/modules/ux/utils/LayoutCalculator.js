class LayoutCalculator {
  constructor(viewport) {
    this.viewport = viewport;
    this.minHeight = 24;
    this.maxHeight = 48;
    this.minWidth = 80;
  }

  // Calculate layout zones for different screen types
  calculateMainMenuLayout() {
    const { width, height } = this.viewport;
    
    // Reserve space for essential elements
    const statusBarHeight = 3; // Header, status line, separator
    const commandPromptHeight = 1; // Bottom command line
    const windowBorderHeight = 2; // Top and bottom borders of main window
    const padding = 2; // Internal padding
    
    // Available content height
    const availableHeight = height - statusBarHeight - commandPromptHeight;
    const contentHeight = availableHeight - windowBorderHeight - (padding * 2);
    
    // Menu calculations
    const coreMenuItems = 6; // Primary menu options
    const secondaryItems = 2; // Secondary action lines
    const statsBoxHeight = 5; // Quick stats box
    const minSpacing = 2; // Minimum spacing lines
    
    const requiredHeight = coreMenuItems + secondaryItems + statsBoxHeight + minSpacing;
    
    // Adapt layout based on available space
    let layout = {
      statusBar: { x: 0, y: 0, width, height: statusBarHeight },
      mainWindow: { 
        x: 0, 
        y: statusBarHeight, 
        width, 
        height: availableHeight,
        contentHeight,
        padding
      },
      commandPrompt: { x: 0, y: height - 1, width, height: 1 },
      showStats: contentHeight >= requiredHeight,
      compactMode: contentHeight < requiredHeight + 3,
      availableContentLines: contentHeight
    };
    
    return layout;
  }

  calculateTitleScreenLayout() {
    const { width, height } = this.viewport;
    
    // Title screen should fit within rendered area (WindowManager reserves bottom line)
    const windowHeight = height - 1;
    return {
      titleWindow: { x: 0, y: 0, width, height: windowHeight },
      availableContentLines: windowHeight - 4 // Account for window borders and padding
    };
  }

  // Adaptive content sizing
  adaptMenuContent(content, availableLines) {
    if (availableLines >= content.length) {
      return content; // Fits perfectly
    }
    
    // Content is too long, need to adapt
    const adapted = [...content];
    
    // Remove optional spacing first
    while (adapted.length > availableLines && adapted.includes('')) {
      const emptyIndex = adapted.indexOf('');
      adapted.splice(emptyIndex, 1);
    }
    
    // If still too long, truncate from bottom
    if (adapted.length > availableLines) {
      adapted.splice(availableLines);
    }
    
    return adapted;
  }

  // Calculate pagination for long content
  calculatePagination(content, availableLines) {
    if (content.length <= availableLines) {
      return { pages: [content], currentPage: 0, totalPages: 1 };
    }
    
    const pages = [];
    for (let i = 0; i < content.length; i += availableLines) {
      pages.push(content.slice(i, i + availableLines));
    }
    
    return { pages, currentPage: 0, totalPages: pages.length };
  }

  // Get responsive window sizing
  getResponsiveWindow(baseHeight, minHeight = 10) {
    const maxAvailable = this.viewport.height - 6; // Leave room for status and command
    return {
      height: Math.min(Math.max(minHeight, baseHeight), maxAvailable),
      needsScrolling: baseHeight > maxAvailable
    };
  }
}

module.exports = LayoutCalculator;