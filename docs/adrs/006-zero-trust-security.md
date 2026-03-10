# ADR-006: Zero-Trust Security Architecture

## Status
Accepted

## Context
The Heady platform handles sensitive AI operations, user data, and financial transactions. A perimeter-based security model is insufficient.

## Decision
Every request is verified, regardless of origin:
- Session binding with device fingerprint + IP hash
- CSRF tokens for all state-changing operations
- CSP headers on all responses
- Prompt injection scanning on all LLM inputs
- WebSocket authentication via ticket-based system
- SBOM generation and dependency vulnerability scanning
- Autonomy guardrails for agent actions (max 21 autonomous actions before human check-in)
- Rate limiting with φ-backoff on all endpoints

## Consequences
- No implicit trust between services
- Higher latency from verification overhead (mitigated by caching)
- Comprehensive audit trail for all actions
- Defense in depth across all layers
