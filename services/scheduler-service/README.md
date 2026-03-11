# Scheduler Service

φ-scaled interval scheduler for batch jobs and asynchronous task execution on the HEADY platform.

## Features

- **Fibonacci-Scaled Intervals**: Jobs execute at exponentially-backed Fibonacci intervals (1s, 1s, 2s, 3s, 5s, 8s, 13s, 21s, 34s, 55s, 89s...)
- **φ-Exponential Backoff**: Retry logic using golden ratio exponential decay (1.618³)
- **One-Time Execution**: Schedule jobs for specific timestamps
- **Manual Triggers**: Execute jobs on-demand without automatic scheduling
- **Job Persistence**: PostgreSQL-backed job storage with retry tracking
- **Zero-Trust**: All inputs validated, no magic numbers
- **Structured Logging**: Complete JSON audit trail of all executions

## Architecture

### Scheduler Engine (`src/scheduler/engine.ts`)

Core scheduling system with:
- Fibonacci interval sequence (18 levels from 1s to ~43 minutes)
- φ-exponential backoff for retries (factor: 1.618³ ≈ 4.236)
- Three schedule types: fibonacci, once, manual
- Automatic level progression for Fibonacci jobs
- Job state management in memory with database persistence

### Job Store (`src/scheduler/job-store.ts`)

PostgreSQL persistence layer with:
- ACID-compliant job storage
- Execution record tracking (timestamps, error messages, retry counts)
- Status lifecycle: idle → running → idle/failed/retrying
- Query builders for filtered job retrieval
- Stale job detection (for zombie task cleanup)

### Job Executor (`src/scheduler/executor.ts`)

Execution engine with:
- Timeout enforcement using Promise.race()
- Configurable job handlers (registered at runtime)
- Pre-built handlers: batch-indexing, data-cleanup, health-check, cache-refresh, webhook
- Payload validation (max 10MB)
- Execution result tracking

## Constants (φ-scaled)

- **PHI**: 1.618033988749895 (golden ratio for exponential backoff)
- **FIBONACCI_INTERVALS**: [1s, 1s, 2s, 3s, 5s, 8s, 13s, 21s, 34s, 55s, 89s, 144s, 233s, 377s, 610s, 987s, 1597s, 2584s]
- **MIN_INTERVAL**: 1000ms
- **MAX_INTERVAL**: 2592000000ms (30 days)
- **CHECK_INTERVAL**: 5000ms (background job checker)
- **Backoff Formula**: `timeout * PHI^retryCount`

## API Endpoints

### POST /api/scheduler/jobs
Create a scheduled job.

```json
{
  "name": "Process monthly reports",
  "type": "batch-indexing",
  "payload": {
    "batchSize": 500,
    "targetCollection": "reports-2026-03"
  },
  "schedule": {
    "type": "fibonacci",
    "level": 0
  },
  "maxRetries": 3,
  "timeout": 30000
}
```

Schedule types:
- **fibonacci**: Fibonacci-interval backoff (auto-escalates through levels)
- **once**: Execute at specific timestamp: `{ "type": "once", "timestamp": 1678982400000 }`
- **manual**: On-demand execution only (no automatic scheduling)

### GET /api/scheduler/jobs
List jobs with optional filtering.

```
?status=running&limit=20&offset=0
```

Status values: `idle`, `running`, `retrying`, `failed`, `cancelled`, `completed`

### DELETE /api/scheduler/jobs/:id
Cancel a job and remove future executions.

### POST /api/scheduler/jobs/:id/trigger
Manually trigger immediate execution of a job.

### GET /health
Service health with active job count and total processed.

## Built-In Job Handlers

### batch-indexing
Simulates batch processing with configurable batch size.

```json
{
  "type": "batch-indexing",
  "payload": {
    "batchSize": 1000,
    "targetCollection": "search-index"
  }
}
```

### data-cleanup
Removes stale data older than specified days.

```json
{
  "type": "data-cleanup",
  "payload": {
    "olderThanDays": 90,
    "maxDeleteCount": 10000
  }
}
```

### health-check
Verifies system health (database, cache, queue).

### cache-refresh
Refreshes specified cache keys with TTL.

```json
{
  "type": "cache-refresh",
  "payload": {
    "cacheKeys": ["user:1", "config:app"],
    "ttlSeconds": 3600
  }
}
```

### webhook
Posts job completion to HTTP endpoint.

```json
{
  "type": "webhook",
  "payload": {
    "url": "https://api.example.com/webhooks/job-complete",
    "method": "POST",
    "body": { "jobId": "abc123" }
  }
}
```

## Environment Variables

```
PORT=3370
DB_HOST=localhost
DB_PORT=5432
DB_NAME=heady
DB_USER=heady_user
DB_PASSWORD=heady_password
LOG_LEVEL=info
NODE_ENV=production
```

## Development

```bash
npm install
npm run dev          # Watch mode with tsx
npm run build        # Compile TypeScript
npm start            # Production start
npm test             # Run tests
npm run lint         # Run linter
```

## Execution Flow

1. **Create Job** → INSERT into scheduler_jobs table, status='idle'
2. **Schedule Job** → Calculate next_run_at, start timer based on schedule type
3. **Check Pending** → Background worker detects jobs with past next_run_at
4. **Execute Job** → Run handler with timeout enforcement, status='running'
5. **Handle Result** → Record execution, update status, reschedule if Fibonacci
6. **Retry on Failure** → Increment retry_count, apply φ-exponential backoff, reschedule

## Retry Strategy

For Fibonacci jobs that fail:
1. Increment retry_count (max 3 by default)
2. Calculate backoff: `timeout_ms * PHI^retry_count`
3. Schedule retry at: `now + backoff`
4. If retries exhausted, status='failed'

For one-time jobs:
- Failed execution is recorded but not retried
- Status remains 'failed'

## Production Deployment

Multi-stage Dockerfile builds optimized 300MB images using distroless base.

```bash
docker build -t heady/scheduler-service:latest .
docker run -p 3370:3370 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=<secure_password> \
  heady/scheduler-service:latest
```

## Scaling Considerations

- Each instance maintains independent job timers (no distributed locking)
- For multi-instance deployments, use unique job names or implement job leases
- Database should have indexes on status and next_run_at for efficient polling
- Max concurrent executions limited by executor pool (default: unbounded)

## Performance Characteristics

- Job creation: O(1)
- Job listing: O(n log n) with database indexes
- Scheduling check: O(m) where m = pending jobs (5s interval)
- Execution: O(1) with timeout enforcement
- Memory: ~100KB per scheduled job in engine state

## HEADY Compliance

Adheres to HEADY 8 Unbreakable Laws:
1. φ-scaled constants (Fibonacci intervals, exponential backoff)
2. CSL gates (job state transitions)
3. Zero-trust (all inputs validated, timeouts enforced)
4. Structured JSON logging (all events logged)
5. No magic numbers (all constants defined)
6. Concurrent-equals (async/await throughout)
