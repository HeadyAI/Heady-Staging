'use strict';

const { createHash } = require('node:crypto');

/**
 * Extract the user-agent family from a raw User-Agent string.
 * Simplified parser — extracts the main browser/bot name without full detail.
 *
 * @param {string} ua
 * @returns {string}
 */
function parseUserAgentFamily(ua) {
  if (!ua) return 'unknown';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('curl')) return 'curl';
  if (ua.includes('bot') || ua.includes('Bot') || ua.includes('crawl')) return 'bot';
  return 'other';
}

/**
 * Hash an IP address with a daily salt for privacy.
 * The hash rotates daily so IPs cannot be tracked across days.
 *
 * @param {string} ip
 * @returns {string} SHA-256 hex (first 16 chars)
 */
function hashIP(ip) {
  const daySalt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash('sha256')
    .update(`${ip}|${daySalt}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Hash a session ID for privacy.
 *
 * @param {string} sessionId
 * @returns {string}
 */
function hashSessionId(sessionId) {
  if (!sessionId) return null;
  return createHash('sha256')
    .update(sessionId)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Create an analytics event collector.
 *
 * @param {object} params
 * @param {import('./store').AnalyticsStore} params.store
 * @param {object} params.log
 * @returns {{ collectPageView: Function, collectEvent: Function, collectApiCall: Function, middleware: Function }}
 */
function createCollector({ store, log }) {
  /**
   * Collect a page view event.
   *
   * @param {object} data
   * @param {string} data.path
   * @param {string} [data.referrer]
   * @param {string} data.ip
   * @param {string} data.userAgent
   * @param {string} [data.sessionId]
   */
  function collectPageView(data) {
    store.addEvent({
      event_type: 'page_view',
      path: data.path,
      referrer: data.referrer || null,
      user_agent_family: parseUserAgentFamily(data.userAgent),
      session_id: hashSessionId(data.sessionId),
      ip_hash: hashIP(data.ip),
    });
  }

  /**
   * Collect a custom event.
   *
   * @param {object} data
   * @param {string} data.eventName
   * @param {object} [data.properties]
   * @param {string} data.ip
   * @param {string} data.userAgent
   * @param {string} [data.sessionId]
   */
  function collectEvent(data) {
    store.addEvent({
      event_type: 'custom_event',
      event_name: data.eventName,
      properties: data.properties || {},
      user_agent_family: parseUserAgentFamily(data.userAgent),
      session_id: hashSessionId(data.sessionId),
      ip_hash: hashIP(data.ip),
    });
  }

  /**
   * Collect an API call event.
   *
   * @param {object} data
   * @param {string} data.method
   * @param {string} data.path
   * @param {number} data.statusCode
   * @param {number} data.latencyMs
   * @param {string} data.ip
   * @param {string} data.userAgent
   */
  function collectApiCall(data) {
    store.addEvent({
      event_type: 'api_call',
      path: data.path,
      user_agent_family: parseUserAgentFamily(data.userAgent),
      ip_hash: hashIP(data.ip),
      properties: {
        method: data.method,
        status_code: data.statusCode,
        latency_ms: data.latencyMs,
      },
    });
  }

  /**
   * Express middleware that auto-collects API call events.
   */
  function middleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
      collectApiCall({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        latencyMs: Date.now() - start,
        ip: req.ip || req.socket?.remoteAddress || '',
        userAgent: req.get('user-agent') || '',
      });
    });
    next();
  }

  return {
    collectPageView,
    collectEvent,
    collectApiCall,
    middleware,
  };
}

module.exports = {
  createCollector,
  parseUserAgentFamily,
  hashIP,
  hashSessionId,
};
