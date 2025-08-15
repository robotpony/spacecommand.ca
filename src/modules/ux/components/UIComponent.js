const EventEmitter = require('events');

/**
 * Base class for all UI components in the SpaceCommand UX system.
 * Provides common functionality for positioning, sizing, visibility, focus management,
 * and hierarchical component relationships.
 * 
 * @extends EventEmitter
 * @example
 * // Extend UIComponent to create custom components
 * class MyComponent extends UIComponent {
 *   render() {
 *     return ['My custom component'];
 *   }
 * }
 */
class UIComponent extends EventEmitter {
  /**
   * Creates a new UI component.
   * 
   * @param {Object} options - Configuration options
   * @param {number} [options.x=0] - X position of the component
   * @param {number} [options.y=0] - Y position of the component
   * @param {number} [options.width=80] - Width of the component
   * @param {number} [options.height=24] - Height of the component
   * @param {boolean} [options.visible=true] - Whether the component is visible
   */
  constructor(options = {}) {
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
   * @param {number} x - The new X coordinate
   * @param {number} y - The new Y coordinate
   * @fires UIComponent#position-changed
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.emit('position-changed', { x, y });
  }

  /**
   * Sets the size of the component.
   * 
   * @param {number} width - The new width
   * @param {number} height - The new height
   * @fires UIComponent#size-changed
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.emit('size-changed', { width, height });
  }

  /**
   * Makes the component visible.
   * 
   * @fires UIComponent#visibility-changed
   */
  show() {
    this.visible = true;
    this.emit('visibility-changed', true);
  }

  /**
   * Hides the component.
   * 
   * @fires UIComponent#visibility-changed
   */
  hide() {
    this.visible = false;
    this.emit('visibility-changed', false);
  }

  /**
   * Gives focus to the component.
   * 
   * @fires UIComponent#focus-gained
   */
  focus() {
    this.focused = true;
    this.emit('focus-gained');
  }

  /**
   * Removes focus from the component.
   * 
   * @fires UIComponent#focus-lost
   */
  blur() {
    this.focused = false;
    this.emit('focus-lost');
  }

  /**
   * Adds a child component.
   * 
   * @param {UIComponent} component - The component to add as a child
   */
  addChild(component) {
    component.parent = this;
    this.children.push(component);
  }

  /**
   * Removes a child component.
   * 
   * @param {UIComponent} component - The component to remove
   */
  removeChild(component) {
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
   * @returns {string[]} Array of rendered lines
   * @throws {Error} If not implemented by subclass
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Updates the component with new data.
   * 
   * @param {*} data - The data to update with
   * @fires UIComponent#update
   */
  update(data) {
    this.emit('update', data);
  }

  /**
   * Clears the component's render buffer.
   * 
   * @fires UIComponent#clear
   */
  clear() {
    this.buffer = [];
    this.emit('clear');
  }

  /**
   * Gets the absolute position of the component relative to the root.
   * 
   * @returns {{x: number, y: number}} The absolute position
   */
  getAbsolutePosition() {
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
   * @param {number} x - The X coordinate to check
   * @param {number} y - The Y coordinate to check
   * @returns {boolean} True if the point is inside the component
   */
  isPointInside(x, y) {
    const pos = this.getAbsolutePosition();
    return x >= pos.x && 
           x < pos.x + this.width && 
           y >= pos.y && 
           y < pos.y + this.height;
  }

  /**
   * Handles user input. Override in subclasses to provide input handling.
   * 
   * @param {string} input - The input to handle
   * @returns {boolean} True if the input was handled, false otherwise
   */
  handleInput(input) {
    return false;
  }
}

module.exports = UIComponent;