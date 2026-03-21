# Heady™ API Reference

> Complete endpoint documentation for all Heady services

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://headyapi.com/v1` |
| Staging | `https://staging.headyapi.com/v1` |
| Local | `http://localhost:3370` |

## Authentication

All authenticated endpoints require one of:
1. **httpOnly cookie** `__Host-heady_session` (preferred, set by auth service)
2. **Bearer token** in `Authorization` header

```
Authorization: Bearer <token>
```

Tokens are HMAC-SHA256 signed JWTs with φ-derived TTLs.

---

## API Gateway (Port 3370)

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "version": "5.3.0",
  "uptime": 12345.678,
  "services": { "auth": "up", "search": "up", ... }
}
```

### Service Proxy
```
ANY /api/<service>/<path>
```
Routes to internal service. Adds request ID, auth verification, rate limiting.

---

## Auth Session (Port 3360)

### Login
```
POST /auth/login
Content-Type: application/json

{
  "idToken": "<Firebase ID token>",
  "rememberMe": false
}
```
Response: Sets `__Host-heady_session` httpOnly cookie.

### Logout
```
POST /auth/logout
```
Clears session cookie and revokes token.

### Session Status
```
GET /auth/session
```
Returns current session info if authenticated.

### Token Refresh
```
POST /auth/refresh
```
Refreshes token if within refresh window (17 944ms before expiry).

### Cross-Domain Relay
```
GET /relay?code=<relay_code>&nonce=<nonce>&dest=<destination_url>
```
Verifies relay code, sets session cookie, redirects to destination.

### Auth Bridge (iframe)
```
GET /bridge
```
Returns bridge HTML for postMessage session communication.

---

## Domain Router (Port 3366)

### Navigation Manifest
```
GET /navigation?domain=headyme.com
```
Returns navigation structure for cross-domain linking.

### Verify Route
```
POST /verify-route
Content-Type: application/json

{
  "sourceDomain": "headyme.com",
  "destinationURL": "https://heady-ai.com/dashboard"
}
```

### Auth Handoff
```
POST /auth-handoff
Content-Type: application/json

{
  "userId": "user_123",
  "sourceDomain": "headyme.com",
  "destinationURL": "https://heady-ai.com/dashboard"
}
```

### Domain Registry
```
GET /domains
```
Returns all 9 Heady domains with roles, pools, and CSL gates.

---

## Search (Port 3364)

### Vector Search
```
POST /search
Content-Type: application/json

{
  "query": "How does CSL routing work?",
  "limit": 13,
  "threshold": 0.691
}
```

### Semantic Similarity
```
POST /search/similarity
Content-Type: application/json

{
  "vectorA": [0.1, 0.2, ...],
  "vectorB": [0.3, 0.4, ...]
}
```

---

## Notification (Port 3361)

### Send Notification
```
POST /notify
Content-Type: application/json

{
  "userId": "user_123",
  "type": "alert",
  "title": "Pipeline complete",
  "body": "HCFullPipeline finished in 4.2s",
  "priority": "high"
}
```

### SSE Stream
```
GET /stream?userId=user_123
Accept: text/event-stream
```
Real-time notification stream via Server-Sent Events.

---

## Analytics (Port 3362)

### Record Event
```
POST /events
Content-Type: application/json

{
  "event": "pipeline_complete",
  "properties": { "duration_ms": 4236, "nodes_used": 5 },
  "userId": "user_123"
}
```

### Query Analytics
```
GET /analytics/summary?from=2026-01-01&to=2026-03-10
```

---

## Scheduler (Port 3363)

### Create Schedule
```
POST /schedules
Content-Type: application/json

{
  "name": "daily-cleanup",
  "cron": "0 3 * * *",
  "task": "janitor.cleanup",
  "payload": {}
}
```

### List Schedules
```
GET /schedules
```

---

## Onboarding (Port 3365)

### Start Onboarding
```
POST /onboarding/start
Content-Type: application/json

{
  "userId": "user_123",
  "plan": "developer"
}
```

### Get Step
```
GET /onboarding/step/:stepId
```

---

## Common Response Codes

| Code | Meaning | Error Code |
|------|---------|------------|
| 200 | Success | — |
| 201 | Created | — |
| 204 | No Content | — |
| 400 | Bad Request | `HEADY-400-xxx` |
| 401 | Unauthorized | `HEADY-401-xxx` |
| 403 | Forbidden | `HEADY-403-xxx` |
| 404 | Not Found | `HEADY-404-xxx` |
| 429 | Rate Limited | `HEADY-429-001` |
| 500 | Internal Error | `HEADY-500-xxx` |

See [Error Codes](../ERROR_CODES.md) for full reference.

## Rate Limits

| Tier | Requests/Window | Window |
|------|-----------------|--------|
| Anonymous | 34/window (fib(9)) | 55 000ms (fib(10) × 1000) |
| Authenticated | 89/window (fib(11)) | 55 000ms |
| Enterprise | 233/window (fib(13)) | 55 000ms |
