const UIComponent = require('./UIComponent');
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');
const formatting = require('../utils/formatting');

class Table extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.headers = options.headers || [];
    this.rows = options.rows || [];
    this.columnWidths = options.columnWidths || [];
    this.columnAligns = options.columnAligns || [];
    this.border = options.border || 'single';
    this.compact = options.compact || false;
    this.showHeaders = options.showHeaders !== false;
    this.headerSeparator = options.headerSeparator !== false;
    this.borderColor = options.borderColor || 'border';
    this.headerColor = options.headerColor || 'title';
    
    // Auto-calculate column widths if not provided
    if (this.columnWidths.length === 0 && this.headers.length > 0) {
      this.calculateColumnWidths();
    }
  }

  calculateColumnWidths() {
    // Initialize with header widths
    this.columnWidths = this.headers.map(header => colors.length(header));
    
    // Check all row data for max width
    this.rows.forEach(row => {
      row.forEach((cell, index) => {
        const cellLength = colors.length(String(cell));
        if (cellLength > this.columnWidths[index]) {
          this.columnWidths[index] = cellLength;
        }
      });
    });
    
    // Add padding
    this.columnWidths = this.columnWidths.map(width => width + 2);
  }

  render() {
    this.buffer = [];
    const chars = ascii.BOX_DRAWING[this.border] || ascii.BOX_DRAWING.single;
    
    if (!this.compact) {
      // Top border
      this.renderTopBorder(chars);
    }
    
    // Headers
    if (this.showHeaders && this.headers.length > 0) {
      this.renderHeaders(chars);
      
      if (this.headerSeparator) {
        this.renderSeparator(chars);
      }
    }
    
    // Rows
    this.renderRows(chars);
    
    if (!this.compact) {
      // Bottom border
      this.renderBottomBorder(chars);
    }
    
    return this.buffer;
  }

  renderTopBorder(chars) {
    let line = chars.topLeft;
    
    this.columnWidths.forEach((width, index) => {
      line += chars.horizontal.repeat(width);
      if (index < this.columnWidths.length - 1) {
        line += chars.cross || chars.horizontal;
      }
    });
    
    line += chars.topRight;
    this.buffer.push(colors.color(line, this.borderColor));
  }

  renderBottomBorder(chars) {
    let line = chars.bottomLeft;
    
    this.columnWidths.forEach((width, index) => {
      line += chars.horizontal.repeat(width);
      if (index < this.columnWidths.length - 1) {
        line += chars.cross || chars.horizontal;
      }
    });
    
    line += chars.bottomRight;
    this.buffer.push(colors.color(line, this.borderColor));
  }

  renderHeaders(chars) {
    let line = '';
    
    if (!this.compact) {
      line += colors.color(chars.vertical, this.borderColor);
    }
    
    this.headers.forEach((header, index) => {
      const width = this.columnWidths[index];
      const align = this.columnAligns[index] || 'left';
      const formatted = this.formatCell(header, width, align);
      line += colors.color(formatted, this.headerColor);
      
      if (index < this.headers.length - 1) {
        line += colors.color(chars.vertical, this.borderColor);
      }
    });
    
    if (!this.compact) {
      line += colors.color(chars.vertical, this.borderColor);
    }
    
    this.buffer.push(line);
  }

  renderSeparator(chars) {
    let line = '';
    
    if (!this.compact) {
      line += colors.color(chars.vertical, this.borderColor);
    }
    
    this.columnWidths.forEach((width, index) => {
      line += colors.color(chars.horizontal.repeat(width), this.borderColor);
      if (index < this.columnWidths.length - 1) {
        line += colors.color(chars.vertical, this.borderColor);
      }
    });
    
    if (!this.compact) {
      line += colors.color(chars.vertical, this.borderColor);
    }
    
    this.buffer.push(line);
  }

  renderRows(chars) {
    this.rows.forEach(row => {
      let line = '';
      
      if (!this.compact) {
        line += colors.color(chars.vertical, this.borderColor);
      }
      
      row.forEach((cell, index) => {
        const width = this.columnWidths[index];
        const align = this.columnAligns[index] || 'left';
        
        // Check if cell has color information
        let cellContent = String(cell);
        let cellColor = null;
        
        if (typeof cell === 'object' && cell.text) {
          cellContent = cell.text;
          cellColor = cell.color;
        }
        
        const formatted = this.formatCell(cellContent, width, align);
        line += cellColor ? colors.color(formatted, cellColor) : formatted;
        
        if (index < row.length - 1) {
          line += colors.color(chars.vertical, this.borderColor);
        }
      });
      
      // Pad remaining columns if row is shorter
      for (let i = row.length; i < this.columnWidths.length; i++) {
        if (i > 0) {
          line += colors.color(chars.vertical, this.borderColor);
        }
        line += ' '.repeat(this.columnWidths[i]);
      }
      
      if (!this.compact) {
        line += colors.color(chars.vertical, this.borderColor);
      }
      
      this.buffer.push(line);
    });
  }

  formatCell(content, width, align = 'left') {
    const contentLength = colors.length(content);
    
    if (contentLength > width) {
      return formatting.truncate(content, width);
    }
    
    const padding = width - contentLength;
    
    switch (align) {
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
      
      case 'right':
        return ' '.repeat(padding) + content;
      
      case 'left':
      default:
        return content + ' '.repeat(padding);
    }
  }

  addRow(row) {
    this.rows.push(row);
    
    // Recalculate widths if needed
    row.forEach((cell, index) => {
      const cellLength = colors.length(String(cell));
      if (cellLength + 2 > this.columnWidths[index]) {
        this.columnWidths[index] = cellLength + 2;
      }
    });
    
    this.emit('row-added', row);
  }

  setRows(rows) {
    this.rows = rows;
    this.calculateColumnWidths();
    this.emit('rows-changed', rows);
  }

  setHeaders(headers) {
    this.headers = headers;
    this.calculateColumnWidths();
    this.emit('headers-changed', headers);
  }

  clear() {
    this.rows = [];
    this.emit('table-cleared');
  }
}

module.exports = Table;