# Auth Session Service

**Port:** 3360 | **Pool:** Hot | **Domain:** auth.headysystems.com

## Overview
Central authentication authority for all 9 Heady domains. Handles Firebase token verification, session management, cross-domain relay, and httpOnly cookie lifecycle.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Authenticate with Firebase ID token |
| `POST` | `/auth/logout` | Destroy session |
| `GET` | `/auth/session` | Get session status |
| `POST` | `/auth/refresh` | Refresh token |
| `GET` | `/relay` | Cross-domain auth relay |
| `GET` | `/bridge` | Auth bridge iframe HTML |
| `GET` | `/health` | Health check |

## Session Flow
1. Client sends Firebase ID token to `/auth/login`
2. Server verifies via Firebase Admin SDK (or HMAC fallback)
3. Generates HMAC-SHA256 token with φ-derived TTL
4. Sets `__Host-heady_session` httpOnly secure cookie
5. Client includes cookie in subsequent requests

## Cross-Domain Flow
1. Source domain requests auth handoff from Domain Router
2. Router generates one-time relay code (21 bytes, 11s TTL)
3. Browser redirects to `/relay?code=...&nonce=...&dest=...`
4. Relay verifies code, sets cookie for destination domain
5. Redirects to destination with valid session

## Security
- Session fingerprinting: IP + User-Agent SHA-256
- Rate limiting: fib(9)/fib(11)/fib(13) per fib(10)×1000ms window
- Token revocation set: max fib(16)=987 entries
- No localStorage — httpOnly cookies only
