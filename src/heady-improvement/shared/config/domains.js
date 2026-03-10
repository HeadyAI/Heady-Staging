'use strict';

/**
 * All 9 Heady platform domains with roles and configuration.
 * Central source of truth for CORS, CSP, cookie domains, and service routing.
 */

const DOMAINS = {
  'headyme.com': {
    role: 'consumer',
    description: 'Consumer-facing Heady personal AI',
    services: ['auth-session-server', 'notification-service', 'analytics-service'],
    allowCookies: true,
  },
  'headysystems.com': {
    role: 'platform',
    description: 'Core Heady platform and API',
    services: ['auth-session-server', 'notification-service', 'analytics-service', 'billing-service', 'scheduler-service'],
    allowCookies: true,
  },
  'heady-ai.com': {
    role: 'ai',
    description: 'Heady AI inference and agent endpoints',
    services: ['auth-session-server', 'notification-service', 'analytics-service'],
    allowCookies: true,
  },
  'headyos.com': {
    role: 'os',
    description: 'HeadyOS operating environment',
    services: ['auth-session-server', 'notification-service', 'analytics-service', 'scheduler-service'],
    allowCookies: true,
  },
  'headyconnection.org': {
    role: 'community',
    description: 'Heady Connection community (nonprofit)',
    services: ['auth-session-server', 'notification-service', 'analytics-service'],
    allowCookies: true,
  },
  'headyconnection.com': {
    role: 'community',
    description: 'Heady Connection community (commercial)',
    services: ['auth-session-server', 'notification-service', 'analytics-service'],
    allowCookies: true,
  },
  'headyex.com': {
    role: 'marketplace',
    description: 'HeadyEX marketplace and exchange',
    services: ['auth-session-server', 'notification-service', 'analytics-service', 'billing-service'],
    allowCookies: true,
  },
  'headyfinance.com': {
    role: 'finance',
    description: 'Heady Finance platform',
    services: ['auth-session-server', 'notification-service', 'analytics-service', 'billing-service'],
    allowCookies: true,
  },
  'admin.headysystems.com': {
    role: 'admin',
    description: 'Platform administration dashboard',
    services: ['auth-session-server', 'notification-service', 'analytics-service', 'billing-service', 'scheduler-service'],
    allowCookies: true,
  },
};

/**
 * Build the full list of allowed origins (https + www variants).
 * Used for CORS and CSP configuration.
 */
function getAllowedOrigins() {
  const origins = new Set();
  for (const domain of Object.keys(DOMAINS)) {
    origins.add(`https://${domain}`);
    // admin subdomain does not get a www variant
    if (!domain.startsWith('admin.')) {
      origins.add(`https://www.${domain}`);
    }
  }
  return origins;
}

/**
 * Get domains that a specific service should accept requests from.
 *
 * @param {string} serviceName
 * @returns {Set<string>} allowed origins for this service
 */
function getOriginsForService(serviceName) {
  const origins = new Set();
  for (const [domain, config] of Object.entries(DOMAINS)) {
    if (config.services.includes(serviceName)) {
      origins.add(`https://${domain}`);
      if (!domain.startsWith('admin.')) {
        origins.add(`https://www.${domain}`);
      }
    }
  }
  return origins;
}

/**
 * Check if an origin is allowed.
 *
 * @param {string} origin
 * @returns {boolean}
 */
function isAllowedOrigin(origin) {
  return getAllowedOrigins().has(origin);
}

/**
 * Get all domain names (without protocol).
 */
function getDomainNames() {
  return Object.keys(DOMAINS);
}

/**
 * Get domains by role.
 *
 * @param {string} role
 * @returns {string[]} domain names
 */
function getDomainsByRole(role) {
  return Object.entries(DOMAINS)
    .filter(([, config]) => config.role === role)
    .map(([domain]) => domain);
}

// Pre-compute for export
const ALLOWED_ORIGINS = getAllowedOrigins();
const DOMAIN_NAMES = getDomainNames();

module.exports = {
  DOMAINS,
  ALLOWED_ORIGINS,
  DOMAIN_NAMES,
  getAllowedOrigins,
  getOriginsForService,
  isAllowedOrigin,
  getDomainNames,
  getDomainsByRole,
};
