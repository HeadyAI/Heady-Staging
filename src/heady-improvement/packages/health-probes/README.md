# @heady/health-probes

Health check probes with phi-scaled thresholds for the Heady platform. Provides Kubernetes-compatible `/health`, `/healthz`, and `/ready` endpoints with Fibonacci-distributed check intervals to prevent thundering herd.

## Installation

```bash
npm install @heady/health-probes
```

## Usage

### Express Middleware

```js
const express = require('express');
const { createHealthMiddleware } = require('@heady/health-probes');

const app = express();

app.use(createHealthMiddleware({
  serviceName: 'user-api',
  version: '2.1.0',
  pgClient: pool,         // pg Pool instance
  redisClient: redis,     // ioredis instance
  externalApis: [
    { name: 'auth-service', url: 'https://auth.heady.io/health' },
  ],
}));

// GET /health   → full health check response
// GET /healthz  → same as /health (Kubernetes alias)
// GET /ready    → readiness check (stricter: returns 503 if degraded)
```

### Custom Health Probe

```js
const { createHealthProbe } = require('@heady/health-probes');

const probe = createHealthProbe('worker-service', [
  {
    name: 'database',
    check: async () => {
      await db.query('SELECT 1');
      return { ok: true };
    },
  },
  {
    name: 'queue',
    check: async () => {
      const depth = await queue.depth();
      return { ok: depth < 10000, detail: `depth=${depth}` };
    },
    timeoutMs: 3000,
  },
]);

const result = await probe.run();
// {
//   status: 'healthy',
//   service: 'worker-service',
//   version: '1.0.0',
//   uptime: 123456,
//   timestamp: '2026-03-10T12:00:00.000Z',
//   checks: [
//     { name: 'database', status: 'healthy', latency: 12 },
//     { name: 'queue', status: 'healthy', latency: 45, detail: 'depth=42' }
//   ],
//   thresholds: { GOOD: 62, ACCEPTABLE: 100, DEGRADED: 162, UNHEALTHY: 262 }
// }
```

### Built-in Check Factories

```js
const { pgvectorCheck, redisCheck, externalApiCheck } = require('@heady/health-probes');

const checks = [
  pgvectorCheck(pgPool),
  redisCheck(redisClient),
  externalApiCheck('payments', 'https://pay.example.com/health', { timeoutMs: 2000 }),
];
```

### Fibonacci-Distributed Intervals

Health check caching uses Fibonacci intervals based on the service name hash. This naturally staggers checks across services:

```js
const { pickFibInterval, FIB_INTERVALS_SEC } = require('@heady/health-probes');

pickFibInterval('user-api');   // e.g. 8 seconds
pickFibInterval('worker');     // e.g. 13 seconds
```

## Response Time Thresholds

Phi-scaled latency classification:

| Threshold | Value | Classification |
|---|---|---|
| GOOD | ~62ms | Healthy |
| ACCEPTABLE | 100ms | Healthy |
| DEGRADED | ~162ms | Degraded |
| UNHEALTHY | ~262ms | Unhealthy |

## API Reference

| Export | Description |
|---|---|
| `createHealthMiddleware(options)` | Express middleware with /health, /healthz, /ready |
| `createHealthProbe(name, checks, opts)` | Standalone health probe |
| `pgvectorCheck(client)` | pgvector connection check factory |
| `redisCheck(client)` | Redis connection check factory |
| `externalApiCheck(name, url, opts)` | External API check factory |
| `pickFibInterval(serviceName)` | Pick a Fib-distributed interval |
| `HealthStatus` | Status enum: healthy, degraded, unhealthy |
| `RESPONSE_TIME_THRESHOLDS` | Phi-scaled latency thresholds |
