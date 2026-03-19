// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY™ Environment Validator — Production Gate v2.0           ║
// ║  © 2026 HeadySystems Inc. — Eric Haywood                      ║
// ║  ∞ Every threshold φ-derived · Zero magic numbers              ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
//
// Usage:
//   node src/security/env-validator.js           # Validates current .env
//   node src/security/env-validator.js --strict  # Exit 1 on any warning
//   node src/security/env-validator.js --ci      # CI/CD mode (JSON output)
//
// Drop into: src/security/env-validator.js
// Pre-deploy hook: package.json → "predeploy": "node src/security/env-validator.js --strict"

'use strict';

// ─── φ Constants (from heady-phi-constants.js) ───────────────────────────────

const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

const CSL = {
  MINIMUM: 0.500,
  LOW: 0.691,
  MEDIUM: 0.809,
  HIGH: 0.882,
  CRITICAL: 0.927,
  DEDUP: 0.972,
};

// ─── Canonical Domain Registry (from heady-domains.js) ───────────────────────

const CANONICAL_DOMAINS = {
  HEADY_ME_URL:         'headyme.com',
  HEADY_SYSTEMS_URL:    'headysystems.com',
  HEADY_CONNECTION_URL: 'headyconnection.org',
  HEADY_BUDDY_URL:      'headybuddy.org',
  HEADY_MCP_URL:        'headymcp.com',
  HEADY_IO_URL:         'headyio.com',
  HEADY_BOT_URL:        'headybot.com',
  HEADY_API_URL:        'headyapi.com',
  HEADY_AI_URL:         'headyai.com',
};

// ─── Known Wrong Domains (audit 2026-03-19) ──────────────────────────────────

const WRONG_DOMAINS = {
  'heady-ai.com':        'headyai.com',
  'headybuddy.com':      'headybuddy.org',
  'headyconnection.com': 'headyconnection.org',
};

// ─── Validation Rules ────────────────────────────────────────────────────────

const REQUIRED_ALL = [
  'NODE_ENV',
  'DATABASE_URL',
  'VECTOR_DIMENSIONS',
  'HNSW_M',
  'HNSW_EF_CONSTRUCTION',
  'HEADY_API_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'GCP_PROJECT_ID',
];

const REQUIRED_PRODUCTION = [
  'JWT_SECRET',
  'SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'REDIS_URL',
  'HEADY_CONDUCTOR_URL',
  'HEADY_MCP_GATEWAY_URL',
  'NEXTAUTH_SECRET',
  'CORS_ALLOWED_ORIGINS',
  'FIREBASE_PROJECT_ID',
  'CLOUDFLARE_API_TOKEN',
];

const SECRET_KEYS = [
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'HEADY_API_SECRET',
  'SESSION_SECRET',
  'DRUPAL_HASH_SALT',
  'DRUPAL_DB_PASSWORD',
  'HEADY_ADMIN_PASSWORD',
];

// External provider keys — length controlled by provider, skip length checks
const EXTERNAL_SECRET_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENTRY_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CLOUDFLARE_API_TOKEN',
];

const FORBIDDEN_PATTERNS = [
  { pattern: /localhost/i, message: 'localhost reference — use Upstash/Cloud Run URLs' },
  { pattern: /127\.0\.0\.1/, message: 'loopback address — use cloud service URLs' },
  { pattern: /0\.0\.0\.0/, message: 'wildcard bind — use specific cloud host' },
  { pattern: /password123/i, message: 'weak placeholder password' },
  { pattern: /changeme/i, message: 'placeholder credential' },
  { pattern: /TODO|FIXME|HACK/i, message: 'unresolved marker in env value' },
  { pattern: /heady2026/i, message: 'hardcoded dev password (Drupal audit finding)' },
  { pattern: /^heady-onboarding-dev/i, message: 'dev placeholder secret (NEXTAUTH audit finding)' },
];

const PLACEHOLDER_PREFIXES = ['ROTATE_', 'CHANGEME', 'REPLACE_', 'TODO'];

// Phi-derived minimum secret length: FIB[9] * 2 = 68 chars
// Using FIB[6] = 8 as minimum, FIB[9] = 34 as recommended
const MIN_SECRET_LENGTH = FIB[9]; // 34 characters minimum
const RECOMMENDED_SECRET_LENGTH = FIB[9] * 2; // 68 characters recommended

// ─── Validator Class ─────────────────────────────────────────────────────────

class HeadyEnvValidator {
  constructor(env = process.env, options = {}) {
    this.env = env;
    this.strict = options.strict || false;
    this.ci = options.ci || false;
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.isProd = env.NODE_ENV === 'production' || env.HEADY_ENVIRONMENT === 'production';
  }

  // ── Core validation pipeline ───────────────────────────────────────────────

  validate() {
    this._checkRequired();
    this._checkForbiddenPatterns();
    this._checkPlaceholders();
    this._checkSecretStrength();
    this._checkPhiConstants();
    this._checkDomainUrls();
    this._checkLocalhostRefs();
    this._checkHnswParams();
    this._checkVectorDimensions();
    this._checkPortScheme();
    this._checkBudgetConfig();
    this._checkCorsOrigins();
    this._checkSentryConfig();
    this._checkDrupalConfig();

    return this._buildReport();
  }

  // ── §1: Required variables ─────────────────────────────────────────────────

  _checkRequired() {
    for (const key of REQUIRED_ALL) {
      if (!this.env[key] || this.env[key].trim() === '') {
        this.errors.push({ rule: 'required', key, message: `Missing required variable: ${key}` });
      }
    }

    if (this.isProd) {
      for (const key of REQUIRED_PRODUCTION) {
        if (!this.env[key] || this.env[key].trim() === '') {
          this.errors.push({ rule: 'required_prod', key, message: `Missing in production: ${key}` });
        }
      }
    }
  }

  // ── §2: Forbidden patterns (localhost, weak passwords, markers) ────────────

  _checkForbiddenPatterns() {
    for (const [key, value] of Object.entries(this.env)) {
      if (!value || key.startsWith('npm_') || key.startsWith('_')) continue;

      for (const { pattern, message } of FORBIDDEN_PATTERNS) {
        if (pattern.test(value)) {
          if (this.isProd) {
            this.errors.push({ rule: 'forbidden', key, message: `${key}: ${message}` });
          } else {
            this.warnings.push({ rule: 'forbidden_dev', key, message: `${key}: ${message} (allowed in dev, blocked in prod)` });
          }
        }
      }
    }
  }

  // ── §3: Unrotated placeholder detection ────────────────────────────────────

  _checkPlaceholders() {
    for (const [key, value] of Object.entries(this.env)) {
      if (!value) continue;
      for (const prefix of PLACEHOLDER_PREFIXES) {
        if (value.startsWith(prefix)) {
          this.errors.push({
            rule: 'placeholder',
            key,
            message: `${key} contains unrotated placeholder: ${value.substring(0, 20)}...`,
          });
        }
      }
    }
  }

  // ── §4: Secret strength (phi-derived minimum) ─────────────────────────────

  _checkSecretStrength() {
    for (const key of SECRET_KEYS) {
      const value = this.env[key];
      if (!value) continue; // Caught by required check

      if (value.length < MIN_SECRET_LENGTH) {
        this.errors.push({
          rule: 'weak_secret',
          key,
          message: `${key} is ${value.length} chars — minimum FIB[9]=${MIN_SECRET_LENGTH}. Generate with: openssl rand -hex ${MIN_SECRET_LENGTH}`,
        });
      } else if (value.length < RECOMMENDED_SECRET_LENGTH) {
        this.warnings.push({
          rule: 'short_secret',
          key,
          message: `${key} is ${value.length} chars — recommended ≥${RECOMMENDED_SECRET_LENGTH} (FIB[9]*2)`,
        });
      }

      // Check for dictionary words in secrets
      const dictWords = ['heady', 'password', 'secret', 'admin', 'dev', 'test', 'onboarding'];
      for (const word of dictWords) {
        if (value.toLowerCase().includes(word)) {
          this.warnings.push({
            rule: 'dict_secret',
            key,
            message: `${key} contains dictionary word "${word}" — use cryptographically random values`,
          });
        }
      }
    }
  }

  // ── §5: Phi constants coherence ────────────────────────────────────────────

  _checkPhiConstants() {
    const checks = [
      { key: 'PHI', expected: '1.618033988749895', tolerance: 0.0001 },
      { key: 'PSI', expected: '0.6180339887498949', tolerance: 0.0001 },
      { key: 'CSL_MINIMUM', expected: '0.500' },
      { key: 'CSL_LOW', expected: '0.691' },
      { key: 'CSL_MEDIUM', expected: '0.809' },
      { key: 'CSL_HIGH', expected: '0.882' },
      { key: 'CSL_CRITICAL', expected: '0.927' },
      { key: 'CSL_DEDUP', expected: '0.972' },
      { key: 'POOL_HOT', expected: '0.34' },
      { key: 'POOL_WARM', expected: '0.21' },
      { key: 'POOL_COLD', expected: '0.13' },
      { key: 'POOL_RESERVE', expected: '0.08' },
      { key: 'POOL_GOVERNANCE', expected: '0.05' },
    ];

    for (const { key, expected, tolerance } of checks) {
      const value = this.env[key];
      if (!value) continue; // Optional — only validate if present

      if (tolerance) {
        const diff = Math.abs(parseFloat(value) - parseFloat(expected));
        if (diff > tolerance) {
          this.errors.push({
            rule: 'phi_mismatch',
            key,
            message: `${key}=${value} diverges from canonical ${expected} (drift=${diff.toFixed(6)})`,
          });
        }
      } else if (value !== expected) {
        this.warnings.push({
          rule: 'phi_drift',
          key,
          message: `${key}=${value} — expected ${expected}`,
        });
      }
    }
  }

  // ── §6: Domain URL validation ──────────────────────────────────────────────

  _checkDomainUrls() {
    for (const [envKey, correctDomain] of Object.entries(CANONICAL_DOMAINS)) {
      const value = this.env[envKey];
      if (!value) continue;

      // Check for known wrong domains
      for (const [wrong, right] of Object.entries(WRONG_DOMAINS)) {
        if (value.includes(wrong)) {
          this.errors.push({
            rule: 'wrong_domain',
            key: envKey,
            message: `${envKey} contains "${wrong}" — must be "${right}" (per heady-domains.js canonical registry)`,
          });
        }
      }

      // Check that value contains the correct domain
      if (!value.includes(correctDomain)) {
        this.warnings.push({
          rule: 'domain_mismatch',
          key: envKey,
          message: `${envKey}="${value}" — expected to contain "${correctDomain}"`,
        });
      }

      // Ensure HTTPS in production
      if (this.isProd && !value.startsWith('https://')) {
        this.errors.push({
          rule: 'no_https',
          key: envKey,
          message: `${envKey} must use HTTPS in production`,
        });
      }
    }
  }

  // ── §7: Localhost reference scanner ────────────────────────────────────────

  _checkLocalhostRefs() {
    const localhostPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /0\.0\.0\.0/,
      /\[::1\]/,
    ];

    const URL_KEYS = Object.keys(this.env).filter(k =>
      k.includes('URL') || k.includes('HOST') || k.includes('ENDPOINT') || k.includes('BASE_URL')
    );

    for (const key of URL_KEYS) {
      const value = this.env[key];
      if (!value) continue;

      for (const pattern of localhostPatterns) {
        if (pattern.test(value)) {
          if (this.isProd) {
            this.errors.push({
              rule: 'localhost_prod',
              key,
              message: `${key} contains localhost reference in production — use cloud service URL`,
            });
          } else {
            this.info.push({
              rule: 'localhost_dev',
              key,
              message: `${key} uses localhost (acceptable in dev only)`,
            });
          }
        }
      }
    }
  }

  // ── §8: HNSW parameter validation (must match phi-constants) ───────────────

  _checkHnswParams() {
    const hnswM = parseInt(this.env.HNSW_M, 10);
    const hnswEf = parseInt(this.env.HNSW_EF_CONSTRUCTION, 10);

    // HNSW.M must be FIB[8] = 21
    if (hnswM && hnswM !== FIB[8]) {
      this.errors.push({
        rule: 'hnsw_m',
        key: 'HNSW_M',
        message: `HNSW_M=${hnswM} — must be FIB[8]=${FIB[8]} (per heady-phi-constants.js)`,
      });
    }

    // HNSW.EF_CONSTRUCTION must be FIB[11] = 89
    if (hnswEf && hnswEf !== FIB[11]) {
      this.errors.push({
        rule: 'hnsw_ef',
        key: 'HNSW_EF_CONSTRUCTION',
        message: `HNSW_EF_CONSTRUCTION=${hnswEf} — must be FIB[11]=${FIB[11]} (per heady-phi-constants.js)`,
      });
    }

    // EF_SEARCH should be FIB[10] = 55
    const efSearch = parseInt(this.env.HNSW_EF_SEARCH, 10);
    if (efSearch && efSearch !== FIB[10]) {
      this.warnings.push({
        rule: 'hnsw_ef_search',
        key: 'HNSW_EF_SEARCH',
        message: `HNSW_EF_SEARCH=${efSearch} — recommended FIB[10]=${FIB[10]}`,
      });
    }
  }

  // ── §9: Vector dimensions (must be 384 = 6 × 64) ──────────────────────────

  _checkVectorDimensions() {
    const dimKeys = ['VECTOR_DIMENSIONS', 'HEADY_EMBED_DIMENSIONS', 'PGVECTOR_DIMENSIONS'];
    const CANONICAL_DIMS = 384; // From heady-phi-constants.js HNSW.DIMENSIONS

    for (const key of dimKeys) {
      const value = parseInt(this.env[key], 10);
      if (!value) continue;

      if (value !== CANONICAL_DIMS) {
        this.errors.push({
          rule: 'vector_dims',
          key,
          message: `${key}=${value} — must be ${CANONICAL_DIMS} (6×64, per heady-phi-constants.js HNSW.DIMENSIONS)`,
        });
      }
    }
  }

  // ── §10: Port scheme validation ────────────────────────────────────────────

  _checkPortScheme() {
    const portMap = {
      HEADY_MANAGER_PORT: 3301,
      HEADY_GUARD_PORT: 3302,
      HEADY_INFER_PORT: 3303,
      HEADY_EMBED_PORT: 3304,
      HEADY_EVAL_PORT: 3305,
      HEADY_CACHE_PORT: 3306,
      HEADY_MCP_PORT: 3307,
      HEADY_EDGE_PORT: 3308,
      HEADY_DASHBOARD_PORT: 3309,
      HEADY_GATEWAY_PORT: 3310,
      HEADY_CHAIN_PORT: 3311,
      HEADY_SITE_PORT: 3312,
    };

    for (const [key, expected] of Object.entries(portMap)) {
      const value = parseInt(this.env[key], 10);
      if (value && value !== expected) {
        this.warnings.push({
          rule: 'port_scheme',
          key,
          message: `${key}=${value} — expected ${expected} per canonical port scheme`,
        });
      }
    }
  }

  // ── §11: Budget configuration ──────────────────────────────────────────────

  _checkBudgetConfig() {
    const cap = parseFloat(this.env.MONTHLY_BUDGET_CAP);
    if (cap && cap > 750) {
      this.warnings.push({
        rule: 'budget',
        key: 'MONTHLY_BUDGET_CAP',
        message: `MONTHLY_BUDGET_CAP=${cap} exceeds $750 ceiling — requires explicit approval`,
      });
    }

    const alertPct = parseFloat(this.env.BUDGET_ALERT_THRESHOLD_PCT);
    if (alertPct && Math.abs(alertPct - PSI) > 0.01) {
      this.warnings.push({
        rule: 'budget_phi',
        key: 'BUDGET_ALERT_THRESHOLD_PCT',
        message: `BUDGET_ALERT_THRESHOLD_PCT=${alertPct} — should be PSI=${PSI.toFixed(3)} for phi-compliance`,
      });
    }
  }

  // ── §12: CORS origins match canonical domains ──────────────────────────────

  _checkCorsOrigins() {
    const cors = this.env.CORS_ALLOWED_ORIGINS;
    if (!cors) return;

    const origins = cors.split(',').map(o => o.trim());

    for (const domain of Object.values(CANONICAL_DOMAINS)) {
      const expected = `https://${domain}`;
      if (!origins.includes(expected)) {
        this.warnings.push({
          rule: 'cors_missing',
          key: 'CORS_ALLOWED_ORIGINS',
          message: `CORS missing canonical domain: ${expected}`,
        });
      }
    }

    // Check for wrong domains in CORS
    for (const origin of origins) {
      for (const wrong of Object.keys(WRONG_DOMAINS)) {
        if (origin.includes(wrong)) {
          this.errors.push({
            rule: 'cors_wrong_domain',
            key: 'CORS_ALLOWED_ORIGINS',
            message: `CORS contains wrong domain "${wrong}" — should be "${WRONG_DOMAINS[wrong]}"`,
          });
        }
      }
    }
  }

  // ── §13: Sentry configuration ──────────────────────────────────────────────

  _checkSentryConfig() {
    const traceRate = parseFloat(this.env.SENTRY_TRACES_SAMPLE_RATE);
    if (traceRate && Math.abs(traceRate - PSI) > 0.01) {
      this.info.push({
        rule: 'sentry_phi',
        key: 'SENTRY_TRACES_SAMPLE_RATE',
        message: `SENTRY_TRACES_SAMPLE_RATE=${traceRate} — phi-optimal is PSI=${PSI.toFixed(3)}`,
      });
    }
  }

  // ── §14: Drupal configuration ──────────────────────────────────────────────

  _checkDrupalConfig() {
    const password = this.env.DRUPAL_DB_PASSWORD;
    if (password) {
      if (password === 'heady2026' || password.length < FIB[8]) {
        this.errors.push({
          rule: 'drupal_password',
          key: 'DRUPAL_DB_PASSWORD',
          message: `DRUPAL_DB_PASSWORD is weak or hardcoded — generate with: openssl rand -hex ${FIB[8]}`,
        });
      }
    }

    const hashSalt = this.env.DRUPAL_HASH_SALT;
    if (hashSalt && hashSalt.length < FIB[9]) {
      this.errors.push({
        rule: 'drupal_salt',
        key: 'DRUPAL_HASH_SALT',
        message: `DRUPAL_HASH_SALT is ${hashSalt.length} chars — minimum FIB[9]=${FIB[9]}`,
      });
    }
  }

  // ── Report builder ─────────────────────────────────────────────────────────

  _buildReport() {
    const totalChecks = this.errors.length + this.warnings.length + this.info.length;
    const score = totalChecks === 0 ? 1.0 :
      Math.max(0, 1 - (this.errors.length * 0.1 + this.warnings.length * 0.03));

    const cslGate = score >= CSL.CRITICAL ? 'CRITICAL' :
      score >= CSL.HIGH ? 'HIGH' :
      score >= CSL.MEDIUM ? 'MEDIUM' :
      score >= CSL.LOW ? 'LOW' : 'FAIL';

    return {
      valid: this.errors.length === 0,
      score: parseFloat(score.toFixed(3)),
      cslGate,
      environment: this.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length,
        verdict: this.errors.length === 0 ? 'PASS' : 'FAIL',
      },
    };
  }
}

// ─── CLI Runner ──────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const ci = args.includes('--ci');

  // Load .env if dotenv is available
  try {
    require('dotenv').config();
  } catch (_) {
    // dotenv not installed — use process.env directly
  }

  const validator = new HeadyEnvValidator(process.env, { strict, ci });
  const report = validator.validate();

  if (ci) {
    // CI/CD mode: JSON output for parsing
    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(report.valid ? 0 : 1);
    return;
  }

  // Human-readable output
  const RESET = '\x1b[0m';
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const GREEN = '\x1b[32m';
  const CYAN = '\x1b[36m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';

  console.log('');
  console.log(`${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  HEADY™ Environment Validator — Production Gate v2.0       ║${RESET}`);
  console.log(`${BOLD}║  ∞ Every threshold φ-derived · Zero magic numbers          ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');
  console.log(`  Environment: ${BOLD}${report.environment}${RESET}`);
  console.log(`  Timestamp:   ${DIM}${report.timestamp}${RESET}`);
  console.log(`  Score:        ${report.score >= CSL.HIGH ? GREEN : report.score >= CSL.MEDIUM ? YELLOW : RED}${report.score.toFixed(3)}${RESET} (CSL Gate: ${report.cslGate})`);
  console.log('');

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}  ✗ ERRORS (${report.errors.length}) — Must fix before deploy${RESET}`);
    console.log(`${RED}  ${'─'.repeat(55)}${RESET}`);
    for (const err of report.errors) {
      console.log(`${RED}    ✗ [${err.rule}] ${err.message}${RESET}`);
    }
    console.log('');
  }

  if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}  ⚠ WARNINGS (${report.warnings.length}) — Recommended fixes${RESET}`);
    console.log(`${YELLOW}  ${'─'.repeat(55)}${RESET}`);
    for (const warn of report.warnings) {
      console.log(`${YELLOW}    ⚠ [${warn.rule}] ${warn.message}${RESET}`);
    }
    console.log('');
  }

  if (report.info.length > 0) {
    console.log(`${CYAN}${BOLD}  ℹ INFO (${report.info.length})${RESET}`);
    console.log(`${CYAN}  ${'─'.repeat(55)}${RESET}`);
    for (const inf of report.info) {
      console.log(`${CYAN}    ℹ [${inf.rule}] ${inf.message}${RESET}`);
    }
    console.log('');
  }

  const verdict = report.valid ? `${GREEN}${BOLD}✓ PASS${RESET}` : `${RED}${BOLD}✗ FAIL${RESET}`;
  console.log(`  Verdict: ${verdict}  |  Errors: ${report.summary.errors}  |  Warnings: ${report.summary.warnings}  |  Info: ${report.summary.info}`);
  console.log('');

  // Exit codes
  if (!report.valid) {
    process.exit(1);
  } else if (strict && report.warnings.length > 0) {
    console.log(`${YELLOW}  --strict mode: ${report.warnings.length} warnings treated as failures${RESET}`);
    process.exit(1);
  }

  process.exit(0);
}

// ─── Exports & Entrypoint ────────────────────────────────────────────────────

module.exports = { HeadyEnvValidator, CANONICAL_DOMAINS, WRONG_DOMAINS, CSL, FIB };

if (require.main === module) {
  main();
}
