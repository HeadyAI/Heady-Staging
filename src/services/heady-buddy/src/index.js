/**
 * heady-buddy — Service Entry Point
 * HeadyBuddy — AI companion, persistent memory, 10 personas
 * © 2026 HeadySystems Inc. — 60+ Provisional Patents
 *
 * Domain: headybuddy.org | Port: 3315
 * Health endpoints: /health /health/live /health/ready /health/startup /health/details
 * Routing: CSL cosine matching — NO priority-based routing
 */

'use strict';

import express from 'express';
import {
  loadConfig, createLogger, logHealthEvent,
  initOtel, getTracer, createMetrics, headySpan,
  HealthRegistry, memoryCheck, envCheck,
  headyRequestId, headyAutoContext, headyCslDomain,
  headyAccessLog, headyRateLimit, headySecurityHeaders, headyErrorHandler,
  PSI, CSL_THRESHOLDS, TIMEOUTS, AUTO_SUCCESS_CYCLE_MS,
} from '@heady/platform';

const SERVICE_NAME = 'heady-buddy';
const config = loadConfig(SERVICE_NAME);
const logger  = createLogger({ service: SERVICE_NAME, domain: config.domain });

await initOtel({ service: SERVICE_NAME, domain: config.domain });
const tracer  = getTracer(SERVICE_NAME);
const metrics = createMetrics(SERVICE_NAME);

// ─── HEALTH REGISTRY ────────────────────────────────────────────────────────

const health = new HealthRegistry({
  service: SERVICE_NAME,
  version: config.version,
  domain:  config.domain,
});

health.register('memory', memoryCheck());
health.register('env', envCheck(['SERVICE_NAME', 'SERVICE_VERSION', 'HEADY_DOMAIN']));

health.register('heady-brain', async () => {
  const url = process.env['HEADY_BRAIN_URL'];
  if (!url) return { status: 'degraded', message: 'HEADY_BRAIN_URL not set' };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUTS.PHI_3);
    const r = await fetch(url + '/health/live', { signal: ctl.signal });
    clearTimeout(t);
    return { status: r.ok ? 'healthy' : 'degraded', message: `heady-brain HTTP ${r.status}` };
  } catch (err) { return { status: 'unhealthy', message: err.message }; }
});

health.register('heady-vector-memory', async () => {
  const url = process.env['HEADY_VECTOR_MEMORY_URL'];
  if (!url) return { status: 'degraded', message: 'HEADY_VECTOR_MEMORY_URL not set' };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUTS.PHI_3);
    const r = await fetch(url + '/health/live', { signal: ctl.signal });
    clearTimeout(t);
    return { status: r.ok ? 'healthy' : 'degraded', message: `heady-vector-memory HTTP ${r.status}` };
  } catch (err) { return { status: 'unhealthy', message: err.message }; }
});

health.register('heady-soul', async () => {
  const url = process.env['HEADY_SOUL_URL'];
  if (!url) return { status: 'degraded', message: 'HEADY_SOUL_URL not set' };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUTS.PHI_3);
    const r = await fetch(url + '/health/live', { signal: ctl.signal });
    clearTimeout(t);
    return { status: r.ok ? 'healthy' : 'degraded', message: `heady-soul HTTP ${r.status}` };
  } catch (err) { return { status: 'unhealthy', message: err.message }; }
});

// ─── EXPRESS APP ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Middleware stack — in canonical order
app.use(headyRequestId());
app.use(headyAutoContext());           // HeadyAutoContext phi-context injection
app.use(headyCslDomain([], null));     // CSL domain matching — NO priority routing
app.use(headyAccessLog(logger));
app.use(headyRateLimit({
  windowMs:    config.rateLimit.windowMs,    // phi4 = 6854ms
  maxRequests: config.rateLimit.maxRequests, // F(11) = 89
  burst:       config.rateLimit.burst,       // F(8) = 21
}));
app.use(headySecurityHeaders());

health.attachRoutes(app);  // /health, /health/live, /health/ready, /health/startup, /health/details

// ─── ROUTES ─────────────────────────────────────────────────────────────────

app.get('/status', (req, res) => {
  res.json({
    service:     SERVICE_NAME,
    version:     config.version,
    domain:      config.domain,
    status:      'running',
    phi_context: {
      phi:        PSI + 1,
      psi:        PSI,
      confidence: PSI,
      coherence:  CSL_THRESHOLDS.HIGH,
      cycle_ms:   AUTO_SUCCESS_CYCLE_MS,
    },
    csl_routing:  'cosine_matching_only',
    priority_routing: false,
    timestamp:    new Date().toISOString(),
  });
});

app.post('/process', async (req, res, next) => {
  const start = Date.now();
  metrics.requestCounter.add(1, { service: SERVICE_NAME });
  try {
    const result = await headySpan(tracer, `${SERVICE_NAME}.process`, {
      confidence:    PSI,
      coherence:     CSL_THRESHOLDS.HIGH,
      domain:        req.headyDomain ?? config.domain,
      pipelineStage: req.body?.stage ?? 'unknown',
    }, async (span) => {
      const input = req.body ?? {};
      const conf = input.confidence ?? PSI;
      if (conf < CSL_THRESHOLDS.PASS) {
        const err = new Error(`CSL gate fail: confidence ${conf.toFixed(3)} < psi ${PSI.toFixed(3)}`);
        err.status = 422;
        throw err;
      }
      span.setAttribute('heady.input.keys', Object.keys(input).join(','));
      return { service: SERVICE_NAME, processed: true, confidence: PSI, domain: config.domain };
    });
    metrics.latencyHistogram.record(Date.now() - start, { service: SERVICE_NAME });
    res.json({ success: true, data: result, latency_ms: Date.now() - start });
  } catch (err) { next(err); }
});

app.use(headyErrorHandler(logger));

// ─── SERVER STARTUP ──────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  logHealthEvent(logger, 'startup', true, { port: config.port, domain: config.domain });
  logger.info({ event: 'service.started', port: config.port, domain: config.domain },
    `${SERVICE_NAME} listening on :${config.port}`);
  health.markReady();
});

async function gracefulShutdown(signal) {
  logger.info({ event: 'service.shutdown', signal }, `Shutdown: ${signal}`);
  const timer = setTimeout(() => process.exit(1), config.timeout.shutdown);
  server.close(() => { clearTimeout(timer); process.exit(0); });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ event: 'unhandled_rejection', reason: String(reason) }, 'Law #1 violation — unhandled rejection');
  process.exit(1);
});

export { app, server, health, config };
