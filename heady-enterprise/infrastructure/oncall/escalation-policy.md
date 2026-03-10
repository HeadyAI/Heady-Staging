# Escalation Policy — HeadySystems Inc.

**Version:** 3.2.2
**Contact:** eric@headyconnection.org

---

## φ Escalation Timers

All escalation timers use the Fibonacci sequence:
```
T+fib(5)=5  min: Secondary on-call
T+fib(6)=8  min: Phone call escalation
T+fib(7)=13 min: Engineering lead
T+fib(8)=21 min: Executive escalation
T+fib(9)=34 min: Major incident declared
T+fib(10)=55 min: Customer communications
```

The use of Fibonacci timers ensures escalation windows grow proportionally (each step is the sum of the previous two), preventing both premature escalation and excessive delay.

---

## Severity Levels

### P0 — Platform Down
- **Definition:** Complete platform outage OR SLO exceeded beyond error budget
- **Response time:** Immediate (< fib(2)=1 minute acknowledgment)
- **Impact:** All users affected, revenue impact confirmed
- **Owner:** CEO/Founder (Eric Haywood)
- **Examples:**
  - All 9 domains returning 5xx
  - Redis fully down > fib(8)=21s
  - Database connection failure > fib(5)=5 min
  - Certificate expired on primary domain

### P1 — Service Degraded
- **Definition:** Partial outage, significant performance degradation, SLO burning at >fib(6)=8× rate
- **Response time:** < fib(5)=5 minutes acknowledgment
- **Impact:** Subset of users affected, Enterprise SLA at risk
- **Owner:** On-call engineer
- **Examples:**
  - heady-brain latency p99 > φ^5=11090ms
  - Rate limiter saturation > 85.4% (critical threshold)
  - Agent deadlocks not auto-resolving
  - MCP service down, agents in no-tool mode

### P2 — Warning
- **Definition:** Performance warning, SLO burning at >fib(4)=3× but not immediately critical
- **Response time:** < fib(7)=13 minutes acknowledgment
- **Impact:** Performance degraded, no immediate user impact
- **Owner:** On-call engineer
- **Examples:**
  - CPU/memory > 76.4% (caution threshold) sustained for fib(8)=21 min
  - Redis hit rate < 38.2% (below nominal threshold)
  - Certificate expiring within fib(9)=34 days
  - Disk usage > 61.8% (1/φ — warning threshold)

### P3 — Informational
- **Definition:** Trend anomaly, upcoming capacity issue
- **Response time:** Next business day
- **Impact:** No immediate user impact
- **Owner:** On-call engineer (during business hours)
- **Examples:**
  - fib(10)=55-day error budget trend
  - Upcoming certificate rotation (fib(11)=89 days)
  - Replica lag growing

---

## Escalation Tiers

### Tier 1: On-Call Engineer
- **Contact:** PagerDuty → Slack → Phone
- **SLA:** Acknowledge within fib(2)=1 minute (P0), fib(5)=5 min (P1)
- **Authority:** Can restart pods, flush caches, scale services
- **Tools:** kubectl, redis-cli, gcloud, runbooks

### Tier 2: Infrastructure Lead / Secondary On-Call
- **Escalation trigger:** No acknowledgment after fib(5)=5 min (P0) or fib(6)=8 min (P1)
- **Contact:** PagerDuty + Phone
- **Authority:** Can modify infrastructure, disable services, activate DR plan
- **Additional access:** Terraform state, GCP console, database direct access

### Tier 3: Engineering Director
- **Escalation trigger:** Not resolved after fib(7)=13 min
- **Contact:** Phone
- **Authority:** Can authorize customer notifications, activate business continuity plan
- **Focus:** Business impact assessment, stakeholder communication

### Tier 4: Executive Escalation
- **Escalation trigger:** Not resolved after fib(8)=21 min
- **Contact:** Phone + personal cell
- **Authority:** Unlimited — can authorize emergency spending, vendor escalation, customer credits
- **Contact:** Eric Haywood, eric@headyconnection.org

---

## On-Call Responsibilities

### During Shift (fib(8)=21 days = 3 weeks)

1. **Response:** Acknowledge all P0/P1 alerts within SLA
2. **Communication:** Post in #incidents Slack channel within fib(2)=1 minute of acknowledgment
3. **Escalation:** Follow Fibonacci timer ladder without skipping steps (unless P0)
4. **Documentation:** Write incident notes in real-time
5. **Handoff:** fib(6)=8 hour overlap with incoming on-call at shift change

### Incident Communication Template

```
:red_circle: P0 INCIDENT: <brief description>
Status: INVESTIGATING
Impact: <user-facing impact>
ETA: Unknown (will update in fib(5)=5 min)
Incident Commander: @<name>
```

```
:large_green_circle: P0 RESOLVED: <brief description>
Duration: <X> minutes
Impact: <users/requests affected>
Root cause: <brief>
Follow-up: <link to post-mortem>
```

---

## φ-Based Decision Matrix

| Condition | Action |
|-----------|--------|
| Error rate < 0.618% (1/φ × 1%) | Monitor |
| Error rate 0.618%—0.764% | P2 alert |
| Error rate 0.764%—0.854% | P1 alert |
| Error rate > 0.854% | P0 alert |
| CPU < 61.8% (1/φ) | Healthy |
| CPU 61.8%—76.4% | Warning → scale |
| CPU 76.4%—85.4% | Critical → scale immediately |
| CPU > 91.0% | P1 → emergency scale |
| Latency p99 < φ^3=4236ms | Healthy |
| Latency p99 > φ^4=6854ms | P1 |
| Latency p99 > φ^5=11090ms | P0 |

---

## Runbook Index

| Scenario | Runbook |
|----------|---------|
| Redis failure | `runbooks/redis-failure.md` |
| Agent deadlock | `runbooks/agent-deadlock.md` |
| MCP unreachable | `runbooks/mcp-unreachable.md` |
| Rate limiter saturation | `runbooks/rate-limiter-saturation.md` |
| Certificate expiry | `runbooks/certificate-expiry.md` |
| Database failover | `runbooks/database-failover.md` |
