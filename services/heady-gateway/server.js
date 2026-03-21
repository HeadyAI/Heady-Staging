/**
 * @fileoverview Heady Central API Gateway
 * @module @heady/gateway-service
 * @version 1.0.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 *
 * CSL-based intent classification for routing, health aggregation,
 * phi-scaled rate limiting, CORS whitelist for all 9 Heady domains.
 */

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import cors from 'cors';
import helmet from 'helmet';

const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };

const log = pino({ name: 'heady-gateway', level: process.env.LOG_LEVEL || 'info' });

/** Approved Heady domains for CORS */
const HEADY_DOMAINS = [
  'headyme.com', 'headysystems.com', 'headyconnection.org', 'headyconnection.com',
  'headybuddy.org', 'headymcp.com', 'headyio.com', 'headybot.com',
  'headyapi.com', 'heady-ai.com', 'headyos.com', 'headyex.com', 'headyfinance.com',
];

function isHeadyOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (HEADY_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) return true;
    if (hostname.endsWith('.run.app')) return true;
    if (hostname.endsWith('.workers.dev')) return true;
    if (process.env.NODE_ENV !== 'production' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
    return false;
  } catch { return false; }
}

/** Service registry with health endpoints */
const SERVICE_REGISTRY = {
  'heady-manager': { url: process.env.HEADY_MANAGER_URL || 'http://heady-manager:3301', healthPath: '/health' },
  'heady-brain': { url: process.env.HEADY_BRAIN_URL || 'http://heady-brain:3302', healthPath: '/health' },
  'heady-conductor': { url: process.env.HEADY_CONDUCTOR_URL || 'http://heady-conductor:3303', healthPath: '/health' },
  'heady-buddy': { url: process.env.BUDDY_SERVICE_URL || 'http://heady-buddy:3310', healthPath: '/health' },
  'heady-ide': { url: process.env.IDE_SERVICE_URL || 'http://heady-ide:3320', healthPath: '/health' },
  'heady-persistence': { url: process.env.HEADY_PERSISTENCE_URL || 'http://heady-persistence:3340', healthPath: '/health' },
  'heady-mcp': { url: process.env.HEADY_MCP_URL || 'http://heady-mcp:3350', healthPath: '/health' },
  'heady-analytics': { url: process.env.HEADY_ANALYTICS_URL || 'http://heady-analytics:3360', healthPath: '/health' },
  'heady-auth': { url: process.env.HEADY_AUTH_URL || 'http://heady-auth:3370', healthPath: '/health' },
};

/** Phi-scaled rate limiting tiers */
const RATE_TIERS = {
  free: { windowMs: 60000, maxRequests: FIB[8] },       // 21 req/min
  standard: { windowMs: 60000, maxRequests: FIB[10] },  // 55 req/min
  pro: { windowMs: 60000, maxRequests: FIB[12] },       // 144 req/min
  enterprise: { windowMs: 60000, maxRequests: FIB[14] }, // 377 req/min
};

/** Simple in-memory rate limiter */
const rateBuckets = new Map();

function rateLimit(clientId, tier = 'standard') {
  const config = RATE_TIERS[tier] || RATE_TIERS.standard;
  const now = Date.now();
  const key = `${clientId}:${Math.floor(now / config.windowMs)}`;

  const current = rateBuckets.get(key) || 0;
  if (current >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetMs: config.windowMs - (now % config.windowMs) };
  }

  rateBuckets.set(key, current + 1);
  // Cleanup old buckets periodically
  if (rateBuckets.size > 10000) {
    const cutoff = Math.floor(now / config.windowMs) - 2;
    for (const [k] of rateBuckets) {
      const bucket = parseInt(k.split(':')[1]);
      if (bucket < cutoff) rateBuckets.delete(k);
    }
  }

  return { allowed: true, remaining: config.maxRequests - current - 1, resetMs: config.windowMs - (now % config.windowMs) };
}

/** CSL-based intent classification for routing */
function classifyIntent(path, method) {
  const routes = [
    { pattern: /^\/api\/buddy/, service: 'heady-buddy', confidence: CSL.HIGH },
    { pattern: /^\/api\/ide/, service: 'heady-ide', confidence: CSL.HIGH },
    { pattern: /^\/api\/auth/, service: 'heady-auth', confidence: CSL.CRITICAL },
    { pattern: /^\/api\/mcp/, service: 'heady-mcp', confidence: CSL.HIGH },
    { pattern: /^\/api\/persistence/, service: 'heady-persistence', confidence: CSL.HIGH },
    { pattern: /^\/api\/analytics/, service: 'heady-analytics', confidence: CSL.MEDIUM },
    { pattern: /^\/api\/brain/, service: 'heady-brain', confidence: CSL.HIGH },
    { pattern: /^\/api\/conductor/, service: 'heady-conductor', confidence: CSL.HIGH },
    { pattern: /^\/api\//, service: 'heady-manager', confidence: CSL.MEDIUM },
  ];

  for (const route of routes) {
    if (route.pattern.test(path)) {
      return { service: route.service, confidence: route.confidence };
    }
  }
  return { service: 'heady-manager', confidence: CSL.LOW };
}

/** Health aggregation across all services */
async function aggregateHealth() {
  const results = {};
  let totalCoherence = 0;
  let serviceCount = 0;

  for (const [name, config] of Object.entries(SERVICE_REGISTRY)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${config.url}${config.healthPath}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        results[name] = { status: 'healthy', coherenceScore: data.coherenceScore || CSL.MEDIUM };
        totalCoherence += results[name].coherenceScore;
        serviceCount++;
      } else {
        results[name] = { status: 'degraded', coherenceScore: CSL.LOW };
        totalCoherence += CSL.LOW;
        serviceCount++;
      }
    } catch {
      results[name] = { status: 'unreachable', coherenceScore: 0 };
      serviceCount++;
    }
  }

  const avgCoherence = serviceCount > 0 ? totalCoherence / serviceCount : 0;
  return {
    status: avgCoherence >= CSL.MEDIUM ? 'healthy' : avgCoherence >= CSL.LOW ? 'degraded' : 'critical',
    coherenceScore: Math.round(avgCoherence * 1000) / 1000,
    services: results,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    phi: PHI,
  };
}

// ── Express App Setup ────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.GATEWAY_PORT || process.env.PORT || '3330');

// Structured logging
app.use(pinoHttp({ logger: log }));

// Security headers
app.use(helmet());

// CORS — whitelist Heady domains only
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isHeadyOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Rate limiting middleware
app.use((req, res, next) => {
  const clientId = req.headers['x-heady-user'] || req.ip;
  const tier = req.headers['x-heady-tier'] || 'standard';
  const result = rateLimit(clientId, tier);

  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetMs / 1000));

  if (!result.allowed) {
    log.warn({ clientId, tier }, 'Rate limit exceeded');
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      retryAfter: Math.ceil(result.resetMs / 1000),
      coherenceScore: CSL.MINIMUM,
    });
  }
  next();
});

// Health endpoint — aggregated
app.get('/health', async (req, res) => {
  try {
    const health = await aggregateHealth();
    const status = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(status).json(health);
  } catch (err) {
    log.error({ err }, 'Health check failed');
    res.status(503).json({ status: 'error', coherenceScore: 0 });
  }
});

// Gateway info
app.get('/', (req, res) => {
  res.json({
    service: 'heady-gateway',
    version: '1.0.0',
    description: 'Heady Central API Gateway — CSL-routed, phi-scaled',
    coherenceScore: CSL.HIGH,
    endpoints: {
      health: '/health',
      api: '/api/*',
      services: Object.keys(SERVICE_REGISTRY),
    },
  });
});

// API routing via CSL intent classification
app.all('/api/*', async (req, res) => {
  const { service, confidence } = classifyIntent(req.path, req.method);
  const correlationId = `gw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  res.setHeader('X-Heady-Correlation-Id', correlationId);
  res.setHeader('X-Heady-Routed-To', service);
  res.setHeader('X-Heady-Confidence', confidence.toString());

  const serviceConfig = SERVICE_REGISTRY[service];
  if (!serviceConfig) {
    return res.status(404).json({ error: 'service_not_found', service, correlationId });
  }

  if (confidence < CSL.MINIMUM) {
    log.warn({ correlationId, service, confidence }, 'Low confidence route');
    return res.status(400).json({ error: 'ambiguous_request', confidence, correlationId });
  }

  try {
    const targetUrl = `${serviceConfig.url}${req.path}`;
    const headers = { ...req.headers, 'x-heady-correlation-id': correlationId, 'x-heady-source': 'gateway' };
    delete headers.host;

    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await proxyRes.text();
    res.status(proxyRes.status);
    for (const [key, value] of proxyRes.headers.entries()) {
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }
    res.send(data);
  } catch (err) {
    log.error({ err, correlationId, service }, 'Proxy request failed');
    res.status(502).json({ error: 'upstream_error', service, correlationId, coherenceScore: CSL.MINIMUM });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  log.info({ port: PORT, services: Object.keys(SERVICE_REGISTRY).length }, 'Heady Gateway started');
});

export default app;
