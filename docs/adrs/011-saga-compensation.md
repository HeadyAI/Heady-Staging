# ADR-011: Saga Pattern for Distributed Transactions

## Status
Accepted

## Context
Multi-service operations (e.g., create subscription + provision resources + notify user) need atomicity across service boundaries.

## Decision
- Saga coordinator orchestrates multi-step transactions
- Each step has an action and a compensation (undo)
- Maximum 21 steps per saga (Fibonacci)
- φ-backoff retry on step failure (up to 5 attempts)
- Compensation runs in reverse order on failure
- Dead letter queue for compensation failures

## Consequences
- Eventual consistency across services
- Automatic rollback on any step failure
- Clear compensation path for debugging
- Maximum transaction complexity is bounded
