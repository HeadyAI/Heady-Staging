/**
 * © 2026 HeadySystems Inc. — Sentry Error Monitoring Integration
 * 
 * Initializes Sentry for the Heady Dynamic Sites server.
 * DSN is loaded from environment variable SENTRY_DSN.
 * 
 * Features:
 * - Automatic error capturing with stack traces
 * - Request context (URL, headers, host)
 * - Custom tags (heady.site, heady.version, heady.domain)
 * - Performance monitoring with phi-scaled sample rates
 * - Breadcrumb trail for debugging
 */

const PSI = 0.618;
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const RELEASE = 'heady-dynamic-sites@4.2.0';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

let Sentry = null;

/**
 * Initialize Sentry if DSN is available.
 * Fails gracefully — the server runs fine without Sentry.
 */
function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No SENTRY_DSN found — error monitoring disabled');
    return;
  }

  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: SENTRY_DSN,
      release: RELEASE,
      environment: ENVIRONMENT,
      tracesSampleRate: PSI, // 61.8% — phi-scaled sampling
      profilesSampleRate: PSI * PSI, // 38.2% — deeper profiling on subset
      beforeSend(event) {
        // Strip any API keys from error reports
        if (event.request && event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
      integrations: [
        Sentry.httpIntegration({ tracing: true }),
      ],
    });
    console.log(`[Sentry] Initialized — release: ${RELEASE}, env: ${ENVIRONMENT}`);
  } catch (err) {
    console.log(`[Sentry] SDK not installed (npm i @sentry/node) — monitoring disabled`);
    Sentry = null;
  }
}

/**
 * Capture an error with Heady-specific context.
 */
function captureError(err, context = {}) {
  if (!Sentry) return;
  Sentry.withScope(scope => {
    if (context.site) scope.setTag('heady.site', context.site);
    if (context.domain) scope.setTag('heady.domain', context.domain);
    if (context.path) scope.setTag('heady.path', context.path);
    scope.setTag('heady.version', '4.2.0');
    if (context.extra) scope.setExtras(context.extra);
    Sentry.captureException(err);
  });
}

/**
 * Add a breadcrumb for debugging.
 */
function addBreadcrumb(message, category = 'heady', data = {}) {
  if (!Sentry) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}

/**
 * Express-style error handler middleware.
 * Call this in the server's error path.
 */
function errorHandler(err, req, res) {
  const host = req.headers.host || 'unknown';
  captureError(err, {
    site: host,
    domain: host.replace(/:\d+$/, ''),
    path: req.url,
    extra: { method: req.method, statusCode: res.statusCode },
  });
}

module.exports = { initSentry, captureError, addBreadcrumb, errorHandler, SENTRY_DSN };
