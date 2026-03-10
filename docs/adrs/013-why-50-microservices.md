# ADR-013: Why 50 Microservices

## Status
Accepted

## Context
The Heady platform must support concurrent execution of inference, memory, orchestration, security, monitoring, web, integration, and specialized services. A monolithic architecture creates coupling between domains with fundamentally different scaling, deployment, and failure characteristics.

## Decision
Decompose into ~50 microservices organized by domain function. Each service:
- Owns a single bounded context (DDD)
- Deploys independently on Cloud Run with φ-scaled concurrency (fib(10)=55 per instance)
- Communicates via NATS JetStream for async and gRPC for sync
- Registers in Consul with CSL-tagged health checks
- Has its own circuit breaker with Fibonacci thresholds (fib(11)=89 open / fib(10)=55 half-open / fib(12)=144 close)

Port allocation: 3310–3396, grouped by domain.

## Consequences
**Benefits:**
- Independent scaling: heady-brain can scale to fib(8)=21 instances during inference spikes while heady-midi stays at 1
- Fault isolation: a failure in discord-bot never cascades to heady-memory
- Team autonomy: each service can be owned by a concurrent-equals team
- Technology flexibility: specialized services (heady-midi) can use domain-specific dependencies

**Costs:**
- Operational complexity: 50 services require robust monitoring (solved by heady-health + Prometheus + Grafana)
- Network overhead: inter-service calls add latency (mitigated by gRPC + connection pooling via PgBouncer fib(9)=34 pool size)
- Data consistency: distributed transactions require saga pattern (solved by saga-coordinator.js)

## References
- Sam Newman, "Building Microservices" (O'Reilly)
- Martin Fowler, "Microservices" pattern
- ADR-009: CQRS Event Sourcing
- ADR-011: Saga Compensation
