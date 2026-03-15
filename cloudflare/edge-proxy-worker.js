/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ EDGE PROXY — Part 5 of 5                               ║
 * ║  Cloudflare Worker: routes all *.headysystems.com domains       ║
 * ║  © 2026 HeadySystems Inc. — Eric Haywood, Founder              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const PHI = 1.618034;
const PSI = 0.618034;

// Domain → upstream service mapping
const ROUTES = {
  // Primary product domains
  'headysystems.com':      { upstream: 'headysystems',      port: 8080 },
  'www.headysystems.com':  { upstream: 'headysystems',      port: 8080 },
  'headyme.com':           { upstream: 'headyme',            port: 8080 },
  'www.headyme.com':       { upstream: 'headyme',            port: 8080 },
  'headymcp.com':          { upstream: 'headymcp',           port: 8080 },
  'headyio.com':           { upstream: 'headyio',            port: 8080 },
  'headyos.com':           { upstream: 'headyos',            port: 8080 },
  'headybuddy.org':        { upstream: 'headybuddy-org',     port: 8080 },
  'headyconnection.org':   { upstream: 'headyconnection',    port: 8080 },
  '1ime1.com':             { upstream: '1ime1',              port: 8080 },

  // API & services
  'api.headysystems.com':  { upstream: 'heady-manager',      port: 3300 },
  'manager.headysystems.com': { upstream: 'heady-manager',   port: 3300 },
  'registry.headysystems.com': { upstream: 'heady-manager',  port: 3300 },
  'mcp.headysystems.com':  { upstream: 'heady-mcp',          port: 3001 },

  // Subdomains → tool sites
  'atlas.headysystems.com':     { upstream: 'heady-atlas',     port: 8080 },
  'builder.headysystems.com':   { upstream: 'heady-builder',   port: 8080 },
  'buddy.headysystems.com':     { upstream: 'heady-buddy-portal', port: 8080 },
  'critique.headysystems.com':  { upstream: 'heady-critique',  port: 8080 },
  'desktop.headysystems.com':   { upstream: 'heady-desktop',   port: 8080 },
  'discord.headysystems.com':   { upstream: 'heady-discord',   port: 8080 },
  'docs.headysystems.com':      { upstream: 'headydocs',       port: 8080 },
  'github.headysystems.com':    { upstream: 'heady-github-integration', port: 8080 },
  'imagine.headysystems.com':   { upstream: 'heady-imagine',   port: 8080 },
  'instant.headysystems.com':   { upstream: 'instant',         port: 8080 },
  'jetbrains.headysystems.com': { upstream: 'heady-jetbrains', port: 8080 },
  'jules.headysystems.com':     { upstream: 'heady-jules',     port: 8080 },
  'kinetics.headysystems.com':  { upstream: 'heady-kinetics',  port: 8080 },
  'logs.headysystems.com':      { upstream: 'heady-logs',      port: 8080 },
  'maestro.headysystems.com':   { upstream: 'heady-maestro',   port: 8080 },
  'metrics.headysystems.com':   { upstream: 'heady-metrics',   port: 8080 },
  'mobile.headysystems.com':    { upstream: 'heady-mobile',    port: 8080 },
  'montecarlo.headysystems.com': { upstream: 'heady-montecarlo', port: 8080 },
  'observer.headysystems.com':  { upstream: 'heady-observer',  port: 8080 },
  'patterns.headysystems.com':  { upstream: 'heady-patterns',  port: 8080 },
  'pythia.headysystems.com':    { upstream: 'heady-pythia',     port: 8080 },
  'sentinel.headysystems.com':  { upstream: 'heady-sentinel',  port: 8080 },
  'slack.headysystems.com':     { upstream: 'heady-slack',     port: 8080 },
  'stories.headysystems.com':   { upstream: 'heady-stories',   port: 8080 },
  'traces.headysystems.com':    { upstream: 'heady-traces',    port: 8080 },
  'vinci.headysystems.com':     { upstream: 'heady-vinci',     port: 8080 },
  'vscode.headysystems.com':    { upstream: 'heady-vscode',    port: 8080 },
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Powered-By': 'Heady/' + '3.0.0',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-API-Key, X-Heady-Service',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Route lookup
    const route = ROUTES[hostname];
    if (!route) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Unknown domain',
        domain: hostname,
        hint: 'Check ROUTES mapping in edge-proxy worker',
      }), { status: 404, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } });
    }

    // Build upstream URL
    const upstreamUrl = `https://${route.upstream}.${env.CLOUDRUN_BASE_DOMAIN || 'a.run.app'}${url.pathname}${url.search}`;

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'Host': `${route.upstream}.${env.CLOUDRUN_BASE_DOMAIN || 'a.run.app'}`,
          'X-Forwarded-Host': hostname,
          'X-Forwarded-Proto': 'https',
          'X-Heady-Service': route.upstream,
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      // Clone response with security headers
      const responseHeaders = new Headers(upstreamResponse.headers);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        responseHeaders.set(key, value);
      }
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(key, value);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Upstream unreachable',
        service: route.upstream,
        message: err.message,
      }), { status: 502, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } });
    }
  },
};
