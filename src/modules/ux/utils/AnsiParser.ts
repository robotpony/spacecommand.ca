/**
 * ANSI escape sequence parser for proper text compositing
 */

class AnsiParser {
  /**
   * Parse a string with ANSI codes into an array of characters with their styles
   * @param {string} text - Text with ANSI escape codes
   * @returns {Array} Array of {char, style} objects
   */
  static parse(text) {
    const result = [];
    let currentStyle = '';
    let i = 0;
    
    while (i < text.length) {
      if (text[i] === '\x1b' && text[i + 1] === '[') {
        // Found an ANSI escape sequence
        let j = i + 2;
        while (j < text.length && !/[a-zA-Z]/.test(text[j])) {
          j++;
        }
        if (j < text.length) {
          const code = text.substring(i, j + 1);
          if (code.includes('0m')) {
            // Reset code
            currentStyle = '';
          } else {
            // Accumulate style codes
            currentStyle += code;
          }
          i = j + 1;
        } else {
          // Incomplete escape sequence
          result.push({ char: text[i], style: currentStyle });
          i++;
        }
      } else {
        // Regular character
        result.push({ char: text[i], style: currentStyle });
        i++;
      }
    }
    
    return result;
  }
  
  /**
   * Convert parsed characters back to a string with ANSI codes
   * @param {Array} parsed - Array of {char, style} objects
   * @returns {string} Text with ANSI escape codes
   */
  static unparse(parsed) {
    let result = '';
    let lastStyle = '';
    
    for (const item of parsed) {
      if (item.style !== lastStyle) {
        if (lastStyle) {
          result += '\x1b[0m'; // Reset previous style
        }
        if (item.style) {
          result += item.style;
        }
        lastStyle = item.style;
      }
      result += item.char;
    }
    
    if (lastStyle) {
      result += '\x1b[0m'; // Final reset
    }
    
    return result;
  }
  
  /**
   * Composite two parsed lines, with the second overlaying the first
   * @param {Array} base - Base parsed line
   * @param {Array} overlay - Overlay parsed line
   * @param {number} startX - Starting X position for overlay
   * @returns {Array} Composited parsed line
   */
  static composite(base, overlay, startX = 0) {
    const result = [...base];
    
    for (let i = 0; i < overlay.length; i++) {
      const targetIndex = startX + i;
      if (targetIndex >= 0 && targetIndex < result.length) {
        // Only overlay non-space characters (preserve transparency)
        if (overlay[i].char !== ' ' || overlay[i].style) {
          result[targetIndex] = overlay[i];
        }
      }
    }
    
    return result;
  }
}

module.exports = AnsiParser;