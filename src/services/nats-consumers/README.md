# @heady/nats-consumers

NATS JetStream consumer groups for event-driven processing across the Heady platform with φ-scaled backpressure, dead letter queues, and semantic deduplication.

## Overview

- **Port:** 4040
- **Health:** `GET /health`
- **Purpose:** Consumes events from NATS JetStream streams and routes them to processing handlers

## Streams

| Stream | Purpose |
|---|---|
| `HEADY_VECTORS` | Vector embedding events (store, update, delete) |
| `HEADY_EVENTS` | System events (user actions, service events) |
| `HEADY_TASKS` | Task lifecycle events (created, assigned, completed) |
| `HEADY_SWARM` | Swarm coordination messages (consensus, routing) |
| `HEADY_HEALTH` | Health check events from all services |

## Features

- Consumer group pattern with durable subscribers
- φ-scaled backpressure (FIB-indexed thresholds)
- Dead letter queue after max delivery attempts
- Semantic deduplication via message fingerprinting
- Structured JSON logging with correlation IDs
- Graceful shutdown with inflight message drain

## Configuration

| Variable | Default | Description |
|---|---|---|
| `NATS_URL` | `nats://nats:4222` | NATS server URL |
| `PORT` | `4040` | Health endpoint port |

## Usage

```bash
docker compose up nats-consumers
```

© 2026 HeadySystems Inc. — Eric Haywood, Founder
