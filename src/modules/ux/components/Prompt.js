const UIComponent = require('./UIComponent');
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');

class Prompt extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.text = options.text || 'Enter input:';
    this.style = options.style || 'minimal';
    this.cursor = options.cursor || 'underline';
    this.blinking = options.blinking !== undefined ? options.blinking : true;
    this.spacing = options.spacing !== undefined ? options.spacing : 1;
    this.value = options.value || '';
    this.cursorPosition = options.cursorPosition || 0;
    this.maxLength = options.maxLength || 100;
    this.placeholder = options.placeholder || '';
    this.showCursor = options.showCursor !== undefined ? options.showCursor : true;
    
    // Visual style options
    this.styles = {
      minimal: { prefix: '', suffix: '', padding: 0 },
      bracketed: { prefix: '[ ', suffix: ' ]', padding: 1 },
      boxed: { prefix: '┌─', suffix: '─┐', padding: 1, border: true },
      highlighted: { prefix: '', suffix: '', padding: 1, background: 'input' },
      arrow: { prefix: '→ ', suffix: '', padding: 0 }
    };
  }

  render() {
    this.buffer = [];
    
    // Add spacing before prompt
    for (let i = 0; i < this.spacing; i++) {
      this.buffer.push('');
    }
    
    const styleConfig = this.styles[this.style] || this.styles.minimal;
    
    if (styleConfig.border) {
      this.renderBoxedPrompt(styleConfig);
    } else {
      this.renderInlinePrompt(styleConfig);
    }
    
    return this.buffer;
  }

  renderInlinePrompt(styleConfig) {
    let line = '';
    
    // Add prefix
    if (styleConfig.prefix) {
      line += colors.color(styleConfig.prefix, 'secondary');
    }
    
    // Add prompt text
    line += colors.color(this.text, 'info');
    line += ' ';
    
    // Add input area
    const inputArea = this.renderInputArea();
    if (styleConfig.background) {
      line += colors.color(inputArea, styleConfig.background);
    } else {
      line += inputArea;
    }
    
    // Add suffix
    if (styleConfig.suffix) {
      line += colors.color(styleConfig.suffix, 'secondary');
    }
    
    this.buffer.push(line);
  }

  renderBoxedPrompt(styleConfig) {
    const promptWidth = Math.max(this.text.length + 10, 30);
    const chars = ascii.BOX_DRAWING.single;
    
    // Top border
    const topBorder = chars.topLeft + chars.horizontal.repeat(promptWidth - 2) + chars.topRight;
    this.buffer.push(colors.color(topBorder, 'border'));
    
    // Content line
    let contentLine = chars.vertical + ' ';
    contentLine += colors.color(this.text, 'info') + ' ';
    contentLine += this.renderInputArea();
    
    // Pad to width
    const currentLength = colors.length(contentLine);
    const padding = promptWidth - currentLength - 1;
    contentLine += ' '.repeat(Math.max(0, padding));
    contentLine += colors.color(chars.vertical, 'border');
    
    this.buffer.push(contentLine);
    
    // Bottom border
    const bottomBorder = chars.bottomLeft + chars.horizontal.repeat(promptWidth - 2) + chars.bottomRight;
    this.buffer.push(colors.color(bottomBorder, 'border'));
  }

  renderInputArea() {
    let inputDisplay = '';
    const displayValue = this.value || this.placeholder;
    
    if (this.showCursor && this.cursor !== 'hidden') {
      // Insert cursor at current position
      const beforeCursor = displayValue.slice(0, this.cursorPosition);
      const atCursor = displayValue[this.cursorPosition] || ' ';
      const afterCursor = displayValue.slice(this.cursorPosition + 1);
      
      inputDisplay = beforeCursor + this.renderCursor(atCursor) + afterCursor;
    } else {
      inputDisplay = displayValue;
    }
    
    // Show placeholder in muted color if no value
    if (!this.value && this.placeholder) {
      inputDisplay = colors.color(inputDisplay, 'muted');
    }
    
    return inputDisplay;
  }

  renderCursor(charAtCursor = ' ') {
    const cursorChars = {
      block: '█',
      underline: '_',
      pipe: '|',
      hidden: charAtCursor
    };
    
    const cursorChar = cursorChars[this.cursor] || cursorChars.underline;
    const cursorColor = this.blinking ? 'highlight' : 'primary';
    
    if (this.cursor === 'underline') {
      // Show character with underline effect
      return colors.color(charAtCursor || ' ', cursorColor) + '\b' + colors.color(cursorChar, cursorColor);
    } else if (this.cursor === 'block') {
      // Block cursor replaces the character
      return colors.color(cursorChar, cursorColor);
    } else if (this.cursor === 'pipe') {
      // Pipe cursor goes before the character
      return colors.color(cursorChar, cursorColor) + charAtCursor;
    } else {
      return charAtCursor;
    }
  }

  setValue(value) {
    this.value = value.slice(0, this.maxLength);
    this.cursorPosition = Math.min(this.cursorPosition, this.value.length);
    this.emit('value-changed', this.value);
  }

  insertCharacter(char) {
    if (this.value.length < this.maxLength) {
      const before = this.value.slice(0, this.cursorPosition);
      const after = this.value.slice(this.cursorPosition);
      this.value = before + char + after;
      this.cursorPosition++;
      this.emit('value-changed', this.value);
    }
  }

  deleteCharacter() {
    if (this.cursorPosition > 0) {
      const before = this.value.slice(0, this.cursorPosition - 1);
      const after = this.value.slice(this.cursorPosition);
      this.value = before + after;
      this.cursorPosition--;
      this.emit('value-changed', this.value);
    }
  }

  moveCursorLeft() {
    this.cursorPosition = Math.max(0, this.cursorPosition - 1);
    this.emit('cursor-moved', this.cursorPosition);
  }

  moveCursorRight() {
    this.cursorPosition = Math.min(this.value.length, this.cursorPosition + 1);
    this.emit('cursor-moved', this.cursorPosition);
  }

  moveCursorToStart() {
    this.cursorPosition = 0;
    this.emit('cursor-moved', this.cursorPosition);
  }

  moveCursorToEnd() {
    this.cursorPosition = this.value.length;
    this.emit('cursor-moved', this.cursorPosition);
  }

  clear() {
    this.value = '';
    this.cursorPosition = 0;
    this.emit('value-changed', this.value);
  }

  handleInput(input) {
    const key = input.toLowerCase();
    
    switch (key) {
      case 'arrowleft':
        this.moveCursorLeft();
        return true;
        
      case 'arrowright':
        this.moveCursorRight();
        return true;
        
      case 'home':
        this.moveCursorToStart();
        return true;
        
      case 'end':
        this.moveCursorToEnd();
        return true;
        
      case 'backspace':
        this.deleteCharacter();
        return true;
        
      case 'enter':
        this.emit('submit', this.value);
        return true;
        
      case 'escape':
        this.emit('cancel');
        return true;
        
      default:
        // Handle printable characters
        if (input.length === 1 && input.charCodeAt(0) >= 32 && input.charCodeAt(0) <= 126) {
          this.insertCharacter(input);
          return true;
        }
        return false;
    }
  }

  focus() {
    this.showCursor = true;
    this.emit('focus');
  }

  blur() {
    this.showCursor = false;
    this.emit('blur');
  }
}

module.exports = Prompt;