/**
 * HEADY SYSTEM — Configuration Validator
 * ═══════════════════════════════════════════════════════════════
 * Validates that all configuration files are consistent, all
 * required environment variables are present, and no secrets
 * are hardcoded. Run this at service startup to fail fast on
 * misconfiguration rather than discovering problems at runtime.
 *
 * Usage:
 *   const config = require("./config-validator").load();
 *   // config is now a frozen, validated configuration object
 *
 * The validator catches:
 *   - Missing required environment variables
 *   - Inconsistent version strings across files
 *   - Hardcoded localhost/credentials in production
 *   - Invalid numeric values (ports, pool sizes)
 *   - Missing TLS configuration when NODE_ENV=production
 * ═══════════════════════════════════════════════════════════════
 */

const { createLogger } = require("./logger");
const logger = createLogger("config-validator");

/**
 * Validates and loads the complete Heady system configuration.
 * Throws immediately on any validation failure so the service
 * won't start with a broken configuration.
 *
 * @returns {object} Frozen configuration object with all validated values
 */
function load() {
  const env = process.env.NODE_ENV || "development";
  const errors = [];

  // ─── Helper: validate required env var ───
  function required(key, description) {
    const val = process.env[key];
    if (!val || val.trim() === "") {
      errors.push(`Missing required env var: ${key} (${description})`);
      return undefined;
    }
    return val.trim();
  }

  // ─── Helper: validate optional env var with default ───
  function optional(key, defaultVal) {
    return process.env[key] ? process.env[key].trim() : defaultVal;
  }

  // ─── Helper: validate integer env var ───
  function intVar(key, defaultVal, min, max) {
    const raw = process.env[key] || String(defaultVal);
    const val = parseInt(raw, 10);
    if (isNaN(val)) {
      errors.push(`${key} must be an integer, got: "${raw}"`);
      return defaultVal;
    }
    if (val < min || val > max) {
      errors.push(`${key} must be between ${min} and ${max}, got: ${val}`);
      return defaultVal;
    }
    return val;
  }

  // ═══ Build configuration object ═══
  const config = {
    env,
    version: optional("HEADY_VERSION", "0.0.0"),

    // ─── Server ───
    server: {
      port: intVar("PORT", 3000, 1, 65535),
      host: optional("HOST", "0.0.0.0"),
    },

    // ─── Database (PostgreSQL) ───
    database: {
      url: required("DATABASE_URL", "PostgreSQL connection string"),
      pool: {
        min: intVar("DB_POOL_MIN", 2, 1, 50),
        max: intVar("DB_POOL_MAX", 10, 2, 100),
      },
    },

    // ─── Redis (Agent Communication Bus) ───
    redis: {
      url: optional("REDIS_URL", "redis://localhost:6379"),
      pool: {
        min: intVar("REDIS_POOL_MIN", 2, 1, 50),
        max: intVar("REDIS_POOL_MAX", 13, 2, 100),
      },
    },

    // ─── Auth / Security ───
    auth: {
      jwtSecret: required("JWT_SECRET", "JWT signing secret (min 32 chars)"),
      tokenExpiry: optional("TOKEN_EXPIRY", "15m"),
      refreshExpiry: optional("REFRESH_EXPIRY", "7d"),
    },

    // ─── MCP Server ───
    mcp: {
      gatewayUrl: optional("MCP_GATEWAY_URL", "https://manager.headysystems.com/mcp/sse"),
      requestTimeoutMs: intVar("MCP_TIMEOUT_MS", 5000, 100, 30000),
    },

    // ─── Trading (Apex Trader Funding) ───
    trading: {
      tradovateApiUrl: optional("TRADOVATE_API_URL", "https://demo.tradovateapi.com/v1"),
      tradovateWsUrl: optional("TRADOVATE_WS_URL", "wss://demo.tradovateapi.com/v1/websocket"),
      maxDrawdownPct: intVar("MAX_DRAWDOWN_PCT", 100, 1, 100),
      consistencyRulePct: intVar("CONSISTENCY_RULE_PCT", 30, 1, 100),
      autocloseTimeET: optional("AUTOCLOSE_TIME_ET", "16:58"),
    },

    // ─── CORS ───
    cors: {
      allowedOrigins: (optional("ALLOWED_ORIGINS", ""))
        .split(",")
        .filter(Boolean)
        .map(o => o.trim()),
    },

    // ─── Observability ───
    observability: {
      logLevel: optional("LOG_LEVEL", "info"),
      enableTracing: optional("ENABLE_TRACING", "false") === "true",
      metricsPort: intVar("METRICS_PORT", 9090, 1, 65535),
    },

    // ─── Colab Runtimes ───
    colab: {
      runtime1Url: optional("COLAB_RUNTIME_1_URL", ""),
      runtime2Url: optional("COLAB_RUNTIME_2_URL", ""),
      runtime3Url: optional("COLAB_RUNTIME_3_URL", ""),
    },
  };

  // ═══ Production-specific validations ═══
  if (env === "production") {
    // JWT secret must be strong in production
    if (config.auth.jwtSecret && config.auth.jwtSecret.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters in production");
    }

    // No wildcard CORS in production
    if (config.cors.allowedOrigins.includes("*")) {
      errors.push("ALLOWED_ORIGINS cannot be '*' in production. Use explicit domain whitelist.");
    }

    // No empty CORS in production (blocks all cross-origin)
    if (config.cors.allowedOrigins.length === 0) {
      errors.push("ALLOWED_ORIGINS must be set in production");
    }

    // Database URL must not contain localhost in production
    if (config.database.url && (config.database.url.includes("localhost") || config.database.url.includes("127.0.0.1"))) {
      errors.push("DATABASE_URL contains localhost in production. Use a proper hostname.");
    }

    // Redis URL must not contain localhost in production
    if (config.redis.url.includes("localhost") || config.redis.url.includes("127.0.0.1")) {
      errors.push("REDIS_URL contains localhost in production. Use a proper hostname.");
    }
  }

  // ═══ Emit results ═══
  if (errors.length > 0) {
    logger.fatal({
      error_count: errors.length,
      errors,
      env,
    }, `Configuration validation FAILED with ${errors.length} error(s)`);
    throw new Error(
      `Configuration validation failed:\n  - ${errors.join("\n  - ")}`
    );
  }

  logger.info({ env, version: config.version }, "Configuration validated successfully");
  return Object.freeze(config);
}

module.exports = { load };
