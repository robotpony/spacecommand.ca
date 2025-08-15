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

  // Calculate layout for trade center screen with multi-column content
  calculateTradeCenterLayout() {
    const { width, height } = this.viewport;
    
    const statusBarHeight = 3;
    const commandPromptHeight = 2;
    const availableHeight = height - statusBarHeight - commandPromptHeight;
    const contentHeight = availableHeight - 4; // Account for window borders and padding
    
    // Calculate responsive column widths
    const minTotalWidth = 80;
    const preferredWidth = Math.min(width - 4, 120);
    const actualWidth = Math.max(minTotalWidth, preferredWidth);
    
    return {
      statusBar: { x: 0, y: 0, width, height: statusBarHeight },
      mainWindow: { 
        x: Math.floor((width - actualWidth) / 2), 
        y: statusBarHeight, 
        width: actualWidth, 
        height: availableHeight,
        contentHeight,
        padding: 2
      },
      commandPrompt: { x: 0, y: height - commandPromptHeight, width, height: commandPromptHeight },
      availableContentLines: contentHeight,
      compactMode: width < 100 || height < 30
    };
  }

  // Calculate layout for market overview screen
  calculateMarketOverviewLayout() {
    const { width, height } = this.viewport;
    
    const statusBarHeight = 3;
    const commandPromptHeight = 2;
    const availableHeight = height - statusBarHeight - commandPromptHeight;
    
    // Table needs space for headers + commodity rows + analysis section
    const minRequiredHeight = 15; // Minimum for basic functionality
    const preferredHeight = 25;
    const actualHeight = Math.min(availableHeight, Math.max(minRequiredHeight, preferredHeight));
    
    return {
      statusBar: { x: 0, y: 0, width, height: statusBarHeight },
      mainWindow: { 
        x: 2, 
        y: statusBarHeight, 
        width: width - 4, 
        height: actualHeight,
        contentHeight: actualHeight - 4,
        padding: 2
      },
      commandPrompt: { x: 0, y: height - commandPromptHeight, width, height: commandPromptHeight },
      availableContentLines: actualHeight - 4,
      compactMode: width < 90 || height < 25,
      showAnalysis: height >= 30
    };
  }

  // Calculate layout for fleet overview screen
  calculateFleetOverviewLayout() {
    const { width, height } = this.viewport;
    
    const statusBarHeight = 3;
    const commandPromptHeight = 2;
    const availableHeight = height - statusBarHeight - commandPromptHeight;
    
    return {
      statusBar: { x: 0, y: 0, width, height: statusBarHeight },
      mainWindow: { 
        x: 2, 
        y: statusBarHeight, 
        width: width - 4, 
        height: availableHeight,
        contentHeight: availableHeight - 4,
        padding: 2
      },
      commandPrompt: { x: 0, y: height - commandPromptHeight, width, height: commandPromptHeight },
      availableContentLines: availableHeight - 4,
      compactMode: height < 25,
      showSummary: height >= 30
    };
  }

  // Calculate layout for galaxy map screen
  calculateGalaxyMapLayout() {
    const { width, height } = this.viewport;
    
    const statusBarHeight = 3;
    const commandPromptHeight = 2;
    const availableHeight = height - statusBarHeight - commandPromptHeight;
    
    // Galaxy map needs significant space
    const mapWidth = Math.max(60, Math.min(width - 20, 100));
    const legendWidth = Math.min(25, width - mapWidth - 6);
    
    return {
      statusBar: { x: 0, y: 0, width, height: statusBarHeight },
      mapWindow: { 
        x: 2, 
        y: statusBarHeight, 
        width: mapWidth, 
        height: availableHeight - 4,
        contentHeight: availableHeight - 8,
        padding: 2
      },
      legendWindow: {
        x: mapWidth + 4,
        y: statusBarHeight,
        width: legendWidth,
        height: Math.min(15, availableHeight - 4),
        contentHeight: Math.min(11, availableHeight - 8),
        padding: 2
      },
      commandPrompt: { x: 0, y: height - commandPromptHeight, width, height: commandPromptHeight },
      availableContentLines: availableHeight - 8,
      compactMode: width < 90,
      showLegend: width >= 90
    };
  }

  // Calculate layout for action queue screen
  calculateActionQueueLayout() {
    const { width, height } = this.viewport;
    
    const statusBarHeight = 3;
    const commandPromptHeight = 2;
    const availableHeight = height - statusBarHeight - commandPromptHeight;
    
    return {
      statusBar: { x: 0, y: 0, width, height: statusBarHeight },
      mainWindow: { 
        x: 2, 
        y: statusBarHeight, 
        width: width - 4, 
        height: availableHeight,
        contentHeight: availableHeight - 4,
        padding: 2
      },
      commandPrompt: { x: 0, y: height - commandPromptHeight, width, height: commandPromptHeight },
      availableContentLines: availableHeight - 4,
      compactMode: height < 25
    };
  }
}

module.exports = LayoutCalculator;