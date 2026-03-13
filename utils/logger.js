/**
 * HEADY SYSTEM — Structured Logging Module
 * ═══════════════════════════════════════════════════════════════
 * Replaces ALL console.log usage with production-grade structured
 * JSON logging using Pino. Every log entry includes:
 *   - timestamp (ISO 8601)
 *   - service_name (which microservice)
 *   - agent_id (which agent, if applicable)
 *   - trace_id (distributed tracing correlation)
 *   - log_level (debug, info, warn, error, fatal)
 *   - message (human-readable description)
 *   - context (structured metadata object)
 *
 * Install: npm install pino pino-pretty
 * Usage:  const logger = createLogger("alpha-agent");
 *         logger.info({ tradeId: "abc" }, "Signal generated");
 * ═══════════════════════════════════════════════════════════════
 */

// In production, pino would be installed. This module provides
// both a pino-based implementation and a fallback for environments
// where pino isn't available yet.

const crypto = require("crypto");

/**
 * Generates a unique trace ID for correlating log entries across
 * distributed services. Uses a 16-byte random hex string that's
 * compatible with OpenTelemetry trace ID format.
 */
function generateTraceId() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generates a span ID for individual operations within a trace.
 * 8-byte hex string compatible with OpenTelemetry span format.
 */
function generateSpanId() {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Creates a structured logger for a specific service or agent.
 *
 * @param {string} serviceName - Name of the service (e.g., "alpha-agent", "risk-agent", "mcp-gateway")
 * @param {object} options - Configuration options
 * @param {string} options.agentId - Optional agent identifier for multi-agent logging
 * @param {string} options.level - Minimum log level (default: "info")
 * @param {boolean} options.pretty - Use pretty-printing for development (default: false)
 * @returns {object} Logger instance with debug, info, warn, error, fatal methods
 */
function createLogger(serviceName, options = {}) {
  const { agentId = null, level = "info", pretty = false } = options;
  const levels = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };
  const minLevel = levels[level] || 20;

  // Try to use pino if available, otherwise fall back to structured JSON
  let pino;
  try {
    pino = require("pino");
    const pinoOpts = {
      level,
      base: {
        service_name: serviceName,
        ...(agentId ? { agent_id: agentId } : {}),
        pid: process.pid,
        hostname: require("os").hostname(),
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: {
        level(label) {
          return { log_level: label };
        },
      },
      ...(pretty ? { transport: { target: "pino-pretty" } } : {}),
    };
    return pino(pinoOpts);
  } catch (e) {
    // Fallback: structured JSON logger without pino dependency
    // This ensures logging works even before pino is installed
  }

  /**
   * Fallback logger that outputs structured JSON to stdout.
   * Format is compatible with ELK, Datadog, Grafana Loki, and Splunk.
   */
  function emit(logLevel, numLevel, contextOrMsg, msg) {
    if (numLevel < minLevel) return;

    // Handle the (context, message) and (message) call signatures
    let context = {};
    let message = "";
    if (typeof contextOrMsg === "string") {
      message = contextOrMsg;
    } else if (typeof contextOrMsg === "object" && contextOrMsg !== null) {
      context = contextOrMsg;
      message = msg || "";
    }

    const entry = {
      timestamp: new Date().toISOString(),
      log_level: logLevel,
      service_name: serviceName,
      ...(agentId ? { agent_id: agentId } : {}),
      trace_id: context.trace_id || context.traceId || generateTraceId(),
      message,
      ...context,
    };

    // Remove duplicated fields from context that are now top-level
    delete entry.trace_id_duplicate;

    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  return {
    debug: (ctx, msg) => emit("debug", 10, ctx, msg),
    info: (ctx, msg) => emit("info", 20, ctx, msg),
    warn: (ctx, msg) => emit("warn", 30, ctx, msg),
    error: (ctx, msg) => emit("error", 40, ctx, msg),
    fatal: (ctx, msg) => emit("fatal", 50, ctx, msg),
    child: (bindings) => createLogger(serviceName, { ...options, agentId: bindings.agent_id || agentId }),
  };
}

/**
 * Middleware for Express/Fastify that automatically logs every HTTP request
 * with structured metadata including method, path, status, and duration.
 */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    const traceId = req.headers["x-trace-id"] || generateTraceId();
    const spanId = generateSpanId();

    // Attach trace context to request for downstream usage
    req.traceId = traceId;
    req.spanId = spanId;

    // Log on response finish
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info({
        trace_id: traceId,
        span_id: spanId,
        method: req.method,
        path: req.url,
        status: res.statusCode,
        duration_ms: duration,
        user_agent: req.headers["user-agent"],
        ip: req.ip || req.connection.remoteAddress,
      }, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });

    // Set trace ID header on response for downstream correlation
    res.setHeader("X-Trace-Id", traceId);
    next();
  };
}

module.exports = { createLogger, requestLogger, generateTraceId, generateSpanId };
