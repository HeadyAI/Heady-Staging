# ADR-009: CQRS + Event Sourcing for State Management

## Status
Accepted

## Context
Complex state changes across distributed services need reliable tracking, replay, and audit capabilities.

## Decision
- Command and Query paths are separated (CQRS)
- All state changes recorded as immutable events
- Projections built from event streams
- Snapshots every 55 events (Fibonacci)
- Event replay for debugging and recovery

## Consequences
- Complete audit trail of all state changes
- Ability to rebuild state from any point
- Eventually consistent read models
- Storage grows linearly with events (managed by event store cap at 1597)
