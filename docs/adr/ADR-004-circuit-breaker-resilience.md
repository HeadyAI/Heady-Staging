# ADR-004: Circuit Breaker with Phi-Exponential Backoff

## Status
Accepted

## Date
2025-12-10

## Context
With 60+ microservices communicating through HTTP and event-based protocols, partial failures are inevitable. A single unresponsive service can cascade through dependency chains, creating widespread outages.

## Decision
We implement a circuit breaker pattern with three states (CLOSED, OPEN, HALF_OPEN) and phi-exponential backoff for recovery probing. The circuit breaker opens after fib(5) = 5 consecutive failures, enters HALF_OPEN state after a phi-backoff delay, and returns to CLOSED after fib(3) = 2 successful probe requests. Backoff timing follows the phi geometric series: 1000ms, 1618ms, 2618ms, 4236ms, 6854ms, 11090ms, with +/-38.2% jitter.

Bulkhead isolation limits concurrent requests per service to Fibonacci-derived maximums (fib(8) = 21 for Hot pool, fib(7) = 13 for Warm, fib(6) = 8 for Cold).

## Consequences

### Benefits
Circuit breakers prevent cascade failures. Phi-exponential backoff provides mathematically smooth recovery probing. Bulkhead isolation ensures failures in one service cannot exhaust resources needed by others.

### Risks
Circuit breakers may prevent legitimate requests during transient issues. The fib(5) failure threshold provides resilience against temporary glitches while still responding quickly to genuine outages.

### Related ADRs
ADR-002 (phi-math), ADR-003 (embedding router), ADR-006 (self-healing)
