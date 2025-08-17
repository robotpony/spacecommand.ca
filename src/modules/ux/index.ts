/**
 * SpaceCommand UX Library - Main entry point
 * A terminal UI toolkit for building BBS-style interfaces
 */

// Core components
import { UIComponent } from './components/UIComponent';
import { Window, Dialog } from './components/Window';
import { Renderer } from './rendering/Renderer';

// Utilities
import * as colors from './utils/colors';
import * as ascii from './utils/ascii';
import * as formatting from './utils/formatting';

// Note: These require statements will be updated as we complete the conversion
const StatusBar = require('./components/StatusBar');
const Table = require('./components/Table');
const StandardGameScreen = require('./components/StandardGameScreen');
const Prompt = require('./components/Prompt');
import { Decoration, TitleScreen } from './components/Decoration';
import { Menu, ContextMenu } from './components/Menu';
const LayoutEngine = require('./rendering/LayoutEngine');
const { StyleEngine, StyledComponent, styled } = require('./rendering/StyleEngine');
const textStyles = require('./utils/textStyles');
import WindowManager from './utils/WindowManager';

export interface UXOptions {
  theme?: string;
  [key: string]: any;
}

/**
 * High-level API for easy UX system usage.
 * Provides a unified interface for creating and managing UI components.
 */
export class UX {
  public windowManager: any;
  public styleEngine: any;
  public renderer: Renderer;

  constructor(options: UXOptions = {}) {
    this.windowManager = new WindowManager(options);
    this.styleEngine = this.windowManager.styleEngine;
    this.renderer = new Renderer();
    
    // Set up global text styles helper
    textStyles.setGlobalStyleEngine(this.styleEngine);
    
    if (options.theme) {
      this.setTheme(options.theme);
    }
  }

  // Window management
  createWindow(id: string, options?: any): any {
    return this.windowManager.createWindow(id, options);
  }

  createDialog(id: string, options?: any): any {
    return this.windowManager.createDialog(id, options);
  }

  createMenu(id: string, items: any[], options?: any): any {
    return this.windowManager.createMenu(id, items, options);
  }

  createContextMenu(id: string, items: any[], x: number, y: number, options?: any): any {
    return this.windowManager.createContextMenu(id, items, x, y, options);
  }

  createTitleScreen(id: string, options?: any): any {
    return this.windowManager.createTitleScreen(id, options);
  }

  createMessageBox(id: string, message: string, buttons: string[], options?: any): any {
    return this.windowManager.createMessageBox(id, message, buttons, options);
  }

  // Component creation helpers
  menu(items: any[], options: any = {}): any {
    return new Menu({
      items,
      styleEngine: this.styleEngine,
      ...options
    });
  }

  contextMenu(items: any[], options: any = {}): any {
    return new ContextMenu({
      items,
      styleEngine: this.styleEngine,
      ...options
    });
  }

  decoration(content: any, options: any = {}): any {
    return new Decoration({
      content,
      styleEngine: this.styleEngine,
      ...options
    });
  }

  titleScreen(options: any = {}): any {
    return new TitleScreen({
      styleEngine: this.styleEngine,
      ...options
    });
  }

  window(options: any = {}): Window {
    return new Window(options);
  }

  dialog(options: any = {}): Dialog {
    return new Dialog(options);
  }

  statusBar(options: any = {}): any {
    return new StatusBar({
      styleEngine: this.styleEngine,
      ...options
    });
  }

  table(options: any = {}): any {
    return new Table(options);
  }

  standardGameScreen(options: any = {}): any {
    return new StandardGameScreen({
      styleEngine: this.styleEngine,
      ...options
    });
  }

  // Style management
  setTheme(themeName: string): void {
    this.styleEngine.setTheme(themeName);
    this.windowManager.setTheme(themeName);
  }

  defineStyle(selector: string, properties: any): void {
    this.styleEngine.defineStyle(selector, properties);
  }

  createStyledText(text: string, styleSelector: string, overrides?: any): any {
    return this.styleEngine.createStyledText(text, styleSelector, overrides);
  }

  // Window operations
  show(id: string): void {
    this.windowManager.show(id);
  }

  hide(id: string): void {
    this.windowManager.hide(id);
  }

  close(id: string): void {
    this.windowManager.close(id);
  }

  focus(id: string): void {
    this.windowManager.focus(id);
  }

  center(id: string): void {
    this.windowManager.center(id);
  }

  // Input handling
  handleInput(input: string): boolean {
    return this.windowManager.handleInput(input);
  }

  // Rendering
  render(): any {
    return this.windowManager.render();
  }

  renderToString(): string {
    return this.windowManager.renderToString();
  }

  renderToConsole(): void {
    this.windowManager.renderToConsole();
  }

  clear(): void {
    this.windowManager.clear();
  }

  // Viewport management
  updateViewport(): any {
    return this.windowManager.updateViewport();
  }

  getViewport(): any {
    return this.windowManager.viewport;
  }

  // Root window management
  setRootWindow(enabled: boolean): void {
    this.windowManager.setRootWindow(enabled);
  }

  setRootWindowBorder(borderStyle: string): void {
    this.windowManager.setRootWindowBorder(borderStyle);
  }

  setRootWindowColor(color: string): void {
    this.windowManager.setRootWindowColor(color);
  }

  // Utility access
  get colors(): typeof colors {
    return colors;
  }

  get ascii(): typeof ascii {
    return ascii;
  }

  get formatting(): typeof formatting {
    return formatting;
  }

  get textStyles(): any {
    return textStyles;
  }
}

/**
 * Creates a new UX instance with the specified options.
 * 
 * @param options - Configuration options for the UX system
 * @returns New UX instance
 */
export function createUX(options?: UXOptions): UX {
  return new UX(options);
}

// Export all components and utilities
export {
  // Core components
  UIComponent,
  Window,
  Dialog,
  StatusBar,
  Prompt,
  Table,
  StandardGameScreen,
  
  // UI Components
  Decoration,
  TitleScreen,
  Menu,
  ContextMenu,
  
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
  textStyles,
  WindowManager
};

// Default export for easy importing
export default {
  UX,
  createUX,
  UIComponent,
  Window,
  Dialog,
  Renderer,
  colors,
  ascii,
  formatting
};