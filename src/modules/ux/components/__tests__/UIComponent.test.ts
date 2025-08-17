import { UIComponent } from '../UIComponent';

describe('UIComponent', () => {
  let component: UIComponent;

  beforeEach(() => {
    component = new UIComponent({
      x: 10,
      y: 5,
      width: 100,
      height: 50
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultComponent = new UIComponent();
      expect(defaultComponent.x).toBe(0);
      expect(defaultComponent.y).toBe(0);
      expect(defaultComponent.width).toBe(80);
      expect(defaultComponent.height).toBe(24);
      expect(defaultComponent.visible).toBe(true);
      expect(defaultComponent.focused).toBe(false);
      expect(defaultComponent.parent).toBe(null);
      expect(defaultComponent.children).toEqual([]);
      expect(defaultComponent.buffer).toEqual([]);
    });

    it('should initialize with provided options', () => {
      expect(component.x).toBe(10);
      expect(component.y).toBe(5);
      expect(component.width).toBe(100);
      expect(component.height).toBe(50);
    });

    it('should handle visible option correctly', () => {
      const hiddenComponent = new UIComponent({ visible: false });
      expect(hiddenComponent.visible).toBe(false);
    });
  });

  describe('setPosition', () => {
    it('should update position and emit position-changed event', () => {
      const listener = jest.fn();
      component.on('position-changed', listener);

      component.setPosition(20, 30);

      expect(component.x).toBe(20);
      expect(component.y).toBe(30);
      expect(listener).toHaveBeenCalledWith({ x: 20, y: 30 });
    });
  });

  describe('setSize', () => {
    it('should update size and emit size-changed event', () => {
      const listener = jest.fn();
      component.on('size-changed', listener);

      component.setSize(200, 100);

      expect(component.width).toBe(200);
      expect(component.height).toBe(100);
      expect(listener).toHaveBeenCalledWith({ width: 200, height: 100 });
    });
  });

  describe('show/hide', () => {
    it('should show component and emit visibility-changed event', () => {
      const listener = jest.fn();
      component.on('visibility-changed', listener);
      component.visible = false;

      component.show();

      expect(component.visible).toBe(true);
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should hide component and emit visibility-changed event', () => {
      const listener = jest.fn();
      component.on('visibility-changed', listener);

      component.hide();

      expect(component.visible).toBe(false);
      expect(listener).toHaveBeenCalledWith(false);
    });
  });

  describe('focus/blur', () => {
    it('should focus component and emit focus-gained event', () => {
      const listener = jest.fn();
      component.on('focus-gained', listener);

      component.focus();

      expect(component.focused).toBe(true);
      expect(listener).toHaveBeenCalled();
    });

    it('should blur component and emit focus-lost event', () => {
      const listener = jest.fn();
      component.on('focus-lost', listener);
      component.focused = true;

      component.blur();

      expect(component.focused).toBe(false);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('child management', () => {
    let child: UIComponent;

    beforeEach(() => {
      child = new UIComponent();
    });

    it('should add child component', () => {
      component.addChild(child);

      expect(component.children).toContain(child);
      expect(child.parent).toBe(component);
    });

    it('should remove child component', () => {
      component.addChild(child);
      component.removeChild(child);

      expect(component.children).not.toContain(child);
      expect(child.parent).toBe(null);
    });

    it('should handle removing non-existent child', () => {
      const otherChild = new UIComponent();
      component.addChild(child);

      component.removeChild(otherChild);

      expect(component.children).toContain(child);
      expect(child.parent).toBe(component);
    });
  });

  describe('render', () => {
    it('should throw error for abstract render method', () => {
      expect(() => component.render()).toThrow('render() must be implemented by subclass');
    });
  });

  describe('update', () => {
    it('should emit update event with data', () => {
      const listener = jest.fn();
      const testData = { test: 'data' };
      component.on('update', listener);

      component.update(testData);

      expect(listener).toHaveBeenCalledWith(testData);
    });
  });

  describe('clear', () => {
    it('should clear buffer and emit clear event', () => {
      const listener = jest.fn();
      component.on('clear', listener);
      component.buffer = ['test', 'data'];

      component.clear();

      expect(component.buffer).toEqual([]);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getAbsolutePosition', () => {
    it('should return component position when no parent', () => {
      const position = component.getAbsolutePosition();
      expect(position).toEqual({ x: 10, y: 5 });
    });

    it('should calculate absolute position with parent', () => {
      const parent = new UIComponent({ x: 20, y: 15 });
      const grandparent = new UIComponent({ x: 5, y: 3 });

      parent.addChild(component);
      grandparent.addChild(parent);

      const position = component.getAbsolutePosition();
      expect(position).toEqual({ x: 35, y: 23 }); // 10+20+5, 5+15+3
    });
  });

  describe('isPointInside', () => {
    it('should return true for point inside component bounds', () => {
      expect(component.isPointInside(15, 10)).toBe(true);
      expect(component.isPointInside(10, 5)).toBe(true); // top-left corner
      expect(component.isPointInside(109, 54)).toBe(true); // bottom-right corner
    });

    it('should return false for point outside component bounds', () => {
      expect(component.isPointInside(5, 10)).toBe(false); // left of component
      expect(component.isPointInside(15, 2)).toBe(false); // above component
      expect(component.isPointInside(110, 30)).toBe(false); // right of component
      expect(component.isPointInside(50, 60)).toBe(false); // below component
    });

    it('should work with parent component offset', () => {
      const parent = new UIComponent({ x: 20, y: 15 });
      parent.addChild(component);

      expect(component.isPointInside(35, 25)).toBe(true); // 30+20, 20+15
      expect(component.isPointInside(15, 10)).toBe(false); // relative position without parent offset
    });
  });

  describe('handleInput', () => {
    it('should return false by default', () => {
      expect(component.handleInput('test')).toBe(false);
    });
  });
});