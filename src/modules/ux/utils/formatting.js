function pad(text, length, align = 'left', char = ' ') {
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

function wrap(text, width, indent = 0) {
  const words = text.split(/\s+/);
  const lines = [];
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

function truncate(text, maxLength, suffix = '...') {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncLength = maxLength - suffix.length;
  return text.slice(0, truncLength) + suffix;
}

function formatNumber(num, options = {}) {
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

function formatCredits(amount) {
  return formatNumber(amount, {
    thousandsSeparator: ',',
    prefix: '₡'
  });
}

function formatPercentage(value, decimals = 1) {
  return formatNumber(value, {
    decimals,
    suffix: '%'
  });
}

function formatDuration(seconds) {
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

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return formatNumber(bytes / Math.pow(k, i), {
    decimals,
    suffix: ' ' + sizes[i]
  });
}

function columns(items, columnWidth, totalWidth) {
  const numColumns = Math.floor(totalWidth / columnWidth);
  const rows = [];
  
  for (let i = 0; i < items.length; i += numColumns) {
    const row = [];
    for (let j = 0; j < numColumns && i + j < items.length; j++) {
      row.push(pad(items[i + j], columnWidth));
    }
    rows.push(row.join(''));
  }
  
  return rows;
}

function list(items, options = {}) {
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

module.exports = {
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