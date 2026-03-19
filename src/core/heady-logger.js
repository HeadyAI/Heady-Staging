/**
 * ∞ Heady™ Logger — Structured colorful logger with levels, JSON mode, and component tagging
 * Part of Heady™Systems™ Sovereign AI Platform v4.0.0
 * © 2026 Heady™Systems Inc. — Proprietary
 */

const { EventEmitter } = require("events");

/** @type {Record<string, number>} Log level priorities */
const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100,
};

/** @type {Record<string, string>} ANSI color codes */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  trace: '\x1b[90m',      // gray
  debug: '\x1b[36m',      // cyan
  info: '\x1b[32m',       // green
  warn: '\x1b[33m',       // yellow
  error: '\x1b[31m',      // red
  fatal: '\x1b[35m',      // magenta
  component: '\x1b[34m',  // blue
  time: '\x1b[90m',       // dark gray
  symbol: '\x1b[96m',     // bright cyan
};

/** @type {Record<string, string>} Level symbols */
const SYMBOLS = {
  trace: '·',
  debug: '◦',
  info: '∞',
  warn: '⚠',
  error: '✗',
  fatal: '☠',
};

/** @type {Record<string, string>} Level labels (padded) */
const LABELS = {
  trace: 'TRACE',
  debug: 'DEBUG',
  info: ' INFO',
  warn: ' WARN',
  error: 'ERROR',
  fatal: 'FATAL',
};

/**
 * Formats a Date to a compact ISO-like string
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  return date.toISOString().replace('T', ' ').substring(0, 23);
}

/**
 * Safely serializes a value for log output
 * @param {unknown} value
 * @returns {string}
 */
function serialize(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? '\n' + value.stack : ''}`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Circular]';
    }
  }
  return String(value);
}

/**
 * @class HeadyLogger
 * @extends EventEmitter
 * Structured logger with ANSI color output, JSON mode, and child logger support.
 */
class HeadyLogger extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {string} [options.component] - Component/module name tag
   * @param {string} [options.level='info'] - Minimum log level
   * @param {boolean} [options.json=false] - Output as JSON (for log aggregators)
   * @param {boolean} [options.color=true] - Enable ANSI colors
   * @param {boolean} [options.timestamp=true] - Include timestamps
   * @param {object} [options.context] - Additional context fields merged into every log
   * @param {number} [options.historySize=100] - Ring buffer size for recent log entries
   */
  constructor(options = {}) {
    super();
    this.component = options.component || 'HeadyCore';
    this.levelName = options.level || process.env.HEADY_LOG_LEVEL || 'info';
    this.levelValue = LEVELS[this.levelName] ?? LEVELS.info;
    this.json = options.json ?? (process.env.HEADY_LOG_FORMAT === 'json');
    this.color = options.color ?? (process.env.NO_COLOR ? false : process.stdout.isTTY !== false);
    this.timestamp = options.timestamp ?? true;
    this.context = options.context || {};
    this.historySize = options.historySize ?? 100;
    /** @type {Array<object>} Ring buffer of recent log entries */
    this._history = [];
    this._seq = 0;
  }

  /**
   * Creates a child logger with additional context
   * @param {string} component - Sub-component name
   * @param {object} [context] - Extra context fields
   * @returns {HeadyLogger}
   */
  child(component, context = {}) {
    return new HeadyLogger({
      component: `${this.component}:${component}`,
      level: this.levelName,
      json: this.json,
      color: this.color,
      timestamp: this.timestamp,
      context: { ...this.context, ...context },
      historySize: this.historySize,
    });
  }

  /**
   * Core log method
   * @param {string} levelName
   * @param {string} message
   * @param {object} [fields]
   */
  _log(levelName, message, fields = {}) {
    const levelValue = LEVELS[levelName] ?? LEVELS.info;
    if (levelValue < this.levelValue) return;

    const now = new Date();
    const entry = {
      seq: ++this._seq,
      time: now.toISOString(),
      level: levelName,
      component: this.component,
      msg: message,
      ...this.context,
      ...fields,
    };

    // Store in ring buffer
    if (this._history.length >= this.historySize) this._history.shift();
    this._history.push(entry);

    // Emit for external listeners
    this.emit('log', entry);
    if (levelValue >= LEVELS.error) this.emit('error-log', entry);

    if (this.json) {
      process.stdout.write(JSON.stringify(entry) + '\n');
      return;
    }

    this._writeFormatted(levelName, now, message, fields);
  }

  /**
   * Writes a human-formatted, colored log line
   * @param {string} levelName
   * @param {Date} time
   * @param {string} message
   * @param {object} fields
   */
  _writeFormatted(levelName, time, message, fields) {
    const c = this.color ? COLORS : {};
    const reset = c.reset || '';

    const timeStr = this.timestamp
      ? `${c.time || ''}${formatTime(time)}${reset} `
      : '';

    const symbol = `${c.symbol || ''}${SYMBOLS[levelName] || '·'}${reset}`;
    const label = `${c[levelName] || ''}${c.bold || ''}${LABELS[levelName]}${reset}`;
    const comp = `${c.component || ''}[${this.component}]${reset}`;
    const msg = `${c[levelName] || ''}${message}${reset}`;

    let line = `${timeStr}${symbol} ${label} ${comp} ${msg}`;

    const extraKeys = Object.keys(fields);
    if (extraKeys.length > 0) {
      const extras = extraKeys
        .map(k => {
          const v = fields[k];
          const vs = v instanceof Error
            ? `${v.message}`
            : typeof v === 'object' ? JSON.stringify(v) : String(v);
          return `${c.dim || ''}${k}=${reset}${vs}`;
        })
        .join(' ');
      line += ` ${extras}`;
    }

    const stream = levelName === 'error' || levelName === 'fatal'
      ? process.stderr
      : process.stdout;
    stream.write(line + '\n');
  }

  /** @param {string} msg @param {object} [fields] */
  trace(msg, fields) { this._log('trace', msg, fields); }

  /** @param {string} msg @param {object} [fields] */
  debug(msg, fields) { this._log('debug', msg, fields); }

  /** @param {string} msg @param {object} [fields] */
  info(msg, fields) { this._log('info', msg, fields); }

  /** @param {string} msg @param {object} [fields] */
  warn(msg, fields) { this._log('warn', msg, fields); }

  /** @param {string} msg @param {object} [fields] */
  error(msg, fields) { this._log('error', msg, fields); }

  /** @param {string} msg @param {object} [fields] */
  fatal(msg, fields) { this._log('fatal', msg, fields); }

  /**
   * Returns recent log history
   * @param {number} [n=20]
   * @returns {Array<object>}
   */
  history(n = 20) {
    return this._history.slice(-n);
  }

  /**
   * Sets the minimum log level at runtime
   * @param {string} levelName
   */
  setLevel(levelName) {
    if (!(levelName in LEVELS)) throw new Error(`Unknown level: ${levelName}`);
    this.levelName = levelName;
    this.levelValue = LEVELS[levelName];
  }

  /**
   * Starts a timer and returns a function to log the elapsed time
   * @param {string} label
   * @returns {function(string?, object?): void}
   */
  time(label) {
    const start = process.hrtime.bigint();
    return (msg, fields = {}) => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      this._log('debug', msg || label, { ...fields, elapsed_ms: elapsed.toFixed(2) });
    };
  }
}

/** Singleton root logger */
const rootLogger = new HeadyLogger({ component: 'Heady' });

/**
 * Creates a component-scoped child logger
 * @param {string} component
 * @param {object} [context]
 * @returns {HeadyLogger}
 */
function createLogger(component, context = {}) {
  return rootLogger.child(component, context);
}

module.exports = { HeadyLogger, createLogger };
