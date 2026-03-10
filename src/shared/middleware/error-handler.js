/**
 * Heady™ Error Handler Middleware v6.0
 * Structured error responses — no stack leaks in production
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { createLogger } = require('../logger');
const { fib } = require('../phi-math');

const logger = createLogger('error-handler');

// ═══════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════

class HeadyError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'HeadyError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends HeadyError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends HeadyError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends HeadyError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends HeadyError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends HeadyError {
  constructor(retryAfterMs = 0) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfterMs });
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends HeadyError {
  constructor(service = 'Service') {
    super(`${service} temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// ═══════════════════════════════════════════════════════════
// ERROR HANDLER MIDDLEWARE
// ═══════════════════════════════════════════════════════════

function createErrorHandler(options = {}) {
  const isProduction = (process.env.NODE_ENV || 'production') === 'production';

  return function errorHandler(err, req, res, next) {
    const errorId = crypto.randomBytes(fib(6)).toString('hex');  // 8-byte error ID

    // Determine status code and structure
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'An unexpected error occurred';

    // Map known error types
    if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
      statusCode = 400;
      code = 'INVALID_JSON';
      message = 'Request body contains invalid JSON';
    }

    if (err.name === 'PayloadTooLargeError') {
      statusCode = 413;
      code = 'PAYLOAD_TOO_LARGE';
    }

    // Log the error
    const logData = {
      message: 'Request error',
      errorId,
      statusCode,
      code,
      error: message,
      method: req.method,
      path: req.url,
      ip: req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent']?.slice(0, fib(11)),  // 89 chars
    };

    if (statusCode >= 500) {
      logData.stack = err.stack;
      logger.error(logData);
    } else {
      logger.warn(logData);
    }

    // Build response
    const response = {
      error: {
        code,
        message: isProduction && statusCode >= 500 ? 'Internal server error' : message,
        errorId,
      },
    };

    // Include details for client errors (non-production or 4xx)
    if (err.details && statusCode < 500) {
      response.error.details = err.details;
    }

    // Include stack in development
    if (!isProduction && err.stack) {
      response.error.stack = err.stack.split('\n').slice(0, fib(5));  // 5 frames
    }

    // Send response
    if (!res.headersSent) {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'X-Error-ID': errorId,
      });
      res.end(JSON.stringify(response));
    }
  };
}

// ═══════════════════════════════════════════════════════════
// UNCAUGHT EXCEPTION HANDLERS
// ═══════════════════════════════════════════════════════════

function installGlobalHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error({
      message: 'Uncaught exception — process will exit',
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({
      message: 'Unhandled promise rejection',
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

module.exports = {
  createErrorHandler,
  installGlobalHandlers,
  HeadyError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
};
