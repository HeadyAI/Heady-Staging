# Disaster Recovery Plan — HeadySystems Inc.

**Version:** 3.2.2
**Effective:** 2026-03-07
**Owner:** Eric Haywood (eric@headyconnection.org)
**Classification:** Internal — Confidential

---

## φ Quick Reference

```
φ = 1.618033988749895
RTO = fib(8)=21 minutes  (production)
RPO = fib(5)=5 minutes   (production)

Escalation: 5min, 8min, 13min, 21min (Fibonacci)
Decision checkpoints: every fib(n) minutes
```

---

## Disaster Scenarios and Classification

| Scenario | Severity | RTO | RPO |
|----------|----------|-----|-----|
| Single pod failure | Low | <1 min (K8s auto-heal) | 0 (stateless) |
| Single zone failure | Medium | fib(4)=3 min | fib(5)=5 min |
| Database primary failure | High | fib(8)=21 min | fib(5)=5 min |
| Region-wide GCP failure | Critical | fib(9)=34 min | fib(5)=5 min |
| Data corruption | Critical | fib(9)=34 min | fib(5)=5 min |
| Ransomware / security breach | Critical | fib(10)=55 min | fib(5)=5 min |
| Complete multi-region failure | Catastrophic | fib(11)=89 min | fib(6)=8 min |

---

## Recovery Tiers

### Tier 1: Automated Recovery (0-fib(4)=3 min)
Kubernetes and GCP handle automatically:
- Pod crashes → K8s restarts within fib(4)=3 × readiness probe interval = 9s
- Cloud Run instance failure → GCP restarts within fib(4)=3 × health check = 24s
- Redis primary failure → Memorystore HA failover ~fib(8)=21s
- Load balancer failover → Cloud Load Balancing handles instantly

### Tier 2: On-Call Recovery (fib(4)=3 - fib(8)=21 min)
On-call engineer executes runbooks:
- See: `runbooks/redis-failure.md`
- See: `runbooks/database-failover.md`
- See: `runbooks/agent-deadlock.md`

### Tier 3: Full DR (fib(8)=21 - fib(9)=34 min)
Leadership-approved DR activation.

---

## DR Procedures

### Procedure 1: Single Zone Failure

```bash
# 1. Verify zone failure
gcloud compute zones describe us-central1-a --format="get(status)"

# 2. Check K8s nodes in affected zone
kubectl get nodes -l topology.kubernetes.io/zone=us-central1-a

# 3. Cordon affected nodes
kubectl cordon $(kubectl get nodes -l topology.kubernetes.io/zone=us-central1-a -o name)

# 4. Force pod rescheduling (drain fib(4)=3 nodes at a time)
kubectl drain --ignore-daemonsets --delete-emptydir-data \
  $(kubectl get nodes -l topology.kubernetes.io/zone=us-central1-a -o name | head -3)

# 5. Verify pods reschedule to healthy zones (should complete in fib(8)=21s)
kubectl get pods -n heady-system -o wide --watch

# 6. Confirm HPA maintains fib(n) minimum replicas
kubectl get hpa -n heady-system
```

**Expected timeline:**
- T+0: Zone failure detected
- T+fib(4)=3min: On-call confirms scope
- T+fib(6)=8min: Pods rescheduled to healthy zones
- T+fib(7)=13min: Full traffic restored

---

### Procedure 2: Database Failover

See: `runbooks/database-failover.md` for detailed steps.

**Summary:**
- GCP REGIONAL HA auto-fails over in ~fib(8)=21 seconds
- Manual promotion if needed: `gcloud sql instances promote-replica`
- RPO: fib(5)=5 min via PITR
- RTO: fib(8)=21 min total

---

### Procedure 3: Region-Wide Failure

**Prerequisites:** Pre-provisioned standby in us-east1 (secondary region).

```bash
# 1. Declare DR — get approval from CEO (Eric Haywood)
# DR activation requires: eric@headyconnection.org approval

# 2. Point DNS to secondary region
# Update Cloudflare DNS to us-east1 load balancer IP
# TTL was set to fib(5)=5 × 60s = 300s for fast failover

# 3. Activate secondary Cloud SQL
gcloud sql instances promote-replica heady-postgres-production-replica-0 \
  --project=heady-systems

# 4. Switch Cloud Run traffic to us-east1 services
gcloud run services update-traffic heady-brain \
  --to-latest \
  --region=us-east1

gcloud run services update-traffic heady-conductor \
  --to-latest \
  --region=us-east1

gcloud run services update-traffic heady-mcp \
  --to-latest \
  --region=us-east1

gcloud run services update-traffic heady-web \
  --to-latest \
  --region=us-east1

# 5. Update Redis URL to us-east1 Memorystore
gcloud secrets versions add redis-url \
  --data-file=<(echo -n "redis://:PASSWORD@US-EAST1-REDIS-IP:6379")

# 6. Verify health in secondary region
curl https://headyme.com/health/deep | jq '.status'

# 7. Monitor error budget impact
# Update SLO dashboards with DR start time
```

**Expected timeline:**
- T+0: Region failure confirmed
- T+fib(5)=5min: DR decision made
- T+fib(7)=13min: DNS propagated (Cloudflare: fib(5)=5 × 60s TTL)
- T+fib(8)=21min: Secondary region fully serving traffic
- T+fib(9)=34min: All systems verified healthy

---

### Procedure 4: Data Corruption

```bash
# 1. Identify corruption timestamp
# Check application logs for first error
kubectl logs -n heady-system -l app.kubernetes.io/name=heady-brain \
  --since=1h | grep -E "data_error|corrupt|invalid_state"

# 2. Stop writes to affected tables
# Set READ_ONLY mode to prevent further corruption
kubectl patch configmap heady-config -n heady-system \
  --type merge \
  -p '{"data":{"DB_READ_ONLY":"true","WRITES_DISABLED":"true"}}'

# 3. Initiate PITR (RPO = fib(5)=5 min)
# Recover to timestamp just before corruption
RECOVERY_TIME="YYYY-MM-DDTHH:MM:SSZ"  # Set from log analysis

gcloud sql instances clone heady-postgres-production \
  heady-postgres-recovery-$(date +%s) \
  --point-in-time=$RECOVERY_TIME

# 4. Validate recovered data
gcloud sql connect heady-postgres-recovery-TIMESTAMP \
  --user=heady_prod \
  --database=heady_production

# 5. Export affected tables and import to production
# ... see database-failover.md Scenario C for full steps ...

# 6. Re-enable writes
kubectl patch configmap heady-config -n heady-system \
  --type merge \
  -p '{"data":{"DB_READ_ONLY":"false","WRITES_DISABLED":"false"}}'
```

---

## Communication Templates

### Internal (Slack #incidents)

```
:rotating_light: DR ACTIVATED — <scenario>
Time: <timestamp>
Severity: <P0/DR-Level>
Estimated RTO: fib(8)=21 minutes
RPO at activation: fib(5)=5 minutes
Incident Commander: @eric
Status updates every fib(5)=5 minutes
```

### Customer Communication (for P0 > fib(7)=13 min)

```
Subject: HeadySystems Service Update — <date>

We are experiencing a service disruption affecting <scope>.
Our team identified the issue at <time> and is actively working to restore service.

Estimated resolution: <time>
Impact: <description>

We will provide updates every fib(7)=13 minutes.
Enterprise customers may contact: eric@headyconnection.org

We apologize for the interruption.
— Eric Haywood, HeadySystems Inc.
```

---

## DR Checklist

### Pre-DR (Monthly)
- [ ] Test backup restore (see backup-policy.yaml schedule)
- [ ] Verify secondary region Cloud Run services are deployed
- [ ] Confirm Cloudflare DNS TTL is fib(5)=5 × 60s = 300s (fast failover)
- [ ] Test pg_logical replication lag (should be < φ^1=1618ms)
- [ ] Rotate DR credentials (fib(8)=21 day review cycle)
- [ ] Review and update this DR plan

### During DR
- [ ] Time logged: DR start
- [ ] CEO approval obtained (if full DR)
- [ ] Customer communication sent (if > fib(7)=13 min outage)
- [ ] SLO error budget impact documented
- [ ] All φ-timers adhered to during escalation
- [ ] Incident Commander designated

### Post-DR
- [ ] Post-mortem scheduled (within fib(5)=5 business days)
- [ ] Primary region restored and tested
- [ ] Failback procedure executed
- [ ] Error budget updated
- [ ] DR plan updated with lessons learned
- [ ] Backup/replication configuration reviewed

---

## Key Contacts

| Role | Name | Contact | Escalation Time |
|------|------|---------|-----------------|
| Primary On-Call | On-Call Rotation | PagerDuty | T+0 |
| Incident Commander | Eric Haywood | eric@headyconnection.org | T+fib(5)=5m |
| CEO / Founder | Eric Haywood | eric@headyconnection.org | T+fib(7)=13m |
| GCP Support | Enterprise Support | console.cloud.google.com/support | T+fib(6)=8m |
| Cloudflare | Enterprise Support | cloudflare.com/support | T+fib(6)=8m if DNS issue |

---

## φ Timeline Summary

| Time | Action |
|------|--------|
| T+0 | Incident detected / paged |
| T+fib(5)=5m | Scope confirmed, playbook selected |
| T+fib(6)=8m | Failover initiated (if needed) |
| T+fib(7)=13m | DNS/routing updated |
| T+fib(8)=21m | **RTO target: full restoration** |
| T+fib(9)=34m | Secondary verification complete |
| T+fib(10)=55m | Customer communication (if sustained) |
| T+fib(11)=89m | Post-mortem preparation begins |
