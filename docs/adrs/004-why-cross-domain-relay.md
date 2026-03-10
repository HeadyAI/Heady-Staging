# ADR-004: Why Cross-Domain Auth Relay over Shared Cookies

## Status
Accepted (2026-03)

## Context
The Heady platform spans 9 domains. Users must navigate between them with a seamless authenticated experience.

### Options Considered
1. **Shared cookies with common parent domain** — Not possible; domains span .com, .org, and different TLDs
2. **OAuth2 token in URL fragment** — Security risk (tokens in browser history, logs)
3. **Cross-domain auth relay with one-time codes** — Chosen approach
4. **Central SSO with iframe bridge** — Supplementary approach (combined with #3)

## Decision
Use one-time relay codes + hidden iframe bridge for cross-domain session propagation.

## Rationale
- TLD diversity prevents cookie sharing
- One-time codes prevent replay attacks (consumed on first use)
- Relay code TTL is φ-derived (11 090ms) — short enough to limit exposure
- Hidden iframe on auth.headysystems.com provides real-time session status via postMessage
- postMessage origin validation uses canonical domain whitelist
- All relay codes are cryptographically random (21 bytes = fib(8))

## Consequences
- Slight navigation delay (~200ms) for cross-domain auth handoff
- Requires auth.headysystems.com iframe to be loadable from all domains
- CSP must allow `frame-src https://auth.headysystems.com`
