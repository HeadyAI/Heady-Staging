# Heady™ Services Guide

> Detailed documentation for each microservice

## Service Overview

| Service | Port | Purpose | Pool | Dependencies |
|---------|------|---------|------|-------------|
| [API Gateway](api-gateway.md) | 3370 | Unified entry point, routing, rate limiting | Hot | All services |
| [Auth Session](auth-session.md) | 3360 | Authentication, sessions, cross-domain relay | Hot | Firebase, Redis |
| [Domain Router](domain-router.md) | 3366 | Cross-domain navigation, auth handoff | Hot | Domain Registry |
| [Notification](notification.md) | 3361 | Alerts, SSE streaming, webhooks | Warm | Redis, Templates |
| [Analytics](analytics.md) | 3362 | Event tracking, metrics, reporting | Cold | PostgreSQL |
| [Scheduler](scheduler.md) | 3363 | Cron jobs, task scheduling | Warm | Redis |
| [Search](search.md) | 3364 | Vector search, semantic similarity | Hot | pgvector |
| [Onboarding](onboarding.md) | 3365 | User onboarding flows | Warm | Auth, Templates |

## Common Patterns

### Health Checks
Every service exposes `GET /health` returning:
```json
{
  "status": "healthy|degraded|unhealthy",
  "service": "<name>",
  "version": "5.3.0",
  "uptime": <seconds>
}
```

### Structured Logging
All services use JSON-structured logging (no `console.log`):
```json
{
  "ts": "2026-03-10T14:00:00.000Z",
  "level": "info",
  "service": "auth-session",
  "msg": "Session created",
  "userId": "user_123"
}
```

### Error Handling
Errors follow the `AppError` class pattern from `src/utils/app-error.js`:
```javascript
const { AppError } = require('../../src/utils/app-error');
throw AppError.badRequest('Invalid input', 'HEADY-400-001');
```

### φ-Derived Constants
Every timing, limit, and threshold imports from `shared/phi-math.js`:
```javascript
const { fib, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');
```
