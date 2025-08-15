const colors = require('../utils/colors');
const formatting = require('../utils/formatting');

class Renderer {
  constructor() {
    this.viewport = {
      width: 80,
      height: 24
    };
    this.cursor = { x: 0, y: 0 };
    this.buffer = [];
    this.clearBuffer();
  }

  setViewport(width, height) {
    this.viewport = { width, height };
    this.clearBuffer();
  }

  clearBuffer() {
    this.buffer = [];
    for (let i = 0; i < this.viewport.height; i++) {
      this.buffer.push(' '.repeat(this.viewport.width));
    }
  }

  moveTo(x, y) {
    this.cursor = { 
      x: Math.max(0, Math.min(x, this.viewport.width - 1)),
      y: Math.max(0, Math.min(y, this.viewport.height - 1))
    };
  }

  writeText(text, style = {}) {
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const currentY = this.cursor.y + lineIndex;
      if (currentY >= this.viewport.height) return;
      
      let styledLine = line;
      
      if (style.color) {
        styledLine = colors.color(styledLine, style.color);
      }
      
      if (style.background) {
        // Background color implementation would go here
      }
      
      if (style.bold) {
        styledLine = colors.color(styledLine, 'bright');
      }
      
      const currentX = lineIndex === 0 ? this.cursor.x : 0;
      const maxLength = this.viewport.width - currentX;
      
      if (colors.length(styledLine) > maxLength) {
        styledLine = formatting.truncate(styledLine, maxLength);
      }
      
      const existingLine = this.buffer[currentY];
      const beforeText = existingLine.substring(0, currentX);
      const afterText = existingLine.substring(currentX + colors.length(styledLine));
      
      this.buffer[currentY] = beforeText + styledLine + afterText;
    });
    
    this.cursor.x += colors.length(lines[lines.length - 1]);
  }

  drawBox(x, y, width, height, style = {}) {
    const borderStyle = style.border || 'single';
    const borderColor = style.borderColor || 'border';
    const fillChar = style.fill || ' ';
    const fillColor = style.fillColor;
    
    const chars = require('../utils/ascii').BOX_DRAWING[borderStyle];
    
    for (let row = 0; row < height; row++) {
      const currentY = y + row;
      if (currentY < 0 || currentY >= this.viewport.height) continue;
      
      let line = '';
      
      for (let col = 0; col < width; col++) {
        const currentX = x + col;
        if (currentX < 0 || currentX >= this.viewport.width) continue;
        
        let char = fillChar;
        
        if (row === 0) {
          if (col === 0) {
            char = chars.topLeft;
          } else if (col === width - 1) {
            char = chars.topRight;
          } else {
            char = chars.horizontal;
          }
        } else if (row === height - 1) {
          if (col === 0) {
            char = chars.bottomLeft;
          } else if (col === width - 1) {
            char = chars.bottomRight;
          } else {
            char = chars.horizontal;
          }
        } else {
          if (col === 0 || col === width - 1) {
            char = chars.vertical;
          }
        }
        
        if (char === chars.vertical || char === chars.horizontal || 
            char === chars.topLeft || char === chars.topRight ||
            char === chars.bottomLeft || char === chars.bottomRight) {
          line += colors.color(char, borderColor);
        } else if (fillColor) {
          line += colors.color(char, fillColor);
        } else {
          line += char;
        }
      }
      
      const existingLine = this.buffer[currentY];
      const beforeBox = existingLine.substring(0, x);
      const afterBox = existingLine.substring(x + width);
      
      this.buffer[currentY] = beforeBox + line + afterBox;
    }
  }

  drawLine(x1, y1, x2, y2, style = {}) {
    const char = style.char || '-';
    const color = style.color || 'border';
    
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while (true) {
      this.drawPoint(x, y, char, color);
      
      if (x === x2 && y === y2) break;
      
      const e2 = 2 * err;
      
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  drawPoint(x, y, char = '█', color = 'primary') {
    if (x < 0 || x >= this.viewport.width || y < 0 || y >= this.viewport.height) {
      return;
    }
    
    const styledChar = colors.color(char, color);
    const existingLine = this.buffer[y];
    const beforePoint = existingLine.substring(0, x);
    const afterPoint = existingLine.substring(x + 1);
    
    this.buffer[y] = beforePoint + styledChar + afterPoint;
  }

  fillRect(x, y, width, height, char = ' ', color = null) {
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const currentX = x + col;
        const currentY = y + row;
        
        if (currentX >= 0 && currentX < this.viewport.width &&
            currentY >= 0 && currentY < this.viewport.height) {
          
          const drawChar = color ? colors.color(char, color) : char;
          const existingLine = this.buffer[currentY];
          const beforeChar = existingLine.substring(0, currentX);
          const afterChar = existingLine.substring(currentX + 1);
          
          this.buffer[currentY] = beforeChar + drawChar + afterChar;
        }
      }
    }
  }

  renderComponent(component) {
    if (!component || !component.render) return;
    
    const originalCursor = { ...this.cursor };
    
    if (component.x !== undefined && component.y !== undefined) {
      this.moveTo(component.x, component.y);
    }
    
    const componentLines = component.render();
    
    componentLines.forEach((line, index) => {
      const currentY = this.cursor.y + index;
      if (currentY >= this.viewport.height) return;
      
      const maxLength = this.viewport.width - this.cursor.x;
      let processedLine = line;
      
      if (colors.length(processedLine) > maxLength) {
        processedLine = formatting.truncate(processedLine, maxLength);
      }
      
      const existingLine = this.buffer[currentY];
      const beforeComponent = existingLine.substring(0, this.cursor.x);
      const afterComponent = existingLine.substring(this.cursor.x + colors.length(processedLine));
      
      this.buffer[currentY] = beforeComponent + processedLine + afterComponent;
    });
    
    this.cursor = originalCursor;
  }

  renderToString() {
    return this.buffer.join('\n');
  }

  renderToConsole() {
    console.clear();
    console.log(this.renderToString());
  }

  getBuffer() {
    return [...this.buffer];
  }

  getCursor() {
    return { ...this.cursor };
  }

  getViewport() {
    return { ...this.viewport };
  }
}

module.exports = Renderer;