import { Viewport, Cursor, TextStyle, BoxStyle, LineStyle, RenderableComponent, ColorName } from '../types';
// Note: These imports will be updated when we convert the utility files
const colors = require('../utils/colors');
const formatting = require('../utils/formatting');

/**
 * Handles low-level rendering operations for the UX system.
 * Manages a text buffer and provides drawing primitives for components.
 */
export class Renderer {
  public viewport: Viewport;
  public cursor: Cursor;
  public buffer: string[];

  constructor() {
    this.viewport = {
      width: 80,
      height: 24
    };
    this.cursor = { x: 0, y: 0 };
    this.buffer = [];
    this.clearBuffer();
  }

  /**
   * Sets the viewport size and clears the buffer.
   * 
   * @param width - New viewport width
   * @param height - New viewport height
   */
  setViewport(width: number, height: number): void {
    this.viewport = { width, height };
    this.clearBuffer();
  }

  /**
   * Clears the render buffer and fills it with empty space.
   */
  clearBuffer(): void {
    this.buffer = [];
    for (let i = 0; i < this.viewport.height; i++) {
      this.buffer.push(' '.repeat(this.viewport.width));
    }
  }

  /**
   * Moves the cursor to the specified position.
   * 
   * @param x - X coordinate (clamped to viewport bounds)
   * @param y - Y coordinate (clamped to viewport bounds)
   */
  moveTo(x: number, y: number): void {
    this.cursor = { 
      x: Math.max(0, Math.min(x, this.viewport.width - 1)),
      y: Math.max(0, Math.min(y, this.viewport.height - 1))
    };
  }

  /**
   * Writes styled text at the current cursor position.
   * 
   * @param text - Text to write (may contain newlines)
   * @param style - Text styling options
   */
  writeText(text: string, style: TextStyle = {}): void {
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

  /**
   * Draws a box with optional border and fill styling.
   * 
   * @param x - Left edge X coordinate
   * @param y - Top edge Y coordinate
   * @param width - Box width
   * @param height - Box height
   * @param style - Box styling options
   */
  drawBox(x: number, y: number, width: number, height: number, style: BoxStyle = {}): void {
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

  /**
   * Draws a line between two points using Bresenham's line algorithm.
   * 
   * @param x1 - Start X coordinate
   * @param y1 - Start Y coordinate
   * @param x2 - End X coordinate
   * @param y2 - End Y coordinate
   * @param style - Line styling options
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, style: LineStyle = {}): void {
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

  /**
   * Draws a single character at the specified position.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param char - Character to draw
   * @param color - Color name for the character
   */
  drawPoint(x: number, y: number, char: string = '█', color: ColorName = 'primary'): void {
    if (x < 0 || x >= this.viewport.width || y < 0 || y >= this.viewport.height) {
      return;
    }
    
    const styledChar = colors.color(char, color);
    const existingLine = this.buffer[y];
    const beforePoint = existingLine.substring(0, x);
    const afterPoint = existingLine.substring(x + 1);
    
    this.buffer[y] = beforePoint + styledChar + afterPoint;
  }

  /**
   * Fills a rectangular area with the specified character and color.
   * 
   * @param x - Left edge X coordinate
   * @param y - Top edge Y coordinate
   * @param width - Rectangle width
   * @param height - Rectangle height
   * @param char - Fill character
   * @param color - Fill color (optional)
   */
  fillRect(x: number, y: number, width: number, height: number, char: string = ' ', color: ColorName | null = null): void {
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

  /**
   * Renders a component to the buffer at its specified position.
   * 
   * @param component - Component to render
   */
  renderComponent(component: RenderableComponent): void {
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

  /**
   * Converts the buffer to a single string.
   * 
   * @returns The rendered buffer as a string
   */
  renderToString(): string {
    return this.buffer.join('\n');
  }

  /**
   * Clears the console and renders the buffer to it.
   */
  renderToConsole(): void {
    console.clear();
    console.log(this.renderToString());
  }

  /**
   * Gets a copy of the current buffer.
   * 
   * @returns Copy of the buffer array
   */
  getBuffer(): string[] {
    return [...this.buffer];
  }

  /**
   * Gets a copy of the current cursor position.
   * 
   * @returns Copy of the cursor position
   */
  getCursor(): Cursor {
    return { ...this.cursor };
  }

  /**
   * Gets a copy of the current viewport size.
   * 
   * @returns Copy of the viewport dimensions
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }
}

export default Renderer;