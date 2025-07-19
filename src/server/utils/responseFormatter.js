/**
 * Standardized response formatting utilities for SpaceCommand API
 * Ensures consistent response structure across all endpoints
 */

/**
 * Format successful API response
 * @param {*} data - The response data (object, array, or primitive)
 * @param {Object} meta - Optional metadata
 * @param {number} meta.page - Current page (for paginated responses)
 * @param {number} meta.limit - Items per page
 * @param {number} meta.total - Total items
 * @param {number} meta.pages - Total pages
 * @returns {Object} Formatted response object
 */
function successResponse(data, meta = {}) {
  const response = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...meta
    }
  };

  // Add pagination if provided
  if (meta.page !== undefined) {
    response.pagination = {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      pages: meta.pages || Math.ceil(meta.total / meta.limit)
    };
    
    // Remove from meta to avoid duplication
    delete response.meta.page;
    delete response.meta.limit;
    delete response.meta.total;
    delete response.meta.pages;
  }

  return response;
}

/**
 * Format error API response
 * @param {string} message - Human-readable error message
 * @param {string} code - Machine-readable error code
 * @param {*} details - Optional error details (validation errors, etc.)
 * @param {string} requestId - Optional request ID for tracking
 * @returns {Object} Formatted error response object
 */
function errorResponse(message, code = 'INTERNAL_ERROR', details = null, requestId = null) {
  const response = {
    error: {
      message,
      code,
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    response.error.details = details;
  }

  if (requestId) {
    response.meta.requestId = requestId;
  }

  return response;
}

/**
 * Format paginated collection response
 * @param {Array} items - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Formatted paginated response
 */
function paginatedResponse(items, page, limit, total) {
  return successResponse(items, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total)
  });
}

/**
 * Format created resource response with location
 * @param {Object} resource - The created resource
 * @param {string} location - Resource location URL
 * @returns {Object} Formatted response for created resource
 */
function createdResponse(resource, location = null) {
  const response = successResponse(resource);
  
  if (location) {
    response.meta.location = location;
  }
  
  return response;
}

/**
 * Format async operation response
 * @param {Object} operation - Operation details
 * @param {string} operation.id - Operation ID
 * @param {string} operation.status - Operation status
 * @param {Date} operation.estimatedCompletion - When operation will complete
 * @returns {Object} Formatted async response
 */
function asyncResponse(operation) {
  return successResponse(operation, {
    async: true,
    status: operation.status || 'in_progress'
  });
}

/**
 * Common error codes for consistent usage
 */
const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_FORMAT: 'INVALID_FORMAT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_VALUE: 'INVALID_VALUE',
  
  // Authentication/Authorization
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * Express middleware to add response formatters to res object
 */
function responseFormatterMiddleware(req, res, next) {
  // Add success response method
  res.success = function(data, meta = {}) {
    return res.json(successResponse(data, meta));
  };

  // Add paginated response method
  res.paginated = function(items, page, limit, total) {
    return res.json(paginatedResponse(items, page, limit, total));
  };

  // Add created response method
  res.created = function(resource, location = null) {
    if (location) {
      res.set('Location', location);
    }
    return res.status(201).json(createdResponse(resource, location));
  };

  // Add async response method
  res.async = function(operation) {
    return res.status(202).json(asyncResponse(operation));
  };

  // Add error response method
  res.error = function(message, code = ERROR_CODES.INTERNAL_ERROR, details = null, statusCode = 500) {
    const requestId = req.headers['x-request-id'] || req.id;
    return res.status(statusCode).json(errorResponse(message, code, details, requestId));
  };

  next();
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  asyncResponse,
  responseFormatterMiddleware,
  ERROR_CODES
};