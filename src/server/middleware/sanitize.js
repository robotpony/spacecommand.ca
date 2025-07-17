/**
 * Input sanitization middleware
 * Sanitizes user input to prevent XSS and other injection attacks
 */

const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // HTML encode if requested
  if (options.htmlEncode) {
    sanitized = validator.escape(sanitized);
  }

  // Remove HTML tags if requested (but allow safe HTML for certain fields)
  if (options.stripHtml) {
    if (options.allowSafeHtml) {
      // Allow only safe HTML tags
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: []
      });
    } else {
      // Strip all HTML
      sanitized = validator.stripLow(sanitized);
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
  }

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Normalize whitespace
  if (options.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  return sanitized;
}

/**
 * Recursively sanitize object properties
 * @param {any} obj - Object to sanitize
 * @param {Object} fieldRules - Field-specific sanitization rules
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj, fieldRules = {}) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, fieldRules['*'] || {});
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, fieldRules));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Get field-specific rules or use default
      const rules = fieldRules[key] || fieldRules['*'] || {};
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, rules);
      } else {
        sanitized[key] = sanitizeObject(value, fieldRules);
      }
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Express middleware for input sanitization
 * @param {Object} fieldRules - Field-specific sanitization rules
 * @returns {Function} Express middleware function
 */
function sanitizeInput(fieldRules = {}) {
  return (req, res, next) => {
    try {
      // Define default sanitization rules for different field types
      const defaultRules = {
        // Default rules for all fields
        '*': {
          trim: true,
          normalizeWhitespace: true
        },
        
        // Specific rules for common fields
        'name': {
          trim: true,
          stripHtml: true,
          normalizeWhitespace: true
        },
        'username': {
          trim: true,
          stripHtml: true,
          normalizeWhitespace: true
        },
        'email': {
          trim: true,
          stripHtml: true
        },
        'message': {
          trim: true,
          stripHtml: true,
          allowSafeHtml: true,
          normalizeWhitespace: true
        },
        'bio': {
          trim: true,
          stripHtml: true,
          allowSafeHtml: true,
          normalizeWhitespace: true
        },
        'subject': {
          trim: true,
          stripHtml: true,
          normalizeWhitespace: true
        },
        'description': {
          trim: true,
          stripHtml: true,
          allowSafeHtml: true,
          normalizeWhitespace: true
        },
        
        // Fields that should not be sanitized (IDs, tokens, etc.)
        'id': { sanitize: false },
        'token': { sanitize: false },
        'password': { sanitize: false },
        'sessionId': { sanitize: false }
      };

      // Merge with provided rules
      const rules = { ...defaultRules, ...fieldRules };

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, rules);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, rules);
      }

      // Sanitize route parameters (be careful with IDs)
      if (req.params && typeof req.params === 'object') {
        const paramRules = { ...rules };
        // Don't sanitize ID parameters by default
        Object.keys(req.params).forEach(key => {
          if (key.includes('id') || key.includes('Id')) {
            paramRules[key] = { sanitize: false };
          }
        });
        req.params = sanitizeObject(req.params, paramRules);
      }

      next();
    } catch (error) {
      console.error('Input sanitization error:', error);
      next(error);
    }
  };
}

/**
 * Validate and sanitize specific input types
 */
const inputValidators = {
  /**
   * Sanitize empire/fleet/planet names
   * @param {string} name - Name to sanitize
   * @returns {string} Sanitized name
   */
  sanitizeName(name) {
    if (typeof name !== 'string') return name;
    
    return sanitizeString(name, {
      stripHtml: true,
      normalizeWhitespace: true,
      trim: true
    }).substring(0, 50); // Limit length
  },

  /**
   * Sanitize message content (allow basic formatting)
   * @param {string} message - Message to sanitize
   * @returns {string} Sanitized message
   */
  sanitizeMessage(message) {
    if (typeof message !== 'string') return message;
    
    return sanitizeString(message, {
      stripHtml: true,
      allowSafeHtml: true,
      normalizeWhitespace: true,
      trim: true
    }).substring(0, 2000); // Limit length
  },

  /**
   * Sanitize user input for search queries
   * @param {string} query - Search query to sanitize
   * @returns {string} Sanitized query
   */
  sanitizeSearchQuery(query) {
    if (typeof query !== 'string') return query;
    
    let sanitized = sanitizeString(query, {
      stripHtml: true,
      normalizeWhitespace: true,
      trim: true
    });
    
    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/[';--]/g, '');
    sanitized = sanitized.replace(/\b(union|select|insert|update|delete|drop|create|alter)\b/gi, '');
    
    return sanitized.substring(0, 100); // Limit length
  }
};

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  inputValidators
};