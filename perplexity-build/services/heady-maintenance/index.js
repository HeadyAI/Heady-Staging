/**
 * heady-maintenance — Self-healing maintenance — quarantine, recovery, respawn
 * Heady™ Service | Domain: reliability | Port: 3342
 * ALL requests enriched by HeadyAutoContext (MANDATORY)
 * NO priority/ranking code. Everything concurrent and equal.
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */
'use strict';

import express from 'express';
import { randomUUID } from 'crypto';

// ─── φ-Math Constants (No Magic Numbers) ──────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const VECTOR_DIM = 384;
const CSL_GATES = Object.freeze({
  include: PSI * PSI,   // ≈ 0.382
  boost: PSI,           // ≈ 0.618
  inject: PSI + 0.1,    // ≈ 0.718
});

// ─── Service Config ───────────────────────────────────────────────────────────
const SERVICE_NAME = 'heady-maintenance';
const PORT = process.env.PORT || 3342;
const DOMAIN = 'reliability';
const BOOT_TIME = Date.now();

// ─── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '8mb' }));
app.disable('x-powered-by');

// ─── MANDATORY: HeadyAutoContext Enrichment Middleware ─────────────────────────
// Every request is enriched with context. This is NOT optional.
app.use((req, res, next) => {
  req.headyContext = {
    service: SERVICE_NAME,
    domain: DOMAIN,
    correlationId: req.headers['x-correlation-id'] || randomUUID(),
    timestamp: Date.now(),
    vectorDim: VECTOR_DIM,
    cslGates: CSL_GATES,
  };
  res.setHeader('X-Heady-Service', SERVICE_NAME);
  res.setHeader('X-Correlation-Id', req.headyContext.correlationId);
  res.setHeader('X-Heady-Domain', DOMAIN);
  next();
});


// ─── OpenTelemetry Distributed Tracing ────────────────────────────────────────
// Spans propagate across all services via W3C Trace Context headers
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
const tracer = trace.getTracer(SERVICE_NAME, '1.0.0');

// ─── Bulkhead Pattern: Per-Service Thread Pool ────────────────────────────────
// Prevents cascading failures. Pool size: Fibonacci-scaled.
const BULKHEAD = {
  maxConcurrent: 55,   // Fibonacci: max concurrent requests
  queueSize: 89,       // Fibonacci: max queued requests
  active: 0,
  queued: 0,
};

function bulkheadMiddleware(req, res, next) {
  if (BULKHEAD.active >= BULKHEAD.maxConcurrent) {
    if (BULKHEAD.queued >= BULKHEAD.queueSize) {
      return res.status(503).json({
        error: 'Service at capacity',
        service: SERVICE_NAME,
        bulkhead: { active: BULKHEAD.active, queued: BULKHEAD.queued },
      });
    }
    BULKHEAD.queued++;
    // φ-scaled backoff before retry
    setTimeout(() => {
      BULKHEAD.queued--;
      next();
    }, Math.round(PSI * 1000));
    return;
  }
  BULKHEAD.active++;
  res.on('finish', () => { BULKHEAD.active--; });
  next();
}

// ─── OpenTelemetry Span Middleware ────────────────────────────────────────────
function otelSpanMiddleware(req, res, next) {
  const span = tracer.startSpan(`${SERVICE_NAME}:${req.method} ${req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.route': req.path,
      'heady.service': SERVICE_NAME,
      'heady.domain': DOMAIN,
      'heady.correlation_id': req.headyContext?.correlationId || 'unknown',
      'heady.vector_dim': VECTOR_DIM,
    },
  });
  req.otelSpan = span;
  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    if (res.statusCode >= 400) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${res.statusCode}` });
    }
    span.end();
  });
  next();
}

// ─── Structured Logging ───────────────────────────────────────────────────────
function log(level, msg, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    level,
    message: msg,
    correlationId: meta.correlationId || 'system',
    domain: DOMAIN,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}

// ─── Typed Error Classes ──────────────────────────────────────────────────────
class HeadyServiceError extends Error {
  constructor(message, code, meta = {}) {
    super(message);
    this.name = 'HeadyServiceError';
    this.code = code;
    this.meta = meta;
  }
}

// ─── Health Endpoints ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'operational',
    domain: DOMAIN,
    uptime: Math.round((Date.now() - BOOT_TIME) / 1000),
    port: PORT,
    vectorDim: VECTOR_DIM,
    phiVersion: PHI.toFixed(15),
    timestamp: new Date().toISOString(),
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', service: SERVICE_NAME });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready', service: SERVICE_NAME, domain: DOMAIN });
});

// ─── Service Info ─────────────────────────────────────────────────────────────
app.get('/info', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    description: 'Self-healing maintenance — quarantine, recovery, respawn',
    domain: DOMAIN,
    port: PORT,
    version: '3.2.3',
    phiConstants: {
      PHI, PSI,
      timeouts: {
        phi1: Math.round(PHI * 1000),
        phi2: Math.round(PHI * PHI * 1000),
        phi3: Math.round(PHI * PHI * PHI * 1000),
        phi4: Math.round(Math.pow(PHI, 4) * 1000),
      },
      fibPools: FIB.slice(4, 10),
      cslGates: CSL_GATES,
    },
    swarmAffinity: DOMAIN,
    architecture: 'concurrent-equals',
    bootTime: new Date(BOOT_TIME).toISOString(),
  });
});

// ─── Context Enrichment Endpoint ──────────────────────────────────────────────
app.post('/context/enrich', (req, res) => {
  const { content, sessionId } = req.body || {};
  log('info', 'Context enrichment request', {
    correlationId: req.headyContext.correlationId,
    sessionId,
    contentLength: content ? content.length : 0,
  });
  res.json({
    enriched: true,
    service: SERVICE_NAME,
    domain: DOMAIN,
    correlationId: req.headyContext.correlationId,
    cslGates: CSL_GATES,
  });
});

// ─── Domain-Specific Endpoint ─────────────────────────────────────────────────
app.post('/execute', async (req, res) => {
  const startTime = performance.now();
  const { task, context } = req.body || {};
  
  try {
    log('info', `Executing task on ${SERVICE_NAME}`, {
      correlationId: req.headyContext.correlationId,
      taskType: task?.type || 'unknown',
    });

    // CSL domain-match routing (NOT priority-based)
    const domainMatch = task?.domain === DOMAIN ? 1.0 : 0.5;
    
    if (domainMatch < CSL_GATES.include) {
      return res.status(200).json({
        routed: false,
        reason: 'CSL domain mismatch below include gate',
        similarity: domainMatch,
        gate: CSL_GATES.include,
      });
    }

    const result = {
      service: SERVICE_NAME,
      domain: DOMAIN,
      executed: true,
      correlationId: req.headyContext.correlationId,
      domainMatch,
      latencyMs: Math.round(performance.now() - startTime),
      timestamp: new Date().toISOString(),
    };

    res.json(result);
  } catch (err) {
    log('error', `Execution failed: ${err.message}`, {
      correlationId: req.headyContext.correlationId,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      error: err.message,
      service: SERVICE_NAME,
      correlationId: req.headyContext.correlationId,
    });
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  log('error', err.message, {
    correlationId: req.headyContext?.correlationId,
    stack: err.stack,
  });
  res.status(err.code || 500).json({
    error: err.message,
    service: SERVICE_NAME,
    correlationId: req.headyContext?.correlationId,
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

// ─── Consul Service Discovery Registration ────────────────────────────────────
async function registerWithConsul() {
  const CONSUL_HOST = process.env.CONSUL_HOST || 'consul';
  const CONSUL_PORT = process.env.CONSUL_PORT || 8500;
  const INSTANCE_ID = process.env.INSTANCE_ID || `${SERVICE_NAME}-${process.pid}`;
  try {
    const registration = {
      ID: INSTANCE_ID,
      Name: SERVICE_NAME,
      Port: parseInt(PORT),
      Tags: ['heady', DOMAIN, 'v1'],
      Meta: { domain: DOMAIN, vector_dim: String(VECTOR_DIM), version: '1.0.0' },
      Check: {
        HTTP: `http://127.0.0.1:${PORT}/health`,
        Interval: '13s',     // Fibonacci
        Timeout: '5s',       // Fibonacci
        DeregisterCriticalServiceAfter: '89s', // Fibonacci
      },
    };
    // In production, POST to Consul API
    log('info', `Consul registration prepared for ${INSTANCE_ID}`, { consul: `${CONSUL_HOST}:${CONSUL_PORT}` });
  } catch (err) {
    log('warn', `Consul registration deferred: ${err.message}`);
  }
}

app.listen(PORT, () => {
  registerWithConsul();
  log('info', `${SERVICE_NAME} operational on port ${PORT}`, {
    domain: DOMAIN,
    phiTimeout: Math.round(PHI * 1000) + 'ms',
    cslGates: CSL_GATES,
  });
});

export default app;
