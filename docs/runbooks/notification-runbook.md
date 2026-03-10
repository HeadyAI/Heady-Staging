# Notification Runbook

**Service:** notification | **Port:** 3361

## Health Check
```bash
curl http://localhost:3361/health
```

## Common Issues

### 1. SSE Connection Drops
**Symptom:** Clients lose event stream
**Cause:** Proxy timeout or network interruption
**Resolution:**
1. Check heartbeat interval: PHI_TIMING.PHI_5 = 11 090ms
2. Ensure Envoy/Nginx SSE timeout > heartbeat interval
3. Clients should auto-reconnect with φ-backoff

### 2. Notification Delivery Delay
**Symptom:** Notifications arriving late
**Cause:** Buffer not flushing or queue backlog
**Resolution:**
1. Check buffer size: max fib(12) = 144
2. Buffer flush interval: PHI_TIMING.PHI_6 = 17 944ms
3. If persistent: restart service to clear buffer
