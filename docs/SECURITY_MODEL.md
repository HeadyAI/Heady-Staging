# Heady Security Model

## Overview
The Heady platform implements a zero-trust security architecture where every request, action, and data flow is verified, authenticated, and audited. All security parameters derive from φ (golden ratio).

## Architecture Layers

### Layer 1: Edge Security (Cloudflare)
- DDoS protection via Cloudflare WAF
- TLS 1.3 enforcement (HSTS max-age: 137980800s ≈ 3.8 years)
- Rate limiting at edge (Fibonacci-scaled: 55 requests per 233s window)
- Bot detection and challenge pages

### Layer 2: Content Security Policy
- Strict CSP headers on all responses
- Nonce-based script loading (13-byte random nonces)
- No inline scripts or styles without nonce
- Violation reporting to /csp-report endpoint
- Directives: default-src 'none', script-src 'self' 'nonce-{n}' 'strict-dynamic'

### Layer 3: Authentication
- Firebase Auth as identity provider
- Server-side session management via httpOnly cookies
- Cookie: __heady_session (HttpOnly; Secure; SameSite=Strict)
- Session TTL: 1597 seconds (≈26.6 minutes)
- Sliding window refresh within last 377 seconds
- Maximum 21 concurrent sessions per user
- Device fingerprint binding (IP + User-Agent SHA-256)

### Layer 4: CSRF Protection
- 34-byte random CSRF tokens per session
- Timing-safe comparison for token validation
- Tokens bound to session ID
- Required for all state-changing operations

### Layer 5: WebSocket Security
- Ticket-based authentication (tickets expire in 55 seconds)
- Device fingerprint verification on connection
- Heartbeat monitoring (34-second intervals)
- Rate limiting: 21 messages per 55-second window
- Maximum 377 concurrent connections, 5 per user
- Stale connection pruning

### Layer 6: Prompt Injection Defense
- 14 pattern-based detection rules
- Categories: instruction override, role reassignment, template injection, jailbreak, prompt extraction
- CSL-gated severity scoring (CRITICAL/HIGH/MEDIUM)
- Input sanitization with pattern redaction
- Canary token injection and leakage detection
- Maximum input length: 15,970 characters

### Layer 7: Agent Guardrails
- Action categorization: READ, ANALYZE, SUGGEST, CREATE, MODIFY, DELETE, DEPLOY, BILLING, SECURITY
- Risk levels mapped to phiThreshold(0-4)
- Maximum 21 autonomous actions before human check-in
- Human approval required for: MODIFY, DELETE, DEPLOY, BILLING, SECURITY
- CSL-gated trust scoring based on escalation history
- Comprehensive audit log (1597 entries)

### Layer 8: Software Supply Chain
- SBOM generation (CycloneDX 1.5 and SPDX 2.3)
- License compliance: whitelist (MIT, Apache-2.0, BSD, ISC) and blacklist (GPL, AGPL, SSPL)
- Dependency vulnerability tracking
- SHA-256 integrity hashes for all dependencies

## Security Monitoring
- All security events logged with SHA-256 integrity hashes
- CSP violation analytics (by directive, by URI)
- Prompt injection detection analytics (by type, by severity)
- Escalation tracking for agent guardrails
- Real-time alerting via notification service

## Incident Response
- Error codes cover all security domains (AUTH, AGENT, INFRA)
- Automatic escalation for CRITICAL severity
- Compensation sagas for multi-service security events
- Dead letter queue for failed security notifications
