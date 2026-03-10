# ADR-002: φ-Scaled Constants — Sacred Geometry Foundation

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Software systems accumulate magic numbers — arbitrary values like `timeout: 5000`, `maxRetries: 3`, `cacheSize: 100`, `threshold: 0.85`. These values have no mathematical basis, drift across services, and create invisible coupling when different services use different arbitrary values for the same concept.

## Decision

Replace ALL arbitrary constants with values derived from the golden ratio (φ = 1.618033988749895) and the Fibonacci sequence [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987]. Every timeout, cache size, threshold, retry count, pool size, and interval in the Heady platform is derived from φ-math.

**Key derivations:**
- Timeouts: φ^n × 1000ms (1618ms, 2618ms, 4236ms, 6854ms)
- Cache sizes: Fibonacci numbers (34, 55, 89, 144, 233, 377, 987)
- Thresholds: 1 - ψ^level × 0.5 (0.500, 0.691, 0.809, 0.882, 0.927)
- Rate limits: Fibonacci-tiered (34 anon, 89 auth, 233 enterprise)
- Backoff: φ-exponential with ±ψ² jitter
- Feature rollout: φ-scaled percentages (6.18%, 38.2%, 61.8%, 100%)

## Consequences

**Positive:**
- Self-documenting: seeing `FIB[9]` immediately conveys "34, a Fibonacci number" instead of wondering why it's 34
- Mathematically harmonious: φ-scaled intervals prevent thundering herd (unlike round numbers)
- Consistent across services: all services use the same @heady/phi-math-foundation package
- Patent-protected: Sacred Geometry orchestration framework covered by provisional patents

**Negative:**
- Learning curve: new developers must understand φ-math foundation
- Slightly unusual values: `34 req/min` instead of `30 req/min` may confuse external users
- Debugging: need to know `FIB[9]=34` to interpret configs

**Mitigations:**
- @heady/phi-math-foundation package with comprehensive README and JSDoc
- Developer onboarding guide explains Sacred Geometry foundation
- Constants are named, not raw numbers: `FIB[9]` not `34`
