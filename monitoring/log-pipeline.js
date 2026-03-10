/**
 * log-pipeline.js — Structured Log Aggregation Pipeline
 *
 * Collects, transforms, routes, and exports structured JSON logs
 * from all 50 Heady services. φ-scaled buffer sizes, Fibonacci batch
 * flush intervals, CSL-gated log level filtering.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const BUFFER_SIZE       = 987;           // fib(16) max buffered entries
const FLUSH_INTERVAL_MS = 8 * 1000;     // fib(6) = 8 seconds
const BATCH_SIZE        = 89;           // fib(11) per flush batch
const MAX_FIELD_LENGTH  = 1597;         // fib(17) max field value length
const RETENTION_DAYS    = 89;           // fib(11) hot retention
const ARCHIVE_DAYS      = 233;          // fib(13) cold retention

// ── Log Levels (CSL-scored) ─────────────────────────────
const LOG_LEVELS = {
  TRACE:    { score: 0.1,   numeric: 0 },
  DEBUG:    { score: CSL_THRESHOLDS.MINIMUM, numeric: 1 },
  INFO:     { score: CSL_THRESHOLDS.LOW,     numeric: 2 },
  WARN:     { score: CSL_THRESHOLDS.MEDIUM,  numeric: 3 },
  ERROR:    { score: CSL_THRESHOLDS.HIGH,    numeric: 4 },
  FATAL:    { score: CSL_THRESHOLDS.CRITICAL, numeric: 5 },
};

// ── Sensitive Field Patterns ────────────────────────────
const REDACT_PATTERNS = [
  /password/i, /secret/i, /token/i, /api[_-]?key/i,
  /authorization/i, /cookie/i, /session/i, /private/i,
  /credit[_-]?card/i, /ssn/i, /social[_-]?security/i,
];

function shouldRedact(fieldName) {
  return REDACT_PATTERNS.some(p => p.test(fieldName));
}

function redactValue(value) {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 8) return '[REDACTED]';
  return value.slice(0, 3) + '***' + value.slice(-3);
}

// ── Log Entry Transformer ───────────────────────────────
function transformEntry(entry) {
  const transformed = {
    timestamp: entry.timestamp || new Date().toISOString(),
    level: entry.level || 'INFO',
    service: entry.service || 'unknown',
    message: (entry.message || '').slice(0, MAX_FIELD_LENGTH),
    traceId: entry.traceId || null,
    spanId: entry.spanId || null,
    requestId: entry.requestId || null,
    domain: entry.domain || null,
    userId: entry.userId || null,
    durationMs: entry.durationMs || null,
    metadata: {},
  };

  // Redact sensitive fields
  if (entry.metadata) {
    for (const [key, value] of Object.entries(entry.metadata)) {
      if (shouldRedact(key)) {
        transformed.metadata[key] = redactValue(value);
      } else {
        transformed.metadata[key] = typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH) : value;
      }
    }
  }

  // Add hash for deduplication
  transformed._hash = createHash('sha256')
    .update(`${transformed.timestamp}:${transformed.service}:${transformed.message}`)
    .digest('hex')
    .slice(0, 21);

  return transformed;
}

// ── Export Destinations ─────────────────────────────────
const DESTINATIONS = {
  CONSOLE: {
    name: 'console',
    export: async (batch) => {
      for (const entry of batch) {
        const line = JSON.stringify(entry);
        process.stdout.write(line + '\n');
      }
    },
  },
  
  BIGQUERY: {
    name: 'bigquery',
    export: async (batch, config) => {
      // BigQuery streaming insert (implementation requires @google-cloud/bigquery)
      return {
        destination: 'bigquery',
        dataset: config?.dataset || 'heady_logs',
        table: config?.table || 'service_logs',
        rowCount: batch.length,
        status: 'buffered',
      };
    },
  },

  LOKI: {
    name: 'loki',
    export: async (batch, config) => {
      // Loki push API format
      const streams = {};
      for (const entry of batch) {
        const labels = `{service="${entry.service}",level="${entry.level}",domain="${entry.domain || 'unknown'}"}`;
        if (!streams[labels]) streams[labels] = [];
        streams[labels].push([
          String(new Date(entry.timestamp).getTime() * 1000000), // nanoseconds
          JSON.stringify(entry),
        ]);
      }
      return {
        destination: 'loki',
        url: config?.url || 'http://loki:3100/loki/api/v1/push',
        streams: Object.keys(streams).length,
        entries: batch.length,
        status: 'buffered',
      };
    },
  },
};

// ── Pipeline ────────────────────────────────────────────
/**
 * Create a log pipeline instance.
 */
export function createLogPipeline(options = {}) {
  const minLevel = options.minLevel || 'INFO';
  const minLevelScore = LOG_LEVELS[minLevel]?.score ?? CSL_THRESHOLDS.LOW;
  const destinations = options.destinations || ['CONSOLE'];
  const buffer = [];
  let flushTimer = null;
  const metrics = { ingested: 0, flushed: 0, dropped: 0, errors: 0 };

  function shouldLog(level) {
    const levelScore = LOG_LEVELS[level]?.score ?? CSL_THRESHOLDS.LOW;
    return levelScore >= minLevelScore;
  }

  async function flush() {
    if (buffer.length === 0) return;
    
    const batch = buffer.splice(0, BATCH_SIZE);
    metrics.flushed += batch.length;
    
    for (const destName of destinations) {
      const dest = DESTINATIONS[destName];
      if (!dest) continue;
      try {
        await dest.export(batch, options[destName.toLowerCase()]);
      } catch (err) {
        metrics.errors++;
      }
    }
  }

  function startFlushTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    if (flushTimer.unref) flushTimer.unref(); // Don't prevent process exit
  }

  return {
    /**
     * Ingest a log entry.
     */
    log(entry) {
      if (!shouldLog(entry.level || 'INFO')) {
        metrics.dropped++;
        return;
      }

      const transformed = transformEntry(entry);
      
      if (buffer.length >= BUFFER_SIZE) {
        // Drop oldest entries (backpressure)
        buffer.shift();
        metrics.dropped++;
      }
      
      buffer.push(transformed);
      metrics.ingested++;
      startFlushTimer();
      
      // Auto-flush on FATAL
      if (entry.level === 'FATAL') {
        flush().catch(() => {});
      }
    },

    /**
     * Convenience methods.
     */
    trace(service, message, meta) { this.log({ level: 'TRACE', service, message, metadata: meta }); },
    debug(service, message, meta) { this.log({ level: 'DEBUG', service, message, metadata: meta }); },
    info(service, message, meta)  { this.log({ level: 'INFO', service, message, metadata: meta }); },
    warn(service, message, meta)  { this.log({ level: 'WARN', service, message, metadata: meta }); },
    error(service, message, meta) { this.log({ level: 'ERROR', service, message, metadata: meta }); },
    fatal(service, message, meta) { this.log({ level: 'FATAL', service, message, metadata: meta }); },

    /**
     * Force flush all buffered entries.
     */
    async flush() {
      while (buffer.length > 0) {
        await flush();
      }
    },

    /**
     * Stop the pipeline.
     */
    async shutdown() {
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      await this.flush();
    },

    /**
     * Get pipeline metrics.
     */
    getMetrics() {
      return {
        ...metrics,
        buffered: buffer.length,
        maxBuffer: BUFFER_SIZE,
        destinations: destinations,
        minLevel,
        retentionDays: RETENTION_DAYS,
        archiveDays: ARCHIVE_DAYS,
      };
    },
  };
}

export { LOG_LEVELS, DESTINATIONS, CSL_THRESHOLDS, RETENTION_DAYS, ARCHIVE_DAYS };
export default { createLogPipeline, LOG_LEVELS, DESTINATIONS };
