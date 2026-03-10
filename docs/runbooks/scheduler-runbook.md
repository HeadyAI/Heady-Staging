# Scheduler Runbook

**Service:** scheduler | **Port:** 3363

## Health Check
```bash
curl http://localhost:3363/health
```

## Common Issues

### 1. Missed Schedules
**Symptom:** Jobs not running at expected time
**Cause:** Service restart lost in-memory schedules
**Resolution:**
1. Check if service was restarted (schedules are in-memory)
2. Persistent schedules require Redis backing (production)
3. Re-create missed schedules via API

### 2. Overlapping Executions
**Symptom:** Same job running multiple times
**Resolution:**
1. Check job lock mechanism
2. Ensure job IDs are unique
3. Review fib(10) × 1000 = 55 000ms minimum interval between same-job executions
