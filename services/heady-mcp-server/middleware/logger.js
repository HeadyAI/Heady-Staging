/**
 * middleware/logger.js — Pino-based structured logger
 * For stdio transport, logs go to stderr to avoid polluting the JSON-RPC stdout stream.
 */
'use strict';

let pino;
try {
  pino = require('pino');
} catch {
  // Fallback if pino not installed
  pino = null;
}

function createLogger(name) {
  if (pino) {
    return pino({
      name,
      level: process.env.HEADY_LOG_LEVEL || 'info',
      // CRITICAL: MCP stdio uses stdout for JSON-RPC — logs MUST go to stderr
      transport: process.env.HEADY_MCP_TRANSPORT === 'stdio'
        ? undefined // raw pino to stderr
        : { target: 'pino-pretty', options: { colorize: true, destination: 2 } },
    }, pino.destination(2)); // fd 2 = stderr
  }

  // Minimal fallback logger (writes to stderr)
  const logFn = (level) => (obj, msg) => {
    const data = typeof obj === 'string' ? { message: obj } : { ...obj, message: msg };
    process.stderr.write(JSON.stringify({ level, name, ...data, time: Date.now() }) + '\n');
  };

  return {
    info: logFn('info'),
    warn: logFn('warn'),
    error: logFn('error'),
    debug: logFn('debug'),
    fatal: logFn('fatal'),
    trace: logFn('trace'),
  };
}

module.exports = { createLogger };
