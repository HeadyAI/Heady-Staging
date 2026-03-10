# @heady/scheduler-service

Cron-equivalent job scheduler with φ-scaled intervals, phi-backoff retries, and circuit breakers for the Heady platform.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /jobs | List all jobs and states |
| GET | /jobs/:jobId | Get job state |
| POST | /jobs/:jobId/trigger | Manually trigger a job |
| GET | /health | Health check |

## Built-in Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| healthCheckAll | 21s (FIB[8] × 1000) | Check all service health endpoints |
| metricsRollup | 144min (FIB[12] × 60000) | Trigger analytics metrics rollup |
| sessionCleanup | 55min (FIB[10] × 60000) | Clean up expired sessions |
| vectorIndexOptimize | 377min (FIB[14] × 60000) | Optimize vector search indexes |

## Job Types

- **interval** — recurring at a fixed φ-scaled interval
- **cron** — standard 5-field cron expression
- **oneshot** — runs once then stops

## Retry & Circuit Breaker

- Max retries: 5 (FIB[5]) with phi-backoff (1s × PHI^attempt ± PSI² jitter)
- Circuit breaker opens after 8 (FIB[6]) consecutive failures
- Half-open probe after ~16.18s (PHI × 10s)
- Successful probe closes the circuit

## Job State

Each job tracks:
- `lastRun` — last execution timestamp
- `nextRun` — next scheduled execution
- `runCount` — total executions
- `failureCount` — total failures
- `consecutiveFailures` — current failure streak
- `status` — idle, running, circuit-open, circuit-half-open

## Docker

```bash
docker build -t heady/scheduler-service .
docker run -p 3384:3384 --env-file .env heady/scheduler-service
```
