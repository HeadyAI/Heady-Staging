# ADR 001: Architecture Overview & Phi-Scaling Rationale

**Date:** 2026-10-24
**Status:** Accepted

## Context
The Heady™ platform is built to operate under the principles of Sacred Geometry, with strict adherence to golden ratio (φ) scaling, concurrency across execution models, and distributed microservices architecture. There are roughly 50 targeted microservices, running in varied cloud/hybrid environments.

## Decision
We have decided to formalize the architecture such that:
1. **Phi Constants Mandatory:** Magic numbers are explicitly forbidden. Retries, limits, timeout delays, sizing intervals, and concurrency bounds are strictly derived from the Golden Ratio ($PHI \approx 1.618$) or the Fibonacci sequence (`1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233...`).
2. **Concurrent Execution:** True parallel and async task execution across NATS. Tasks have equal status, stripping away priority queuing methodologies in favor of distributed CSL-gated weighting metrics.
3. **Session Cookies Instead of Tokens in Storage:** Security rules dictate complete removal of `localStorage` tokens. Session handling must enforce `httpOnly`, Cross-Domain propagation via the Relay IFrame, and prefixing with `__Host-` on production to lock down cookie exposure.
4. **WebSocket/Real-Time Syncing:** Websocket frame processing must constantly re-validate tokens, failing-closed immediately on invalid tokens, and employing phi-scaled exponential backoff for broadcast and reconnection attempts.

## Consequences
- **Positive:** Improved architectural consistency rooted in biological structure emulation; significant resilience in asynchronous communication patterns; hardened security footprint preventing XSS-driven token exfiltration.
- **Negative:** Increased cognitive load for new developers to conceptualize timeout structures based on Fibonacci and Phi math; higher latency requirements to establish cross-domain Relay iframe setups.
