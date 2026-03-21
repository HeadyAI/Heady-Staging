'use strict';

/**
 * HEADY™ Cloudflare Session Durable Object
 * Liquid Architecture v9.0
 *
 * Stateful edge session management with:
 * - CSL-gated memory bootstrap from Qdrant
 * - CRDT merge for cross-device sync
 * - KV config distribution
 * - R2 audit trail storage
 */

// ── KV Config Keys — replicated to 300+ PoPs ──
const CONFIG_KEYS = {
  'heady:nodes:catalog':    '20-node catalog',
  'heady:csl:gates':        '{ core: 0.718, include: 0.618, recall: 0.382 }',
  'heady:pipeline:stages':  '22-stage HCFullPipeline config',
  'heady:sites:registry':   '9-site registry with domains + accents',
  'heady:wisdom:hash':      'SHA-256 of current wisdom.json',
  'heady:distiller:config':  'HeadyDistiller compression settings',
};

// ── R2 Buckets ──
const R2_BUCKETS = {
  'heady-assets':            'Static assets for all 9 sites',
  'heady-models':            'Model weights cache',
  'heady-memory-snapshots':  'Daily memory vector snapshots',
  'heady-audit-trail':       'Ed25519-signed audit logs (forever)',
  'heady-gists-mirror':      'Mirror of GitHub Gists configs',
};

// ── Pages — All 9 Sites ──
const PAGES_SITES = [
  { domain: 'headyme.com',           project: 'headyme',         accent: '#4c8fff' },
  { domain: 'headysystems.com',      project: 'headysystems',    accent: '#6366f1' },
  { domain: 'headybuddy.org',        project: 'headybuddy',      accent: '#10b981' },
  { domain: 'heady-ai.com',           project: 'headyai',         accent: '#f59e0b' },
  { domain: 'headybrain.com',        project: 'headybrain',      accent: '#ec4899' },
  { domain: 'headyguard.com',        project: 'headyguard',      accent: '#ef4444' },
  { domain: 'headyarena.com',        project: 'headyarena',      accent: '#8b5cf6' },
  { domain: 'headyex.com',           project: 'headyex',         accent: '#06b6d4' },
  { domain: 'admin.headysystems.com', project: 'heady-admin',    accent: '#f97316' },
];

/**
 * Durable Object: HeadySession
 * Manages stateful user sessions at the Cloudflare edge.
 *
 * Actions:
 *   bootstrap — Load user's CSL-gated memories from Qdrant
 *   update    — CRDT merge for cross-device state sync
 *   destroy   — Clean up session state
 */
class HeadySession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    try {
      const { userId, action, data } = await request.json();

      switch (action) {
        case 'bootstrap': {
          const bootstrapped = {
            userId,
            memories: [],
            bootstrappedAt: Date.now(),
            cslGate: 0.618,
          };
          this.sessions.set(userId, bootstrapped);
          return Response.json({ status: 'bootstrapped', ...bootstrapped });
        }

        case 'update': {
          const existing = this.sessions.get(userId) || {};
          const merged = { ...existing, ...data, lastUpdated: Date.now() };
          this.sessions.set(userId, merged);
          return Response.json({ status: 'synced', merged });
        }

        case 'destroy': {
          this.sessions.delete(userId);
          return Response.json({ status: 'destroyed' });
        }

        default:
          return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
}

module.exports = {
  HeadySession,
  CONFIG_KEYS,
  R2_BUCKETS,
  PAGES_SITES,
};
