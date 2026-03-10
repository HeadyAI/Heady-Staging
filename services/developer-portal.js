import pino from 'pino';
const logger = pino();
/**
 * developer-portal.js — Heady Developer Portal Service
 *
 * API key management, SDK documentation routing, quickstart guides,
 * usage dashboards, and developer onboarding. φ-scaled rate limits,
 * Fibonacci-sized quotas, CSL-gated access tiers.
 *
 * Serves at: developers.headysystems.com (Port 3319)
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold, fibSequence } from '../shared/phi-math.js';
import { createHash, randomBytes } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const API_KEY_LENGTH    = 34;             // fib(9) bytes → 68 hex chars
const MAX_KEYS_PER_USER = 8;             // fib(6)
const MAX_APPS          = 13;            // fib(7) per developer
const KEY_PREFIX        = 'hdy_';

// ── Rate Limit Tiers (Fibonacci-sized) ──────────────────
const TIERS = {
  free: {
    name: 'Free',
    requestsPerMin: 34,                   // fib(9)
    requestsPerDay: 987,                  // fib(16)
    maxModels: 3,                          // fib(4)
    vectorOps: 89,                         // fib(11) per day
    support: 'community',
  },
  starter: {
    name: 'Starter',
    requestsPerMin: 89,                    // fib(11)
    requestsPerDay: 6765,                  // fib(20)
    maxModels: 8,                          // fib(6)
    vectorOps: 987,                        // fib(16) per day
    support: 'email',
  },
  pro: {
    name: 'Pro',
    requestsPerMin: 233,                   // fib(13)
    requestsPerDay: 46368,                 // fib(24)
    maxModels: 21,                         // fib(8)
    vectorOps: 6765,                       // fib(20) per day
    support: 'priority',
  },
  enterprise: {
    name: 'Enterprise',
    requestsPerMin: 610,                   // fib(15)
    requestsPerDay: Infinity,
    maxModels: Infinity,
    vectorOps: Infinity,
    support: 'dedicated',
  },
};

// ── API Key Store ────────────────────────────────────────
const apiKeys = new Map();
const developers = new Map();

/**
 * Generate a new API key.
 */
function generateApiKey() {
  const raw = randomBytes(API_KEY_LENGTH).toString('hex');
  return `${KEY_PREFIX}${raw}`;
}

function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

// ── Developer Registration ──────────────────────────────
/**
 * Register a new developer.
 */
export function registerDeveloper(userId, profile = {}) {
  if (developers.has(userId)) return developers.get(userId);

  const dev = {
    userId,
    tier: profile.tier || 'free',
    name: profile.name || '',
    email: profile.email || '',
    company: profile.company || '',
    apps: [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    usage: { today: 0, thisMonth: 0 },
  };
  developers.set(userId, dev);
  return dev;
}

/**
 * Create an app and generate API key.
 */
export function createApp(userId, appName, description = '') {
  const dev = developers.get(userId);
  if (!dev) throw new Error('Developer not registered');
  if (dev.apps.length >= MAX_APPS) throw new Error(`Maximum apps (${MAX_APPS}) reached`);

  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  const app = {
    id: createHash('sha256').update(`${userId}:${appName}:${Date.now()}`).digest('hex').slice(0, 21),
    name: appName,
    description,
    keyHash,
    tier: dev.tier,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    requestCount: 0,
    active: true,
  };

  dev.apps.push(app);
  apiKeys.set(keyHash, { appId: app.id, userId, tier: dev.tier });

  return {
    app,
    apiKey,  // Only returned once — must be saved by developer
    warning: 'Store this API key securely. It will not be shown again.',
  };
}

/**
 * Validate an API key and return its metadata.
 */
export function validateApiKey(key) {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;
  const keyHash = hashApiKey(key);
  const record = apiKeys.get(keyHash);
  if (!record) return null;

  const dev = developers.get(record.userId);
  const tier = TIERS[record.tier] || TIERS.free;

  return {
    valid: true,
    userId: record.userId,
    appId: record.appId,
    tier: record.tier,
    limits: tier,
  };
}

/**
 * Revoke an API key.
 */
export function revokeApiKey(userId, appId) {
  const dev = developers.get(userId);
  if (!dev) return false;

  const app = dev.apps.find(a => a.id === appId);
  if (!app) return false;

  apiKeys.delete(app.keyHash);
  app.active = false;
  return true;
}

// ── SDK Documentation Routing ───────────────────────────
const SDK_DOCS = {
  javascript: {
    name: 'JavaScript / Node.js',
    installCmd: 'npm install @heady/sdk',
    quickstart: `import Heady from '@heady/sdk';\n\nconst heady = new Heady({ apiKey: 'hdy_your_key_here' });\nconst result = await heady.memory.search('system architecture');\nlogger.info(result.matches);`,
    docs: 'https://developers.headysystems.com/docs/js',
  },
  python: {
    name: 'Python',
    installCmd: 'pip install heady-sdk',
    quickstart: `from heady import Heady\n\nheady = Heady(api_key='hdy_your_key_here')\nresult = heady.memory.search('system architecture')\nprint(result.matches)`,
    docs: 'https://developers.headysystems.com/docs/python',
  },
  curl: {
    name: 'cURL / REST',
    installCmd: null,
    quickstart: `curl -X POST https://api.headyme.com/v1/memory/search \\\n  -H "Authorization: Bearer hdy_your_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"query": "system architecture", "limit": 8}'`,
    docs: 'https://developers.headysystems.com/docs/rest',
  },
};

/**
 * Get SDK documentation for a language.
 */
export function getSDKDocs(language) {
  return SDK_DOCS[language] || null;
}

/**
 * Get all available SDKs.
 */
export function listSDKs() {
  return Object.entries(SDK_DOCS).map(([key, sdk]) => ({
    id: key,
    name: sdk.name,
    installCmd: sdk.installCmd,
    docs: sdk.docs,
  }));
}

// ── Usage Tracking ──────────────────────────────────────
/**
 * Record API usage for a developer.
 */
export function recordUsage(userId, endpoint, tokens = 0) {
  const dev = developers.get(userId);
  if (!dev) return;
  dev.usage.today++;
  dev.usage.thisMonth++;
  dev.lastActive = new Date().toISOString();
}

/**
 * Get usage summary for a developer.
 */
export function getUsage(userId) {
  const dev = developers.get(userId);
  if (!dev) return null;
  const tier = TIERS[dev.tier] || TIERS.free;
  return {
    tier: dev.tier,
    limits: tier,
    usage: dev.usage,
    remainingToday: Math.max(0, tier.requestsPerDay - dev.usage.today),
    apps: dev.apps.map(a => ({ id: a.id, name: a.name, active: a.active, requestCount: a.requestCount })),
  };
}

/**
 * Get developer portal summary.
 */
export function getSummary() {
  const tierCounts = {};
  for (const [, dev] of developers) {
    tierCounts[dev.tier] = (tierCounts[dev.tier] || 0) + 1;
  }
  return {
    totalDevelopers: developers.size,
    totalApps: [...developers.values()].reduce((s, d) => s + d.apps.length, 0),
    totalApiKeys: apiKeys.size,
    tierDistribution: tierCounts,
    availableSDKs: Object.keys(SDK_DOCS),
  };
}

export { TIERS, SDK_DOCS, CSL_THRESHOLDS };
export default { registerDeveloper, createApp, validateApiKey, revokeApiKey, getSDKDocs, listSDKs, getUsage, getSummary, recordUsage };
