# Incident Playbook: Database Connection Pool Exhaustion

**Severity:** P1 (Critical)
**Response Time:** <3 minutes
**Resolution Time:** <15 minutes

---

## Alert: PostgreSQL Connection Pool Full

Services cannot acquire database connections; all queries time out with "connection pool exhausted"

---

## Initial Triage (First 2 minutes)

### Step 1: Confirm Pool Exhaustion

```bash
# SSH to Postgres pod
kubectl exec -it pod/postgres-0 -- bash

# Check connection count
psql -U heady_user -d heady_db -c \
  "SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;"

# Expected output:
# datname  | usename      | count
# ─────────┼──────────────┼───────
# heady_db | heady_user   |   98
# postgres | postgres     |    1

# If heady_db connection count ≥ 100 (max_connections): POOL FULL

# Check pool size
psql -U postgres -d postgres -c "SHOW max_connections;"
# Current: 100 connections max
```

### Step 2: Identify Connection Sources

```bash
# See which processes holding connections
psql -U heady_user -d heady_db -c \
  "SELECT query, state, application_name, usename, client_addr
   FROM pg_stat_activity
   ORDER BY state, query_start DESC;"

# Look for:
# - idle: Connections sitting idle (can be terminated)
# - active: Currently running query
# - idle in transaction: Connection holding transaction open (BAD)

# Example output:
# query                           | state  | application_name | usename     | client_addr
# ────────────────────────────────┼────────┼──────────────────┼─────────────┼─────────────
# <command>                        | idle   | heady-brain      | heady_user  | 10.0.2.1
# SELECT * FROM users WHERE...    | active | api-gateway      | heady_user  | 10.0.2.5
# <idle in transaction>            | idle   | heady-embed      | heady_user  | 10.0.2.3
```

### Step 3: Check Blocking Queries

```bash
# Find long-running queries holding locks
psql -U heady_user -d heady_db -c \
  "SELECT pid, query, state_change, query_start
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY query_start ASC
   LIMIT 10;"

# Any query running for >10 minutes?
# Or waiting on lock?
```

---

## Immediate Resolution (Minute 3)

### Option 1: Terminate Idle Connections (Fast)

```bash
psql -U heady_user -d heady_db -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < now() - INTERVAL '5 minutes'
   AND application_name NOT IN ('Grafana', 'PgBouncer');"

# Result: Terminates idle connections > 5 minutes old
# Immediate effect: frees up connection slots

# Verify
psql -U heady_user -d heady_db -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = 'heady_db';"
# Should drop from 98 to ~50
```

### Option 2: Kill Long-Running Query (If Blocking)

```bash
# Identify blocking query
psql -U heady_user -d heady_db -c \
  "SELECT pid, query, query_start
   FROM pg_stat_activity
   WHERE state != 'idle'
   AND query_start < now() - INTERVAL '5 minutes'
   LIMIT 1;"

# Kill if safe (not in active transaction)
PID=12345
psql -U heady_user -d heady_db -c "SELECT pg_terminate_backend($PID);"

# Service will retry and acquire new connection
```

### Option 3: Restart PgBouncer Connection Pooler

```bash
# PgBouncer might have stale state
kubectl rollout restart deployment/pgbouncer

# Wait for restart
kubectl rollout status deployment/pgbouncer

# PgBouncer now has fresh connections to postgres
```

---

## Monitor Recovery (Minutes 5-10)

```bash
# Check connection count normalizing
psql -U heady_user -d heady_db -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = 'heady_db';" \
  --watch=5  # Refresh every 5 seconds

# Should see: 98 → 75 → 45 → 30 → normal baseline

# Check service health
for svc in heady-brain heady-embed heady-memory auth-session-server; do
  echo "=== $svc ==="
  curl http://$svc:8000/health | jq .
done

# All should return healthy: "status": "healthy"
```

---

## Root Cause Analysis (Minute 10+)

### Investigate Why Pool Exhausted

```bash
# Pattern 1: Connection Leak in Application
# Symptoms: Connection count grows steadily over hours
# Fix: Close connections properly; use connection pooling

# Check for idle-in-transaction
psql -U heady_user -d heady_db -c \
  "SELECT pid, application_name, backend_start, query_start
   FROM pg_stat_activity
   WHERE state = 'idle in transaction';"

# If any: application holding transaction open
# Fix: Ensure transactions committed/rolled back in finally blocks

# Pattern 2: Sudden Spike (Traffic Burst)
# Symptoms: Connection spike during peak hours
# Check metrics: Did traffic increase 10x?
# Fix: Scale up PgBouncer or postgres connections

# Pattern 3: Slow Queries
# Symptoms: Queries taking >30s, blocking connections
# Check slow query log:
psql -U heady_user -d heady_db -c \
  "SELECT query, calls, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 10;"

# If any query > 1000ms: missing index or bad query
# Fix: Add index or optimize query

# Pattern 4: Background Task Accumulation
# Symptoms: Spike during maintenance window
# Example: Periodic task spawning 50 connections
# Fix: Serialize background tasks or increase pool
```

---

## Permanent Fix (After Incident)

### Increase Connection Pool

```bash
# Edit PgBouncer configuration
kubectl edit configmap pgbouncer-config

# Update:
# max_client_conn = 100 → 150 (or higher if needed)
# max_db_connections = 50 → 75

# Apply changes
kubectl apply -f k8s/pgbouncer-config.yaml

# Restart PgBouncer
kubectl rollout restart deployment/pgbouncer

# Verify new limits
psql -U postgres -d postgres -c "SHOW max_connections;" # Via psql
kubectl logs pod/pgbouncer-xyz | grep "max_client_conn"
```

### Increase PostgreSQL Max Connections

```bash
# Edit Postgres config
kubectl edit statefulset postgres

# In spec.template.spec.containers[].env, add:
# - name: POSTGRES_INIT_ARGS
#   value: "-c max_connections=200"

# Or edit postgresql.conf in Postgres config map:
# max_connections = 100 → 200

# Restart postgres
kubectl rollout restart statefulset postgres

# Verify
psql -U postgres -d postgres -c "SHOW max_connections;"
# Result: 200
```

### Add Connection Timeout to Services

```typescript
// services/heady-brain/src/db.ts
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'heady_db',
  max: 20, // Max connections per service instance
  idleTimeoutMillis: 30000, // Close idle after 30s
  connectionTimeoutMillis: 5000, // Timeout acquiring connection after 5s
  query_timeout: 30000, // Query timeout 30s
});
```

### Monitor Connection Health

```yaml
# PrometheusRule: Alert if connections approaching limit
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: postgres-connection-alert
spec:
  groups:
    - name: postgres.rules
      rules:
        - alert: PostgresConnectionPoolNearFull
          expr: pg_stat_activity_count >= 80  # 80% of 100
          for: 2m
          annotations:
            summary: "Postgres connections approaching limit ({{ $value }}/100)"
            runbook: "docs/playbooks/database-connection-pool.md"

        - alert: PostgresIdleTransaction
          expr: pg_stat_activity_idle_in_transaction_seconds > 300
          annotations:
            summary: "Long-running idle transaction ({{ $value }}s)"
```

---

## Prevention

### Connection Pooling Best Practices

```typescript
// DO: Use connection pool
const pool = new Pool({ max: 20 });
const client = await pool.connect();
try {
  await client.query('...');
} finally {
  client.release(); // Always release
}

// DON'T: Create new connection per query
const client = new Client();
await client.connect();
await client.query('...');
await client.end(); // Wasteful
```

### Slow Query Prevention

```sql
-- Find slow queries regularly
SELECT query, calls, mean_time FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC LIMIT 10;

-- Add indexes for slow queries
CREATE INDEX embeddings_domain_idx ON embeddings(domain_id);
CREATE INDEX embeddings_created_idx ON embeddings(created_at DESC);

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM embeddings WHERE domain_id = 'x';
```

---

## Escalation Path

If issue persists >10 minutes:

```
1. Page on-call database engineer
2. Check if data corruption or critical service affected
3. Possible need for: hard restart, data recovery, temporary traffic routing

Escalation contact:
- Database lead: @name in Slack
- Infrastructure: @name in Slack
- Emergency: PagerDuty
```

