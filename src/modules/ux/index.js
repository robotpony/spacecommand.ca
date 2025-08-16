// Core components
const UIComponent = require('./components/UIComponent');
const { Window, Dialog } = require('./components/Window');
const StatusBar = require('./components/StatusBar');
const Table = require('./components/Table');
const StandardGameScreen = require('./components/StandardGameScreen');

// V1 Components (original)
const { Decoration, TitleScreen } = require('./components/Decoration');
const { Menu, ContextMenu } = require('./components/Menu');

// V2 Components (refactored with style engine)
const { DecorationV2, TitleScreenV2 } = require('./components/DecorationV2');
const { MenuV2, ContextMenuV2 } = require('./components/MenuV2');

// Rendering system
const Renderer = require('./rendering/Renderer');
const LayoutEngine = require('./rendering/LayoutEngine');
const { StyleEngine, StyledComponent, styled } = require('./rendering/StyleEngine');

// Utilities
const colors = require('./utils/colors');
const ascii = require('./utils/ascii');
const formatting = require('./utils/formatting');
const WindowManager = require('./utils/WindowManager');

// High-level API for easy usage
class UX {
  constructor(options = {}) {
    this.windowManager = new WindowManager(options);
    this.styleEngine = this.windowManager.styleEngine;
    this.renderer = new Renderer();
    
    if (options.theme) {
      this.setTheme(options.theme);
    }
  }

  // Window management
  createWindow(id, options) {
    return this.windowManager.createWindow(id, options);
  }

  createDialog(id, options) {
    return this.windowManager.createDialog(id, options);
  }

  createMenu(id, items, options) {
    return this.windowManager.createMenu(id, items, options);
  }

  createContextMenu(id, items, x, y, options) {
    return this.windowManager.createContextMenu(id, items, x, y, options);
  }

  createTitleScreen(id, options) {
    return this.windowManager.createTitleScreen(id, options);
  }

  createMessageBox(id, message, buttons, options) {
    return this.windowManager.createMessageBox(id, message, buttons, options);
  }

  // Component creation helpers
  menu(items, options = {}) {
    return new MenuV2({
      items,
      styleEngine: this.styleEngine,
      ...options
    });
  }

  contextMenu(items, options = {}) {
    return new ContextMenuV2({
      items,
      styleEngine: this.styleEngine,
      ...options
    });
  }

  decoration(content, options = {}) {
    return new DecorationV2({
      content,
      styleEngine: this.styleEngine,
      ...options
    });
  }

  titleScreen(options = {}) {
    return new TitleScreenV2({
      styleEngine: this.styleEngine,
      ...options
    });
  }

  window(options = {}) {
    return new Window(options);
  }

  dialog(options = {}) {
    return new Dialog(options);
  }

  statusBar(options = {}) {
    return new StatusBar({
      styleEngine: this.styleEngine,
      ...options
    });
  }

  table(options = {}) {
    return new Table(options);
  }

  standardGameScreen(options = {}) {
    return new StandardGameScreen({
      styleEngine: this.styleEngine,
      ...options
    });
  }

  // Style management
  setTheme(themeName) {
    this.styleEngine.setTheme(themeName);
    this.windowManager.setTheme(themeName);
  }

  defineStyle(selector, properties) {
    this.styleEngine.defineStyle(selector, properties);
  }

  createStyledText(text, styleSelector, overrides) {
    return this.styleEngine.createStyledText(text, styleSelector, overrides);
  }

  // Window operations
  show(id) {
    this.windowManager.show(id);
  }

  hide(id) {
    this.windowManager.hide(id);
  }

  close(id) {
    this.windowManager.close(id);
  }

  focus(id) {
    this.windowManager.focus(id);
  }

  center(id) {
    this.windowManager.center(id);
  }

  // Input handling
  handleInput(input) {
    return this.windowManager.handleInput(input);
  }

  // Rendering
  render() {
    return this.windowManager.render();
  }

  renderToString() {
    return this.windowManager.renderToString();
  }

  renderToConsole() {
    this.windowManager.renderToConsole();
  }

  clear() {
    this.windowManager.clear();
  }

  // Viewport management
  updateViewport() {
    return this.windowManager.updateViewport();
  }

  getViewport() {
    return this.windowManager.viewport;
  }

  // Root window management
  setRootWindow(enabled) {
    this.windowManager.setRootWindow(enabled);
  }

  setRootWindowBorder(borderStyle) {
    this.windowManager.setRootWindowBorder(borderStyle);
  }

  setRootWindowColor(color) {
    this.windowManager.setRootWindowColor(color);
  }

  // Utility access
  get colors() {
    return colors;
  }

  get ascii() {
    return ascii;
  }

  get formatting() {
    return formatting;
  }
}

// Create default instance
function createUX(options) {
  return new UX(options);
}

// Export everything
module.exports = {
  // Main API
  UX,
  createUX,
  
  // Core components
  UIComponent,
  Window,
  Dialog,
  StatusBar,
  Table,
  StandardGameScreen,
  
  // V1 Components (for backward compatibility)
  Decoration,
  TitleScreen,
  Menu,
  ContextMenu,
  
  // V2 Components (recommended)
  DecorationV2,
  TitleScreenV2,
  MenuV2,
  ContextMenuV2,
  
  // Rendering system
  Renderer,
  LayoutEngine,
  StyleEngine,
  StyledComponent,
  styled,
  
  // Utilities
  colors,
  ascii,
  formatting,
  WindowManager
};