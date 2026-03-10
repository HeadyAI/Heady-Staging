# @heady/saga-coordinator

Distributed saga orchestrator for multi-service transactions with φ-scaled timeouts, CSL-gated compensation, and structured audit trails.

## Overview

- **Port:** 4030
- **Health:** `GET /health`
- **Purpose:** Coordinates multi-step distributed transactions across Heady services with automatic compensation on failure

## Features

- Saga orchestration pattern (not choreography)
- CSL-gated step validation before proceeding
- Automatic compensating transactions on failure
- φ-scaled step timeouts (Fibonacci backoff)
- Structured audit trail for every saga execution
- Dead letter handling for failed compensations
- Idempotency keys for retry safety

## Built-in Sagas

| Saga | Steps | Purpose |
|---|---|---|
| `user-onboarding` | 5 | Create user → provision resources → init vectors → send welcome → update analytics |
| `vector-reindex` | 3 | Snapshot → rebuild indexes → swap live |
| `billing-upgrade` | 4 | Validate → update Stripe → provision resources → notify |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PG_CONNECTION_STRING` | — | PostgreSQL connection string (required) |
| `NATS_URL` | `nats://nats:4222` | NATS server URL |
| `PORT` | `4030` | Health endpoint port |

## Usage

```bash
docker compose up saga-coordinator
```

© 2026 HeadySystems Inc. — Eric Haywood, Founder
