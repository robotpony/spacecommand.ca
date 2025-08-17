const UIComponent = require('./UIComponent');
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');

class StatusBar extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.height = 3; // Header line, status line, separator
    this.title = options.title || 'SPACECOMMAND';
    this.subtitle = options.subtitle || '';
    this.leftStatus = options.leftStatus || '';
    this.rightStatus = options.rightStatus || '';
    this.borderColor = options.borderColor || 'border';
    this.titleColor = options.titleColor || 'title';
    this.statusColor = options.statusColor || 'info';
  }

  render() {
    this.buffer = [];
    
    // Top border with title and subtitle
    this.renderHeader();
    
    // Status line
    this.renderStatusLine();
    
    // Bottom separator
    this.renderSeparator();
    
    return this.buffer;
  }

  renderHeader() {
    const chars = ascii.BOX_DRAWING.single;
    
    // Calculate positions
    const leftPart = `─[ ${this.title} ]─`;
    const rightPart = this.subtitle ? `─[ ${this.subtitle} ]─┐` : '─┐';
    const middleLength = this.width - leftPart.length - rightPart.length;
    const middlePart = '─'.repeat(Math.max(0, middleLength));
    
    // Build the line
    let line = '';
    line += colors.color('┌', this.borderColor);
    line += colors.color(leftPart.substring(1), this.titleColor);
    line += colors.color(middlePart, this.borderColor);
    line += colors.color(rightPart, this.titleColor);
    
    this.buffer.push(line);
  }

  renderStatusLine() {
    const chars = ascii.BOX_DRAWING.single;
    
    // Calculate interior width (excluding borders)
    const interiorWidth = this.width - 2;
    
    // Calculate left status positioning
    const leftText = this.leftStatus;
    const rightText = this.rightStatus;
    const leftLen = colors.length(leftText);
    const rightLen = colors.length(rightText);
    const spacesNeeded = interiorWidth - leftLen - rightLen;
    
    // Build the line
    let line = '';
    line += colors.color('│', this.borderColor);
    line += ` ${colors.color(leftText, this.statusColor)}`;
    line += ' '.repeat(Math.max(0, spacesNeeded - 1));
    line += colors.color(rightText, this.statusColor);
    line += colors.color('│', this.borderColor);
    
    this.buffer.push(line);
  }

  renderSeparator() {
    const chars = ascii.BOX_DRAWING.single;
    
    let line = '';
    line += colors.color('├', this.borderColor);
    line += colors.color('─'.repeat(this.width - 2), this.borderColor);
    line += colors.color('┤', this.borderColor);
    
    this.buffer.push(line);
  }

  setTitle(title, subtitle = null) {
    this.title = title;
    if (subtitle !== null) {
      this.subtitle = subtitle;
    }
    this.emit('title-changed', { title, subtitle });
  }

  setStatus(left, right) {
    this.leftStatus = left;
    this.rightStatus = right;
    this.emit('status-changed', { left, right });
  }

  setLeftStatus(text) {
    this.leftStatus = text;
    this.emit('left-status-changed', text);
  }

  setRightStatus(text) {
    this.rightStatus = text;
    this.emit('right-status-changed', text);
  }
}

module.exports = StatusBar;