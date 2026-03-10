'use strict';

const { randomUUID } = require('node:crypto');

/**
 * Generate a new correlation ID (UUID v4).
 *
 * @returns {string} UUID v4 string
 */
function generateCorrelationId() {
  return randomUUID();
}

/**
 * Extract a correlation ID from incoming HTTP request headers.
 * Checks (in priority order): X-Correlation-ID, X-Request-ID, traceparent.
 * For traceparent, extracts the trace-id portion (second segment).
 *
 * @param {object} headers — HTTP headers object (keys should be lowercase)
 * @returns {string} extracted or newly generated correlation ID
 */
function extractCorrelationId(headers) {
  if (!headers || typeof headers !== 'object') {
    return generateCorrelationId();
  }

  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }

  if (normalized['x-correlation-id']) {
    return String(normalized['x-correlation-id']);
  }

  if (normalized['x-request-id']) {
    return String(normalized['x-request-id']);
  }

  if (normalized['traceparent']) {
    const parts = String(normalized['traceparent']).split('-');
    if (parts.length >= 2 && parts[1].length === 32) {
      return parts[1];
    }
  }

  return generateCorrelationId();
}

/**
 * Create a middleware-compatible correlation context object.
 *
 * @param {object} [headers] — optional HTTP headers to extract from
 * @returns {{ correlationId: string, traceId: string, spanId: string }}
 */
function createCorrelationContext(headers) {
  const correlationId = extractCorrelationId(headers);
  const traceId = randomUUID().replace(/-/g, '');
  const spanId = randomUUID().replace(/-/g, '').slice(0, 16);

  return {
    correlationId,
    traceId,
    spanId,
  };
}

module.exports = {
  generateCorrelationId,
  extractCorrelationId,
  createCorrelationContext,
};
