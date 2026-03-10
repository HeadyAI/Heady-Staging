# ADR-004: Firebase Auth for Identity

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Heady needs multi-provider authentication (Google OAuth, Email/Password, Anonymous) across 9 domains with cross-domain session propagation.

## Decision

Use Firebase Auth for identity provider management with a custom session server (auth-session-server) that converts Firebase ID tokens into httpOnly `__Host-heady_session` cookies. Cross-domain propagation via relay iframe + postMessage on `.headysystems.com`.

## Consequences

**Positive:** Free tier handles 10K MAU, multi-provider out of box, Anonymous auth for onboarding  
**Negative:** Google dependency, token refresh complexity, cross-domain cookies require SameSite=None  
**Mitigations:** Session server decouples from Firebase tokens, __Host- prefix prevents subdomain override, IP+UA binding prevents replay
