/**
 * Text formatting and data presentation utilities.
 * Provides functions for padding, wrapping, truncating, and formatting various data types.
 */

export type TextAlign = 'left' | 'right' | 'center';

export interface NumberFormatOptions {
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
}

export interface ListOptions {
  bullet?: string;
  indent?: number;
  numbered?: boolean;
}

/**
 * Pads text to a specified length with optional alignment and padding character.
 * 
 * @param text - Text to pad
 * @param length - Target length
 * @param align - Text alignment ('left', 'right', 'center')
 * @param char - Padding character
 * @returns Padded text
 */
export function pad(text: string, length: number, align: TextAlign = 'left', char: string = ' '): string {
  const textLength = text.length;
  
  if (textLength >= length) {
    return text.slice(0, length);
  }
  
  const padding = length - textLength;
  
  switch (align) {
    case 'left':
      return text + char.repeat(padding);
    case 'right':
      return char.repeat(padding) + text;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return char.repeat(leftPad) + text + char.repeat(rightPad);
    default:
      return text;
  }
}

/**
 * Wraps text to fit within a specified width, with optional indentation.
 * 
 * @param text - Text to wrap
 * @param width - Maximum line width
 * @param indent - Number of spaces to indent wrapped lines
 * @returns Array of wrapped lines
 */
export function wrap(text: string, width: number, indent: number = 0): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = ' '.repeat(indent);
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 > width) {
      lines.push(currentLine.trim());
      currentLine = ' '.repeat(indent) + word;
    } else {
      if (currentLine.trim().length > 0) {
        currentLine += ' ';
      }
      currentLine += word;
    }
  }
  
  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}

/**
 * Truncates text to a maximum length with an optional suffix.
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum allowed length
 * @param suffix - Suffix to append when truncating
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncLength = maxLength - suffix.length;
  return text.slice(0, truncLength) + suffix;
}

/**
 * Formats a number with customizable separators and affixes.
 * 
 * @param num - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatNumber(num: number, options: NumberFormatOptions = {}): string {
  const {
    decimals = 0,
    thousandsSeparator = ',',
    decimalSeparator = '.',
    prefix = '',
    suffix = ''
  } = options;
  
  let formatted = num.toFixed(decimals);
  
  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    formatted = parts.join(decimalSeparator);
  }
  
  return prefix + formatted + suffix;
}

/**
 * Formats currency amounts with game credit symbol.
 * 
 * @param amount - Credit amount to format
 * @returns Formatted credits string
 */
export function formatCredits(amount: number): string {
  return formatNumber(amount, {
    thousandsSeparator: ',',
    prefix: '₡'
  });
}

/**
 * Formats a value as a percentage.
 * 
 * @param value - Value to format as percentage
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return formatNumber(value, {
    decimals,
    suffix: '%'
  });
}

/**
 * Formats a duration in seconds to human-readable format.
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Formats time in HH:MM:SS format.
 * 
 * @param date - Date object to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats date in YYYY-MM-DD format.
 * 
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats date and time together.
 * 
 * @param date - Date object to format
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Formats byte values with appropriate units.
 * 
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted bytes string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return formatNumber(bytes / Math.pow(k, i), {
    decimals,
    suffix: ' ' + sizes[i]
  });
}

/**
 * Arranges items in columns with fixed width.
 * 
 * @param items - Items to arrange
 * @param columnWidth - Width of each column
 * @param totalWidth - Total available width
 * @returns Array of formatted rows
 */
export function columns(items: string[], columnWidth: number, totalWidth: number): string[] {
  const numColumns = Math.floor(totalWidth / columnWidth);
  const rows: string[] = [];
  
  for (let i = 0; i < items.length; i += numColumns) {
    const row: string[] = [];
    for (let j = 0; j < numColumns && i + j < items.length; j++) {
      row.push(pad(items[i + j], columnWidth));
    }
    rows.push(row.join(''));
  }
  
  return rows;
}

/**
 * Formats items as a bulleted or numbered list.
 * 
 * @param items - Items to list
 * @param options - List formatting options
 * @returns Array of formatted list items
 */
export function list(items: string[], options: ListOptions = {}): string[] {
  const {
    bullet = '• ',
    indent = 0,
    numbered = false
  } = options;
  
  return items.map((item, index) => {
    const prefix = numbered ? `${index + 1}. ` : bullet;
    return ' '.repeat(indent) + prefix + item;
  });
}

// Default export for CommonJS compatibility during transition
export default {
  pad,
  wrap,
  truncate,
  formatNumber,
  formatCredits,
  formatPercentage,
  formatDuration,
  formatTime,
  formatDate,
  formatDateTime,
  formatBytes,
  columns,
  list
};