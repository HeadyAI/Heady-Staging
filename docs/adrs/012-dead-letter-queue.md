# ADR-012: Dead Letter Queue with Quarantine

## Status
Accepted

## Context
Failed messages need structured handling rather than silent dropping.

## Decision
- Maximum 5 retry attempts with φ-backoff
- After max retries: quarantine (separate from DLQ)
- DLQ capacity: 1597 messages
- Quarantine capacity: 377 messages
- Retention: 89 days
- Alert threshold: 21 items in DLQ
- Analytics: by-queue and by-error breakdowns

## Consequences
- No silent message loss
- Quarantine separates permanently-failed from retryable
- Alerting catches systemic issues
- Analytics enable root cause analysis
