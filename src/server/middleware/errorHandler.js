/**
 * Global error handling middleware
 */

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
  let details = {};

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = err.details || {};
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden operation';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    status = 409;
    message = 'Resource conflict';
    details = err.details || {};
  } else if (err.name === 'InsufficientResourcesError') {
    status = 402;
    message = 'Insufficient resources';
    details = err.details || {};
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON format';
  }

  // Send error response
  const response = { message };
  
  // Only include details in development or if they're safe to expose
  if (Object.keys(details).length > 0) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
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