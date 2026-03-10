/**
 * Heady™ OpenTelemetry Configuration
 * Distributed tracing with correlation IDs across all 55 services
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const { fib, PHI_TIMING } = require('../shared/phi-math');

const OTEL_CONFIG = {
  serviceName: process.env.SERVICE_NAME || 'heady-unknown',
  serviceVersion: process.env.HEADY_VERSION || '5.1.0',
  exporter: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
    protocol: 'grpc',
  },
  sampler: {
    type: 'parentBased',
    root: { type: 'traceIdRatio', ratio: 0.382 },  // ψ² ≈ 38.2% sampling
  },
  spanLimits: {
    maxAttributes: fib(11),           // 89
    maxEvents: fib(9),                // 34
    maxLinks: fib(7),                 // 13
    maxAttributeLength: fib(13),      // 233
  },
  batchProcessor: {
    maxQueueSize: fib(14),            // 377
    maxExportBatchSize: fib(10),      // 55
    scheduledDelayMs: fib(8) * 1000,  // 21,000ms
  },
};

/**
 * Create trace context middleware for Express
 */
function traceMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  const spanId = generateSpanId();
  
  req.traceContext = {
    traceId,
    spanId,
    service: OTEL_CONFIG.serviceName,
    startTime: Date.now(),
  };
  
  res.setHeader('X-Trace-Id', traceId);
  res.setHeader('X-Span-Id', spanId);
  res.setHeader('X-Heady-Service', OTEL_CONFIG.serviceName);
  
  res.on('finish', () => {
    const duration = Date.now() - req.traceContext.startTime;
    const span = {
      traceId, spanId,
      service: OTEL_CONFIG.serviceName,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ts: new Date().toISOString(),
    };
    // In production: export to OTLP collector
    if (duration > PHI_TIMING.PHI_3) { // > 4,236ms = slow
      process.stdout.write(JSON.stringify({ level: 'warn', msg: 'Slow request', ...span }) + '\n');
    }
  });
  
  next();
}

function generateTraceId() {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSpanId() {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

module.exports = { OTEL_CONFIG, traceMiddleware, generateTraceId, generateSpanId };
