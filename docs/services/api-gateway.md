# API Gateway Service

**Port:** 3370 | **Pool:** Hot | **Domain:** headyapi.com

## Overview
Unified entry point for all Heady API requests. Handles routing, authentication verification, rate limiting, CORS, and request tracing.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check with service status |
| `ANY` | `/api/<service>/<path>` | Proxy to internal service |
| `GET` | `/api/domains` | Domain registry |

## Configuration
| Env Variable | Default | Description |
|--------------|---------|-------------|
| `SERVICE_PORT` | `3370` | Listen port |
| `SESSION_SECRET` | — | HMAC signing key |
| `UPSTREAM_TIMEOUT_MS` | `29034` | φ⁷×1000 upstream timeout |

## Rate Limiting
Uses φ-derived windows: fib(9)=34 anonymous, fib(11)=89 authenticated, fib(13)=233 enterprise per fib(10)×1000=55s window.

## Security
- CORS: Explicit 9-domain whitelist via `shared/heady-domains.js`
- CSP: Full Content-Security-Policy headers
- Auth: httpOnly cookie verification via `src/middleware/auth-verify.js`
