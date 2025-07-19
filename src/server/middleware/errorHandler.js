/**
 * Global error handling middleware
 */
const { ERROR_CODES } = require('../utils/responseFormatter');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Default error
  let status = 500;
  let message = 'Internal server error';
  let code = ERROR_CODES.INTERNAL_ERROR;
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 422;
    message = err.message || 'Validation failed';
    code = ERROR_CODES.VALIDATION_ERROR;
    details = err.details || null;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = err.message || 'Authentication required';
    code = ERROR_CODES.AUTHENTICATION_REQUIRED;
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = err.message || 'Access denied';
    code = ERROR_CODES.ACCESS_DENIED;
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = err.message || 'Resource not found';
    code = ERROR_CODES.RESOURCE_NOT_FOUND;
  } else if (err.name === 'ConflictError') {
    status = 409;
    message = err.message || 'Resource conflict';
    code = ERROR_CODES.RESOURCE_CONFLICT;
    details = err.details || null;
  } else if (err.name === 'InsufficientResourcesError') {
    status = 409;
    message = err.message || 'Insufficient resources';
    code = ERROR_CODES.INSUFFICIENT_RESOURCES;
    details = err.details || null;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large';
    code = 'FILE_TOO_LARGE';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON format';
    code = ERROR_CODES.INVALID_FORMAT;
  }

  // Use the standardized error response if res.error is available
  if (res.error) {
    return res.error(message, code, details, status);
  }

  // Fallback to manual response construction
  const response = {
    error: {
      message,
      code
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  // Only include details if they exist and are safe to expose
  if (details && status < 500) {
    response.error.details = details;
  }

  // Add request ID for tracking
  const requestId = req.headers['x-request-id'] || req.id || Date.now().toString(36);
  response.meta.requestId = requestId;

  // In development, add more debugging info
  if (process.env.NODE_ENV === 'development') {
    console.error('Development Error Details:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      user: req.user?.id,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  res.status(status).json(response);
}

/**
 * Create custom error classes for better error handling
 */
class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden operation') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
  }
}

class InsufficientResourcesError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InsufficientResourcesError';
    this.details = details;
  }
}

module.exports = {
  errorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InsufficientResourcesError
};