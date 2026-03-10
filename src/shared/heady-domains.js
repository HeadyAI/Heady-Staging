/**
 * Heady™ Latent OS v5.3.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 *
 * CANONICAL DOMAIN REGISTRY
 * Single source of truth for all 9 Heady domains + admin subdomains.
 * Every service imports from here — no domain strings scattered across files.
 */
'use strict';

const { CSL_THRESHOLDS, PHI, PSI } = require('./phi-math');

// ─── The 9 Heady Domains ────────────────────────────────────────────────────

const HEADY_DOMAINS = Object.freeze({
  HEADYME:          { host: 'headyme.com',          role: 'command_center',     pool: 'hot',  csl: CSL_THRESHOLDS.MEDIUM },
  HEADYSYSTEMS:     { host: 'headysystems.com',     role: 'architecture_engine',pool: 'warm', csl: CSL_THRESHOLDS.HIGH },
  HEADYCONNECTION:  { host: 'headyconnection.org',  role: 'nonprofit',          pool: 'warm', csl: PSI },
  HEADYBUDDY:       { host: 'headybuddy.org',       role: 'companion',          pool: 'hot',  csl: CSL_THRESHOLDS.MEDIUM },
  HEADYMCP:         { host: 'headymcp.com',         role: 'mcp_layer',          pool: 'hot',  csl: CSL_THRESHOLDS.CRITICAL },
  HEADYIO:          { host: 'headyio.com',          role: 'developer_platform', pool: 'warm', csl: CSL_THRESHOLDS.LOW },
  HEADYBOT:         { host: 'headybot.com',         role: 'automation',         pool: 'warm', csl: CSL_THRESHOLDS.MEDIUM },
  HEADYAPI:         { host: 'headyapi.com',         role: 'api_gateway',        pool: 'hot',  csl: CSL_THRESHOLDS.CRITICAL },
  HEADYAI:          { host: 'headyai.com',          role: 'intelligence_hub',   pool: 'hot',  csl: CSL_THRESHOLDS.HIGH },
});

// ─── Admin Subdomains ────────────────────────────────────────────────────────

const ADMIN_SUBDOMAINS = Object.freeze([
  'auth.headysystems.com',
  'admin.headysystems.com',
  'api.headysystems.com',
  'docs.headysystems.com',
  'status.headysystems.com',
]);

// ─── Build canonical ALLOWED_ORIGINS from domains ────────────────────────────

function buildAllowedOrigins() {
  const origins = [];
  for (const domain of Object.values(HEADY_DOMAINS)) {
    origins.push(`https://${domain.host}`);
    origins.push(`https://www.${domain.host}`);
  }
  for (const sub of ADMIN_SUBDOMAINS) {
    origins.push(`https://${sub}`);
  }
  return Object.freeze(origins);
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

// ─── Helper: get domain config by hostname ───────────────────────────────────

function getDomainByHost(hostname) {
  const clean = hostname.replace(/^www\./, '');
  for (const [key, domain] of Object.entries(HEADY_DOMAINS)) {
    if (domain.host === clean) return { key, ...domain };
  }
  return null;
}

// ─── Helper: check if origin is allowed ──────────────────────────────────────

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin);
}

// ─── Navigation map for cross-domain linking ─────────────────────────────────

const NAVIGATION_MAP = Object.freeze({
  primary: [
    { label: 'Dashboard',    href: 'https://headyme.com',          domain: 'HEADYME' },
    { label: 'AI Hub',       href: 'https://headyai.com',          domain: 'HEADYAI' },
    { label: 'API',          href: 'https://headyapi.com',         domain: 'HEADYAPI' },
    { label: 'MCP',          href: 'https://headymcp.com',         domain: 'HEADYMCP' },
  ],
  secondary: [
    { label: 'Developers',   href: 'https://headyio.com',          domain: 'HEADYIO' },
    { label: 'Automation',   href: 'https://headybot.com',         domain: 'HEADYBOT' },
    { label: 'Companion',    href: 'https://headybuddy.org',       domain: 'HEADYBUDDY' },
    { label: 'Community',    href: 'https://headyconnection.org',  domain: 'HEADYCONNECTION' },
  ],
  admin: [
    { label: 'Systems',      href: 'https://headysystems.com',     domain: 'HEADYSYSTEMS' },
    { label: 'Auth',         href: 'https://auth.headysystems.com' },
    { label: 'Docs',         href: 'https://docs.headysystems.com' },
    { label: 'Status',       href: 'https://status.headysystems.com' },
  ],
});

module.exports = {
  HEADY_DOMAINS,
  ADMIN_SUBDOMAINS,
  ALLOWED_ORIGINS,
  NAVIGATION_MAP,
  getDomainByHost,
  isAllowedOrigin,
  buildAllowedOrigins,
};
