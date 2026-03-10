'use strict';

const { appendFileSync, mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
const { generateCorrelationId } = require('./correlation');
const { jsonFormatter, humanFormatter } = require('./formatters');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Phi-derived sampling rates: lower-severity logs can be sampled down
// PSI ≈ 0.618, PSI² ≈ 0.382
const PHI_SAMPLING = {
  debug: 0.381966011250105,   // PSI² — sample ~38% of debug logs
  info: 0.618033988749895,    // PSI  — sample ~62% of info logs
  warn: 1.0,                  // always log warnings
  error: 1.0,                 // always log errors
  fatal: 1.0,                 // always log fatals
};

/**
 * @typedef {object} LoggerOptions
 * @property {string} service — service/application name
 * @property {string} [domain] — domain or module name
 * @property {string} [level='info'] — minimum log level
 * @property {'json'|'human'} [format='json'] — output format
 * @property {string} [correlationId] — default correlation ID
 * @property {{ type: 'stdout' } | { type: 'file', path: string }} [sink] — log sink
 * @property {boolean} [sampling=false] — enable phi-based sampling
 */

/**
 * Create a structured logger instance.
 *
 * @param {LoggerOptions} options
 * @returns {object} logger with debug/info/warn/error/fatal methods
 */
function createLogger(options) {
  const {
    service,
    domain = '',
    level: minLevel = 'info',
    format = 'json',
    correlationId: defaultCorrelationId = '',
    sink = { type: 'stdout' },
    sampling = false,
  } = options;

  if (!service) {
    throw new Error('Logger requires a service name');
  }

  const minLevelNum = LOG_LEVELS[minLevel];
  if (minLevelNum === undefined) {
    throw new Error(`Invalid log level: ${minLevel}. Must be one of: ${Object.keys(LOG_LEVELS).join(', ')}`);
  }

  const formatter = format === 'human' ? humanFormatter : jsonFormatter;

  // Prepare file sink if needed
  if (sink.type === 'file') {
    mkdirSync(dirname(sink.path), { recursive: true });
  }

  function write(line) {
    if (sink.type === 'file') {
      appendFileSync(sink.path, line + '\n', 'utf8');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  function shouldSample(level) {
    if (!sampling) return true;
    const rate = PHI_SAMPLING[level] || 1.0;
    return Math.random() < rate;
  }

  function log(level, message, meta = {}) {
    const levelNum = LOG_LEVELS[level];
    if (levelNum === undefined || levelNum < minLevelNum) return;
    if (!shouldSample(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service,
      ...(domain && { domain }),
      ...(meta.correlationId || defaultCorrelationId
        ? { correlationId: meta.correlationId || defaultCorrelationId }
        : {}),
      ...(meta.traceId ? { traceId: meta.traceId } : {}),
      ...(meta.spanId ? { spanId: meta.spanId } : {}),
    };

    // Merge extra metadata (excluding known fields)
    const knownKeys = new Set(['correlationId', 'traceId', 'spanId']);
    for (const [key, value] of Object.entries(meta)) {
      if (!knownKeys.has(key)) {
        entry[key] = value;
      }
    }

    write(formatter(entry));
  }

  /**
   * Create a child logger that inherits the parent's configuration
   * but can override specific fields.
   *
   * @param {Partial<LoggerOptions>} overrides
   * @returns {object}
   */
  function child(overrides = {}) {
    return createLogger({
      service,
      domain,
      level: minLevel,
      format,
      correlationId: defaultCorrelationId,
      sink,
      sampling,
      ...overrides,
    });
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    fatal: (msg, meta) => log('fatal', msg, meta),
    child,
  };
}

module.exports = {
  createLogger,
  LOG_LEVELS,
  PHI_SAMPLING,
};
