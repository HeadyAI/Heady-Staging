# Spec 05 — Heady Deployment Pulse

**Wave:** Third Wave  
**Domain:** headysystems.com / Cloud & DevOps  
**Primary Repos:** headysystems-core, heady-production, headymcp-core, headyme-core, latent-core-dev  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Deployment Pulse is a real-time deployment health visibility and forecasting system for the Heady platform. It aggregates signals from all active services — deploy history, error rates, latency, health checks, and pipeline status — and synthesizes them into a live "pulse" that any operator or developer can read at a glance. Unlike raw metrics dashboards, Deployment Pulse interprets what it sees: it flags anomalies, explains trends in plain language, forecasts deployment risk before a change is pushed, and triggers self-healing recommendations through headysystems-core.

**Why it matters:** The Heady ecosystem spans heady-production (Latent OS), headymcp-core (31 MCP tools), headysystems-core (Sacred Geometry orchestration), plus a growing roster of site projections and service endpoints. As deployment velocity increases, the risk of silent failures and cascading degradation grows. Deployment Pulse provides the situational awareness layer to keep the fleet healthy.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Surface all production incidents within 2 minutes of onset | Time-to-detection metric |
| G2 | Forecast deployment risk for every proposed change before it is applied | Risk forecast generated for 100% of staged deployments |
| G3 | Reduce mean time to resolution (MTTR) by 50% through AI-assisted diagnosis | MTTR tracked per incident |
| G4 | Zero "silent failures" — every service degradation triggers a Pulse alert | Undetected incident count = 0 (audited monthly) |
| G5 | Any operator can read current fleet health in ≤ 30 seconds from the Pulse dashboard | Time-to-situational-awareness (user study) |

---

## 3. Non-Goals

- **Infrastructure provisioning** — That is Cloud Forge (Spec 04).
- **Log aggregation pipeline** — Deployment Pulse reads from heady-logs; it does not own the log pipeline.
- **Business metrics / product analytics** — Pulse is infrastructure health only; product metrics are a separate concern.
- **Cost management** — Out of scope for v1.

---

## 4. User Stories

**As a platform operator,** I want to open the Deployment Pulse dashboard and immediately see the overall fleet health state — green/yellow/red — with a plain-language summary of any active issues so that I can triage without digging through raw logs.

**As a developer preparing to deploy,** I want Deployment Pulse to analyze my proposed change against recent fleet behavior and return a risk score with specific concerns (e.g., "this service had 3 timeout spikes in the past 24 hours; deploying now increases blast radius risk") so that I can make an informed decision.

**As an on-call engineer,** I want to receive a Pulse alert the moment any service degrades, with a AI-generated diagnosis summary and suggested remediation steps, so that I can act within minutes.

**As an engineering lead,** I want to review a weekly Deployment Health Report — trend lines per service, incident frequency, resolution time, and improvement opportunities — so that I can track platform reliability over time.

**As a new developer,** I want to see which services are healthy, which are in staging, and which are currently being deployed, in real time, so that I always know the current platform state.

---

## 5. Requirements

### P0 — Must Have

- **Health Signal Collector:** Cloudflare Worker that polls each registered service's health endpoint every 60 seconds and writes status, latency, and error rate to the Pulse time-series store.
- **Service Registry:** List of all registered Heady services (from Infrastructure Registry in Cloud Forge or manual registration), each with: service_id, name, environment, health_endpoint, owner, criticality (P0/P1/P2).
- **Pulse Score Engine:** Calculates a composite health score (0–100) per service and a fleet-wide score every 60 seconds. Score factors: uptime, error rate, latency vs. p95 baseline, recent deploy stability.
- **Anomaly Detector:** Baseline each service's normal behavior; alert when current metrics deviate beyond configurable thresholds. Alerts published to headymcp-core event stream.
- **AI Diagnosis Engine:** When an anomaly is detected, headymcp-core tool `diagnose_incident(service_id, alert_context)` pulls recent logs from heady-logs, recent deploys, and metric history → returns a plain-language diagnosis + top-3 remediation suggestions.
- **Pulse Dashboard:** Real-time fleet view showing service cards (name, env, health badge, latency sparkline, last deploy). Fleet-level health indicator at top. Active alerts panel.
- **Alert Routing:** Alerts routed via headybuddy-core (push to mobile/desktop) and email. Severity levels: Info, Warning, Critical. On-call escalation after 5 minutes without acknowledgment.
- **Deployment Risk Forecast:** Before any deploy in the CI/CD pipeline, Pulse is called with the proposed service and change set; it returns a risk score (0–100) + explanation. Risk score above 75 triggers a human review gate.

### P1 — Should Have

- **Deploy Timeline:** Per-service deploy history with success/rollback indicators, aligned with metric timeline so correlation is instant.
- **Self-Healing Trigger:** When AI Diagnosis Engine recommends a known fix pattern (e.g., "restart the worker," "scale up replicas"), Pulse can automatically trigger it via headysystems-core self-healing subsystem with operator confirmation.
- **Weekly Health Report:** Automated Markdown report per service: uptime, incident count, MTTR, top error types, trend vs. prior week. Distributed to engineering team.
- **Dependency Graph:** Visual map of service-to-service dependencies; when a service degrades, dependent services are highlighted automatically.

### P2 — Future

- **Predictive failure model** — Forecast service failure likelihood in the next 24 hours based on historical patterns.
- **Multi-org fleet view** — HeadyMe + HeadySystems + HeadyConnection services in a single cross-org Pulse view.
- **SLA tracking** — Configurable SLA targets per service with automated breach notifications.

---

## 6. User Experience

1. **Entry point:** Deployment Pulse panel at `headysystems.com/pulse` and `headyme.com/pulse`. Also accessible via headymcp-core as a tool surface.
2. **Fleet overview:** Large fleet health badge (green/yellow/red) with a plain-language status line: "All systems operational" or "2 services degraded — see alerts." Below: service grid cards.
3. **Service card:** Shows service name, environment badge, current health score (0–100 dial), latency sparkline (last 1 hour), last deploy time, and criticality badge.
4. **Alert panel:** Right-side drawer of active alerts, each with: severity badge, affected service, onset time, AI diagnosis summary (expandable), suggested actions, and "Acknowledge" / "Escalate" / "Trigger Fix" buttons.
5. **Deploy risk check:** Inline in CI/CD pipeline output — shows a Pulse risk card before any production deploy. Green (< 40): proceed. Yellow (40–74): proceed with caution. Red (≥ 75): review gate required.
6. **Weekly report:** Emailed to engineering team, formatted as a structured digest with trend arrows per service.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│  headysystems.com UI (/pulse) + headyme.com (/pulse)│
│  (template-heady-ui micro-frontend)                 │
└──────────────────┬──────────────────────────────────┘
                   │ WebSocket (live updates)
┌──────────────────▼──────────────────────────────────┐
│             headysystems-core                        │
│  Pulse Score Engine  │  Anomaly Detector            │
│  AI Diagnosis Engine │  Deploy Risk Forecaster      │
│  Alert Router        │  Weekly Report Generator     │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────────┐
│  heady-production   │  │  headymcp-core           │
│  service_registry   │  │  diagnose_incident tool  │
│  pulse_metrics      │  │  alert event stream      │
│  pulse_alerts       │  └────────────┬─────────────┘
│  deploy_log         │               │
└──────────┬──────────┘  ┌────────────▼─────────────┐
           │             │  heady-logs (log store)   │
┌──────────▼──────────┐  └──────────────────────────┘
│  latent-core-dev    │
│  Baseline behavior  │  ┌──────────────────────────┐
│  vectors (anomaly   │  │  headybuddy-core          │
│  detection context) │  │  Push alerts             │
└─────────────────────┘  └──────────────────────────┘
```

---

## 8. Data Flows

**Health signal collection (continuous):**
```
Cloudflare Worker (60-second scheduled trigger)
  → For each service in service_registry
  → GET health_endpoint
  → Record: status, latency_ms, error_count, timestamp → pulse_metrics
  → Pulse Score Engine recalculates service score
  → If score drops below threshold → publish anomaly_event
```

**Incident diagnosis:**
```
anomaly_event published
  → headymcp-core: diagnose_incident(service_id, alert_context)
    → Fetch last 50 log lines from heady-logs
    → Fetch recent deploys from deploy_log
    → Fetch metric history from pulse_metrics
    → LLM: diagnose + suggest remediation
  → Create pulse_alert record
  → Alert Router → headybuddy-core push + email
```

**Deploy risk forecast:**
```
CI/CD pipeline triggers: pulse_risk_check(service_id, diff_summary)
  → Fetch recent metric history for service
  → Fetch recent error events
  → LLM: assess risk of change given current service state
  → Return: risk_score, explanation, recommended action
  → If risk_score ≥ 75 → trigger human review gate in CI/CD
```

---

## 9. Security & Privacy

- Service health endpoints must not expose sensitive data; Pulse only polls public health endpoints (HTTP 200/503 style) or private endpoints via authenticated requests using service-level tokens.
- pulse_metrics and pulse_alerts tables have read access for engineering and operator roles; no public access.
- AI Diagnosis Engine receives only metric values, error type counts, and anonymized log summaries — no user data or PII from application logs.
- Alert escalation paths are configurable; on-call engineer identities are stored encrypted.
- Deploy risk forecasts are logged for review; no forecast blocks a deploy autonomously (human gate only).

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headysystems-core — core service | Internal | Extend with Pulse module |
| heady-production — Postgres (new tables) | Internal | Migration required |
| headymcp-core — `diagnose_incident` tool + event stream | Internal | New tool |
| heady-logs — log store | Internal | Existing — read-only access |
| latent-core-dev — baseline behavior vectors | Internal | Extend with service behavior corpus |
| headybuddy-core — push alerts | Internal | Existing — add Pulse alert type |
| CI/CD pipeline — pre-deploy hook | Internal | Add Pulse risk check call to deploy workflow |

---

## 11. Phased Rollout

### Phase 1 — Health Collection (Weeks 1–4)
- Service Registry schema
- Health Signal Collector worker (60-second poll)
- Pulse Score Engine
- Pulse Dashboard (basic service grid)

### Phase 2 — Alerting + Diagnosis (Weeks 5–8)
- Anomaly Detector
- AI Diagnosis Engine (diagnose_incident tool)
- Alert routing (headybuddy-core + email)
- Deploy log integration

### Phase 3 — Forecasting + Intelligence (Weeks 9–12)
- Deploy Risk Forecast (CI/CD integration)
- Deploy Timeline UI
- Weekly Health Report automation
- Self-healing trigger integration
- Dependency graph visualization

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Time-to-detection (incidents) | Unknown (manual monitoring) | ≤ 2 minutes |
| MTTR | Unknown | -50% vs. pre-Pulse baseline |
| Undetected incidents per month | Unknown | 0 |
| Deploy risk forecast coverage | 0% | 100% of production deploys |
| Time-to-situational-awareness | Manual (5–15 min) | ≤ 30 seconds |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Does heady-logs already expose a queryable API, or does Pulse need to integrate directly with the log store? | Engineering | Yes — affects diagnosis engine architecture |
| Which CI/CD system handles Heady deploys? (GitHub Actions? Cloud Run triggers?) | Engineering | Yes — determines where to hook deploy risk check |
| What is the criticality classification for each current service? | Eric / Engineering | No — can default to P1 for all in Phase 1 |
| Should Pulse include heady-production itself, or only service projections? | Eric | No — recommend yes; include all services |
