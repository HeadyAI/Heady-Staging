/**
 * Heady™ Latent OS — Heady Manager
 * Main HTTP/MCP server entry point. Pure orchestrator shell.
 *
 * Responsibilities:
 *   - Runs the 10-phase boot() sequence
 *   - Mounts health probes at /healthz, /readyz, /startupz
 *   - Exposes MCP JSON-RPC 2.0 endpoint at /mcp
 *   - Listens on PORT env var or default 3301
 *   - Graceful shutdown on SIGTERM/SIGINT (delegated to bootstrap)
 *
 * This file is the process entry point: node src/bootstrap/heady-manager.js
 *
 * © 2024-2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */

'use strict';

const express    = require('express');
const helmet     = require('helmet');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const { createLogger }       = require('../core/heady-logger');

const log = createLogger('heady-manager');

// ─── Lazy-loaded heavy modules (deferred until first use for cold-start perf) ─
let _phiMath = null;
function getPhiMath() {
  if (!_phiMath) _phiMath = require('../../shared/phi-math');
  return _phiMath;
}

let _bootstrap = null;
function getBootstrap() {
  if (!_bootstrap) _bootstrap = require('./bootstrap');
  return _bootstrap;
}

let _healthProbes = null;
function getHealthProbes() {
  if (!_healthProbes) _healthProbes = require('../core/health-probes');
  return _healthProbes;
}

let _eventBus = null;
function getEventBus() {
  if (!_eventBus) _eventBus = require('../core/event-bus');
  return _eventBus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default HTTP port — must come from env; fallback 3301 */
const DEFAULT_PORT = parseInt(process.env.PORT || '3301', 10);

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

// ─── Security Headers (helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard:              { action: 'deny' },          // X-Frame-Options: DENY
  noSniff:                 true,                         // X-Content-Type-Options: nosniff
  hsts:                    { maxAge: 31536000, includeSubDomains: true, preload: true }, // Strict-Transport-Security
  referrerPolicy:          { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,                     // disabled for MCP compatibility
}));

// ─── Response Compression (gzip/brotli) ──────────────────────────────────────
app.use(compression({
  level: 6,
  threshold: 1024,  // only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ─── Rate Limiting (100 req/min per IP) ──────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code:       'RATE_LIMITED',
        message:    'Too many requests. Try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000) / 1000),
      },
    });
  },
});
app.use(apiLimiter);

// Parse JSON bodies for MCP and API endpoints
app.use(express.json({ limit: '4mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  log.debug('HTTP request', { method: req.method, path: req.path, ip: req.ip });
  next();
});

// ─── Health Routes ────────────────────────────────────────────────────────────

app.use('/', getHealthProbes().createHealthRouter());

// ─── MCP JSON-RPC 2.0 Endpoint ───────────────────────────────────────────────

/**
 * MCP (Model Context Protocol) JSON-RPC 2.0 stub.
 * Accepts POST /mcp with a JSON-RPC 2.0 body.
 * Returns method-not-found for unregistered methods until real
 * MCP dispatcher is wired in by the CSL/Conductor layers.
 *
 * Spec: https://spec.modelcontextprotocol.io/specification/
 */
app.post('/mcp', (req, res) => {
  const body = req.body;

  // Validate JSON-RPC 2.0 envelope
  if (!body || body.jsonrpc !== '2.0' || !body.method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id:      body && body.id !== undefined ? body.id : null,
      error:   { code: -32600, message: 'Invalid Request' },
    });
  }

  const { id, method, params } = body;
  const { PHI } = getPhiMath();

  // Built-in MCP capabilities
  if (method === 'mcp/capabilities') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        name:        'heady-latent-os',
        version:     process.env.HEADY_VERSION || '1.0.0',
        phi:         PHI,
        capabilities: [
          'task/submit',
          'task/status',
          'memory/search',
          'health/status',
          'pipeline/run',
        ],
      },
    });
  }

  if (method === 'mcp/ping') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result:  { pong: true, ts: new Date().toISOString(), phi: PHI },
    });
  }

  // Route to EventBus for registered method handlers
  const { PSI, CSL_THRESHOLDS } = getPhiMath();
  getEventBus().bus.emit('task', {
    type:     'mcp_request',
    data:     { id, method, params },
    temporal: CSL_THRESHOLDS.MEDIUM,   // 0.809
    semantic: CSL_THRESHOLDS.LOW,      // 0.691
    spatial:  PSI,                      // 0.618
  });

  // Until the full MCP dispatcher is wired, return method-not-found
  return res.status(404).json({
    jsonrpc: '2.0',
    id,
    error: {
      code:    -32601,
      message: `Method not found: ${method}`,
    },
  });
});

// ─── Info Route ───────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name:    'Heady Latent OS',
    version: process.env.HEADY_VERSION || '1.0.0',
    env:     process.env.HEADY_ENV     || 'development',
    phi:     getPhiMath().PHI,
    routes: {
      health:   ['/healthz', '/readyz', '/startupz'],
      mcp:      '/mcp',
    },
    ts: new Date().toISOString(),
  });
});

// ─── 404 Catch-all ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', phi: getPhiMath().PHI });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  log.error('Express error handler', err);
  res.status(500).json({ error: 'internal_server_error', message: err.message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

/**
 * Start the HTTP server and run the boot sequence.
 * @returns {Promise<import('http').Server>}
 */
async function startServer() {
  // Run 10-phase boot sequence first
  await getBootstrap().boot();

  return new Promise((resolve, reject) => {
    const server = app.listen(DEFAULT_PORT, (err) => {
      if (err) return reject(err);
      log.info('Heady Manager listening', {
        port: DEFAULT_PORT,
        env:  process.env.HEADY_ENV,
        phi:  getPhiMath().PHI,
      });
      getEventBus().bus.emit('lifecycle', {
        type:     'http_ready',
        data:     { port: DEFAULT_PORT },
        temporal: 0.9,
        semantic: 0.9,
        spatial:  0.9,
      });
      resolve(server);
    });

    server.on('error', reject);
  });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

// Only start when this file is the direct entry point
if (require.main === module) {
  startServer().catch((err) => {
    log.fatal('Server startup failed', err);
    process.exit(1);
  });
}

// ─── Exports (for testing / programmatic use) ─────────────────────────────────

module.exports = { app, startServer, DEFAULT_PORT };
