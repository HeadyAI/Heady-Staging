# ADR-016: Why Firebase Authentication

## Status
Accepted

## Context
The Heady platform needs authentication across 9 domains with:
- Social login (Google OAuth 2.0)
- Email/password registration
- Anonymous auth for frictionless onboarding
- Cross-domain session propagation via relay iframe
- Session cookies (httpOnly, Secure, SameSite=Lax, __Host- prefix)
- Per-user rate limiting tied to auth state (fib(9)=34 anon, fib(11)=89 auth, fib(13)=233 enterprise)

## Decision
Use Firebase Authentication as the identity provider. Firebase ID tokens are validated server-side by auth-session-server, which issues `__Host-heady_session` httpOnly cookies. Cross-domain propagation uses a relay iframe on auth.headysystems.com with origin-verified postMessage.

## Consequences
**Benefits:**
- Zero-config Google OAuth, email/password, and anonymous auth
- Firebase Admin SDK validates ID tokens server-side with no custom JWT implementation
- Anonymous auth enables frictionless first use with upgrade path to full account
- Free tier covers 10K monthly active users (sufficient for launch phase)
- Cross-platform: same auth works for web, mobile, and CLI
- `__Host-` cookie prefix enforces Secure + same-origin binding at browser level

**Costs:**
- Google Cloud dependency for auth (mitigated: Firebase is a thin layer; auth tokens are standard JWTs)
- Anonymous auth abuse vector (mitigated by Fibonacci rate limits + IP anomaly detection)
- Cross-domain relay iframe adds complexity (mitigated by host-cookie-binder.js origin verification)

**Alternatives Considered:**
- Auth0: Full-featured but expensive at scale ($23/1K MAU)
- Keycloak: Self-hosted but heavy operational burden
- Custom JWT: Reinventing security primitives; Firebase is battle-tested
- Clerk: Modern DX but SaaS dependency conflicts with sovereignty

## References
- ADR-003: httpOnly Cookies Only
- security/host-cookie-binder.js: __Host- prefix enforcement
- services/auth-session-server.js: Firebase ID token validation
- ADR-006: Zero Trust Security
