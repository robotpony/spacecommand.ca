const { Menu, ContextMenu } = require('../Menu');

describe('Menu', () => {
  const testItems = [
    { label: 'Item 1', key: '1', description: 'First item' },
    { label: 'Item 2', key: '2', description: 'Second item' },
    { label: 'Item 3', key: '3', description: 'Third item', disabled: true }
  ];

  function createTestMenu(options = {}) {
    return new Menu({
      items: [...testItems], // Clone the array to avoid mutations affecting other tests
      title: 'Test Menu',
      width: 80,
      height: 24,
      ...options
    });
  }

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultMenu = new Menu();
      expect(defaultMenu.items).toEqual([]);
      expect(defaultMenu.title).toBe('');
      expect(defaultMenu.selectedIndex).toBe(0);
      expect(defaultMenu.showKeys).toBe(true);
      expect(defaultMenu.showDescriptions).toBe(true);
      expect(defaultMenu.keyStyle).toBe('brackets');
      expect(defaultMenu.itemSpacing).toBe(1);
      expect(defaultMenu.numbered).toBe(false);
      expect(defaultMenu.breadcrumbs).toEqual([]);
      expect(defaultMenu.footer).toBe('');
      expect(defaultMenu.columns).toBe(1);
    });

    it('should initialize with provided options', () => {
      const customMenu = new Menu({
        items: testItems,
        title: 'Custom Title',
        selectedIndex: 1,
        showKeys: false,
        keyStyle: 'parentheses',
        numbered: true,
        breadcrumbs: ['Home', 'Settings'],
        footer: 'Press ESC to exit',
        columns: 2
      });

      expect(customMenu.items).toEqual(testItems);
      expect(customMenu.title).toBe('Custom Title');
      expect(customMenu.selectedIndex).toBe(1);
      expect(customMenu.showKeys).toBe(false);
      expect(customMenu.keyStyle).toBe('parentheses');
      expect(customMenu.numbered).toBe(true);
      expect(customMenu.breadcrumbs).toEqual(['Home', 'Settings']);
      expect(customMenu.footer).toBe('Press ESC to exit');
      expect(customMenu.columns).toBe(2);
    });
  });

  describe('render', () => {
    it('should render menu with title and items', () => {
      const menu = createTestMenu();
      const result = menu.render();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(line => line.includes('Test Menu'))).toBe(true);
    });

    it('should render breadcrumbs when provided', () => {
      const menu = createTestMenu();
      menu.breadcrumbs = ['Home', 'Settings', 'Display'];
      const result = menu.render();
      expect(result.some(line => line.includes('Home > Settings > Display'))).toBe(true);
    });

    it('should render footer when provided', () => {
      const menu = createTestMenu();
      menu.footer = 'Press ESC to exit';
      const result = menu.render();
      expect(result.some(line => line.includes('Press ESC to exit'))).toBe(true);
    });
  });

  describe('item manipulation', () => {
    it('should add item and emit event', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('item-added', listener);
      const newItem = { label: 'New Item', key: '4' };

      menu.addItem(newItem);

      expect(menu.items).toContain(newItem);
      expect(listener).toHaveBeenCalledWith(newItem);
    });

    it('should remove item and emit event', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('item-removed', listener);
      const itemToRemove = menu.items[1];

      menu.removeItem(1);

      expect(menu.items).not.toContain(itemToRemove);
      expect(listener).toHaveBeenCalledWith(itemToRemove);
    });

    it('should adjust selectedIndex when removing selected item', () => {
      const menu = createTestMenu();
      menu.selectedIndex = 2;
      menu.removeItem(2);
      expect(menu.selectedIndex).toBe(1);
    });

    it('should handle removing invalid index', () => {
      const menu = createTestMenu();
      const originalLength = menu.items.length;
      menu.removeItem(10);
      expect(menu.items.length).toBe(originalLength);
    });

    it('should set items and reset selection', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('items-changed', listener);
      const newItems = [{ label: 'New Item 1' }, { label: 'New Item 2' }];
      menu.selectedIndex = 2;

      menu.setItems(newItems);

      expect(menu.items).toEqual(newItems);
      expect(menu.selectedIndex).toBe(0);
      expect(listener).toHaveBeenCalledWith(newItems);
    });
  });

  describe('selection', () => {
    it('should select item by index and emit event', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('selection-changed', listener);

      menu.selectItem(1);

      expect(menu.selectedIndex).toBe(1);
      expect(listener).toHaveBeenCalledWith(1, testItems[1]);
    });

    it('should not select invalid index', () => {
      const menu = createTestMenu();
      const originalIndex = menu.selectedIndex;
      menu.selectItem(10);
      expect(menu.selectedIndex).toBe(originalIndex);
    });

    it('should select next item with wrap-around', () => {
      const menu = createTestMenu();
      menu.selectItem(2);
      menu.selectNext();
      expect(menu.selectedIndex).toBe(0);
    });

    it('should select previous item with wrap-around', () => {
      const menu = createTestMenu();
      menu.selectItem(0);
      menu.selectPrevious();
      expect(menu.selectedIndex).toBe(2);
    });

    it('should get selected item', () => {
      const menu = createTestMenu();
      menu.selectedIndex = 1;
      expect(menu.getSelectedItem()).toBe(testItems[1]);
    });

    it('should find item by key', () => {
      const menu = createTestMenu();
      const item = menu.findItemByKey('2');
      expect(item).toEqual(testItems[1]);
    });

    it('should find item by key case-insensitively', () => {
      const menu = createTestMenu();
      const itemWithKey = { label: 'Item A', key: 'a' };
      menu.addItem(itemWithKey);
      const foundItem = menu.findItemByKey('A');
      expect(foundItem).toBe(itemWithKey);
    });
  });

  describe('key display formatting', () => {
    it('should format key with brackets style', () => {
      const menu = createTestMenu({ keyStyle: 'brackets' });
      const display = menu.getKeyDisplay(testItems[0], 0);
      expect(display).toBe('[1]');
    });

    it('should format key with parentheses style', () => {
      const menu = createTestMenu({ keyStyle: 'parentheses' });
      const display = menu.getKeyDisplay(testItems[0], 0);
      expect(display).toBe('(1)');
    });

    it('should format key with plain style', () => {
      const menu = createTestMenu({ keyStyle: 'plain' });
      const display = menu.getKeyDisplay(testItems[0], 0);
      expect(display).toBe('1.');
    });

    it('should return empty string for none style', () => {
      const menu = createTestMenu({ keyStyle: 'none' });
      const display = menu.getKeyDisplay(testItems[0], 0);
      expect(display).toBe('');
    });

    it('should use numbered keys when numbered option is true', () => {
      const menu = createTestMenu({ numbered: true });
      const item = { label: 'Test' };
      const display = menu.getKeyDisplay(item, 2);
      expect(display).toBe('[3]');
    });

    it('should return empty string when showKeys is false', () => {
      const menu = createTestMenu({ showKeys: false });
      const display = menu.getKeyDisplay(testItems[0], 0);
      expect(display).toBe('');
    });
  });

  describe('input handling', () => {
    it('should handle arrow up navigation', () => {
      const menu = createTestMenu();
      menu.selectItem(1);
      const result = menu.handleInput('arrowup');
      expect(result).toBe(true);
      expect(menu.selectedIndex).toBe(0);
    });

    it('should handle w key navigation', () => {
      const menu = createTestMenu();
      menu.selectItem(1);
      const result = menu.handleInput('w');
      expect(result).toBe(true);
      expect(menu.selectedIndex).toBe(0);
    });

    it('should handle arrow down navigation', () => {
      const menu = createTestMenu();
      menu.selectItem(1);
      const result = menu.handleInput('arrowdown');
      expect(result).toBe(true);
      expect(menu.selectedIndex).toBe(2);
    });

    it('should handle s key navigation', () => {
      const menu = createTestMenu();
      menu.selectItem(1);
      const result = menu.handleInput('s');
      expect(result).toBe(true);
      expect(menu.selectedIndex).toBe(2);
    });

    it('should handle enter key selection', () => {
      const menu = createTestMenu();
      menu.selectItem(1);
      const listener = jest.fn();
      menu.on('item-selected', listener);

      const result = menu.handleInput('enter');

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(testItems[1], 1);
    });

    it('should handle space key selection', () => {
      const menu = createTestMenu();
      menu.selectItem(1);
      const listener = jest.fn();
      menu.on('item-selected', listener);

      const result = menu.handleInput(' ');

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(testItems[1], 1);
    });

    it('should handle direct key activation', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('item-activated', listener);

      const result = menu.handleInput('1');

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith(testItems[0]);
    });

    it('should not activate disabled items', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('item-activated', listener);

      const result = menu.handleInput('3');

      expect(result).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should return false for unhandled input', () => {
      const menu = createTestMenu();
      const result = menu.handleInput('x');
      expect(result).toBe(false);
    });
  });

  describe('breadcrumbs, title, and footer setters', () => {
    it('should set breadcrumbs and emit event', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('breadcrumbs-changed', listener);
      const breadcrumbs = ['Home', 'Settings'];

      menu.setBreadcrumbs(breadcrumbs);

      expect(menu.breadcrumbs).toEqual(breadcrumbs);
      expect(listener).toHaveBeenCalledWith(breadcrumbs);
    });

    it('should set title and emit event', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('title-changed', listener);
      const title = 'New Title';

      menu.setTitle(title);

      expect(menu.title).toBe(title);
      expect(listener).toHaveBeenCalledWith(title);
    });

    it('should set footer and emit event', () => {
      const menu = createTestMenu();
      const listener = jest.fn();
      menu.on('footer-changed', listener);
      const footer = 'New Footer';

      menu.setFooter(footer);

      expect(menu.footer).toBe(footer);
      expect(listener).toHaveBeenCalledWith(footer);
    });
  });
});

describe('ContextMenu', () => {
  let contextMenu;
  const testItems = [
    { label: 'Cut', shortcut: 'Ctrl+X' },
    { label: 'Copy', shortcut: 'Ctrl+C' },
    { label: 'Paste', shortcut: 'Ctrl+V', disabled: true }
  ];

  beforeEach(() => {
    contextMenu = new ContextMenu({
      items: testItems,
      width: 40,
      separators: [1]
    });
  });

  describe('constructor', () => {
    it('should initialize with context menu defaults', () => {
      const freshContextMenu = new ContextMenu({
        items: testItems,
        width: 40,
        separators: [1]
      });
      expect(freshContextMenu.showKeys).toBe(false);
      expect(freshContextMenu.keyStyle).toBe('none');
      expect(freshContextMenu.itemSpacing).toBe(0);
      expect(freshContextMenu.separators.has(1)).toBe(true);
    });
  });

  describe('render', () => {
    it('should render context menu items', () => {
      const result = contextMenu.render();
      expect(result.length).toBe(4); // 3 items + 1 separator
    });

    it('should include separators at specified indices', () => {
      const result = contextMenu.render();
      expect(result[1]).toContain('─'); // separator should be at index 1
    });
  });

  describe('addSeparator', () => {
    it('should add separator at specified index', () => {
      contextMenu.addSeparator(2);
      expect(contextMenu.separators.has(2)).toBe(true);
    });
  });
});