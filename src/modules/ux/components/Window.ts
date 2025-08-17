import { UIComponent } from './UIComponent';
import { 
  WindowOptions, 
  DialogOptions, 
  ContentArea, 
  BorderStyle, 
  TitleAlign, 
  ColorName, 
  WindowContent, 
  RenderableContent
} from '../types';
// Note: These imports will be updated when we convert the utility files
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');
const formatting = require('../utils/formatting');

export class Window extends UIComponent {
  public title: string;
  public border: BorderStyle;
  public padding: number;
  public content: WindowContent;
  public titleAlign: TitleAlign;
  public borderColor: ColorName;
  public titleColor: ColorName;
  public contentArea: ContentArea;

  constructor(options: WindowOptions = {}) {
    super(options);
    this.title = options.title || '';
    this.border = options.border || 'single';
    this.padding = options.padding || 1;
    this.content = options.content || null;
    this.titleAlign = options.titleAlign || 'center';
    this.borderColor = options.borderColor || 'border';
    this.titleColor = options.titleColor || 'title';
    this.contentArea = {
      x: this.padding,
      y: this.padding + (this.title ? 1 : 0),
      width: this.width - (this.padding * 2),
      height: this.height - (this.padding * 2) - (this.title ? 1 : 0)
    };
  }

  render(): string[] {
    this.buffer = [];
    this.updateContentArea();
    
    this.renderBorder();
    
    if (this.title) {
      this.renderTitle();
    }
    
    if (this.content) {
      this.renderContent();
    }
    
    return this.buffer;
  }

  updateContentArea(): void {
    const titleOffset = this.title ? 1 : 0;
    this.contentArea = {
      x: this.padding,
      y: this.padding + titleOffset,
      width: this.width - (this.padding * 2),
      height: this.height - (this.padding * 2) - titleOffset
    };
  }

  renderBorder(): void {
    const chars = ascii.BOX_DRAWING[this.border] || ascii.BOX_DRAWING.single;
    
    for (let y = 0; y < this.height; y++) {
      let line = '';
      
      for (let x = 0; x < this.width; x++) {
        if (y === 0) {
          if (x === 0) {
            line += chars.topLeft;
          } else if (x === this.width - 1) {
            line += chars.topRight;
          } else {
            line += chars.horizontal;
          }
        } else if (y === this.height - 1) {
          if (x === 0) {
            line += chars.bottomLeft;
          } else if (x === this.width - 1) {
            line += chars.bottomRight;
          } else {
            line += chars.horizontal;
          }
        } else {
          if (x === 0 || x === this.width - 1) {
            line += chars.vertical;
          } else {
            line += ' ';
          }
        }
      }
      
      this.buffer.push(colors.color(line, this.borderColor));
    }
  }

  renderTitle(): void {
    if (!this.title || this.height < 3) return;
    
    const titleText = ` ${this.title} `;
    const chars = ascii.BOX_DRAWING[this.border] || ascii.BOX_DRAWING.single;
    let insertPos: number;
    
    switch (this.titleAlign) {
      case 'left':
        insertPos = 2;
        break;
      case 'right':
        insertPos = this.width - titleText.length - 2;
        break;
      case 'center':
      default:
        insertPos = Math.floor((this.width - titleText.length) / 2);
        break;
    }
    
    insertPos = Math.max(1, Math.min(insertPos, this.width - titleText.length - 1));
    
    // Build the top border line in three parts
    let line = '';
    
    // Part 1: Border before title
    line += colors.color(chars.topLeft, this.borderColor);
    for (let x = 1; x < insertPos; x++) {
      line += colors.color(chars.horizontal, this.borderColor);
    }
    
    // Part 2: The title
    line += colors.color(titleText, this.titleColor);
    
    // Part 3: Border after title
    for (let x = insertPos + titleText.length; x < this.width - 1; x++) {
      line += colors.color(chars.horizontal, this.borderColor);
    }
    line += colors.color(chars.topRight, this.borderColor);
    
    this.buffer[0] = line;
  }

  renderContent(): void {
    if (!this.content) return;
    
    let contentLines: string[];
    
    if (typeof this.content === 'string') {
      contentLines = this.content.split('\n');
    } else if (Array.isArray(this.content)) {
      contentLines = this.content;
    } else if (this.isRenderableContent(this.content)) {
      this.content.setSize?.(this.contentArea.width, this.contentArea.height);
      contentLines = this.content.render();
    } else {
      contentLines = [this.content.toString()];
    }
    
    const startY = this.contentArea.y;
    const maxLines = this.contentArea.height;
    const chars = ascii.BOX_DRAWING[this.border] || ascii.BOX_DRAWING.single;
    
    for (let i = 0; i < Math.min(contentLines.length, maxLines); i++) {
      const lineY = startY + i;
      if (lineY >= this.buffer.length) break;
      
      let contentLine = contentLines[i] || '';
      
      // Truncate the content if it's too long
      const contentLength = colors.length(contentLine);
      if (contentLength > this.contentArea.width) {
        contentLine = formatting.truncate(contentLine, this.contentArea.width);
      }
      
      // Build the complete line with proper spacing
      let newLine = '';
      
      // Left border
      newLine += colors.color(chars.vertical, this.borderColor);
      
      // Interior space (padding + content + padding)
      const interiorWidth = this.width - 2; // Total width minus two borders
      let interior = '';
      
      // Left padding
      for (let p = 0; p < this.padding; p++) {
        interior += ' ';
      }
      
      // Content
      interior += contentLine;
      
      // Calculate remaining space to fill
      const usedSpace = this.padding + colors.length(contentLine);
      const remainingSpace = interiorWidth - usedSpace;
      
      // Fill remaining space (right padding and extra spaces)
      for (let s = 0; s < remainingSpace; s++) {
        interior += ' ';
      }
      
      newLine += interior;
      
      // Right border (always at the same position)
      newLine += colors.color(chars.vertical, this.borderColor);
      
      this.buffer[lineY] = newLine;
    }
  }

  private isRenderableContent(content: any): content is RenderableContent {
    return content && typeof content.render === 'function';
  }

  setContent(content: WindowContent): void {
    this.content = content;
    if (content && typeof content === 'object' && 'parent' in content) {
      content.parent = this;
    }
    this.emit('content-changed', content);
  }

  setTitle(title: string): void {
    this.title = title;
    this.updateContentArea();
    this.emit('title-changed', title);
  }

  setBorder(border: BorderStyle): void {
    this.border = border;
    this.emit('border-changed', border);
  }

  setPadding(padding: number): void {
    this.padding = padding;
    this.updateContentArea();
    this.emit('padding-changed', padding);
  }

  getContentArea(): ContentArea {
    return { ...this.contentArea };
  }

  fitContent(): void {
    if (!this.content) return;
    
    if (this.isRenderableContent(this.content)) {
      const contentLines = this.content.render();
      const contentWidth = Math.max(...contentLines.map(line => colors.length(line)));
      const contentHeight = contentLines.length;
      
      this.width = contentWidth + (this.padding * 2) + 2;
      this.height = contentHeight + (this.padding * 2) + 2 + (this.title ? 1 : 0);
      
      this.updateContentArea();
      this.emit('size-changed', { width: this.width, height: this.height });
    }
  }

  center(containerWidth: number, containerHeight: number): void {
    this.x = Math.floor((containerWidth - this.width) / 2);
    this.y = Math.floor((containerHeight - this.height) / 2);
    this.emit('position-changed', { x: this.x, y: this.y });
  }

  // Window inherits standard EventEmitter methods from UIComponent
}

export class Dialog extends Window {
  public buttons: string[];
  public selectedButton: number;
  public buttonSpacing: number;

  constructor(options: DialogOptions = {}) {
    super({
      border: 'double',
      padding: 2,
      titleAlign: 'center',
      ...options
    });
    
    this.buttons = options.buttons || ['OK'];
    this.selectedButton = 0;
    this.buttonSpacing = options.buttonSpacing || 4;
  }

  render(): string[] {
    super.render();
    this.renderButtons();
    return this.buffer;
  }

  renderButtons(): void {
    if (this.buttons.length === 0) return;
    
    const chars = ascii.BOX_DRAWING[this.border] || ascii.BOX_DRAWING.single;
    const buttonY = this.height - this.padding - 1;
    const buttonText = this.buttons.map((btn, index) => {
      const isSelected = index === this.selectedButton;
      const text = isSelected ? `[${btn}]` : ` ${btn} `;
      return isSelected ? colors.color(text, 'highlight') : colors.color(text, 'info');
    }).join(' '.repeat(this.buttonSpacing));
    
    const buttonTextLength = colors.length(buttonText);
    const buttonX = Math.floor((this.width - buttonTextLength) / 2);
    
    if (buttonY >= 0 && buttonY < this.buffer.length) {
      // Rebuild the entire line with buttons properly positioned
      let newLine = '';
      
      // Left border
      newLine += colors.color(chars.vertical, this.borderColor);
      
      // Interior content
      const interiorWidth = this.width - 2;
      let interior = '';
      
      // Add spaces before buttons
      for (let x = 0; x < buttonX - 1; x++) {
        interior += ' ';
      }
      
      // Add button text
      interior += buttonText;
      
      // Add spaces after buttons
      const spacesAfter = interiorWidth - (buttonX - 1) - buttonTextLength;
      for (let x = 0; x < spacesAfter; x++) {
        interior += ' ';
      }
      
      newLine += interior;
      
      // Right border
      newLine += colors.color(chars.vertical, this.borderColor);
      
      this.buffer[buttonY] = newLine;
    }
  }

  selectButton(index: number): void {
    if (index >= 0 && index < this.buttons.length) {
      this.selectedButton = index;
      this.emit('button-selection-changed', { index, button: this.buttons[index] });
    }
  }

  selectNextButton(): void {
    this.selectButton((this.selectedButton + 1) % this.buttons.length);
  }

  selectPreviousButton(): void {
    const prevIndex = this.selectedButton === 0 ? this.buttons.length - 1 : this.selectedButton - 1;
    this.selectButton(prevIndex);
  }

  handleInput(input: string): boolean {
    switch (input.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        this.selectPreviousButton();
        return true;
        
      case 'arrowright':
      case 'd':
        this.selectNextButton();
        return true;
        
      case 'enter':
      case ' ':
        this.emit('button-activated', { index: this.selectedButton, button: this.buttons[this.selectedButton] });
        return true;
        
      case 'escape':
        this.emit('dialog-cancelled');
        return true;
        
      default:
        return false;
    }
  }

  // Dialog inherits event methods from Window class
}