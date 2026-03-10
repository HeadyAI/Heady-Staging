/**
 * Heady™ Request Validation Middleware v6.0
 * Input sanitization, size limits, schema validation
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { createLogger } = require('../logger');
const { fib, EMBEDDING_DIM } = require('../phi-math');
const { ValidationError } = require('./error-handler');

const logger = createLogger('request-validator');

// ═══════════════════════════════════════════════════════════
// SIZE LIMITS — Fibonacci-scaled
// ═══════════════════════════════════════════════════════════

const LIMITS = Object.freeze({
  maxBodySize: fib(16) * 1024,        // 987KB max body
  maxJsonDepth: fib(7),                // 13 levels deep
  maxStringLength: fib(14),            // 377 chars per string field
  maxArrayLength: fib(12),             // 144 items per array
  maxHeaderSize: fib(13),              // 233 chars per header value
  maxUrlLength: fib(13) * fib(5),      // 1165 chars URL
});

// ═══════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim();
}

function sanitizeObject(obj, depth = 0) {
  if (depth > LIMITS.maxJsonDepth) {
    throw new ValidationError('Request body exceeds maximum nesting depth', { maxDepth: LIMITS.maxJsonDepth });
  }

  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    if (obj.length > LIMITS.maxArrayLength) {
      throw new ValidationError(`Array exceeds maximum length of ${LIMITS.maxArrayLength}`);
    }
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeString(key);
    if (cleanKey.length > LIMITS.maxStringLength) {
      throw new ValidationError(`Object key exceeds maximum length of ${LIMITS.maxStringLength}`);
    }
    sanitized[cleanKey] = sanitizeObject(value, depth + 1);
  }
  return sanitized;
}

// ═══════════════════════════════════════════════════════════
// SCHEMA VALIDATORS
// ═══════════════════════════════════════════════════════════

const SCHEMAS = {
  embedding: {
    validate(data) {
      const errors = [];
      if (!data.embedding) errors.push('embedding is required');
      if (data.embedding && !Array.isArray(data.embedding)) errors.push('embedding must be an array');
      if (data.embedding && data.embedding.length !== EMBEDDING_DIM) {
        errors.push(`embedding must be ${EMBEDDING_DIM}-dimensional, got ${data.embedding.length}`);
      }
      if (data.embedding) {
        for (let i = 0; i < data.embedding.length; i++) {
          if (typeof data.embedding[i] !== 'number' || !isFinite(data.embedding[i])) {
            errors.push(`embedding[${i}] must be a finite number`);
            break;
          }
        }
      }
      if (data.metadata && typeof data.metadata !== 'object') errors.push('metadata must be an object');
      return errors;
    },
  },

  search: {
    validate(data) {
      const errors = [];
      if (!data.query && !data.embedding) errors.push('query or embedding is required');
      if (data.embedding) {
        if (!Array.isArray(data.embedding)) errors.push('embedding must be an array');
        if (data.embedding.length !== EMBEDDING_DIM) {
          errors.push(`embedding must be ${EMBEDDING_DIM}-dimensional`);
        }
      }
      if (data.topK !== undefined) {
        if (typeof data.topK !== 'number' || data.topK < 1 || data.topK > fib(12)) {
          errors.push(`topK must be between 1 and ${fib(12)}`);
        }
      }
      if (data.threshold !== undefined) {
        if (typeof data.threshold !== 'number' || data.threshold < 0 || data.threshold > 1) {
          errors.push('threshold must be between 0 and 1');
        }
      }
      return errors;
    },
  },

  task: {
    validate(data) {
      const errors = [];
      if (!data.type) errors.push('type is required');
      if (typeof data.type !== 'string') errors.push('type must be a string');
      if (data.payload && typeof data.payload !== 'object') errors.push('payload must be an object');
      if (data.priority && !['hot', 'warm', 'cold'].includes(data.priority)) {
        errors.push('priority must be hot, warm, or cold');
      }
      return errors;
    },
  },

  auth: {
    validate(data) {
      const errors = [];
      if (!data.idToken && !data.email) errors.push('idToken or email is required');
      if (data.idToken && typeof data.idToken !== 'string') errors.push('idToken must be a string');
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('invalid email format');
      return errors;
    },
  },
};

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════════

function createBodyParser(maxSize = LIMITS.maxBodySize) {
  return function bodyParser(req, res, next) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      if (next) return next();
      return;
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      if (next) return next();
      return;
    }

    let body = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Body exceeds ${maxSize} bytes` } }));
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (body) {
        try {
          req.body = sanitizeObject(JSON.parse(body));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } }));
          return;
        }
      } else {
        req.body = null;
      }
      if (next) next();
    });

    req.on('error', () => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'REQUEST_ERROR', message: 'Error reading request body' } }));
    });
  };
}

function createSchemaValidator(schemaName) {
  const schema = SCHEMAS[schemaName];
  if (!schema) throw new Error(`Unknown schema: ${schemaName}`);

  return function schemaValidator(req, res, next) {
    if (!req.body) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'MISSING_BODY', message: 'Request body is required' } }));
      return;
    }

    const errors = schema.validate(req.body);
    if (errors.length > 0) {
      logger.warn({ message: 'Validation failed', schema: schemaName, errors });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      }));
      return;
    }

    if (next) next();
  };
}

module.exports = {
  createBodyParser,
  createSchemaValidator,
  sanitizeString,
  sanitizeObject,
  SCHEMAS,
  LIMITS,
};
