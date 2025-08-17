/**
 * ANSI color codes and terminal color management utilities.
 * Provides theming support and automatic color detection.
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface AnsiCodes {
  [key: string]: string;
}

export interface ColorTheme {
  [colorName: string]: string;
}

export interface Themes {
  [themeName: string]: ColorTheme;
}

export const ANSI_CODES: AnsiCodes = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fgBlack: '\x1b[30m',
  fgRed: '\x1b[31m',
  fgGreen: '\x1b[32m',
  fgYellow: '\x1b[33m',
  fgBlue: '\x1b[34m',
  fgMagenta: '\x1b[35m',
  fgCyan: '\x1b[36m',
  fgWhite: '\x1b[37m',
  fgGray: '\x1b[90m',
  fgBrightRed: '\x1b[91m',
  fgBrightGreen: '\x1b[92m',
  fgBrightYellow: '\x1b[93m',
  fgBrightBlue: '\x1b[94m',
  fgBrightMagenta: '\x1b[95m',
  fgBrightCyan: '\x1b[96m',
  fgBrightWhite: '\x1b[97m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
  bgBrightRed: '\x1b[101m',
  bgBrightGreen: '\x1b[102m',
  bgBrightYellow: '\x1b[103m',
  bgBrightBlue: '\x1b[104m',
  bgBrightMagenta: '\x1b[105m',
  bgBrightCyan: '\x1b[106m',
  bgBrightWhite: '\x1b[107m'
};

export const THEMES: Themes = {
  default: {
    primary: ANSI_CODES.fgCyan,
    secondary: ANSI_CODES.fgBlue,
    success: ANSI_CODES.fgGreen,
    warning: ANSI_CODES.fgYellow,
    error: ANSI_CODES.fgRed,
    info: ANSI_CODES.fgWhite,
    muted: ANSI_CODES.fgGray,
    highlight: ANSI_CODES.fgBrightCyan,
    border: ANSI_CODES.fgGray,
    title: ANSI_CODES.fgBrightWhite + ANSI_CODES.bright
  },
  
  retro: {
    primary: ANSI_CODES.fgBrightGreen,
    secondary: ANSI_CODES.fgGreen,
    success: ANSI_CODES.fgBrightGreen,
    warning: ANSI_CODES.fgBrightYellow,
    error: ANSI_CODES.fgBrightRed,
    info: ANSI_CODES.fgBrightWhite,
    muted: ANSI_CODES.fgGreen + ANSI_CODES.dim,
    highlight: ANSI_CODES.fgBrightGreen + ANSI_CODES.bright,
    border: ANSI_CODES.fgGreen,
    title: ANSI_CODES.fgBrightGreen + ANSI_CODES.bright
  },
  
  faction: {
    terran: ANSI_CODES.fgBlue,
    orion: ANSI_CODES.fgRed,
    centauri: ANSI_CODES.fgGreen,
    neutral: ANSI_CODES.fgWhite
  }
};

let currentTheme: string = 'default';
let colorsEnabled: boolean | null = null; // Auto-detect

/**
 * Detects if color output is supported in the current environment.
 * 
 * @returns True if colors are supported
 */
export function isColorSupported(): boolean {
  if (colorsEnabled !== null) {
    return colorsEnabled;
  }
  
  // Check environment variables
  if (process.env.NO_COLOR) {
    colorsEnabled = false;
    return false;
  }
  
  if (process.env.FORCE_COLOR) {
    colorsEnabled = true;
    return true;
  }
  
  // Check if we're in a TTY
  if (process.stdout && process.stdout.isTTY) {
    colorsEnabled = true;
    return true;
  }
  
  // Check TERM variable
  const term = process.env.TERM;
  if (term && (term.includes('color') || term.includes('xterm') || term === 'screen')) {
    colorsEnabled = true;
    return true;
  }
  
  // Default to no colors for safety
  colorsEnabled = false;
  return false;
}

/**
 * Manually sets color support status.
 * 
 * @param enabled - Whether colors should be enabled
 */
export function setColorSupport(enabled: boolean): void {
  colorsEnabled = enabled;
}

/**
 * Sets the active color theme.
 * 
 * @param themeName - Name of the theme to activate
 */
export function setTheme(themeName: string): void {
  if (THEMES[themeName]) {
    currentTheme = themeName;
  }
}

/**
 * Gets the current color theme.
 * 
 * @returns The active color theme
 */
export function getTheme(): ColorTheme {
  return THEMES[currentTheme];
}

/**
 * Applies color to text using theme colors or ANSI codes.
 * 
 * @param text - Text to colorize
 * @param colorName - Color name from theme or ANSI codes
 * @returns Colorized text
 */
export function color(text: string, colorName: string): string {
  if (!isColorSupported()) {
    return text;
  }
  
  const theme = getTheme();
  const colorCode = theme[colorName] || ANSI_CODES[colorName] || '';
  return colorCode + text + ANSI_CODES.reset;
}

/**
 * Creates an RGB foreground color code.
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns ANSI RGB color code
 */
export function rgb(r: number, g: number, b: number): string {
  if (!isColorSupported()) {
    return '';
  }
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Creates an RGB background color code.
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns ANSI RGB background color code
 */
export function bgRgb(r: number, g: number, b: number): string {
  if (!isColorSupported()) {
    return '';
  }
  return `\x1b[48;2;${r};${g};${b}m`;
}

/**
 * Creates a color gradient across text.
 * 
 * @param text - Text to apply gradient to
 * @param startColor - Starting RGB color
 * @param endColor - Ending RGB color
 * @returns Text with gradient coloring
 */
export function gradient(text: string, startColor: RGBColor, endColor: RGBColor): string {
  if (!isColorSupported()) {
    return text;
  }
  
  const length = text.length;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const ratio = i / (length - 1);
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
    result += rgb(r, g, b) + text[i];
  }
  
  return result + ANSI_CODES.reset;
}

/**
 * Strips ANSI color codes from text.
 * 
 * @param text - Text containing ANSI codes
 * @returns Text with ANSI codes removed
 */
export function strip(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Gets the display length of text excluding ANSI codes.
 * 
 * @param text - Text to measure
 * @returns Display length of text
 */
export function length(text: string): number {
  return strip(text).length;
}

// Default export for CommonJS compatibility during transition
export default {
  ANSI_CODES,
  THEMES,
  setTheme,
  getTheme,
  color,
  rgb,
  bgRgb,
  gradient,
  strip,
  length,
  isColorSupported,
  setColorSupport
};