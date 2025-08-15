const UIComponent = require('./UIComponent');
const colors = require('../utils/colors');
const ascii = require('../utils/ascii');
const formatting = require('../utils/formatting');
const { getDefaultLogo } = require('../utils/branding');

class Decoration extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'box';
    this.style = options.style || 'single';
    this.content = options.content || [];
    this.title = options.title || '';
    this.colorTheme = options.colorTheme || 'border';
    this.padding = options.padding || 1;
  }

  render() {
    this.buffer = [];
    
    switch (this.type) {
      case 'box':
        return this.renderBox();
      case 'banner':
        return this.renderBanner();
      case 'divider':
        return this.renderDivider();
      case 'title':
        return this.renderTitle();
      case 'logo':
        return this.renderLogo();
      case 'border':
        return this.renderBorder();
      default:
        return this.renderBox();
    }
  }

  renderBox() {
    const boxLines = ascii.box(this.width, this.height, this.style, this.content);
    const theme = colors.getTheme();
    const color = theme[this.colorTheme] || theme.border;
    
    this.buffer = boxLines.map(line => colors.color(line, this.colorTheme));
    
    if (this.title) {
      const titleLine = this.buffer[0];
      const titleText = ` ${this.title} `;
      const insertPos = Math.max(2, Math.floor((this.width - titleText.length) / 2));
      
      this.buffer[0] = titleLine.substring(0, insertPos) + 
                      colors.color(titleText, 'title') + 
                      titleLine.substring(insertPos + titleText.length);
    }
    
    return this.buffer;
  }

  renderBanner() {
    const text = this.content.length > 0 ? this.content[0] : this.title;
    const bannerLines = ascii.banner(text, this.style);
    this.buffer = bannerLines.map(line => colors.color(line, this.colorTheme));
    return this.buffer;
  }

  renderDivider() {
    const chars = ascii.BOX_DRAWING[this.style] || ascii.BOX_DRAWING.single;
    let line = '';
    
    if (this.title) {
      const titleText = ` ${this.title} `;
      const sideLength = Math.floor((this.width - titleText.length) / 2);
      line = chars.horizontal.repeat(sideLength) + 
             titleText + 
             chars.horizontal.repeat(this.width - sideLength - titleText.length);
    } else {
      line = chars.horizontal.repeat(this.width);
    }
    
    this.buffer = [colors.color(line, this.colorTheme)];
    return this.buffer;
  }

  renderTitle() {
    const text = this.content.length > 0 ? this.content[0] : this.title;
    const centeredText = formatting.pad(text, this.width, 'center');
    
    this.buffer = [colors.color(centeredText, 'title')];
    
    if (this.height > 1) {
      const underline = ascii.BOX_DRAWING[this.style].horizontal.repeat(text.length);
      const centeredUnderline = formatting.pad(underline, this.width, 'center');
      this.buffer.push(colors.color(centeredUnderline, this.colorTheme));
    }
    
    while (this.buffer.length < this.height) {
      this.buffer.push(' '.repeat(this.width));
    }
    
    return this.buffer;
  }

  renderLogo() {
    if (this.content.length === 0) {
      this.content = this.getDefaultLogo();
    }
    
    const paddedContent = [];
    
    for (let i = 0; i < this.height; i++) {
      if (i < this.content.length) {
        const line = this.content[i];
        const centeredLine = formatting.pad(line, this.width, 'center');
        paddedContent.push(colors.color(centeredLine, this.colorTheme));
      } else {
        paddedContent.push(' '.repeat(this.width));
      }
    }
    
    this.buffer = paddedContent;
    return this.buffer;
  }

  renderBorder() {
    const chars = ascii.BOX_DRAWING[this.style] || ascii.BOX_DRAWING.single;
    const theme = colors.getTheme();
    const color = theme[this.colorTheme] || theme.border;
    
    this.buffer = [];
    
    for (let y = 0; y < this.height; y++) {
      let line = '';
      
      for (let x = 0; x < this.width; x++) {
        if (y === 0 || y === this.height - 1) {
          if (x === 0) {
            line += y === 0 ? chars.topLeft : chars.bottomLeft;
          } else if (x === this.width - 1) {
            line += y === 0 ? chars.topRight : chars.bottomRight;
          } else {
            line += chars.horizontal;
          }
        } else {
          if (x === 0 || x === this.width - 1) {
            line += chars.vertical;
          } else {
            line += ' ';
          }
        }
      }
      
      this.buffer.push(colors.color(line, this.colorTheme));
    }
    
    return this.buffer;
  }

  getDefaultLogo() {
    return getDefaultLogo();
  }

  setContent(content) {
    this.content = Array.isArray(content) ? content : [content];
    this.emit('content-changed', this.content);
  }

  setTitle(title) {
    this.title = title;
    this.emit('title-changed', title);
  }

  setStyle(style) {
    this.style = style;
    this.emit('style-changed', style);
  }

  setColorTheme(theme) {
    this.colorTheme = theme;
    this.emit('color-theme-changed', theme);
  }
}

class TitleScreen extends Decoration {
  constructor(options = {}) {
    super({
      type: 'logo',
      colorTheme: 'primary',
      width: 80,
      height: 25,
      ...options
    });
    
    this.subtitle = options.subtitle || '';
    this.version = options.version || '';
    this.footer = options.footer || '';
  }

  render() {
    const logo = this.getDefaultLogo();
    const logoHeight = logo.length;
    const startY = Math.floor((this.height - logoHeight - 4) / 2);
    
    this.buffer = [];
    
    for (let y = 0; y < this.height; y++) {
      if (y < startY) {
        this.buffer.push(' '.repeat(this.width));
      } else if (y < startY + logoHeight) {
        const logoLine = logo[y - startY];
        const centeredLine = formatting.pad(logoLine, this.width, 'center');
        this.buffer.push(colors.color(centeredLine, 'primary'));
      } else if (y === startY + logoHeight + 1 && this.subtitle) {
        const centeredSubtitle = formatting.pad(this.subtitle, this.width, 'center');
        this.buffer.push(colors.color(centeredSubtitle, 'secondary'));
      } else if (y === startY + logoHeight + 2 && this.version) {
        const centeredVersion = formatting.pad(this.version, this.width, 'center');
        this.buffer.push(colors.color(centeredVersion, 'muted'));
      } else if (y === this.height - 2 && this.footer) {
        const centeredFooter = formatting.pad(this.footer, this.width, 'center');
        this.buffer.push(colors.color(centeredFooter, 'info'));
      } else {
        this.buffer.push(' '.repeat(this.width));
      }
    }
    
    return this.buffer;
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