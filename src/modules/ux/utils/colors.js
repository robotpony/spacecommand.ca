const ANSI_CODES = {
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

const THEMES = {
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
    highlight: ANSI_CODES.fgBrightGreen + ANSI_CODES.blink,
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

let currentTheme = 'default';

function setTheme(themeName) {
  if (THEMES[themeName]) {
    currentTheme = themeName;
  }
}

function getTheme() {
  return THEMES[currentTheme];
}

function color(text, colorName) {
  const theme = getTheme();
  const colorCode = theme[colorName] || ANSI_CODES[colorName] || '';
  return colorCode + text + ANSI_CODES.reset;
}

function rgb(r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bgRgb(r, g, b) {
  return `\x1b[48;2;${r};${g};${b}m`;
}

function gradient(text, startColor, endColor) {
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

function strip(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function length(text) {
  return strip(text).length;
}

module.exports = {
  ANSI_CODES,
  THEMES,
  setTheme,
  getTheme,
  color,
  rgb,
  bgRgb,
  gradient,
  strip,
  length
};