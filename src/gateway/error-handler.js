'use strict';

const { logger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.error(`[ErrorHandler] ${err.stack || err.message}`);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}

module.exports = { errorHandler };
