# @heady/structured-logger

Structured JSON logger with correlation tracking for the Heady platform. Features phi-based log sampling, correlation ID propagation, and multiple output formats.

## Installation

```bash
npm install @heady/structured-logger
```

## Usage

### Basic Logger

```js
const { createLogger } = require('@heady/structured-logger');

const logger = createLogger({
  service: 'user-api',
  domain: 'auth',
  level: 'info',
});

logger.info('User logged in', { userId: '123', correlationId: 'abc-def' });
// Output (JSON): {"timestamp":"2026-03-10T...","level":"info","message":"User logged in","service":"user-api","domain":"auth","correlationId":"abc-def","userId":"123"}
```

### File Sink

```js
const logger = createLogger({
  service: 'worker',
  sink: { type: 'file', path: '/var/log/heady/worker.jsonl' },
});

logger.error('Job failed', { jobId: 'xyz', error: 'timeout' });
```

### Dev Mode (Human-Readable)

```js
const logger = createLogger({
  service: 'api',
  format: 'human',
  level: 'debug',
});

logger.debug('Processing request', { path: '/api/v1/users' });
// Output: 2026-03-10T12:00:00.000Z DEBUG [api] cid=abc12345 Processing request {"path":"/api/v1/users"}
```

### Phi-Based Sampling

```js
const logger = createLogger({
  service: 'high-traffic-api',
  sampling: true,  // debug: 38.2%, info: 61.8%, warn/error/fatal: 100%
});
```

### Correlation IDs

```js
const { extractCorrelationId, createCorrelationContext, generateCorrelationId } = require('@heady/structured-logger');

// Extract from HTTP headers
const corrId = extractCorrelationId(req.headers);
// Checks: X-Correlation-ID > X-Request-ID > traceparent > generates new

// Full context
const ctx = createCorrelationContext(req.headers);
// { correlationId, traceId, spanId }

// Generate fresh
const newId = generateCorrelationId();
```

### Child Logger

```js
const parent = createLogger({ service: 'api', level: 'info' });
const child = parent.child({ domain: 'payments', correlationId: 'req-123' });

child.info('Payment processed');
// Inherits service='api' and level='info', adds domain and correlationId
```

## API Reference

| Export | Description |
|---|---|
| `createLogger(options)` | Create a structured logger instance |
| `generateCorrelationId()` | Generate a UUID v4 correlation ID |
| `extractCorrelationId(headers)` | Extract correlation ID from HTTP headers |
| `createCorrelationContext(headers)` | Create full correlation context |
| `jsonFormatter(entry)` | Format log entry as JSON |
| `humanFormatter(entry)` | Format log entry for human reading |
| `LOG_LEVELS` | Level name to number mapping |
| `PHI_SAMPLING` | Phi-derived sampling rates per level |
