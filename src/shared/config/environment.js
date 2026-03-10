'use strict';

/**
 * Environment detection, validated variables, and fail-fast configuration.
 * Ensures all required env vars are present at startup.
 */

const ENVIRONMENTS = {
  production: 'production',
  staging: 'staging',
  development: 'development',
  test: 'test',
};

/**
 * Detect current environment from NODE_ENV.
 * Defaults to 'development' if unset.
 */
function detectEnvironment() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (!Object.values(ENVIRONMENTS).includes(env)) {
    throw new Error(
      `Invalid NODE_ENV="${env}". Must be one of: ${Object.values(ENVIRONMENTS).join(', ')}`
    );
  }
  return env;
}

/**
 * Validate that all required environment variables are set.
 * Throws on first missing variable in production/staging; warns in dev/test.
 *
 * @param {object} schema — { VAR_NAME: { required: boolean, default?: string, description?: string } }
 * @returns {object} validated environment variables
 */
function validateEnv(schema) {
  const env = detectEnvironment();
  const isStrict = env === ENVIRONMENTS.production || env === ENVIRONMENTS.staging;
  const result = {};
  const missing = [];
  const warnings = [];

  for (const [key, config] of Object.entries(schema)) {
    const value = process.env[key];

    if (value !== undefined && value !== '') {
      result[key] = value;
    } else if (config.default !== undefined) {
      result[key] = config.default;
      warnings.push(`${key}: using default "${config.default}"`);
    } else if (config.required) {
      missing.push(`${key}${config.description ? ` (${config.description})` : ''}`);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n  - ${missing.join('\n  - ')}`;
    if (isStrict) {
      throw new Error(message);
    }
    // In dev/test, warn but don't crash
    process.stderr.write(`[env-warning] ${message}\n`);
  }

  if (warnings.length > 0 && isStrict) {
    process.stderr.write(
      `[env-warning] Using defaults in ${env}:\n  - ${warnings.join('\n  - ')}\n`
    );
  }

  return result;
}

/**
 * Common environment variable schema shared across all Heady services.
 */
const COMMON_ENV_SCHEMA = {
  NODE_ENV: {
    required: false,
    default: 'development',
    description: 'Runtime environment',
  },
  PORT: {
    required: true,
    description: 'HTTP listen port',
  },
  LOG_LEVEL: {
    required: false,
    default: 'info',
    description: 'Logging level (debug, info, warn, error)',
  },
  LOG_FORMAT: {
    required: false,
    default: 'json',
    description: 'Log format (json, human)',
  },
  HMAC_SECRET: {
    required: true,
    description: 'Shared HMAC secret for inter-service request signing',
  },
};

/**
 * Per-service environment schemas.
 */
const SERVICE_ENV_SCHEMAS = {
  'auth-session-server': {
    ...COMMON_ENV_SCHEMA,
    DATABASE_URL: { required: true, description: 'PostgreSQL connection string' },
    REDIS_URL: { required: true, description: 'Redis connection string' },
    FIREBASE_SERVICE_ACCOUNT: { required: true, description: 'Firebase service account JSON' },
    SESSION_SECRET: { required: true, description: 'Session encryption secret' },
  },
  'notification-service': {
    ...COMMON_ENV_SCHEMA,
    NATS_URL: { required: true, description: 'NATS server URL' },
    REDIS_URL: { required: true, description: 'Redis connection string' },
  },
  'analytics-service': {
    ...COMMON_ENV_SCHEMA,
    DATABASE_URL: { required: true, description: 'PostgreSQL connection string' },
    REDIS_URL: { required: true, description: 'Redis connection string' },
  },
  'billing-service': {
    ...COMMON_ENV_SCHEMA,
    DATABASE_URL: { required: true, description: 'PostgreSQL connection string' },
    STRIPE_SECRET_KEY: { required: true, description: 'Stripe secret API key' },
    STRIPE_WEBHOOK_SECRET: { required: true, description: 'Stripe webhook signing secret' },
  },
  'scheduler-service': {
    ...COMMON_ENV_SCHEMA,
    DATABASE_URL: { required: true, description: 'PostgreSQL connection string' },
    NATS_URL: { required: true, description: 'NATS server URL' },
    AUTH_SERVICE_URL: { required: false, default: 'http://auth-session-server:3380', description: 'Auth service base URL' },
    NOTIFICATION_SERVICE_URL: { required: false, default: 'http://notification-service:3381', description: 'Notification service base URL' },
    ANALYTICS_SERVICE_URL: { required: false, default: 'http://analytics-service:3382', description: 'Analytics service base URL' },
    BILLING_SERVICE_URL: { required: false, default: 'http://billing-service:3383', description: 'Billing service base URL' },
  },
};

/**
 * Load and validate environment for a specific service.
 * Fail-fast in production/staging if required vars are missing.
 *
 * @param {string} serviceName
 * @returns {object} validated env vars
 */
function loadServiceEnv(serviceName) {
  const schema = SERVICE_ENV_SCHEMAS[serviceName];
  if (!schema) {
    throw new Error(`Unknown service: ${serviceName}`);
  }
  return validateEnv(schema);
}

/**
 * Helper: is current env production?
 */
function isProduction() {
  return detectEnvironment() === ENVIRONMENTS.production;
}

/**
 * Helper: is current env development or test?
 */
function isDevelopment() {
  const env = detectEnvironment();
  return env === ENVIRONMENTS.development || env === ENVIRONMENTS.test;
}

module.exports = {
  ENVIRONMENTS,
  COMMON_ENV_SCHEMA,
  SERVICE_ENV_SCHEMAS,
  detectEnvironment,
  validateEnv,
  loadServiceEnv,
  isProduction,
  isDevelopment,
};
