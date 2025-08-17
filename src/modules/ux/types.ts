/**
 * Type definitions for the SpaceCommand UX system.
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface UIComponentOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
}

export interface UIComponentEvents {
  'position-changed': Position;
  'size-changed': Size;
  'visibility-changed': boolean;
  'focus-gained': void;
  'focus-lost': void;
  'update': any;
  'content-changed': any;
  'title-changed': string;
  'border-changed': any;
  'padding-changed': number;
  'button-selection-changed': any;
  'button-activated': any;
  'dialog-cancelled': void;
  'clear': void;
  'item-selected': any;
  'item-activated': any;
  'selection-changed': any;
  'items-changed': any;
  'item-added': any;
  'item-removed': any;
  'style-changed': any;
  'style-engine-changed': any;
  'breadcrumbs-changed': any;
  'footer-changed': any;
  'align-changed': any;
  'subtitle-changed': any;
  'version-changed': any;
}

export interface ContentArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BorderStyle = 'single' | 'double' | 'rounded' | 'thick' | 'dashed';
export type TitleAlign = 'left' | 'center' | 'right';
export type ColorName = string;

export interface RenderableContent {
  render(): string[];
  setSize?(width: number, height: number): void;
  parent?: any;
}

export type WindowContent = string | string[] | RenderableContent | any;

export interface WindowOptions extends UIComponentOptions {
  title?: string;
  border?: BorderStyle;
  padding?: number;
  content?: WindowContent;
  titleAlign?: TitleAlign;
  borderColor?: ColorName;
  titleColor?: ColorName;
}

export interface DialogOptions extends WindowOptions {
  buttons?: string[];
  buttonSpacing?: number;
}

export interface WindowEvents extends UIComponentEvents {
  'content-changed': WindowContent;
  'title-changed': string;
  'border-changed': BorderStyle;
  'padding-changed': number;
}

export interface DialogEvents extends WindowEvents {
  'button-selection-changed': { index: number; button: string };
  'button-activated': { index: number; button: string };
  'dialog-cancelled': void;
}

// Rendering system types
export interface Viewport {
  width: number;
  height: number;
}

export interface Cursor {
  x: number;
  y: number;
}

export interface TextStyle {
  color?: ColorName;
  background?: ColorName;
  bold?: boolean;
}

export interface BoxStyle {
  border?: BorderStyle;
  borderColor?: ColorName;
  fill?: string;
  fillColor?: ColorName;
}

export interface LineStyle {
  char?: string;
  color?: ColorName;
}

export interface RenderableComponent {
  x?: number;
  y?: number;
  render(): string[];
}