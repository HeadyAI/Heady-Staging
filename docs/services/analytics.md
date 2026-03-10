# Analytics Service

**Port:** 3362 | **Pool:** Cold | **Domain:** analytics.headysystems.com

## Overview
Event tracking, metrics collection, and reporting. Runs in the Cold pool — optimized for throughput over latency.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events` | Record analytics event |
| `GET` | `/analytics/summary` | Query summary metrics |
| `GET` | `/analytics/events` | Query raw events |
| `GET` | `/health` | Health check |

## Event Schema
```json
{
  "event": "pipeline_complete",
  "properties": {
    "duration_ms": 4236,
    "nodes_used": 5,
    "pool": "hot"
  },
  "userId": "user_123",
  "ts": "2026-03-10T14:00:00.000Z"
}
```

## Batch Processing
Events are buffered and flushed every PHI_TIMING.PHI_6 = 17 944ms for efficiency.
Buffer size: fib(12) = 144 events maximum.
