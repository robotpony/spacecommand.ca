const UIComponent = require('./UIComponent');
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');
const formatting = require('../utils/formatting');

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
      line += colors.color(keyDisplay, keyColor);
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
    const key = input.toLowerCase();
    
    switch (key) {
      case 'arrowup':
      case 'w':
        this.selectPrevious();
        return true;
        
      case 'arrowdown':
      case 's':
        this.selectNext();
        return true;
        
      case 'enter':
      case ' ':
        this.emit('item-selected', this.getSelectedItem(), this.selectedIndex);
        return true;
        
      default:
        const item = this.findItemByKey(key);
        if (item && !item.disabled) {
          this.emit('item-activated', item);
          return true;
        }
        return false;
    }
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