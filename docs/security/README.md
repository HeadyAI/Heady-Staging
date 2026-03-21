# Heady™ Security Guide

> Authentication, authorization, cross-domain security, and compliance

## Security Principles

1. **httpOnly Cookies Only** — Tokens never touch localStorage or JavaScript
2. **No Wildcard CORS** — Explicit whitelist of all 9 Heady domains + admin subdomains
3. **HMAC-SHA256 Tokens** — Timing-safe signature verification
4. **PKCE-S256** — OAuth 2.1 with Proof Key for Code Exchange
5. **CSL-Gated Auth** — Continuous confidence scoring instead of binary allow/deny
6. **One-Time Relay Codes** — Cross-domain auth uses single-use, time-limited codes
7. **Session Fingerprinting** — IP + User-Agent hash binding

## Authentication Flow

### Standard Login
```
Client                Auth Service (3360)           Firebase
  │                        │                           │
  │── POST /auth/login ───▶│                           │
  │   { idToken }          │── verifyIdToken() ──────▶│
  │                        │◀── { uid, email } ───────│
  │                        │                           │
  │                        │── Generate HMAC token ────│
  │                        │── Set httpOnly cookie ────│
  │◀── 200 + Set-Cookie ──│                           │
```

### Cross-Domain Navigation
```
headyme.com         Domain Router (3366)      Auth (3360)         heady-ai.com
  │                        │                     │                     │
  │── POST /auth-handoff──▶│                     │                     │
  │                        │── generateRelayCode │                     │
  │◀── { handoffURL } ────│                     │                     │
  │                        │                     │                     │
  │── Redirect to auth ───────────────────────▶│                     │
  │                        │                     │── Verify code ──────│
  │                        │                     │── Set cookie ───────│
  │                        │                     │── Redirect ────────▶│
  │                        │                     │                     │── Valid session
```

## Token Lifecycle

| Phase | TTL | Constant |
|-------|-----|----------|
| Short session | 29 034ms | PHI_TIMING.PHI_7 |
| Long session | ~28.5h | fib(11) × fib(12) × fib(6) × 1000ms |
| Relay code | 11 090ms | PHI_TIMING.PHI_5 |
| Refresh window | 17 944ms before expiry | PHI_TIMING.PHI_6 |

## Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Anonymous | fib(9) = 34 | fib(10) × 1000 = 55 000ms |
| Authenticated | fib(11) = 89 | fib(10) × 1000 = 55 000ms |
| Enterprise | fib(13) = 233 | fib(10) × 1000 = 55 000ms |

## Content Security Policy

Generated dynamically from canonical domain registry. Includes:
- `default-src 'self'`
- `script-src 'self' <all Heady domains>`
- `frame-src 'self' https://auth.headysystems.com` (auth bridge)
- `frame-ancestors 'none'` (clickjacking protection)
- `upgrade-insecure-requests`

## Headers Applied

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=704880; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |

## CSL-Gated Auth Confidence

Instead of binary allow/deny, auth evaluates a φ-weighted confidence score:

| Factor | Weight | Description |
|--------|--------|-------------|
| Token valid | ψ ≈ 0.618 | HMAC signature verified |
| Fingerprint match | ψ² ≈ 0.382 | IP + UA matches session |
| Origin trusted | ψ³ ≈ 0.236 | Origin in whitelist |
| Session fresh | ψ⁴ ≈ 0.146 | Not near expiry |
| MFA verified | ψ⁵ ≈ 0.090 | Multi-factor complete |

Decision: `gatedScore ≥ CSL_THRESHOLDS.MEDIUM (0.809)` → allow

## Modules

| Module | Path | Purpose |
|--------|------|---------|
| Auth Verify Middleware | `src/middleware/auth-verify.js` | Token extraction & verification |
| CORS Middleware | `src/middleware/cors.js` | Origin whitelist enforcement |
| CSRF Protection | `src/security/csrf-protection.js` | Double-submit cookie pattern |
| Input Validator | `src/security/input-validator.js` | Schema-based input sanitization |
| Secret Manager | `src/security/secret-manager.js` | Environment secret loading |
| Cross-Domain Auth | `src/security/cross-domain-auth.js` | Relay codes, bridge, PKCE |
| Token Manager | `src/security/token-manager.js` | Token generation, verification, revocation |
| Security Headers | `src/security/security-headers.js` | CSP, HSTS, security response headers |
| CSP Headers | `security/csp-headers.js` | Standalone CSP generator |
| Rate Limiter | `security/rate-limiter.js` | Sliding window rate limiting |
| Prompt Defense | `security/prompt-defense.js` | LLM prompt injection protection |
