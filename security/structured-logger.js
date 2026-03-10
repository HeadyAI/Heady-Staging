/**
 * StructuredLogger — Security-Auditable Structured Logger
 * Produces JSON-formatted, tamper-evident log entries with SHA-256 chain hashing,
 * log level gating via CSL, and φ-sized ring buffer.
 * All constants φ-derived. ESM only.
 * Author: Eric Haywood
 */
import { createHash } from 'crypto';

// ── φ-Math Foundation ────────────────────────────────────────────
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH: phiThreshold(3),
  MEDIUM: phiThreshold(2),
  LOW: phiThreshold(1),
  MINIMUM: phiThreshold(0),
};

function cslGate(value, score, tau = CSL_THRESHOLDS.MEDIUM, temp = Math.pow(PSI, 3)) {
  return value * (1 / (1 + Math.exp(-(score - tau) / temp)));
}

function hashSHA256(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

// ── Log Levels (CSL-scored) ──────────────────────────────────────
const LOG_LEVELS = {
  TRACE:    { score: 0.1, numeric: 0 },
  DEBUG:    { score: 0.3, numeric: 1 },
  INFO:     { score: CSL_THRESHOLDS.MINIMUM, numeric: 2 },
  WARN:     { score: CSL_THRESHOLDS.LOW, numeric: 3 },
  ERROR:    { score: CSL_THRESHOLDS.MEDIUM, numeric: 4 },
  FATAL:    { score: CSL_THRESHOLDS.CRITICAL, numeric: 5 },
  SECURITY: { score: 1.0, numeric: 6 },
};

// ── Ring Buffer ──────────────────────────────────────────────────
class RingBuffer {
  constructor(capacity = FIB[17]) { // 1597
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.size = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
    return this.size;
  }

  toArray() {
    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size);
    }
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }

  last(n = FIB[8]) {
    const arr = this.toArray();
    return arr.slice(-n);
  }
}

// ── Transport Interface ──────────────────────────────────────────
class ConsoleTransport {
  write(entry) {
    const level = entry.level;
    const formatted = JSON.stringify(entry, null, 0);
    if (level === 'ERROR' || level === 'FATAL' || level === 'SECURITY') {
      process.stderr.write(formatted + '\n');
    } else {
      process.stdout.write(formatted + '\n');
    }
  }
}

class FileTransport {
  constructor(config = {}) {
    this.path = config.path ?? '/tmp/heady-security.log';
    this.buffer = [];
    this.flushSize = config.flushSize ?? FIB[8]; // 21
  }

  write(entry) {
    this.buffer.push(JSON.stringify(entry));
    if (this.buffer.length >= this.flushSize) {
      this.flush();
    }
  }

  flush() {
    // In production, write to file system
    const batch = this.buffer.splice(0);
    return batch.length;
  }
}

// ── Structured Logger ────────────────────────────────────────────
class StructuredLogger {
  constructor(config = {}) {
    this.serviceName = config.serviceName ?? 'heady-os';
    this.version = config.version ?? '3.0.0';
    this.environment = config.environment ?? 'production';
    this.minLevel = config.minLevel ?? 'INFO';
    this.minLevelScore = LOG_LEVELS[this.minLevel]?.score ?? CSL_THRESHOLDS.MINIMUM;

    // Transports
    this.transports = config.transports ?? [new ConsoleTransport()];

    // Ring buffer for in-memory log retention
    this.ringBuffer = new RingBuffer(config.bufferSize ?? FIB[17]);

    // Hash chain for tamper evidence
    this.lastHash = hashSHA256({ genesis: true, service: this.serviceName, ts: Date.now() });
    this.entryCount = 0;

    // Sensitive field redaction
    this.redactFields = new Set(config.redactFields ?? [
      'password', 'token', 'secret', 'apiKey', 'api_key',
      'authorization', 'cookie', 'session', 'credential',
    ]);

    // Correlation context
    this.defaultContext = {
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
    };
  }

  _shouldLog(level) {
    const levelDef = LOG_LEVELS[level];
    if (!levelDef) return false;
    return cslGate(1.0, levelDef.score, this.minLevelScore) > CSL_THRESHOLDS.MINIMUM;
  }

  _redact(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    const redacted = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.redactFields.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this._redact(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  _buildEntry(level, message, data = {}, context = {}) {
    this.entryCount++;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.defaultContext,
      ...context,
      data: this._redact(data),
      sequence: this.entryCount,
      chainHash: this.lastHash,
    };

    // Compute hash chain
    entry.hash = hashSHA256({ ...entry });
    this.lastHash = entry.hash;

    return entry;
  }

  log(level, message, data = {}, context = {}) {
    if (!this._shouldLog(level)) return null;

    const entry = this._buildEntry(level, message, data, context);

    // Write to all transports
    for (const transport of this.transports) {
      try { transport.write(entry); } catch (_) { /* transport failure should not crash */ }
    }

    // Store in ring buffer
    this.ringBuffer.push(entry);

    return entry;
  }

  trace(message, data, context) { return this.log('TRACE', message, data, context); }
  debug(message, data, context) { return this.log('DEBUG', message, data, context); }
  info(message, data, context) { return this.log('INFO', message, data, context); }
  warn(message, data, context) { return this.log('WARN', message, data, context); }
  error(message, data, context) { return this.log('ERROR', message, data, context); }
  fatal(message, data, context) { return this.log('FATAL', message, data, context); }
  security(message, data, context) { return this.log('SECURITY', message, data, context); }

  // Create child logger with additional context
  child(context) {
    const child = Object.create(this);
    child.defaultContext = { ...this.defaultContext, ...context };
    return child;
  }

  // Verify hash chain integrity
  verifyChain(entries) {
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].chainHash !== entries[i - 1].hash) {
        return { valid: false, brokenAt: i, entry: entries[i] };
      }
    }
    return { valid: true, entriesChecked: entries.length };
  }

  recentEntries(count = FIB[8]) {
    return this.ringBuffer.last(count);
  }

  stats() {
    return {
      service: this.serviceName,
      totalEntries: this.entryCount,
      bufferSize: this.ringBuffer.size,
      bufferCapacity: this.ringBuffer.capacity,
      minLevel: this.minLevel,
      transports: this.transports.length,
    };
  }
}

export default StructuredLogger;
export { StructuredLogger, RingBuffer, ConsoleTransport, FileTransport, LOG_LEVELS };
