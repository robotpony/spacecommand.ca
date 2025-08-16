const UIComponent = require('./UIComponent');
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');
const formatting = require('../utils/formatting');
const Prompt = require('./Prompt');

class Menu extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.items = options.items || [];
    this.title = options.title || '';
    this.selectedIndex = options.selectedIndex || 0;
    this.showKeys = options.showKeys !== undefined ? options.showKeys : true;
    this.showDescriptions = options.showDescriptions !== undefined ? options.showDescriptions : true;
    this.keyStyle = options.keyStyle || 'brackets';
    this.itemSpacing = options.itemSpacing !== undefined ? options.itemSpacing : 1;
    this.numbered = options.numbered || false;
    this.breadcrumbs = options.breadcrumbs || [];
    this.footer = options.footer || '';
    this.columns = options.columns || 1;
    
    // Prompt integration
    this.promptActive = false;
    this.prompt = options.prompt ? new Prompt({
      text: options.prompt.text || 'Enter selection:',
      style: options.prompt.style || 'minimal',
      cursor: options.prompt.cursor || 'underline',
      blinking: options.prompt.blinking !== undefined ? options.prompt.blinking : true,
      spacing: options.prompt.spacing !== undefined ? options.prompt.spacing : 1,
      placeholder: options.prompt.placeholder || '',
      maxLength: options.prompt.maxLength || 100,
      ...options.prompt
    }) : null;
    
    // Set up prompt event forwarding if prompt exists
    if (this.prompt) {
      this.prompt.on('submit', (value) => {
        this.emit('prompt-submit', value);
      });
      
      this.prompt.on('cancel', () => {
        this.emit('prompt-cancel');
        this.promptActive = false;
      });
      
      this.prompt.on('value-changed', (value) => {
        this.emit('prompt-value-changed', value);
      });
    }
  }

  render() {
    this.buffer = [];
    let currentY = 0;

    if (this.breadcrumbs.length > 0) {
      this.renderBreadcrumbs();
      currentY += 2;
    }

    if (this.title) {
      this.renderTitle();
      currentY += 2;
    }

    if (this.columns > 1) {
      this.renderColumnarItems();
    } else {
      this.renderLinearItems();
    }

    if (this.footer) {
      this.renderFooter();
    }

    if (this.prompt) {
      this.renderPrompt();
    }

    return this.buffer;
  }

  renderBreadcrumbs() {
    const breadcrumbText = this.breadcrumbs.join(' > ');
    this.buffer.push(colors.color(breadcrumbText, 'muted'));
    this.buffer.push('');
  }

  renderTitle() {
    if (this.title) {
      this.buffer.push(colors.color(this.title, 'highlight'));
      this.buffer.push('');
    }
  }

  renderLinearItems() {
    this.items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const line = this.formatMenuItem(item, index, isSelected);
      this.buffer.push(line);

      if (this.itemSpacing > 0 && index < this.items.length - 1) {
        for (let i = 0; i < this.itemSpacing - 1; i++) {
          this.buffer.push('');
        }
      }
    });
  }

  renderColumnarItems() {
    const itemsPerColumn = Math.ceil(this.items.length / this.columns);
    const columnWidth = Math.floor(this.width / this.columns);
    
    for (let row = 0; row < itemsPerColumn; row++) {
      let line = '';
      
      for (let col = 0; col < this.columns; col++) {
        const itemIndex = col * itemsPerColumn + row;
        
        if (itemIndex < this.items.length) {
          const item = this.items[itemIndex];
          const isSelected = itemIndex === this.selectedIndex;
          const itemText = this.formatMenuItem(item, itemIndex, isSelected, false);
          line += formatting.pad(itemText, columnWidth, 'left');
        } else {
          line += ' '.repeat(columnWidth);
        }
      }
      
      this.buffer.push(line.trimEnd());
    }
  }

  renderFooter() {
    if (this.buffer.length > 0) {
      this.buffer.push('');
    }
    this.buffer.push(colors.color(this.footer, 'info'));
  }

  renderPrompt() {
    if (this.prompt) {
      const promptLines = this.prompt.render();
      this.buffer.push(...promptLines);
    }
  }

  formatMenuItem(item, index, isSelected = false, includeDescription = true) {
    let line = '';
    
    const keyDisplay = this.getKeyDisplay(item, index);
    const labelColor = isSelected ? 'highlight' : 'info';
    const keyColor = isSelected ? 'primary' : 'secondary';
    
    if (isSelected && this.keyStyle !== 'none') {
      line += colors.color('> ', 'primary');
    } else if (this.keyStyle !== 'none') {
      line += '  ';
    }
    
    if (keyDisplay) {
      line += colors.ANSI_CODES.bright + colors.color(keyDisplay, keyColor) + colors.ANSI_CODES.reset;
      line += ' ';
    }
    
    line += colors.color(item.label || item.text || item.name || '', labelColor);
    
    if (includeDescription && this.showDescriptions && item.description) {
      const descPadding = Math.max(1, 25 - (item.label || '').length);
      line += ' '.repeat(descPadding);
      line += colors.color(`- ${item.description}`, 'muted');
    }
    
    if (item.badge) {
      line += ' ' + colors.color(`[${item.badge}]`, 'warning');
    }
    
    if (item.disabled) {
      line = colors.color(line, 'muted');
    }
    
    return line;
  }

  getKeyDisplay(item, index) {
    if (!this.showKeys) return '';
    
    let key = '';
    
    if (item.key !== undefined) {
      key = item.key.toString();
    } else if (this.numbered) {
      key = (index + 1).toString();
    } else {
      return '';
    }
    
    switch (this.keyStyle) {
      case 'brackets':
        return `[${key}]`;
      case 'parentheses':
        return `(${key})`;
      case 'plain':
        return `${key}.`;
      case 'none':
        return '';
      default:
        return `[${key}]`;
    }
  }

  addItem(item) {
    this.items.push(item);
    this.emit('item-added', item);
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      const removed = this.items.splice(index, 1)[0];
      if (this.selectedIndex >= this.items.length) {
        this.selectedIndex = Math.max(0, this.items.length - 1);
      }
      this.emit('item-removed', removed);
    }
  }

  setItems(items) {
    this.items = items;
    this.selectedIndex = 0;
    this.emit('items-changed', items);
  }

  selectItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.selectedIndex = index;
      this.emit('selection-changed', this.selectedIndex, this.items[index]);
    }
  }

  selectNext() {
    const nextIndex = (this.selectedIndex + 1) % this.items.length;
    this.selectItem(nextIndex);
  }

  selectPrevious() {
    const prevIndex = this.selectedIndex === 0 ? this.items.length - 1 : this.selectedIndex - 1;
    this.selectItem(prevIndex);
  }

  getSelectedItem() {
    return this.items[this.selectedIndex];
  }

  findItemByKey(key) {
    return this.items.find(item => 
      item.key && item.key.toString().toLowerCase() === key.toLowerCase()
    );
  }

  handleInput(input) {
    // If prompt is active, let it handle input first
    if (this.prompt && this.promptActive) {
      const handled = this.prompt.handleInput(input);
      if (handled) {
        return true;
      }
    }
    
    const key = input.toLowerCase();
    
    switch (key) {
      case 'arrowup':
      case 'w':
        if (!this.promptActive) {
          this.selectPrevious();
          return true;
        }
        break;
        
      case 'arrowdown':
      case 's':
        if (!this.promptActive) {
          this.selectNext();
          return true;
        }
        break;
        
      case 'enter':
      case ' ':
        if (!this.promptActive) {
          this.emit('item-selected', this.getSelectedItem(), this.selectedIndex);
          return true;
        }
        break;
        
      case 'tab':
        if (this.prompt) {
          this.togglePrompt();
          return true;
        }
        break;
        
      default:
        if (!this.promptActive) {
          const item = this.findItemByKey(key);
          if (item && !item.disabled) {
            this.emit('item-activated', item);
            return true;
          }
        }
        return false;
    }
    
    return false;
  }

  setBreadcrumbs(breadcrumbs) {
    this.breadcrumbs = breadcrumbs;
    this.emit('breadcrumbs-changed', breadcrumbs);
  }

  setTitle(title) {
    this.title = title;
    this.emit('title-changed', title);
  }

  setFooter(footer) {
    this.footer = footer;
    this.emit('footer-changed', footer);
  }

  setPrompt(promptOptions) {
    if (promptOptions) {
      this.prompt = new Prompt({
        text: promptOptions.text || 'Enter selection:',
        style: promptOptions.style || 'minimal',
        cursor: promptOptions.cursor || 'underline',
        blinking: promptOptions.blinking !== undefined ? promptOptions.blinking : true,
        spacing: promptOptions.spacing !== undefined ? promptOptions.spacing : 1,
        placeholder: promptOptions.placeholder || '',
        maxLength: promptOptions.maxLength || 100,
        ...promptOptions
      });
      
      // Forward prompt events
      this.prompt.on('submit', (value) => {
        this.emit('prompt-submit', value);
      });
      
      this.prompt.on('cancel', () => {
        this.emit('prompt-cancel');
        this.promptActive = false;
      });
      
      this.prompt.on('value-changed', (value) => {
        this.emit('prompt-value-changed', value);
      });
    } else {
      this.prompt = null;
    }
    this.promptActive = false;
    this.emit('prompt-changed', this.prompt);
  }

  activatePrompt() {
    if (this.prompt) {
      this.promptActive = true;
      this.prompt.focus();
      this.emit('prompt-activated');
    }
  }

  deactivatePrompt() {
    if (this.prompt) {
      this.promptActive = false;
      this.prompt.blur();
      this.emit('prompt-deactivated');
    }
  }

  togglePrompt() {
    if (this.prompt) {
      if (this.promptActive) {
        this.deactivatePrompt();
      } else {
        this.activatePrompt();
      }
    }
  }

  getPromptValue() {
    return this.prompt ? this.prompt.value : '';
  }

  setPromptValue(value) {
    if (this.prompt) {
      this.prompt.setValue(value);
    }
  }

  clearPrompt() {
    if (this.prompt) {
      this.prompt.clear();
    }
  }
}

class ContextMenu extends Menu {
  constructor(options = {}) {
    super({
      showKeys: false,
      keyStyle: 'none',
      itemSpacing: 0,
      ...options
    });
    
    this.separators = new Set(options.separators || []);
  }

  render() {
    this.buffer = [];
    
    this.items.forEach((item, index) => {
      if (this.separators.has(index)) {
        const separator = ascii.BOX_DRAWING.single.horizontal.repeat(this.width - 4);
        this.buffer.push(`  ${colors.color(separator, 'border')}`);
      }
      
      const isSelected = index === this.selectedIndex;
      const line = this.formatContextItem(item, isSelected);
      this.buffer.push(line);
    });
    
    return this.buffer;
  }

  formatContextItem(item, isSelected) {
    const prefix = isSelected ? colors.color('> ', 'primary') : '  ';
    const labelColor = item.disabled ? 'muted' : (isSelected ? 'highlight' : 'info');
    const label = colors.color(item.label || item.text, labelColor);
    
    let line = prefix + label;
    
    if (item.shortcut) {
      const shortcutPadding = Math.max(1, this.width - 10 - (item.label || '').length);
      line += ' '.repeat(shortcutPadding);
      line += colors.color(item.shortcut, 'muted');
    }
    
    return line;
  }

  addSeparator(index) {
    this.separators.add(index);
  }
}

module.exports = { Menu, ContextMenu };