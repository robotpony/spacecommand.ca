import { EventEmitter } from 'events';
import { UIComponentOptions, Position, UIComponentEvents } from '../types';

/**
 * Base class for all UI components in the SpaceCommand UX system.
 * Provides common functionality for positioning, sizing, visibility, focus management,
 * and hierarchical component relationships.
 * 
 * @extends EventEmitter
 * @example
 * // Extend UIComponent to create custom components
 * class MyComponent extends UIComponent {
 *   render(): string[] {
 *     return ['My custom component'];
 *   }
 * }
 */
export class UIComponent extends EventEmitter {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public visible: boolean;
  public focused: boolean;
  public parent: UIComponent | null;
  public children: UIComponent[];
  public buffer: string[];

  /**
   * Creates a new UI component.
   * 
   * @param options - Configuration options
   */
  constructor(options: UIComponentOptions = {}) {
    super();
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 80;
    this.height = options.height || 24;
    this.visible = options.visible !== undefined ? options.visible : true;
    this.focused = false;
    this.parent = null;
    this.children = [];
    this.buffer = [];
  }

  /**
   * Sets the position of the component.
   * 
   * @param x - The new X coordinate
   * @param y - The new Y coordinate
   * @fires UIComponent#position-changed
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.emit('position-changed', { x, y });
  }

  /**
   * Sets the size of the component.
   * 
   * @param width - The new width
   * @param height - The new height
   * @fires UIComponent#size-changed
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.emit('size-changed', { width, height });
  }

  /**
   * Makes the component visible.
   * 
   * @fires UIComponent#visibility-changed
   */
  show(): void {
    this.visible = true;
    this.emit('visibility-changed', true);
  }

  /**
   * Hides the component.
   * 
   * @fires UIComponent#visibility-changed
   */
  hide(): void {
    this.visible = false;
    this.emit('visibility-changed', false);
  }

  /**
   * Gives focus to the component.
   * 
   * @fires UIComponent#focus-gained
   */
  focus(): void {
    this.focused = true;
    this.emit('focus-gained');
  }

  /**
   * Removes focus from the component.
   * 
   * @fires UIComponent#focus-lost
   */
  blur(): void {
    this.focused = false;
    this.emit('focus-lost');
  }

  /**
   * Adds a child component.
   * 
   * @param component - The component to add as a child
   */
  addChild(component: UIComponent): void {
    component.parent = this;
    this.children.push(component);
  }

  /**
   * Removes a child component.
   * 
   * @param component - The component to remove
   */
  removeChild(component: UIComponent): void {
    const index = this.children.indexOf(component);
    if (index > -1) {
      component.parent = null;
      this.children.splice(index, 1);
    }
  }

  /**
   * Renders the component to an array of strings.
   * Must be implemented by subclasses.
   * 
   * @abstract
   * @returns Array of rendered lines
   * @throws If not implemented by subclass
   */
  render(): string[] {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Updates the component with new data.
   * 
   * @param data - The data to update with
   * @fires UIComponent#update
   */
  update(data: any): void {
    this.emit('update', data);
  }

  /**
   * Clears the component's render buffer.
   * 
   * @fires UIComponent#clear
   */
  clear(): void {
    this.buffer = [];
    this.emit('clear');
  }

  /**
   * Gets the absolute position of the component relative to the root.
   * 
   * @returns The absolute position
   */
  getAbsolutePosition(): Position {
    let x = this.x;
    let y = this.y;
    let parent = this.parent;
    
    while (parent) {
      x += parent.x;
      y += parent.y;
      parent = parent.parent;
    }
    
    return { x, y };
  }

  /**
   * Checks if a point is inside the component's bounds.
   * 
   * @param x - The X coordinate to check
   * @param y - The Y coordinate to check
   * @returns True if the point is inside the component
   */
  isPointInside(x: number, y: number): boolean {
    const pos = this.getAbsolutePosition();
    return x >= pos.x && 
           x < pos.x + this.width && 
           y >= pos.y && 
           y < pos.y + this.height;
  }

  /**
   * Handles user input. Override in subclasses to provide input handling.
   * 
   * @param input - The input to handle
   * @returns True if the input was handled, false otherwise
   */
  handleInput(_input: string): boolean {
    return false;
  }

  // Type-safe event emitter methods
  emit<K extends keyof UIComponentEvents>(event: K, ...args: UIComponentEvents[K] extends void ? [] : [UIComponentEvents[K]]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof UIComponentEvents>(event: K, listener: (arg: UIComponentEvents[K]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof UIComponentEvents>(event: K, listener: (arg: UIComponentEvents[K]) => void): this {
    return super.once(event, listener);
  }

  off<K extends keyof UIComponentEvents>(event: K, listener: (arg: UIComponentEvents[K]) => void): this {
    return super.off(event, listener);
  }
}

export default UIComponent;