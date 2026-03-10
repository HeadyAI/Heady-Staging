/**
 * Heady CSP Middleware — Content Security Policy enforcement
 * Strict CSP headers, nonce generation, violation reporting
 * Author: Eric Haywood | All constants φ-derived | ESM only
 */
import { createHash, randomBytes } from 'crypto';
import { PHI, PSI, PSI2, phiThreshold, fibonacci } from '../shared/phi-math-v2.js';
import { cslGate } from '../shared/csl-engine-v2.js';

const NONCE_BYTES         = fibonacci(7);   // 13
const REPORT_BUFFER_MAX   = fibonacci(14);  // 377
const RATE_LIMIT_REPORTS  = fibonacci(10);  // 55 per window
const REPORT_WINDOW_MS    = fibonacci(13) * 1000; // 233s

function sha256(input) { return createHash('sha256').update(String(input)).digest('hex'); }

const violationReports = [];
const reportRateLimits = new Map();

function generateNonce() {
  return randomBytes(NONCE_BYTES).toString('base64url');
}

function buildCspHeader(nonce, options) {
  const opts = options || {};
  const directives = {
    'default-src': ["'none'"],
    'script-src': ["'self'", "'nonce-" + nonce + "'", "'strict-dynamic'"],
    'style-src': ["'self'", "'nonce-" + nonce + "'"],
    'img-src': ["'self'", 'data:', 'https://cdn.headysystems.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://api.headysystems.com', 'wss://ws.headysystems.com', 'https://firebaseauth.googleapis.com'],
    'frame-src': ["'self'", 'https://auth.headysystems.com'],
    'frame-ancestors': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'report-uri': [opts.reportUri || '/csp-report'],
    'report-to': ['heady-csp-endpoint'],
    'upgrade-insecure-requests': [],
  };

  if (opts.additionalSources) {
    for (const [directive, sources] of Object.entries(opts.additionalSources)) {
      if (directives[directive]) {
        directives[directive].push(...sources);
      }
    }
  }

  return Object.entries(directives)
    .map(([key, values]) => values.length > 0 ? key + ' ' + values.join(' ') : key)
    .join('; ');
}

function buildSecurityHeaders(nonce, options) {
  const cspValue = buildCspHeader(nonce, options);
  return {
    'Content-Security-Policy': cspValue,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)',
    'Strict-Transport-Security': 'max-age=' + (fibonacci(17) * 86400) + '; includeSubDomains; preload',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
}

function handleViolationReport(report, clientIp) {
  const clientId = sha256(clientIp || 'unknown');
  let bucket = reportRateLimits.get(clientId);
  const now = Date.now();
  if (!bucket || (now - bucket.start) > REPORT_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    reportRateLimits.set(clientId, bucket);
  }
  bucket.count++;

  const gateScore = 1.0 - (bucket.count / RATE_LIMIT_REPORTS);
  const gate = cslGate(1.0, gateScore, phiThreshold(1), PSI * PSI * PSI);
  if (gate < PSI2) return { accepted: false, reason: 'rate_limited' };

  const entry = {
    id: sha256(JSON.stringify(report) + now),
    documentUri: report['document-uri'] || report.documentURL || 'unknown',
    violatedDirective: report['violated-directive'] || report.effectiveDirective || 'unknown',
    blockedUri: report['blocked-uri'] || report.blockedURL || 'unknown',
    originalPolicy: report['original-policy'] || '',
    disposition: report.disposition || 'enforce',
    timestamp: now,
    clientHash: clientId,
    hash: sha256(JSON.stringify(report)),
  };

  if (violationReports.length >= REPORT_BUFFER_MAX) violationReports.shift();
  violationReports.push(entry);
  return { accepted: true, id: entry.id };
}

function getViolationAnalytics() {
  const byDirective = {};
  const byUri = {};
  for (const v of violationReports) {
    byDirective[v.violatedDirective] = (byDirective[v.violatedDirective] || 0) + 1;
    byUri[v.blockedUri] = (byUri[v.blockedUri] || 0) + 1;
  }
  return { total: violationReports.length, byDirective, byUri, recent: violationReports.slice(-fibonacci(8)) };
}

function createMiddleware(options) {
  return (req, res, next) => {
    const nonce = generateNonce();
    const headers = buildSecurityHeaders(nonce, options);
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
    res.locals = res.locals || {};
    res.locals.cspNonce = nonce;
    if (typeof next === 'function') next();
  };
}

function createServer(port = 3390) {
  return import('http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const respond = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
      const readBody = () => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { r(JSON.parse(Buffer.concat(c).toString())); } catch { r({}); } }); });

      if (url.pathname === '/csp-report' && req.method === 'POST') {
        const body = await readBody();
        const report = body['csp-report'] || body;
        respond(204, handleViolationReport(report, req.headers['x-forwarded-for']));
      } else if (url.pathname === '/csp/analytics' && req.method === 'GET') {
        respond(200, getViolationAnalytics());
      } else if (url.pathname === '/csp/headers' && req.method === 'GET') {
        const nonce = generateNonce();
        respond(200, buildSecurityHeaders(nonce));
      } else if (url.pathname === '/health') {
        respond(200, { service: 'csp-middleware', status: 'healthy', violationCount: violationReports.length });
      } else { respond(404, { error: 'not_found' }); }
    });
    server.listen(port);
    return server;
  });
}

export default { createServer, createMiddleware, buildCspHeader, buildSecurityHeaders, generateNonce, handleViolationReport, getViolationAnalytics };
export { createServer, createMiddleware, buildCspHeader, buildSecurityHeaders, generateNonce, handleViolationReport, getViolationAnalytics };
