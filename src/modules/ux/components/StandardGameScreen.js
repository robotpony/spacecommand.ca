const UIComponent = require('./UIComponent');
const { Window } = require('./Window');
const StatusBar = require('./StatusBar');
const colors = require('../utils/colors');

/**
 * StandardGameScreen - Enforces consistent styling across all game screens
 * 
 * This component ensures all game screens have:
 * - Consistent root window border styling
 * - Standard header format with screen title and turn info
 * - Integrated status bar with player info and resources
 * - Proper content area sizing and positioning
 */
class StandardGameScreen extends UIComponent {
  constructor(options = {}) {
    super(options);
    
    // Screen configuration
    this.screenTitle = options.screenTitle || 'GAME SCREEN';
    this.gameState = options.gameState || {};
    
    // Root window configuration - standardized across all screens
    this.rootWindowBorder = 'single';
    this.rootWindowColor = 'border';
    this.headerColor = 'title';
    this.statusColor = 'info';
    
    // Content configuration
    this.content = options.content || null;
    this.contentPadding = options.contentPadding || 1;
    
    // Calculate content area (accounting for root window + status header)
    this.updateContentArea();
  }

  updateContentArea() {
    // Content area starts after: root border (1) + header (1) + status (1) + separator (1) = 4 lines
    const headerHeight = 4;
    const footerHeight = 1; // Bottom border
    
    this.contentArea = {
      x: this.contentPadding + 1, // Root border + content padding
      y: headerHeight,
      width: this.width - (this.contentPadding * 2) - 2, // Account for left/right borders
      height: this.height - headerHeight - footerHeight - (this.contentPadding * 2)
    };
  }

  render() {
    this.buffer = [];
    this.updateContentArea();
    
    // Render the complete standardized game screen
    this.renderRootWindow();
    this.renderHeader();
    this.renderStatusBar();
    this.renderSeparator();
    this.renderContent();
    
    return this.buffer;
  }

  renderRootWindow() {
    // Clear buffer for full screen
    for (let y = 0; y < this.height; y++) {
      this.buffer[y] = ' '.repeat(this.width);
    }
    
    const chars = require('../utils/ascii').BOX_DRAWING[this.rootWindowBorder];
    
    // Top border
    let topLine = chars.topLeft;
    for (let x = 1; x < this.width - 1; x++) {
      topLine += chars.horizontal;
    }
    topLine += chars.topRight;
    this.buffer[0] = colors.color(topLine, this.rootWindowColor);
    
    // Side borders and interior
    for (let y = 1; y < this.height - 1; y++) {
      let line = colors.color(chars.vertical, this.rootWindowColor);
      line += ' '.repeat(this.width - 2);
      line += colors.color(chars.vertical, this.rootWindowColor);
      this.buffer[y] = line;
    }
    
    // Bottom border
    let bottomLine = chars.bottomLeft;
    for (let x = 1; x < this.width - 1; x++) {
      bottomLine += chars.horizontal;
    }
    bottomLine += chars.bottomRight;
    this.buffer[this.height - 1] = colors.color(bottomLine, this.rootWindowColor);
  }

  renderHeader() {
    if (this.height < 4) return;
    
    // Format: ┌─[ SCREEN TITLE ]─────────────[ Turn 47 | 2h 15m left ]─┐
    const leftTitle = `─[ ${this.screenTitle} ]─`;
    const rightTitle = `─[ Turn ${this.gameState.turn || '??'} | ${this.gameState.timeLeft || '??'} left ]─`;
    
    const totalTitleLength = leftTitle.length + rightTitle.length;
    const availableSpace = this.width - 2; // Account for borders
    const fillLength = Math.max(0, availableSpace - totalTitleLength);
    
    const headerContent = leftTitle + '─'.repeat(fillLength) + rightTitle;
    
    // Build the complete header line
    let headerLine = colors.color('┌', this.rootWindowColor);
    headerLine += colors.color(headerContent.substring(0, this.width - 2), this.headerColor);
    headerLine += colors.color('┐', this.rootWindowColor);
    
    this.buffer[0] = headerLine;
  }

  renderStatusBar() {
    if (this.height < 3) return;
    
    // Player info on left, credits/AP on right
    const leftStatus = `${this.gameState.player || 'Unknown'} @ ${this.gameState.location || 'Unknown'}`;
    const rightStatus = `Credits: ₡${(this.gameState.credits || 0).toLocaleString()}  AP: ${this.gameState.actionPoints?.current || 0}/${this.gameState.actionPoints?.max || 0}`;
    
    const availableWidth = this.width - 4; // Account for borders and padding
    const leftPart = leftStatus.substring(0, Math.max(0, availableWidth - rightStatus.length - 2));
    const rightPart = rightStatus;
    
    // Calculate spacing
    const usedSpace = leftPart.length + rightPart.length;
    const spacing = Math.max(1, availableWidth - usedSpace);
    
    const statusContent = leftPart + ' '.repeat(spacing) + rightPart;
    
    let statusLine = colors.color('│', this.rootWindowColor);
    statusLine += ' ';
    statusLine += colors.color(statusContent.substring(0, this.width - 4), this.statusColor);
    statusLine += ' ';
    statusLine += colors.color('│', this.rootWindowColor);
    
    this.buffer[1] = statusLine;
  }

  renderSeparator() {
    if (this.height < 4) return;
    
    let separatorLine = colors.color('├', this.rootWindowColor);
    separatorLine += colors.color('─'.repeat(this.width - 2), this.rootWindowColor);
    separatorLine += colors.color('┤', this.rootWindowColor);
    
    this.buffer[2] = separatorLine;
  }

  renderContent() {
    if (!this.content || this.contentArea.height <= 0) return;
    
    let contentLines;
    
    if (typeof this.content === 'string') {
      contentLines = this.content.split('\n');
    } else if (Array.isArray(this.content)) {
      contentLines = this.content;
    } else if (this.content.render && typeof this.content.render === 'function') {
      // Set size for renderable content
      this.content.setSize(this.contentArea.width, this.contentArea.height);
      contentLines = this.content.render();
    } else {
      contentLines = [this.content.toString()];
    }
    
    // Render content lines into the content area
    const startY = this.contentArea.y;
    const maxLines = Math.min(contentLines.length, this.contentArea.height);
    
    for (let i = 0; i < maxLines; i++) {
      const lineY = startY + i;
      if (lineY >= this.buffer.length) break;
      
      let contentLine = contentLines[i] || '';
      
      // Truncate if too long
      if (colors.length(contentLine) > this.contentArea.width) {
        const { truncate } = require('../utils/formatting');
        contentLine = truncate(contentLine, this.contentArea.width);
      }
      
      // Build the complete line with borders
      const chars = require('../utils/ascii').BOX_DRAWING[this.rootWindowBorder];
      let line = colors.color(chars.vertical, this.rootWindowColor);
      
      // Add left padding
      line += ' '.repeat(this.contentPadding);
      
      // Add content
      line += contentLine;
      
      // Fill remaining space
      const contentLength = colors.length(contentLine);
      const remainingSpace = this.width - 2 - this.contentPadding - contentLength - this.contentPadding;
      line += ' '.repeat(Math.max(0, remainingSpace));
      
      // Add right padding and border
      line += ' '.repeat(this.contentPadding);
      line += colors.color(chars.vertical, this.rootWindowColor);
      
      this.buffer[lineY] = line;
    }
  }

  setContent(content) {
    this.content = content;
    this.emit('content-changed', content);
  }

  setGameState(gameState) {
    this.gameState = { ...this.gameState, ...gameState };
    this.emit('gamestate-changed', this.gameState);
  }

  setScreenTitle(title) {
    this.screenTitle = title;
    this.emit('title-changed', title);
  }

  getContentArea() {
    return { ...this.contentArea };
  }
}

module.exports = StandardGameScreen;