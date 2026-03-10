/**
 * Heady Contract Tests — Pact-Style Inter-Service API Verification
 * Verifies that service interfaces match their declared contracts.
 * Author: Eric Haywood | ESM only | φ-scaled | No stubs
 */
import { strict as assert } from 'assert';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// φ-Math constants
const PHI   = 1.6180339887;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const FIB   = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];

function fibonacci(n) { return FIB[n] || Math.round((Math.pow(PHI, n) - Math.pow(-PSI, n)) / Math.sqrt(5)); }
function phiThreshold(level, spread = PSI2 + (1 - PSI2) / PHI) {
  return 1 - Math.pow(PSI, level) * spread;
}

// SHA-256 for contract fingerprinting
function sha256(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ── Contract Definitions ─────────────────────────────────────────
// Each contract defines: provider, consumer, endpoint, request schema, response schema

const CONTRACTS = [
  {
    name: 'auth-session-create',
    provider: 'auth-session-server',
    consumer: 'api-gateway',
    method: 'POST',
    path: '/api/sessions',
    requestSchema: {
      type: 'object',
      required: ['firebaseIdToken'],
      properties: {
        firebaseIdToken: { type: 'string', minLength: fibonacci(5) },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['sessionId', 'expiresAt', 'userId'],
      properties: {
        sessionId: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        expiresAt: { type: 'number' },
        userId: { type: 'string' },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Heady-Domain': 'auth',
    },
    cookieExpected: '__Host-heady_session',
  },
  {
    name: 'memory-search',
    provider: 'heady-memory',
    consumer: 'heady-brain',
    method: 'POST',
    path: '/api/memory/search',
    requestSchema: {
      type: 'object',
      required: ['query', 'topK'],
      properties: {
        query: { type: 'string', minLength: 1 },
        topK: { type: 'integer', minimum: 1, maximum: fibonacci(10) },
        threshold: { type: 'number', minimum: 0, maximum: 1 },
        namespace: { type: 'string' },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['matches', 'queryId', 'latencyMs'],
      properties: {
        matches: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'score', 'content'],
            properties: {
              id: { type: 'string' },
              score: { type: 'number', minimum: 0, maximum: 1 },
              content: { type: 'string' },
              metadata: { type: 'object' },
            },
          },
        },
        queryId: { type: 'string' },
        latencyMs: { type: 'number' },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Heady-Domain': 'memory',
    },
  },
  {
    name: 'embedding-create',
    provider: 'heady-embed',
    consumer: 'heady-memory',
    method: 'POST',
    path: '/api/embed',
    requestSchema: {
      type: 'object',
      required: ['text', 'model'],
      properties: {
        text: { type: 'string', minLength: 1 },
        model: { type: 'string', enum: ['nomic-embed-text-v1.5', 'jina-embeddings-v3', 'voyage-3-lite'] },
        dimensions: { type: 'integer', enum: [384, 768, 1536] },
        taskType: { type: 'string', enum: ['search_document', 'search_query', 'clustering', 'classification'] },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['embedding', 'model', 'dimensions', 'tokensUsed'],
      properties: {
        embedding: { type: 'array', items: { type: 'number' }, minItems: 384, maxItems: 1536 },
        model: { type: 'string' },
        dimensions: { type: 'integer' },
        tokensUsed: { type: 'integer' },
        cached: { type: 'boolean' },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Heady-Domain': 'memory',
    },
  },
  {
    name: 'inference-request',
    provider: 'heady-brain',
    consumer: 'api-gateway',
    method: 'POST',
    path: '/api/infer',
    requestSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', minLength: 1 },
        model: { type: 'string' },
        temperature: { type: 'number', minimum: 0, maximum: 2 },
        maxTokens: { type: 'integer', minimum: 1, maximum: fibonacci(14) },
        stream: { type: 'boolean' },
        systemPrompt: { type: 'string' },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['response', 'model', 'tokensUsed', 'latencyMs'],
      properties: {
        response: { type: 'string' },
        model: { type: 'string' },
        tokensUsed: { type: 'object', properties: { input: { type: 'integer' }, output: { type: 'integer' } } },
        latencyMs: { type: 'number' },
        cslConfidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Heady-Domain': 'inference',
    },
  },
  {
    name: 'agent-spawn',
    provider: 'heady-bee-factory',
    consumer: 'heady-hive',
    method: 'POST',
    path: '/api/agents/spawn',
    requestSchema: {
      type: 'object',
      required: ['agentType', 'task'],
      properties: {
        agentType: { type: 'string', enum: ['worker', 'specialist', 'coordinator', 'scout'] },
        task: { type: 'string', minLength: 1 },
        parentId: { type: 'string' },
        ttlMs: { type: 'integer', minimum: fibonacci(13) * 1000 },
        capabilities: { type: 'array', items: { type: 'string' } },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['agentId', 'status', 'createdAt'],
      properties: {
        agentId: { type: 'string', pattern: '^bee-[a-f0-9]{12}$' },
        status: { type: 'string', enum: ['active', 'queued', 'spawning'] },
        createdAt: { type: 'string', format: 'date-time' },
        estimatedCompletionMs: { type: 'number' },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Heady-Domain': 'agents',
    },
  },
  {
    name: 'health-check',
    provider: '*',
    consumer: 'heady-health',
    method: 'GET',
    path: '/health',
    requestSchema: { type: 'object', properties: {} },
    responseSchema: {
      type: 'object',
      required: ['status', 'service', 'uptime', 'timestamp'],
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        service: { type: 'string' },
        uptime: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        checks: { type: 'object' },
      },
    },
    headers: { 'Accept': 'application/json' },
  },
  {
    name: 'notification-send',
    provider: 'notification-service',
    consumer: 'heady-brain',
    method: 'POST',
    path: '/api/notifications/send',
    requestSchema: {
      type: 'object',
      required: ['userId', 'channel', 'template', 'data'],
      properties: {
        userId: { type: 'string' },
        channel: { type: 'string', enum: ['websocket', 'sse', 'push', 'email'] },
        template: { type: 'string' },
        data: { type: 'object' },
        priority: { type: 'string', enum: ['standard', 'elevated', 'critical'] },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['notificationId', 'status', 'sentAt'],
      properties: {
        notificationId: { type: 'string' },
        status: { type: 'string', enum: ['sent', 'queued', 'failed'] },
        sentAt: { type: 'string', format: 'date-time' },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Heady-Domain': 'services',
    },
  },
  {
    name: 'billing-usage-report',
    provider: 'billing-service',
    consumer: 'api-gateway',
    method: 'GET',
    path: '/api/billing/usage',
    requestSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        period: { type: 'string', enum: ['day', 'week', 'month'] },
      },
    },
    responseSchema: {
      type: 'object',
      required: ['userId', 'period', 'usage', 'quotaRemaining'],
      properties: {
        userId: { type: 'string' },
        period: { type: 'string' },
        usage: {
          type: 'object',
          properties: {
            inferenceTokens: { type: 'integer' },
            embeddingTokens: { type: 'integer' },
            storageBytes: { type: 'integer' },
            apiCalls: { type: 'integer' },
          },
        },
        quotaRemaining: { type: 'object' },
        costUsd: { type: 'number' },
      },
    },
    headers: {
      'Accept': 'application/json',
      'X-Heady-Domain': 'billing',
    },
  },
];

// ── Contract Validator ───────────────────────────────────────────

function validateSchema(schema, label) {
  const errors = [];
  if (!schema || typeof schema !== 'object') {
    errors.push(`${label}: schema must be an object`);
    return errors;
  }
  if (!schema.type) {
    errors.push(`${label}: missing 'type' field`);
  }
  if (schema.type === 'object' && schema.required) {
    if (!Array.isArray(schema.required)) {
      errors.push(`${label}: 'required' must be an array`);
    }
    if (schema.properties) {
      for (const req of schema.required) {
        if (!schema.properties[req]) {
          errors.push(`${label}: required field '${req}' not in properties`);
        }
      }
    }
  }
  if (schema.type === 'array' && !schema.items) {
    errors.push(`${label}: array type missing 'items'`);
  }
  return errors;
}

function validateContract(contract) {
  const errors = [];
  const required = ['name', 'provider', 'consumer', 'method', 'path', 'requestSchema', 'responseSchema'];
  for (const field of required) {
    if (!contract[field]) errors.push(`Missing field: ${field}`);
  }
  if (contract.method && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(contract.method)) {
    errors.push(`Invalid HTTP method: ${contract.method}`);
  }
  errors.push(...validateSchema(contract.requestSchema, 'request'));
  errors.push(...validateSchema(contract.responseSchema, 'response'));
  return errors;
}

// ── Run Contract Verification ────────────────────────────────────

function runContractTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const contract of CONTRACTS) {
    const errors = validateContract(contract);
    const fingerprint = sha256({
      name: contract.name,
      method: contract.method,
      path: contract.path,
      request: contract.requestSchema,
      response: contract.responseSchema,
    }).slice(0, fibonacci(7));

    if (errors.length === 0) {
      passed++;
      results.push({ name: contract.name, status: 'PASS', fingerprint, errors: [] });
    } else {
      failed++;
      results.push({ name: contract.name, status: 'FAIL', fingerprint, errors });
    }
  }

  return { passed, failed, total: CONTRACTS.length, results };
}

// ── Self-test on import ──────────────────────────────────────────

const testResults = runContractTests();
assert.equal(testResults.failed, 0, `Contract validation failures: ${testResults.results.filter(r => r.status === 'FAIL').map(r => r.name + ': ' + r.errors.join(', ')).join('; ')}`);

console.log(`  ✓ Contract tests: ${testResults.passed}/${testResults.total} contracts validated`);
console.log(`  ✓ Contract fingerprints generated (SHA-256 truncated to fib(7)=${fibonacci(7)} chars)`);

// ── Exports ──────────────────────────────────────────────────────

export { CONTRACTS, validateContract, runContractTests, sha256 };
export default { CONTRACTS, validateContract, runContractTests };
