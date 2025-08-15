const { Window, Dialog } = require('../components/Window');
const { MenuV2, ContextMenuV2 } = require('../components/MenuV2');
const { DecorationV2, TitleScreenV2 } = require('../components/DecorationV2');
const { StyleEngine } = require('../rendering/StyleEngine');
const LayoutEngine = require('../rendering/LayoutEngine');
const AnsiParser = require('./AnsiParser');

class WindowManager {
  constructor(options = {}) {
    this.viewport = {
      width: options.width || this.getTerminalWidth(),
      height: options.height || this.getTerminalHeight()
    };
    this.manualViewport = !!(options.width || options.height); // Set if viewport specified in options
    this.windows = new Map();
    this.focusStack = [];
    this.styleEngine = new StyleEngine();
    this.layoutEngine = new LayoutEngine();
    this.zIndex = 0;
  }

  createWindow(id, options = {}) {
    const window = new Window({
      width: 40,
      height: 20,
      ...options,
      styleEngine: this.styleEngine
    });
    
    this.windows.set(id, {
      window,
      zIndex: this.zIndex++,
      visible: true,
      modal: options.modal || false
    });
    
    if (options.autoFocus !== false) {
      this.focus(id);
    }
    
    return window;
  }

  createDialog(id, options = {}) {
    const dialog = new Dialog({
      width: 50,
      height: 15,
      ...options,
      styleEngine: this.styleEngine
    });
    
    if (options.center !== false) {
      dialog.center(this.viewport.width, this.viewport.height);
    }
    
    this.windows.set(id, {
      window: dialog,
      zIndex: this.zIndex++,
      visible: true,
      modal: true
    });
    
    this.focus(id);
    return dialog;
  }

  createMenu(id, items, options = {}) {
    const menu = new MenuV2({
      items,
      width: options.width || 30,
      height: options.height || items.length + 2,
      styleEngine: this.styleEngine,
      ...options
    });
    
    const window = this.createWindow(id, {
      title: options.title || 'Menu',
      content: menu,
      width: menu.width + 4,
      height: menu.height + 4,
      ...options
    });
    
    return { window, menu };
  }

  createContextMenu(id, items, x, y, options = {}) {
    const menu = new ContextMenuV2({
      items,
      width: options.width || 25,
      height: items.length,
      styleEngine: this.styleEngine,
      ...options
    });
    
    const window = this.createWindow(id, {
      x,
      y,
      content: menu,
      width: menu.width + 2,
      height: menu.height + 2,
      border: 'single',
      padding: 0,
      autoFocus: true,
      ...options
    });
    
    return { window, menu };
  }

  createTitleScreen(id, options = {}) {
    const titleScreen = new TitleScreenV2({
      width: this.viewport.width,
      height: this.viewport.height,
      styleEngine: this.styleEngine,
      ...options
    });
    
    this.windows.set(id, {
      window: { 
        render: () => titleScreen.render(),
        x: 0,
        y: 0,
        width: this.viewport.width,
        height: this.viewport.height
      },
      zIndex: this.zIndex++,
      visible: true,
      modal: false
    });
    
    this.focus(id);
    return titleScreen;
  }

  createMessageBox(id, message, buttons = ['OK'], options = {}) {
    const dialog = this.createDialog(id, {
      title: options.title || 'Message',
      content: Array.isArray(message) ? message : [message],
      buttons,
      width: options.width || Math.max(40, Math.max(...(Array.isArray(message) ? message : [message])).length + 8),
      height: options.height || (Array.isArray(message) ? message.length : 1) + 8,
      ...options
    });
    
    return dialog;
  }

  show(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.visible = true;
      this.focus(id);
    }
  }

  hide(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.visible = false;
      this.removeFocus(id);
    }
  }

  close(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      this.removeFocus(id);
      this.windows.delete(id);
    }
  }

  focus(id) {
    if (!this.windows.has(id)) return;
    
    this.removeFocus(id);
    this.focusStack.push(id);
    
    const windowData = this.windows.get(id);
    if (windowData && windowData.window.focus) {
      windowData.window.focus();
    }
  }

  removeFocus(id) {
    const index = this.focusStack.indexOf(id);
    if (index > -1) {
      this.focusStack.splice(index, 1);
    }
    
    const windowData = this.windows.get(id);
    if (windowData && windowData.window.blur) {
      windowData.window.blur();
    }
  }

  getFocused() {
    if (this.focusStack.length === 0) return null;
    const focusedId = this.focusStack[this.focusStack.length - 1];
    return this.windows.get(focusedId);
  }

  moveToFront(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.zIndex = this.zIndex++;
    }
  }

  setPosition(id, x, y) {
    const windowData = this.windows.get(id);
    if (windowData && windowData.window.setPosition) {
      windowData.window.setPosition(x, y);
    }
  }

  setSize(id, width, height) {
    const windowData = this.windows.get(id);
    if (windowData && windowData.window.setSize) {
      windowData.window.setSize(width, height);
    }
  }

  center(id) {
    const windowData = this.windows.get(id);
    if (windowData && windowData.window.center) {
      windowData.window.center(this.viewport.width, this.viewport.height);
    }
  }

  handleInput(input) {
    const focused = this.getFocused();
    if (focused && focused.window.handleInput) {
      return focused.window.handleInput(input);
    }
    return false;
  }

  render() {
    // Initialize buffer with parsed empty lines
    // Reserve the last line for cursor/command prompt in BBS-style interfaces
    const renderHeight = this.viewport.height - 1;
    const parsedBuffer = [];
    for (let y = 0; y < renderHeight; y++) {
      parsedBuffer[y] = [];
      for (let x = 0; x < this.viewport.width; x++) {
        parsedBuffer[y].push({ char: ' ', style: '' });
      }
    }
    
    const sortedWindows = Array.from(this.windows.entries())
      .filter(([id, data]) => data.visible)
      .sort((a, b) => a[1].zIndex - b[1].zIndex);
    
    // Render each window into the buffer
    for (const [id, windowData] of sortedWindows) {
      const window = windowData.window;
      
      if (window.render) {
        const windowLines = window.render();
        const startX = window.x || 0;
        const startY = window.y || 0;
        
        windowLines.forEach((line, lineIndex) => {
          const targetY = startY + lineIndex;
          
          if (targetY >= 0 && targetY < renderHeight) {
            // Parse the window line
            const parsedLine = AnsiParser.parse(line);
            
            // Composite onto the buffer
            for (let i = 0; i < parsedLine.length; i++) {
              const targetX = startX + i;
              if (targetX >= 0 && targetX < this.viewport.width) {
                // Always overwrite - windows should be opaque
                // This ensures proper window rendering with their backgrounds
                parsedBuffer[targetY][targetX] = parsedLine[i];
              }
            }
          }
        });
      }
    }
    
    // Convert parsed buffer back to strings with ANSI codes
    const buffer = [];
    for (let y = 0; y < renderHeight; y++) {
      buffer.push(AnsiParser.unparse(parsedBuffer[y]));
    }
    
    return buffer;
  }

  renderToString() {
    return this.render().join('\n');
  }

  renderToConsole() {
    console.clear();
    console.log(this.renderToString());
  }

  clear() {
    this.windows.clear();
    this.focusStack = [];
    this.zIndex = 0;
  }

  getWindow(id) {
    const windowData = this.windows.get(id);
    return windowData ? windowData.window : null;
  }

  getWindows() {
    return Array.from(this.windows.keys());
  }

  setViewport(width, height) {
    this.viewport = { width, height };
    this.manualViewport = true; // Flag to indicate viewport was manually set
  }

  resetViewport() {
    this.manualViewport = false;
    return this.updateViewport();
  }

  setTheme(themeName) {
    this.styleEngine.setTheme(themeName);
  }

  getTerminalWidth() {
    if (process.stdout && process.stdout.columns) {
      return Math.max(80, process.stdout.columns); // Minimum 80 columns
    }
    return 80; // Fallback
  }

  getTerminalHeight() {
    if (process.stdout && process.stdout.rows) {
      return Math.max(24, process.stdout.rows); // Minimum 24 rows
    }
    return 24; // Fallback
  }

  updateViewport() {
    // Only update viewport if it wasn't manually set
    if (!this.manualViewport) {
      this.viewport = {
        width: this.getTerminalWidth(),
        height: this.getTerminalHeight()
      };
    }
    return this.viewport;
  }
}

module.exports = WindowManager;