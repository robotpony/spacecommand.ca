const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile = 'spacecommand.log') {
    this.logFile = path.join(process.cwd(), logFile);
    this.debugMode = process.env.DEBUG === '1';
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Write to log file
    const logLine = `${timestamp} [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Silently fail if can't write to log
    }

    // Only show in console if debug mode is enabled
    if (this.debugMode) {
      console.error(`[${level}] ${message}`, data || '');
    }
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }

  clear() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
    } catch (error) {
      // Silently fail
    }
  }
}

module.exports = new Logger();