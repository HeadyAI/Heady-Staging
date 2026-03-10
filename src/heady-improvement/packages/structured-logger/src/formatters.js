'use strict';

const LEVEL_COLORS = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  fatal: '\x1b[35m',  // magenta
};
const RESET = '\x1b[0m';

/**
 * Format a log entry as a JSON string (for production / machine consumption).
 *
 * @param {object} entry — structured log entry
 * @returns {string} JSON-serialized line
 */
function jsonFormatter(entry) {
  return JSON.stringify(entry);
}

/**
 * Format a log entry as a human-readable string (for development).
 *
 * @param {object} entry — structured log entry
 * @returns {string} human-readable log line
 */
function humanFormatter(entry) {
  const color = LEVEL_COLORS[entry.level] || '';
  const ts = entry.timestamp;
  const level = (entry.level || 'info').toUpperCase().padEnd(5);
  const svc = entry.service ? `[${entry.service}]` : '';
  const domain = entry.domain ? `(${entry.domain})` : '';
  const corrId = entry.correlationId ? ` cid=${entry.correlationId.slice(0, 8)}` : '';
  const msg = entry.message || '';

  const meta = {};
  const knownKeys = new Set([
    'timestamp', 'level', 'message', 'correlationId', 'service',
    'domain', 'traceId', 'spanId',
  ]);
  for (const [key, value] of Object.entries(entry)) {
    if (!knownKeys.has(key)) {
      meta[key] = value;
    }
  }
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

  return `${color}${ts} ${level}${RESET} ${svc}${domain}${corrId} ${msg}${metaStr}`;
}

module.exports = {
  jsonFormatter,
  humanFormatter,
};
