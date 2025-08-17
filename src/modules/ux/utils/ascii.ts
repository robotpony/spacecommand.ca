/**
 * ASCII art and box drawing character utilities.
 * Provides various box drawing styles and decorative characters.
 */

export interface BoxDrawingChars {
  horizontal: string;
  vertical: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  cross: string;
  teeUp: string;
  teeDown: string;
  teeLeft: string;
  teeRight: string;
}

export interface BoxDrawingSets {
  [styleName: string]: BoxDrawingChars;
}

export const BOX_DRAWING: BoxDrawingSets = {
  single: {
    horizontal: '─',
    vertical: '│',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    cross: '┼',
    teeUp: '┴',
    teeDown: '┬',
    teeLeft: '┤',
    teeRight: '├'
  },
  
  double: {
    horizontal: '═',
    vertical: '║',
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    cross: '╬',
    teeUp: '╩',
    teeDown: '╦',
    teeLeft: '╣',
    teeRight: '╠'
  },
  
  rounded: {
    horizontal: '─',
    vertical: '│',
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    cross: '┼',
    teeUp: '┴',
    teeDown: '┬',
    teeLeft: '┤',
    teeRight: '├'
  },
  
  heavy: {
    horizontal: '━',
    vertical: '┃',
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    cross: '╋',
    teeUp: '┻',
    teeDown: '┳',
    teeLeft: '┫',
    teeRight: '┣'
  },
  
  ascii: {
    horizontal: '-',
    vertical: '|',
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    cross: '+',
    teeUp: '+',
    teeDown: '+',
    teeLeft: '+',
    teeRight: '+'
  }
};

const BLOCKS = {
  full: '█',
  threeFourths: '▓',
  half: '▒',
  oneFourth: '░',
  
  vertical: {
    full: '█',
    sevenEighths: '▇',
    threeFourths: '▆',
    fiveEighths: '▅',
    half: '▄',
    threeEighths: '▃',
    oneFourth: '▂',
    oneEighth: '▁'
  },
  
  horizontal: {
    full: '█',
    sevenEighths: '▉',
    threeFourths: '▊',
    fiveEighths: '▋',
    half: '▌',
    threeEighths: '▍',
    oneFourth: '▎',
    oneEighth: '▏'
  }
};

const ARROWS = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  upDown: '↕',
  leftRight: '↔',
  
  triangle: {
    up: '▲',
    down: '▼',
    left: '◀',
    right: '▶'
  },
  
  chevron: {
    up: '⌃',
    down: '⌄',
    left: '‹',
    right: '›',
    doubleLeft: '«',
    doubleRight: '»'
  }
};

const SYMBOLS = {
  bullet: '•',
  circle: '○',
  filledCircle: '●',
  square: '□',
  filledSquare: '■',
  diamond: '◇',
  filledDiamond: '◆',
  star: '☆',
  filledStar: '★',
  check: '✓',
  cross: '✗',
  warning: '⚠',
  info: 'ⓘ',
  
  currency: {
    credits: '₡',
    dollar: '$',
    euro: '€',
    pound: '£',
    yen: '¥'
  },
  
  space: {
    rocket: '🚀',
    satellite: '🛰',
    planet: '🪐',
    star: '⭐',
    galaxy: '🌌'
  }
};

export function box(width: number, height: number, style: string = 'single', content: string[] | null = null): string[] {
  const chars = BOX_DRAWING[style] || BOX_DRAWING.single;
  const lines: string[] = [];
  
  const topLine = chars.topLeft + chars.horizontal.repeat(width - 2) + chars.topRight;
  lines.push(topLine);
  
  const innerHeight = height - 2;
  for (let i = 0; i < innerHeight; i++) {
    let line = chars.vertical;
    if (content && content[i]) {
      const contentLine = content[i];
      const padding = width - 2 - contentLine.length;
      line += contentLine + ' '.repeat(Math.max(0, padding));
    } else {
      line += ' '.repeat(width - 2);
    }
    line += chars.vertical;
    lines.push(line);
  }
  
  const bottomLine = chars.bottomLeft + chars.horizontal.repeat(width - 2) + chars.bottomRight;
  lines.push(bottomLine);
  
  return lines;
}

export function progressBar(value: number, max: number, width: number, showPercentage: boolean = true): string {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let bar = BLOCKS.full.repeat(filled) + BLOCKS.oneFourth.repeat(empty);
  
  if (showPercentage) {
    const percentText = ` ${Math.round(percentage)}%`;
    bar += percentText;
  }
  
  return bar;
}

export function table(headers: string[], rows: any[][], options: any = {}): string[] {
  const columnWidths: number[] = [];
  const separator = options.separator || ' │ ';
  const borderStyle = options.border || 'single';
  
  for (let i = 0; i < headers.length; i++) {
    let maxWidth = headers[i].length;
    for (const row of rows) {
      if (row[i] && row[i].toString().length > maxWidth) {
        maxWidth = row[i].toString().length;
      }
    }
    columnWidths.push(maxWidth);
  }
  
  const lines: string[] = [];
  const chars = BOX_DRAWING[borderStyle];
  
  const headerRow = headers.map((h, i) => h.padEnd(columnWidths[i])).join(separator);
  lines.push(headerRow);
  
  const divider = columnWidths.map(w => chars.horizontal.repeat(w)).join('─┼─');
  lines.push(divider);
  
  for (const row of rows) {
    const rowLine = row.map((cell, i) => {
      const cellStr = (cell || '').toString();
      return cellStr.padEnd(columnWidths[i]);
    }).join(separator);
    lines.push(rowLine);
  }
  
  return lines;
}

export function sparkline(values: number[], width: number): string {
  const sparks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const samples = [];
  const step = values.length / width;
  
  for (let i = 0; i < width; i++) {
    const index = Math.floor(i * step);
    const value = values[index];
    const normalized = (value - min) / range;
    const sparkIndex = Math.floor(normalized * (sparks.length - 1));
    samples.push(sparks[sparkIndex]);
  }
  
  return samples.join('');
}

export function banner(text: string, style: string = 'single'): string[] {
  const chars = BOX_DRAWING[style];
  const padding = 2;
  const width = text.length + padding * 2;
  
  const lines = [];
  lines.push(chars.topLeft + chars.horizontal.repeat(width) + chars.topRight);
  lines.push(chars.vertical + ' '.repeat(padding) + text + ' '.repeat(padding) + chars.vertical);
  lines.push(chars.bottomLeft + chars.horizontal.repeat(width) + chars.bottomRight);
  
  return lines;
}

// Default export for CommonJS compatibility during transition
export default {
  BOX_DRAWING,
  BLOCKS,
  ARROWS,
  SYMBOLS,
  box,
  progressBar,
  table,
  sparkline,
  banner
};