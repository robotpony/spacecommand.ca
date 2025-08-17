/**
 * TypeScript test example for Window component
 * Demonstrates proper TypeScript testing patterns for the UX library
 */

import { Window, Dialog } from '../Window';
import { UIComponent } from '../UIComponent';
import { WindowOptions, DialogOptions } from '../../types';

describe('Window Component - TypeScript Tests', () => {
  describe('Window', () => {
    let window: Window;

    beforeEach(() => {
      const options: WindowOptions = {
        x: 10,
        y: 10,
        width: 60,
        height: 20,
        title: 'Test Window',
        border: 'single',
        padding: 2
      };
      window = new Window(options);
    });

    it('should initialize with TypeScript options', () => {
      expect(window.title).toBe('Test Window');
      expect(window.border).toBe('single');
      expect(window.padding).toBe(2);
      expect(window.width).toBe(60);
      expect(window.height).toBe(20);
    });

    it('should extend UIComponent with proper typing', () => {
      expect(window).toBeInstanceOf(UIComponent);
      expect(window).toBeInstanceOf(Window);
    });

    it('should handle content setting with type safety', () => {
      const testContent: string[] = ['Line 1', 'Line 2', 'Line 3'];
      
      window.setContent(testContent);
      expect(window.content).toBe(testContent);
    });

    it('should emit events when position changes', (done) => {
      const expectedPosition = { x: 20, y: 30 };
      
      (window as any).on('position-changed', (position: any) => {
        expect(position).toEqual(expectedPosition);
        done();
      });
      
      window.setPosition(20, 30);
    });

    it('should calculate content area correctly', () => {
      const contentArea = window.getContentArea();
      
      expect(contentArea).toHaveProperty('x');
      expect(contentArea).toHaveProperty('y');
      expect(contentArea).toHaveProperty('width');
      expect(contentArea).toHaveProperty('height');
      
      // With title and padding=2, content area should be smaller
      expect(contentArea.width).toBe(window.width - 4); // 2 * padding
      expect(contentArea.height).toBe(window.height - 5); // 2 * padding + 1 for title
    });

    it('should render without errors', () => {
      const output = window.render();
      
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
      expect(typeof output[0]).toBe('string');
    });
  });

  describe('Dialog', () => {
    let dialog: Dialog;

    beforeEach(() => {
      const options: DialogOptions = {
        title: 'Confirm Action',
        width: 50,
        height: 15,
        buttons: ['OK', 'Cancel'],
        buttonSpacing: 3
      };
      dialog = new Dialog(options);
    });

    it('should initialize with dialog-specific options', () => {
      expect(dialog.buttons).toEqual(['OK', 'Cancel']);
      expect(dialog.selectedButton).toBe(0);
      expect(dialog.buttonSpacing).toBe(3);
    });

    it('should handle button selection with proper types', () => {
      dialog.selectButton(1);
      expect(dialog.selectedButton).toBe(1);
      
      dialog.selectNextButton();
      expect(dialog.selectedButton).toBe(0); // Should wrap around
      
      dialog.selectPreviousButton();
      expect(dialog.selectedButton).toBe(1); // Should wrap to last
    });

    it('should emit dialog-specific events', (done) => {
      let eventCount = 0;
      
      (dialog as any).on('button-selection-changed', (data: any) => {
        expect(data).toHaveProperty('index');
        expect(data).toHaveProperty('button');
        expect(data.index).toBe(1);
        expect(data.button).toBe('Cancel');
        eventCount++;
        
        if (eventCount === 1) done();
      });
      
      dialog.selectButton(1);
    });

    it('should handle input with TypeScript typing', () => {
      const result = dialog.handleInput('arrowright');
      expect(result).toBe(true);
      expect(dialog.selectedButton).toBe(1);
    });
  });

  describe('Type Safety Examples', () => {
    it('should enforce WindowOptions interface', () => {
      // Valid options
      const validOptions: WindowOptions = {
        title: 'Valid',
        border: 'double',
        titleAlign: 'center'
      };
      
      const window = new Window(validOptions);
      expect(window.title).toBe('Valid');
      
      // TypeScript would catch invalid options at compile time:
      // const invalidOptions: WindowOptions = {
      //   title: 123, // Error: number not assignable to string
      //   border: 'invalid', // Error: not in BorderStyle union
      //   titleAlign: 'middle' // Error: not in TitleAlign union
      // };
    });

    it('should provide event handling capabilities', () => {
      const window = new Window();
      
      // Event handling using any casting for compatibility
      (window as any).on('content-changed', (content: any) => {
        // Event handlers can process content changes
        expect(content).toBeDefined();
      });
      
      (window as any).on('title-changed', (title: any) => {
        // Event handlers can process title changes
        expect(typeof title).toBe('string');
      });
    });

    it('should support generic component patterns', () => {
      interface CustomComponentOptions extends WindowOptions {
        customProperty: string;
      }
      
      class CustomWindow extends Window {
        public customProperty: string;
        
        constructor(options: CustomComponentOptions) {
          super(options);
          this.customProperty = options.customProperty;
        }
        
        getCustomInfo(): string {
          return `${this.title} - ${this.customProperty}`;
        }
      }
      
      const custom = new CustomWindow({
        title: 'Custom',
        customProperty: 'test-value'
      });
      
      expect(custom.getCustomInfo()).toBe('Custom - test-value');
      expect(custom).toBeInstanceOf(Window);
    });
  });
});