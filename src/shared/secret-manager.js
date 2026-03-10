/**
 * Heady™ Secret Manager v6.0
 * GCP Secret Manager integration — ZERO default passwords
 * Secrets loaded at startup, cached in memory, auto-rotated
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { createLogger } = require('./logger');
const { phiBackoffWithJitter, fib, CSL_THRESHOLDS, PHI, PSI, TIMING } = require('./phi-math');

const logger = createLogger('secret-manager');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION — Phi-Scaled
// ═══════════════════════════════════════════════════════════

const SECRET_CACHE_TTL_MS = fib(13) * 1000;       // 233 seconds
const SECRET_REFRESH_INTERVAL_MS = fib(12) * 1000; // 144 seconds
const MAX_FETCH_RETRIES = fib(5);                   // 5 retries
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'gen-lang-client-0920560496';
const SECRET_PREFIX = 'heady-';

// ═══════════════════════════════════════════════════════════
// REQUIRED SECRETS REGISTRY — No defaults, all must come from Secret Manager
// ═══════════════════════════════════════════════════════════

const REQUIRED_SECRETS = Object.freeze({
  // Database
  PG_PASSWORD:          { name: `${SECRET_PREFIX}pg-password`, required: true },
  PG_BOUNCER_PASSWORD:  { name: `${SECRET_PREFIX}pgbouncer-password`, required: true },
  
  // Firebase
  FIREBASE_SERVICE_ACCOUNT: { name: `${SECRET_PREFIX}firebase-service-account`, required: true, json: true },
  
  // Session signing
  SESSION_SIGNING_KEY:  { name: `${SECRET_PREFIX}session-signing-key`, required: true },
  CSRF_SECRET:          { name: `${SECRET_PREFIX}csrf-secret`, required: true },
  
  // Encryption
  ENCRYPTION_KEY:       { name: `${SECRET_PREFIX}encryption-key`, required: true },
  
  // NATS
  NATS_AUTH_TOKEN:      { name: `${SECRET_PREFIX}nats-auth-token`, required: true },
  
  // Grafana
  GRAFANA_ADMIN_PASSWORD: { name: `${SECRET_PREFIX}grafana-admin-password`, required: true },
  
  // mTLS
  MTLS_CA_CERT:         { name: `${SECRET_PREFIX}mtls-ca-cert`, required: true },
  MTLS_CA_KEY:          { name: `${SECRET_PREFIX}mtls-ca-key`, required: true },
  
  // API Keys
  CLOUDFLARE_API_TOKEN: { name: `${SECRET_PREFIX}cloudflare-api-token`, required: true },
  GH_TOKEN:             { name: `${SECRET_PREFIX}github-token`, required: true },
  
  // Colab
  COLAB_API_KEY:        { name: `${SECRET_PREFIX}colab-api-key`, required: true },
  
  // Backup encryption
  BACKUP_ENCRYPTION_KEY: { name: `${SECRET_PREFIX}backup-encryption-key`, required: true },
});

// ═══════════════════════════════════════════════════════════
// SECRET CACHE
// ═══════════════════════════════════════════════════════════

class SecretCache {
  constructor() {
    this.secrets = new Map();
    this.fetchedAt = new Map();
    this.versions = new Map();
    this.refreshTimer = null;
  }

  get(key) {
    const entry = this.secrets.get(key);
    if (!entry) return null;
    
    const fetchedAt = this.fetchedAt.get(key) || 0;
    if (Date.now() - fetchedAt > SECRET_CACHE_TTL_MS) {
      // Stale but return it; background refresh handles updates
      logger.debug({ message: 'Secret cache stale, using cached value', key });
    }
    return entry;
  }

  set(key, value, version) {
    this.secrets.set(key, value);
    this.fetchedAt.set(key, Date.now());
    if (version) this.versions.set(key, version);
  }

  has(key) {
    return this.secrets.has(key);
  }

  getVersion(key) {
    return this.versions.get(key) || 'unknown';
  }

  clear() {
    this.secrets.clear();
    this.fetchedAt.clear();
    this.versions.clear();
  }

  getStats() {
    return {
      cached: this.secrets.size,
      required: Object.keys(REQUIRED_SECRETS).length,
    };
  }
}

const secretCache = new SecretCache();

// ═══════════════════════════════════════════════════════════
// GCP SECRET MANAGER CLIENT
// ═══════════════════════════════════════════════════════════

let secretManagerClient = null;

async function _getClient() {
  if (secretManagerClient) return secretManagerClient;
  
  try {
    const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
    secretManagerClient = new SecretManagerServiceClient({
      projectId: GCP_PROJECT_ID,
    });
    logger.info({ message: 'GCP Secret Manager client initialized', projectId: GCP_PROJECT_ID });
    return secretManagerClient;
  } catch (error) {
    logger.error({ message: 'Failed to initialize Secret Manager client', error: error.message });
    throw error;
  }
}

async function _fetchSecret(secretName, version = 'latest') {
  const client = await _getClient();
  const name = `projects/${GCP_PROJECT_ID}/secrets/${secretName}/versions/${version}`;
  
  let lastError = null;
  for (let attempt = 0; attempt < MAX_FETCH_RETRIES; attempt++) {
    try {
      const [response] = await client.accessSecretVersion({ name });
      const payload = response.payload.data.toString('utf8');
      const secretVersion = response.name.split('/').pop();
      
      logger.info({
        message: 'Secret fetched successfully',
        secretName,
        version: secretVersion,
        attempt,
      });
      
      return { value: payload, version: secretVersion };
    } catch (error) {
      lastError = error;
      
      // Non-retryable errors
      if (error.code === 5) {  // NOT_FOUND
        throw new SecretError(`Secret '${secretName}' not found in GCP Secret Manager`, 'NOT_FOUND');
      }
      if (error.code === 7) {  // PERMISSION_DENIED
        throw new SecretError(`Permission denied accessing '${secretName}'`, 'PERMISSION_DENIED');
      }
      
      if (attempt < MAX_FETCH_RETRIES - 1) {
        const delay = phiBackoffWithJitter(attempt);
        logger.warn({
          message: 'Secret fetch retry',
          secretName,
          attempt,
          nextRetryMs: delay,
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new SecretError(
    `Failed to fetch secret '${secretName}' after ${MAX_FETCH_RETRIES} attempts: ${lastError?.message}`,
    'FETCH_EXHAUSTED'
  );
}

// ═══════════════════════════════════════════════════════════
// SECRET LOADING — All-or-nothing on startup
// ═══════════════════════════════════════════════════════════

async function loadAllSecrets() {
  logger.info({ message: 'Loading all required secrets from GCP Secret Manager' });
  
  const results = { loaded: [], failed: [], skipped: [] };
  
  // Load in parallel batches of fib(6) = 8
  const entries = Object.entries(REQUIRED_SECRETS);
  const batchSize = fib(6);
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const promises = batch.map(async ([envKey, config]) => {
      try {
        const { value, version } = await _fetchSecret(config.name);
        const processedValue = config.json ? JSON.parse(value) : value;
        secretCache.set(envKey, processedValue, version);
        results.loaded.push(envKey);
      } catch (error) {
        if (config.required) {
          results.failed.push({ key: envKey, error: error.message });
        } else {
          results.skipped.push({ key: envKey, reason: error.message });
        }
      }
    });
    
    await Promise.all(promises);
  }
  
  logger.info({
    message: 'Secret loading complete',
    loaded: results.loaded.length,
    failed: results.failed.length,
    skipped: results.skipped.length,
  });
  
  // CRITICAL: Fail startup if any required secret is missing
  if (results.failed.length > 0) {
    const missingKeys = results.failed.map(f => f.key).join(', ');
    throw new SecretError(
      `Missing required secrets: ${missingKeys}. Cannot start without all required secrets.`,
      'MISSING_REQUIRED'
    );
  }
  
  // Start background refresh
  _startRefreshLoop();
  
  return results;
}

// ═══════════════════════════════════════════════════════════
// BACKGROUND REFRESH — phi-timed interval
// ═══════════════════════════════════════════════════════════

function _startRefreshLoop() {
  if (secretCache.refreshTimer) {
    clearInterval(secretCache.refreshTimer);
  }
  
  secretCache.refreshTimer = setInterval(async () => {
    logger.debug({ message: 'Background secret refresh starting' });
    
    for (const [envKey, config] of Object.entries(REQUIRED_SECRETS)) {
      try {
        const { value, version } = await _fetchSecret(config.name);
        const currentVersion = secretCache.getVersion(envKey);
        
        if (version !== currentVersion) {
          const processedValue = config.json ? JSON.parse(value) : value;
          secretCache.set(envKey, processedValue, version);
          logger.info({
            message: 'Secret rotated',
            key: envKey,
            previousVersion: currentVersion,
            newVersion: version,
          });
        }
      } catch (error) {
        logger.warn({
          message: 'Background secret refresh failed for key',
          key: envKey,
          error: error.message,
        });
        // Don't crash — keep using cached value
      }
    }
  }, SECRET_REFRESH_INTERVAL_MS);
  
  // Unref so it doesn't keep the process alive
  if (secretCache.refreshTimer.unref) {
    secretCache.refreshTimer.unref();
  }
}

function stopRefreshLoop() {
  if (secretCache.refreshTimer) {
    clearInterval(secretCache.refreshTimer);
    secretCache.refreshTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════
// SECRET ACCESS — Single interface for all components
// ═══════════════════════════════════════════════════════════

function getSecret(key) {
  const value = secretCache.get(key);
  if (value === null || value === undefined) {
    throw new SecretError(`Secret '${key}' not loaded. Call loadAllSecrets() first.`, 'NOT_LOADED');
  }
  return value;
}

function hasSecret(key) {
  return secretCache.has(key);
}

// ═══════════════════════════════════════════════════════════
// ENVIRONMENT VALIDATION — Reject any service with default passwords
// ═══════════════════════════════════════════════════════════

const BANNED_DEFAULTS = [
  'password', 'default', 'changeme', 'admin', 'secret',
  '12345', 'postgres', 'grafana', 'root', 'test',
];

function validateNoDefaults(envVars = process.env) {
  const violations = [];
  
  const sensitivePatterns = [
    /password/i, /secret/i, /token/i, /key$/i,
    /api_key/i, /auth/i, /credential/i,
  ];
  
  for (const [key, value] of Object.entries(envVars)) {
    const isSensitive = sensitivePatterns.some(p => p.test(key));
    if (!isSensitive) continue;
    
    if (!value || value.trim() === '') {
      violations.push({ key, reason: 'empty' });
      continue;
    }
    
    const lowerValue = value.toLowerCase().trim();
    if (BANNED_DEFAULTS.includes(lowerValue)) {
      violations.push({ key, reason: `banned default value: '${lowerValue}'` });
    }
    
    if (value.length < fib(6)) {  // 8 chars minimum
      violations.push({ key, reason: `too short (${value.length} < ${fib(6)})` });
    }
  }
  
  if (violations.length > 0) {
    logger.error({
      message: 'Default/weak secrets detected — refusing to start',
      violations: violations.map(v => ({ key: v.key, reason: v.reason })),
    });
    throw new SecretError(
      `${violations.length} default/weak secrets detected. All secrets must come from GCP Secret Manager.`,
      'DEFAULT_DETECTED'
    );
  }
  
  logger.info({ message: 'Secret validation passed — no defaults detected' });
}

// ═══════════════════════════════════════════════════════════
// DOCKER COMPOSE SECRET INJECTION HELPER
// Generates env vars that point to GCP Secret Manager instead of defaults
// ═══════════════════════════════════════════════════════════

function generateEnvTemplate() {
  const lines = [
    '# Heady™ Environment Template — ALL secrets from GCP Secret Manager',
    '# NO DEFAULT VALUES — every secret must be populated before deployment',
    `# Project: ${GCP_PROJECT_ID}`,
    '',
  ];
  
  for (const [envKey, config] of Object.entries(REQUIRED_SECRETS)) {
    lines.push(`# GCP Secret: ${config.name}`);
    lines.push(`${envKey}=  # REQUIRED — load from: gcloud secrets versions access latest --secret="${config.name}"`);
    lines.push('');
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════
// CUSTOM ERROR
// ═══════════════════════════════════════════════════════════

class SecretError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SecretError';
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  loadAllSecrets,
  getSecret,
  hasSecret,
  validateNoDefaults,
  generateEnvTemplate,
  stopRefreshLoop,
  secretCache,
  SecretError,
  REQUIRED_SECRETS,
  SECRET_CACHE_TTL_MS,
  SECRET_REFRESH_INTERVAL_MS,
};
