const colors = require('../utils/colors');

class StyleEngine {
  constructor() {
    this.styles = new Map();
    this.computedStyles = new Map();
    this.currentTheme = 'default';
    
    this.registerDefaultStyles();
  }

  registerDefaultStyles() {
    this.defineStyle('window.default', {
      border: 'single',
      borderColor: 'border',
      titleColor: 'title',
      backgroundColor: null,
      padding: 1
    });

    this.defineStyle('window.dialog', {
      border: 'double',
      borderColor: 'primary',
      titleColor: 'highlight',
      backgroundColor: null,
      padding: 2
    });

    this.defineStyle('menu.default', {
      keyColor: 'secondary',
      labelColor: 'info',
      selectedKeyColor: 'primary',
      selectedLabelColor: 'highlight',
      descriptionColor: 'muted',
      separatorColor: 'border'
    });

    this.defineStyle('menu.compact', {
      keyColor: 'muted',
      labelColor: 'info',
      selectedKeyColor: 'highlight',
      selectedLabelColor: 'highlight',
      descriptionColor: 'muted',
      separatorColor: 'border',
      spacing: 0
    });

    this.defineStyle('button.default', {
      color: 'info',
      selectedColor: 'highlight',
      backgroundColor: null,
      selectedBackgroundColor: null,
      border: 'none'
    });

    this.defineStyle('button.primary', {
      color: 'primary',
      selectedColor: 'highlight',
      backgroundColor: null,
      selectedBackgroundColor: null,
      border: 'brackets'
    });

    this.defineStyle('statusbar.default', {
      backgroundColor: null,
      color: 'info',
      separatorColor: 'muted',
      highlightColor: 'primary'
    });

    this.defineStyle('text.title', {
      color: 'title',
      align: 'center',
      weight: 'bold'
    });

    this.defineStyle('text.subtitle', {
      color: 'secondary',
      align: 'center',
      weight: 'normal'
    });

    this.defineStyle('text.error', {
      color: 'error',
      weight: 'bold'
    });

    this.defineStyle('text.warning', {
      color: 'warning',
      weight: 'bold'
    });

    this.defineStyle('text.success', {
      color: 'success',
      weight: 'bold'
    });
  }

  defineStyle(selector, properties) {
    this.styles.set(selector, { ...properties });
    this.invalidateComputed(selector);
  }

  getStyle(selector) {
    if (this.computedStyles.has(selector)) {
      return this.computedStyles.get(selector);
    }

    const computed = this.computeStyle(selector);
    this.computedStyles.set(selector, computed);
    return computed;
  }

  computeStyle(selector) {
    const baseStyle = this.styles.get(selector) || {};
    const theme = colors.getTheme();
    
    const computed = { ...baseStyle };
    
    Object.keys(computed).forEach(key => {
      if (key.endsWith('Color') && typeof computed[key] === 'string') {
        const colorName = computed[key];
        computed[key] = theme[colorName] || colors.ANSI_CODES[colorName] || colorName;
      }
    });
    
    return computed;
  }

  applyStyle(text, styleSelector, overrides = {}) {
    const style = this.getStyle(styleSelector);
    const finalStyle = { ...style, ...overrides };
    
    let result = text;
    
    if (finalStyle.color) {
      result = colors.color(result, finalStyle.color);
    }
    
    if (finalStyle.backgroundColor) {
      // Background color implementation would go here
    }
    
    if (finalStyle.weight === 'bold') {
      result = colors.ANSI_CODES.bright + result;
    }
    
    return result;
  }

  applyComponentStyle(component, styleSelector, overrides = {}) {
    const style = this.getStyle(styleSelector);
    const finalStyle = { ...style, ...overrides };
    
    Object.keys(finalStyle).forEach(key => {
      if (component.hasOwnProperty(key) && finalStyle[key] !== undefined) {
        component[key] = finalStyle[key];
      }
    });
    
    return component;
  }

  createStyledText(text, styleSelector, overrides = {}) {
    return this.applyStyle(text, styleSelector, overrides);
  }

  setTheme(themeName) {
    if (colors.THEMES[themeName]) {
      this.currentTheme = themeName;
      colors.setTheme(themeName);
      this.invalidateAllComputed();
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  invalidateComputed(selector) {
    if (selector) {
      this.computedStyles.delete(selector);
    }
  }

  invalidateAllComputed() {
    this.computedStyles.clear();
  }

  extendStyle(baseSelector, newSelector, properties = {}) {
    const baseStyle = this.styles.get(baseSelector) || {};
    this.defineStyle(newSelector, { ...baseStyle, ...properties });
  }

  createStyleVariant(baseSelector, variantName, properties = {}) {
    const newSelector = `${baseSelector}.${variantName}`;
    this.extendStyle(baseSelector, newSelector, properties);
    return newSelector;
  }

  getStyleSelectors() {
    return Array.from(this.styles.keys());
  }

  removeStyle(selector) {
    this.styles.delete(selector);
    this.computedStyles.delete(selector);
  }

  reset() {
    this.styles.clear();
    this.computedStyles.clear();
    this.registerDefaultStyles();
  }
}

class StyledComponent {
  constructor(component, styleSelector = null) {
    this.component = component;
    this.styleSelector = styleSelector;
    this.styleOverrides = {};
  }

  setStyle(styleSelector) {
    this.styleSelector = styleSelector;
    return this;
  }

  override(properties) {
    this.styleOverrides = { ...this.styleOverrides, ...properties };
    return this;
  }

  render(styleEngine) {
    if (this.styleSelector && styleEngine) {
      styleEngine.applyComponentStyle(this.component, this.styleSelector, this.styleOverrides);
    }
    
    return this.component.render ? this.component.render() : [this.component.toString()];
  }

  getComponent() {
    return this.component;
  }
}

function styled(component, styleSelector) {
  return new StyledComponent(component, styleSelector);
}

module.exports = { StyleEngine, StyledComponent, styled };