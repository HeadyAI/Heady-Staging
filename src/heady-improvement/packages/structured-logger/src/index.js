'use strict';

const { createLogger, LOG_LEVELS, PHI_SAMPLING } = require('./logger');
const {
  generateCorrelationId,
  extractCorrelationId,
  createCorrelationContext,
} = require('./correlation');
const { jsonFormatter, humanFormatter } = require('./formatters');

module.exports = {
  createLogger,
  LOG_LEVELS,
  PHI_SAMPLING,
  generateCorrelationId,
  extractCorrelationId,
  createCorrelationContext,
  jsonFormatter,
  humanFormatter,
};
