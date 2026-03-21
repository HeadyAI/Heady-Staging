#!/usr/bin/env node
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY SYSTEMS — Sentry Project Setup Script                   ║
// ║  ∞ CSL-Classified Error Tracking Across All 9 Domains          ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

'use strict';

/**
 * Configures Sentry project mappings for all 19 Heady Sentry projects.
 * Maps each Sentry project to its Sacred Geometry layer and pool assignment.
 *
 * Run: node scripts/setup-sentry-projects.js
 */

const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;

const SENTRY_ORG = 'headyconnection-inc';
const SENTRY_REGION = 'https://us.sentry.io';

// ─── Project-to-Layer Mapping ─────────────────────────────────────────
const SENTRY_PROJECTS = [
  { slug: 'heady-manager',         layer: 'Inner',      pool: 'Hot',  domain: 'headyme.com' },
  { slug: 'heady-systems',         layer: 'Inner',      pool: 'Hot',  domain: 'headysystems.com' },
  { slug: 'heady-ai',              layer: 'Inner',      pool: 'Hot',  domain: 'heady-ai.com' },
  { slug: 'heady-ai-cloudrun',     layer: 'Inner',      pool: 'Hot',  domain: 'heady-ai.com' },
  { slug: 'heady-api',             layer: 'Middle',     pool: 'Hot',  domain: 'headyapi.com' },
  { slug: 'heady-mcp',             layer: 'Middle',     pool: 'Hot',  domain: 'headymcp.com' },
  { slug: 'heady-mcp-server',      layer: 'Middle',     pool: 'Hot',  domain: 'headymcp.com' },
  { slug: 'heady-buddy',           layer: 'Inner',      pool: 'Hot',  domain: 'headybuddy.org' },
  { slug: 'headybuddy-frontend',   layer: 'Outer',      pool: 'Warm', domain: 'headybuddy.org' },
  { slug: 'heady-connection',      layer: 'Outer',      pool: 'Warm', domain: 'headyconnection.org' },
  { slug: 'heady-io',              layer: 'Middle',     pool: 'Warm', domain: 'headyio.com' },
  { slug: 'heady-bot',             layer: 'Outer',      pool: 'Warm', domain: 'headybot.com' },
  { slug: 'heady-web',             layer: 'Outer',      pool: 'Warm', domain: 'headyweb.com' },
  { slug: 'heady-dynamic-sites',   layer: 'Outer',      pool: 'Warm', domain: '*' },
  { slug: 'headyme-frontend',      layer: 'Outer',      pool: 'Warm', domain: 'headyme.com' },
  { slug: 'api-gateway',           layer: 'Inner',      pool: 'Hot',  domain: '*' },
  { slug: 'auth-session-server',   layer: 'Inner',      pool: 'Hot',  domain: '*' },
  { slug: 'edge-proxy',            layer: 'Governance',  pool: 'Hot',  domain: '*' },
  { slug: 'liquid-gateway-worker', layer: 'Governance',  pool: 'Hot',  domain: '*' },
];

// ─── Sampling Rates per Pool (phi-derived) ────────────────────────────
const SAMPLING_RATES = {
  Hot:     1.0,
  Warm:    PSI,          // 0.618
  Cold:    PSI * PSI,    // 0.382
  Reserve: PSI * PSI * PSI, // 0.236
};

// ─── Generate Configuration ───────────────────────────────────────────
function generateSentryConfig() {
  const config = {
    organization: SENTRY_ORG,
    region: SENTRY_REGION,
    phi_compliance: true,
    sacred_geometry: true,
    projects: SENTRY_PROJECTS.map(p => ({
      ...p,
      samplingRate: SAMPLING_RATES[p.pool] || PSI,
      dsnEnvVar: `SENTRY_DSN_${p.slug.toUpperCase().replace(/-/g, '_')}`,
    })),
    csl_severity_map: {
      MINIMUM: 'info',
      LOW: 'warning',
      MEDIUM: 'error',
      HIGH: 'error',
      CRITICAL: 'fatal',
    },
  };

  return config;
}

// ─── Main ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const config = generateSentryConfig();
  console.log(JSON.stringify(config, null, 2));
  console.log(`\n✅ ${config.projects.length} Sentry projects mapped`);
  console.log(`   Hot pool: ${config.projects.filter(p => p.pool === 'Hot').length} projects (sampling: 100%)`);
  console.log(`   Warm pool: ${config.projects.filter(p => p.pool === 'Warm').length} projects (sampling: ${(PSI * 100).toFixed(1)}%)`);
  console.log(`   Governance: ${config.projects.filter(p => p.pool === 'Governance' || p.layer === 'Governance').length} projects`);
}

module.exports = { SENTRY_PROJECTS, SAMPLING_RATES, generateSentryConfig };
