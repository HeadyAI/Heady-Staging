# ADR-007: httpOnly Cookie Session Management

## Status
Accepted

## Date
2026-01-15

## Context
The Heady platform requires authenticated sessions. LocalStorage-based token storage is vulnerable to XSS attacks. For a sovereign AI platform processing sensitive intelligence, this is unacceptable.

## Decision
We mandate httpOnly cookie-based session management. The session server (port 3373) issues cryptographically secure session identifiers stored in httpOnly, Secure, SameSite=Strict cookies. Session IDs are SHA-256 hashed before storage. CSRF protection uses double-submit cookie validation. Session TTL is fib(17) seconds (~26.6 minutes) with sliding window renewal.

No tokens or credentials are ever stored in localStorage, sessionStorage, or any client-side JavaScript-accessible storage. This is absolute.

## Consequences

### Benefits
httpOnly cookies are immune to XSS-based token theft. SameSite=Strict prevents CSRF attacks. SHA-256 hashing means a compromised session store cannot impersonate users.

### Risks
httpOnly cookies require server-side session state. We accept this cost as necessary for the security guarantees required.

### Related ADRs
ADR-006 (self-healing), ADR-008 (zero-trust)
