# MODULE 07 — SECURITY STANDARDS

> **ID:** `SECURITY_STANDARDS` | **Deps:** `CORE_IDENTITY`, `VERIFICATION_ENGINE`  
> **Required by:** All compositions handling user data, network services, or auth  
> **Deterministic role:** Security rules are binary — a system either resists an attack class or it doesn't. This module adds mandatory security gates that block delivery if violated.

---

## Security Posture

Security is not a feature added later. It's a property that holds from the first line of code. Every rule below is a gate check that blocks delivery if failed.

## Layer 1: Input Validation

All user-provided data is hostile until proven otherwise. Validate type, format, length, and range on every field at the system boundary. Use allowlists over denylists (denylists are always incomplete). Reject early with clear messages that don't reveal internals. Sanitize for output context: HTML-encode for web, parameterize for SQL, shell-escape for commands. Drupal's Form API and Entity Validation API handle much of this natively — don't circumvent them.

## Layer 2: Authentication & Authorization

Separate "who are you" from "what can you do." Short-lived access tokens (15 min or less) with refresh rotation. Session invalidation is immediate and global. Rate-limit auth endpoints aggressively. Passwords hashed with bcrypt/scrypt/Argon2. Authorization checked on every request, not just the first. Drupal's permission and role system is the foundation — extend it through Heady's 3D persistence for cross-site auth schemas, never bypass it.

**3D persistence auth schema:** Connected service credentials live at `user.[userId].auth.[serviceId]@latest`, encrypted at rest, decrypted only during execution window. OAuth2 tokens auto-refresh when within 5 minutes of expiry.

## Layer 3: Transport

HTTPS everywhere. HSTS headers. TLS 1.2 minimum. No sensitive data in URL parameters. Certificate validation mandatory in production (`verify_peer: true` always). Drupal's trusted host patterns configured correctly.

## Layer 4: Data Protection

Encrypt sensitive data at rest. Audit log all access to sensitive data with correlation IDs. Never log passwords, tokens, PII, or payment data. Mask sensitive fields in error messages. 3D persistence layer encrypts credential vectors at rest with per-user keys. Drupal's database encryption modules applied where PII is stored.

## Layer 5: Dependencies

Run `composer audit` and `npm audit` in CI. Fail on critical vulns. Use lockfiles (`composer.lock`, `package-lock.json`). Pin exact versions. Review transitive dependencies. Drupal security advisories monitored — apply security releases within 48 hours.

## Layer 6: API & Web Security

Rate limiting on all user-facing endpoints. CORS uses explicit origin whitelists (never `*` in production). CSRF protection on state-changing endpoints — Drupal handles this natively via form tokens. Response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`. Drupal's Security Kit (SecKit) module configured.

## Security Verification Extension

Added to MODULE 04 Pass 1 (Structural):

```
□ Zero credentials, API keys, or secrets in source code
□ Zero credentials in env templates (only placeholder names)
□ .gitignore covers .env, key files, credential stores
□ Zero hardcoded URLs with embedded credentials
□ Dependency audit: zero critical vulnerabilities
```

Added to MODULE 04 Pass 4 (Invariants):

```
□ Input validation present on all API boundaries
□ All DB queries parameterized (zero string concatenation)
□ CORS: explicit whitelists only (zero wildcards)
□ Auth tokens: short expiry + refresh mechanism
□ Cookies: httpOnly + Secure + SameSite=Strict
□ File uploads: type, size, content validated
□ Rate limiting: active on auth + user-facing endpoints
□ Zero sensitive data in log output
□ 3D persistence auth vectors encrypted at rest
□ Drupal admin routes permission-protected (no open /admin)
□ Drupal trusted_host_patterns configured
```

**Affirmation:** `SECURITY: VERIFIED — 0 secrets in source, 0 injection vectors, 0 CORS wildcards, all auth endpoints rate-limited`
