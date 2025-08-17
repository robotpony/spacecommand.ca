const UIComponent = require('./UIComponent');
const { Window } = require('./Window');
const { StyleEngine } = require('../rendering/StyleEngine');
const ascii = require('../utils/ascii');
const { getDefaultLogo } = require('../utils/branding');

class Decoration extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'text';
    this.content = options.content || [];
    this.styleSelector = options.styleSelector || 'text.title';
    this.styleEngine = options.styleEngine || new StyleEngine();
    this.align = options.align || 'center';
  }

  render() {
    switch (this.type) {
      case 'text':
        return this.renderText();
      case 'logo':
        return this.renderLogo();
      case 'divider':
        return this.renderDivider();
      case 'banner':
        return this.renderBanner();
      default:
        return this.renderText();
    }
  }

  renderText() {
    const lines = [];
    const contentArray = Array.isArray(this.content) ? this.content : [this.content];
    
    contentArray.forEach(line => {
      const styledLine = this.styleEngine.createStyledText(line, this.styleSelector);
      const alignedLine = this.alignText(styledLine);
      lines.push(alignedLine);
    });
    
    return lines;
  }

  renderLogo() {
    if (this.content.length === 0) {
      this.content = this.getDefaultLogo();
    }
    
    const lines = [];
    const logoLines = Array.isArray(this.content) ? this.content : [this.content];
    
    logoLines.forEach(line => {
      const styledLine = this.styleEngine.createStyledText(line, this.styleSelector);
      const alignedLine = this.alignText(styledLine);
      lines.push(alignedLine);
    });
    
    return lines;
  }

  renderDivider() {
    const char = this.content[0] || '─';
    let line = char.repeat(this.width);
    
    if (this.content.length > 1) {
      const titleText = ` ${this.content[1]} `;
      const sideLength = Math.floor((this.width - titleText.length) / 2);
      line = char.repeat(sideLength) + titleText + char.repeat(this.width - sideLength - titleText.length);
    }
    
    const styledLine = this.styleEngine.createStyledText(line, this.styleSelector);
    return [styledLine];
  }

  renderBanner() {
    const text = Array.isArray(this.content) ? this.content[0] : this.content;
    const bannerLines = ascii.banner(text, 'single');
    
    return bannerLines.map(line => {
      const styledLine = this.styleEngine.createStyledText(line, this.styleSelector);
      return this.alignText(styledLine);
    });
  }

  alignText(text) {
    const colors = require('../utils/colors');
    const textLength = colors.length(text);
    
    switch (this.align) {
      case 'left':
        return text + ' '.repeat(Math.max(0, this.width - textLength));
      case 'right':
        return ' '.repeat(Math.max(0, this.width - textLength)) + text;
      case 'center':
      default:
        const padding = Math.max(0, this.width - textLength);
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    }
  }

  getDefaultLogo() {
    return getDefaultLogo();
  }

  setContent(content) {
    this.content = Array.isArray(content) ? content : [content];
    this.emit('content-changed', this.content);
  }

  setStyle(styleSelector) {
    this.styleSelector = styleSelector;
    this.emit('style-changed', styleSelector);
  }

  setAlign(align) {
    this.align = align;
    this.emit('align-changed', align);
  }
}

class TitleScreen extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.title = options.title || 'SPACE COMMAND';
    this.subtitle = options.subtitle || '';
    this.version = options.version || '';
    this.footer = options.footer || '';
    this.styleEngine = options.styleEngine || new StyleEngine();
    
    this.logoComponent = new Decoration({
      type: 'logo',
      content: options.logo || this.getDefaultLogo(),
      styleSelector: 'text.title',
      styleEngine: this.styleEngine,
      width: this.width,
      height: this.height
    });
  }

  render() {
    const lines = [];
    const logoLines = this.logoComponent.render();
    const logoHeight = logoLines.length;
    
    const startY = Math.floor((this.height - logoHeight - 4) / 2);
    
    for (let y = 0; y < this.height; y++) {
      if (y < startY) {
        lines.push(' '.repeat(this.width));
      } else if (y < startY + logoHeight) {
        lines.push(logoLines[y - startY]);
      } else if (y === startY + logoHeight + 1 && this.subtitle) {
        const styledSubtitle = this.styleEngine.createStyledText(this.subtitle, 'text.subtitle');
        lines.push(this.alignText(styledSubtitle));
      } else if (y === startY + logoHeight + 2 && this.version) {
        const styledVersion = this.styleEngine.createStyledText(this.version, 'text.subtitle');
        lines.push(this.alignText(styledVersion));
      } else if (y === this.height - 2 && this.footer) {
        const styledFooter = this.styleEngine.createStyledText(this.footer, 'text.subtitle');
        lines.push(this.alignText(styledFooter));
      } else {
        lines.push(' '.repeat(this.width));
      }
    }
    
    return lines;
  }

  alignText(text) {
    const colors = require('../utils/colors');
    const textLength = colors.length(text);
    const padding = Math.max(0, this.width - textLength);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  getDefaultLogo() {
    return getDefaultLogo();
  }

  setSubtitle(subtitle) {
    this.subtitle = subtitle;
    this.emit('subtitle-changed', subtitle);
  }

  setVersion(version) {
    this.version = version;
    this.emit('version-changed', version);
  }

  setFooter(footer) {
    this.footer = footer;
    this.emit('footer-changed', footer);
  }
}

module.exports = { Decoration, TitleScreen };