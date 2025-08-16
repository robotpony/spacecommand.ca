const colors = require('../../modules/ux/utils/colors');
const { ANSI_CODES } = colors;

class TitleScreen {
  constructor(ux) {
    this.ux = ux;
    this.width = 80;
    this.height = 24;
  }

  render() {
    const lines = [];
    const border = '='.repeat(this.width);
    
    lines.push(border);
    lines.push('');
    
    // ASCII Logo
    const logo = [
      '        ███████╗██████╗  █████╗  ██████╗███████╗',
      '        ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝',
      '        ███████╗██████╔╝███████║██║     █████╗',
      '        ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝',
      '        ███████║██║     ██║  ██║╚██████╗███████╗',
      '        ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝',
      '',
      '     ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗',
      '    ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗',
      '    ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║',
      '    ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║',
      '    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝',
      '     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝'
    ];
    
    // Add logo with green color
    logo.forEach(line => {
      lines.push(colors.color(line, 'primary'));
    });
    
    lines.push('');
    
    // Subtitle
    const subtitle = 'A Golden Age Space Trading Adventure';
    const padding = ' '.repeat((this.width - subtitle.length) / 2);
    lines.push(ANSI_CODES.fgGreen + padding + subtitle + ANSI_CODES.reset);
    
    lines.push('');
    
    // Version
    const version = 'Version 0.1.0-alpha';
    const versionPadding = ' '.repeat((this.width - version.length) / 2);
    lines.push(ANSI_CODES.fgGray + versionPadding + version + ANSI_CODES.reset);
    
    lines.push('');
    
    // Prompt - use bold instead of blink for interactive element
    const prompt = '[ Press ENTER to Continue ]';
    const promptPadding = ' '.repeat((this.width - prompt.length) / 2);
    lines.push(ANSI_CODES.bright + colors.color(promptPadding + prompt, 'primary') + ANSI_CODES.reset);
    
    lines.push('');
    lines.push(border);
    
    return lines.join('\n');
  }

  handleInput(key) {
    if (key === '\r' || key === '\n') {
      return 'main-menu';
    }
    return null;
  }
}

module.exports = TitleScreen;