import { UIComponent } from './UIComponent';
import { StyleEngine } from '../rendering/StyleEngine';
import * as colors from '../utils/colors';

export class Menu extends UIComponent {
  items: any[];
  title: string;
  selectedIndex: number;
  styleSelector: string;
  keyStyle: string;
  showKeys: boolean;
  showDescriptions: boolean;
  columns: number;
  itemSpacing: number;
  numbered: boolean;
  breadcrumbs: string[];
  footer: string;
  styleEngine: any;

  constructor(options = {}) {
    super(options);
    this.items = options.items || [];
    this.title = options.title || '';
    this.selectedIndex = options.selectedIndex || 0;
    this.styleSelector = options.styleSelector || 'menu.default';
    this.keyStyle = options.keyStyle || 'brackets';
    this.showKeys = options.showKeys !== undefined ? options.showKeys : true;
    this.showDescriptions = options.showDescriptions !== undefined ? options.showDescriptions : true;
    this.columns = options.columns || 1;
    this.itemSpacing = options.itemSpacing !== undefined ? options.itemSpacing : 1;
    this.numbered = options.numbered || false;
    this.breadcrumbs = options.breadcrumbs || [];
    this.footer = options.footer || '';
    this.styleEngine = options.styleEngine || new StyleEngine();
  }

  render() {
    const lines = [];
    
    // Add breadcrumbs if present
    if (this.breadcrumbs && this.breadcrumbs.length > 0) {
      lines.push(this.breadcrumbs.join(' > '));
      lines.push('');
    }
    
    // Add title if present
    if (this.title) {
      lines.push(this.title);
      lines.push('');
    }
    
    // Render menu items
    if (this.columns > 1) {
      lines.push(...this.renderColumns());
    } else {
      lines.push(...this.renderLinear());
    }
    
    // Add footer if present
    if (this.footer) {
      lines.push('');
      lines.push(this.footer);
    }
    
    return lines;
  }

  renderLinear() {
    const style = this.styleEngine.getStyle(this.styleSelector);
    const lines = [];
    
    this.items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const line = this.renderItem(item, index, isSelected, style);
      lines.push(line);
      
      // Add item spacing
      if (this.itemSpacing > 0 && index < this.items.length - 1) {
        for (let i = 0; i < this.itemSpacing; i++) {
          lines.push('');
        }
      }
    });
    
    return lines;
  }

  renderColumns() {
    const style = this.styleEngine.getStyle(this.styleSelector);
    const lines = [];
    const itemsPerColumn = Math.ceil(this.items.length / this.columns);
    const columnWidth = Math.floor(this.width / this.columns);
    
    for (let row = 0; row < itemsPerColumn; row++) {
      let line = '';
      
      for (let col = 0; col < this.columns; col++) {
        const itemIndex = col * itemsPerColumn + row;
        
        if (itemIndex < this.items.length) {
          const item = this.items[itemIndex];
          const isSelected = itemIndex === this.selectedIndex;
          const itemText = this.renderItem(item, itemIndex, isSelected, style, false);
          line += this.padToWidth(itemText, columnWidth);
        } else {
          line += ' '.repeat(columnWidth);
        }
      }
      
      lines.push(line.trimEnd());
    }
    
    return lines;
  }

  renderItem(item, index, isSelected, style, includeDescription = true) {
    const parts = [];
    
    // Selection indicator
    if (isSelected) {
      parts.push(this.styleEngine.createStyledText('> ', this.styleSelector, { color: style.selectedKeyColor }));
    } else {
      parts.push('  ');
    }
    
    // Key display
    const keyDisplay = this.getKeyDisplay(item, index);
    if (keyDisplay) {
      const keyColor = isSelected ? style.selectedKeyColor : style.keyColor;
      parts.push(this.styleEngine.createStyledText(keyDisplay + ' ', this.styleSelector, { color: keyColor }));
    }
    
    // Label
    const labelColor = isSelected ? style.selectedLabelColor : style.labelColor;
    const label = item.label || item.text || item.name || '';
    parts.push(this.styleEngine.createStyledText(label, this.styleSelector, { color: labelColor }));
    
    // Description
    if (includeDescription && this.showDescriptions && item.description) {
      const descPadding = Math.max(1, 25 - label.length);
      parts.push(' '.repeat(descPadding));
      parts.push(this.styleEngine.createStyledText(`- ${item.description}`, this.styleSelector, { color: style.descriptionColor }));
    }
    
    // Badge
    if (item.badge) {
      parts.push(' ');
      parts.push(this.styleEngine.createStyledText(`[${item.badge}]`, 'text.warning'));
    }
    
    let result = parts.join('');
    
    // Handle disabled items
    if (item.disabled) {
      result = this.styleEngine.createStyledText(result, this.styleSelector, { color: style.descriptionColor });
    }
    
    return result;
  }

  getKeyDisplay(item, index) {
    // Return empty if showKeys is false
    if (!this.showKeys) {
      return '';
    }
    
    let key = '';
    
    // Use numbered index if numbered option is true
    if (this.numbered) {
      key = (index + 1).toString();
    } else if (item.key !== undefined) {
      key = item.key.toString();
    } else if (item.number !== undefined) {
      key = item.number.toString();
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

  padToWidth(text, width) {
    const textLength = colors.length(text);
    
    if (textLength >= width) {
      return text.slice(0, width);
    }
    
    return text + ' '.repeat(width - textLength);
  }

  // Navigation methods
  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.emit('selection-changed', this.selectedIndex, this.items[this.selectedIndex]);
  }

  selectPrevious() {
    this.selectedIndex = this.selectedIndex === 0 ? this.items.length - 1 : this.selectedIndex - 1;
    this.emit('selection-changed', this.selectedIndex, this.items[this.selectedIndex]);
  }

  selectItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.selectedIndex = index;
      this.emit('selection-changed', this.selectedIndex, this.items[index]);
    }
  }

  getSelectedItem() {
    return this.items[this.selectedIndex];
  }

  findItemByKey(key) {
    return this.items.find(item => 
      item.key && item.key.toString().toLowerCase() === key.toLowerCase()
    );
  }

  // Input handling
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

  // Data management
  setItems(items) {
    this.items = items;
    this.selectedIndex = 0;
    this.emit('items-changed', items);
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

  // Style management
  setStyle(styleSelector) {
    this.styleSelector = styleSelector;
    this.emit('style-changed', styleSelector);
  }

  setStyleEngine(styleEngine) {
    this.styleEngine = styleEngine;
    this.emit('style-engine-changed', styleEngine);
  }
  
  // Setter methods
  setTitle(title) {
    this.title = title;
    this.emit('title-changed', title);
  }
  
  setBreadcrumbs(breadcrumbs) {
    this.breadcrumbs = breadcrumbs;
    this.emit('breadcrumbs-changed', breadcrumbs);
  }
  
  setFooter(footer) {
    this.footer = footer;
    this.emit('footer-changed', footer);
  }

}

class ContextMenu extends Menu {
  separators: Set<number>;

  constructor(options = {}) {
    super({
      styleSelector: 'menu.compact',
      keyStyle: 'none',
      showKeys: false,
      showDescriptions: false,
      itemSpacing: 0,
      ...options
    });
    
    this.separators = new Set(options.separators || []);
  }

  render() {
    const style = this.styleEngine.getStyle(this.styleSelector);
    const lines = [];
    
    this.items.forEach((item, index) => {
      if (this.separators.has(index)) {
        const separator = '─'.repeat(Math.max(20, this.width - 4));
        lines.push(`  ${this.styleEngine.createStyledText(separator, this.styleSelector, { color: style.separatorColor })}`);
      }
      
      const isSelected = index === this.selectedIndex;
      const line = this.renderContextItem(item, isSelected, style);
      lines.push(line);
    });
    
    return lines;
  }

  renderContextItem(item, isSelected, style) {
    const prefix = isSelected ? 
      this.styleEngine.createStyledText('> ', this.styleSelector, { color: style.selectedKeyColor }) : 
      '  ';
    
    const labelColor = item.disabled ? style.descriptionColor : 
                      (isSelected ? style.selectedLabelColor : style.labelColor);
    
    const label = this.styleEngine.createStyledText(item.label || item.text, this.styleSelector, { color: labelColor });
    
    let line = prefix + label;
    
    if (item.shortcut) {
      const shortcutPadding = Math.max(1, this.width - 10 - (item.label || '').length);
      line += ' '.repeat(shortcutPadding);
      line += this.styleEngine.createStyledText(item.shortcut, this.styleSelector, { color: style.descriptionColor });
    }
    
    return line;
  }

  addSeparator(index) {
    this.separators.add(index);
  }

  removeSeparator(index) {
    this.separators.delete(index);
  }
}

export { ContextMenu };
export default Menu;