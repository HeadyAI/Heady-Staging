# ADR-006: Self-Healing Lifecycle with Semantic Drift Detection

## Status
Accepted

## Date
2026-01-05

## Context
A system with 60+ microservices and 30+ AI nodes will experience component failures, configuration drift, and behavioral changes over time. Manual monitoring cannot scale.

## Decision
We implement a seven-stage self-healing lifecycle: Monitor, Detect (drift when cosine similarity drops below phiThreshold(2) = 0.809), Alert, Diagnose, Heal, Verify, and Learn. All healing actions must pass through HeadyCheck before execution. Three healing cycles for the same component triggers architectural review.

## Consequences

### Benefits
Automated detection catches degradation that humans would miss. The seven-stage pipeline ensures systematic diagnosis before remediation. Monte Carlo simulation of healing strategies reduces risk.

### Risks
Automated healing could mask deeper architectural issues. We mitigate through recurring drift escalation.

### Related ADRs
ADR-004 (circuit breaker), ADR-005 (Sacred Geometry)
