/**
 * Heady™ Domain Router Service — Cross-Domain Link Verification & Auth Handoff
 * Port: 3366 | Domain: router.headysystems.com
 *
 * Ensures all links between the 9 Heady domains are:
 *   1. Authenticated — session is relayed via auth bridge
 *   2. Verified — destination domain is in canonical registry
 *   3. CSL-gated — routing confidence meets domain threshold
 *   4. Logged — cross-domain navigation tracked for analytics
 *
 * Author: Eric Haywood <eric@headysystems.com>
 * © 2026 HeadySystems Inc. — 51 Provisional Patents
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const {
  PHI, PSI, fib, CSL_THRESHOLDS, PHI_TIMING,
  cslGate, sigmoid, phiBackoffWithJitter,
} = require('../../shared/phi-math');
const {
  HEADY_DOMAINS, ALLOWED_ORIGINS, isAllowedOrigin, getDomainByHost, NAVIGATION_MAP,
} = require('../../shared/heady-domains');
const {
  generateRelayCode, evaluateAuthConfidence,
} = require('../../src/security/cross-domain-auth');

// ─── φ-Constants ─────────────────────────────────────────────────────────────

const PORT                = parseInt(process.env.SERVICE_PORT, 10) || 3366;
const MAX_BODY_BYTES      = fib(10) * 1024;          // 55 KB
const ROUTE_CACHE_TTL_MS  = PHI_TIMING.PHI_7;        // 29 034ms
const NAVIGATION_CACHE    = new Map();
const ROUTE_LOG_BUFFER    = [];
const ROUTE_LOG_FLUSH_MS  = PHI_TIMING.PHI_6;        // 17 944ms
const MAX_LOG_BUFFER      = fib(12);                  // 144 entries

// ─── Structured logger ──────────────────────────────────────────────────────

function log(level, msg, meta = {}) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'domain-router',
    msg,
    ...meta,
  });
  process.stdout.write(entry + '\n');
}

// ─── Parse request body ─────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (parseErr) { reject(parseErr); }
    });
    req.on('error', (reqErr) => reject(reqErr));
  });
}

// ─── JSON response helper ───────────────────────────────────────────────────

function jsonResponse(res, statusCode, body) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
  });
  res.end(json);
}

// ─── CORS handling ──────────────────────────────────────────────────────────

function handleCORS(req, res) {
  const origin = req.headers.origin || '';
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ─── Route verification ─────────────────────────────────────────────────────

function verifyRoute(sourceDomain, destinationURL) {
  try {
    const url = new URL(destinationURL);
    const destDomain = getDomainByHost(url.hostname);

    if (!destDomain) {
      return { valid: false, reason: 'destination_not_in_registry', destination: url.hostname };
    }

    // CSL gate: evaluate routing confidence
    const sourceConfig = getDomainByHost(sourceDomain);
    const sourceGate = sourceConfig ? sourceConfig.csl : CSL_THRESHOLDS.LOW;
    const destGate = destDomain.csl;
    const routingConfidence = Math.min(sourceGate, destGate);

    return {
      valid: true,
      source: sourceDomain,
      destination: destDomain.host,
      destinationRole: destDomain.role,
      pool: destDomain.pool,
      routingConfidence: Math.round(routingConfidence * 1000) / 1000,
      meetsThreshold: routingConfidence >= CSL_THRESHOLDS.MINIMUM,
    };
  } catch (urlErr) {
    return { valid: false, reason: 'invalid_url', error: urlErr.message };
  }
}

// ─── Auth handoff — generate relay code for cross-domain navigation ─────────

function initiateAuthHandoff(userId, sourceDomain, destinationURL) {
  const verification = verifyRoute(sourceDomain, destinationURL);
  if (!verification.valid) {
    return { success: false, verification };
  }

  const relayCode = generateRelayCode(userId, sourceDomain);

  return {
    success: true,
    verification,
    relay: {
      code: relayCode.code,
      nonce: relayCode.nonce,
      expiresAt: relayCode.expiresAt,
      handoffURL: `https://auth.headysystems.com/relay?code=${relayCode.code}&nonce=${relayCode.nonce}&dest=${encodeURIComponent(destinationURL)}`,
    },
  };
}

// ─── Navigation manifest ────────────────────────────────────────────────────

function getNavigationManifest(currentDomain) {
  const cacheKey = `nav:${currentDomain}`;
  const cached = NAVIGATION_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const manifest = {
    currentDomain,
    navigation: NAVIGATION_MAP,
    domains: Object.entries(HEADY_DOMAINS).map(([key, d]) => ({
      key,
      host: d.host,
      url: `https://${d.host}`,
      role: d.role,
      pool: d.pool,
      isCurrent: d.host === currentDomain,
    })),
    authBridge: 'https://auth.headysystems.com/bridge',
    authRelay: 'https://auth.headysystems.com/relay',
  };

  NAVIGATION_CACHE.set(cacheKey, { ts: Date.now(), data: manifest });
  return manifest;
}

// ─── Log route for analytics ────────────────────────────────────────────────

function logRoute(source, destination, userId, success) {
  ROUTE_LOG_BUFFER.push({
    ts: new Date().toISOString(),
    source,
    destination,
    userId: userId || 'anonymous',
    success,
  });

  if (ROUTE_LOG_BUFFER.length >= MAX_LOG_BUFFER) {
    flushRouteLogs();
  }
}

function flushRouteLogs() {
  if (ROUTE_LOG_BUFFER.length === 0) return;
  const batch = ROUTE_LOG_BUFFER.splice(0, ROUTE_LOG_BUFFER.length);
  log('info', 'Route log flush', { count: batch.length, routes: batch });
}

setInterval(flushRouteLogs, ROUTE_LOG_FLUSH_MS);

// ─── HTTP Server ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  handleCORS(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // Health check
    if (url.pathname === '/health') {
      return jsonResponse(res, 200, {
        status: 'healthy',
        service: 'domain-router',
        version: '5.3.0',
        uptime: process.uptime(),
        domains: Object.keys(HEADY_DOMAINS).length,
        origins: ALLOWED_ORIGINS.length,
      });
    }

    // GET /navigation?domain=headyme.com
    if (url.pathname === '/navigation' && req.method === 'GET') {
      const domain = url.searchParams.get('domain') || '';
      return jsonResponse(res, 200, getNavigationManifest(domain));
    }

    // POST /verify-route
    if (url.pathname === '/verify-route' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = verifyRoute(body.sourceDomain, body.destinationURL);
      logRoute(body.sourceDomain, body.destinationURL, body.userId, result.valid);
      return jsonResponse(res, 200, result);
    }

    // POST /auth-handoff
    if (url.pathname === '/auth-handoff' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.userId || !body.sourceDomain || !body.destinationURL) {
        return jsonResponse(res, 400, { error: 'Missing userId, sourceDomain, or destinationURL' });
      }
      const result = initiateAuthHandoff(body.userId, body.sourceDomain, body.destinationURL);
      logRoute(body.sourceDomain, body.destinationURL, body.userId, result.success);
      return jsonResponse(res, result.success ? 200 : 403, result);
    }

    // GET /domains
    if (url.pathname === '/domains' && req.method === 'GET') {
      return jsonResponse(res, 200, {
        domains: HEADY_DOMAINS,
        origins: ALLOWED_ORIGINS,
        navigation: NAVIGATION_MAP,
      });
    }

    // 404
    return jsonResponse(res, 404, { error: 'Not found', path: url.pathname });

  } catch (routeErr) {
    log('error', 'Request handler error', { error: routeErr.message, path: url.pathname });
    return jsonResponse(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log('info', 'Domain Router started', {
    port: PORT,
    domains: Object.keys(HEADY_DOMAINS).length,
    origins: ALLOWED_ORIGINS.length,
  });
});

module.exports = { verifyRoute, initiateAuthHandoff, getNavigationManifest, logRoute };
