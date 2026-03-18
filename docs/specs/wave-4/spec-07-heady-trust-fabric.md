# Spec-07: Heady Trust Fabric

**Wave:** Fourth  
**Feature Name:** Heady Trust Fabric  
**Skill Counterpart:** `heady-trust-fabric`  
**Surface Anchors:** headyme.com (command center), headymcp.com (MCP layer), headyapi.com (public interface), headysystems.com (core architecture)  
**Repo Anchors:** `HeadyMe/heady-production`, `HeadyMe/headymcp-core`, `HeadyMe/headysystems-core`, `HeadyMe/heady-sentinel`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Trust Fabric is the attestation, verification, and reputation layer of the Heady ecosystem. It answers the question "how much should I trust this entity?" for every agent, service, user, API caller, and data source that operates within or connects to Heady. Trust Fabric issues trust attestations, aggregates behavioral signals, enforces trust thresholds for sensitive operations, and surfaces trust state in dashboards and MCP tools — making trust a first-class property of the Heady platform rather than an afterthought.

**Problem Statement:**  
As Heady scales to hundreds of swarm agents, external developer integrations, and public API callers, the platform has no formal model of trust. Any credentialed agent can call any authorized service. There is no signal about whether an agent has behaved reliably, whether an API key belongs to a reputable caller, or whether a piece of data from an external source has been validated. This creates risk surfaces where misconfigured or compromised agents can take high-consequence actions without any trust gate.

---

## 2. Goals

1. Assign and maintain a trust score (0–100) for every principal (user, agent, service, API key) based on behavioral history, attestations, and anomaly signals.
2. Enable services to declare trust thresholds for sensitive operations — only principals at or above threshold can proceed.
3. Issue verifiable trust attestations (signed, time-stamped records) that principals can present to services as proof of trust standing.
4. Surface trust state in headyme.com dashboards and via MCP tool so operators can inspect and agents can self-check their standing.
5. Integrate anomaly detection: flag principals whose behavioral patterns deviate significantly from baseline, triggering trust score reduction and operator alert.

### Non-Goals (v1)

- Blockchain-anchored attestation or verifiable credentials (VC) standard (Phase 3).
- Third-party trust signals from external reputation systems (Phase 2).
- Trust-weighted voting or consensus mechanisms for agent collectives (Phase 3).
- Human identity document verification (KYC/AML) — out of scope for developer platform.
- Trust scores for data content (data provenance is a separate feature).

---

## 3. User Stories

### Operator

- **As a platform operator**, I want to see the current trust score for every active agent so I can identify low-trust agents before they take consequential actions.
- **As an operator**, I want to set a minimum trust threshold for high-risk operations (e.g., treasury authorization above $1,000) so that only proven, well-behaved agents can execute them.
- **As an operator**, I want to be alerted when any principal's trust score drops below a configured floor so I can investigate before damage occurs.

### Developer / Agent

- **As a headyio.com developer**, I want to see my API key's trust score and the signals contributing to it so I can understand why certain high-stakes endpoints are unavailable to me and what I need to do to unlock them.
- **As a Heady swarm agent**, I want to retrieve my current trust score via MCP before attempting a high-stakes action so I can fail gracefully rather than receiving a mid-execution rejection.
- **As an agent**, I want to request a trust attestation for a specific capability scope so downstream services can verify my standing without querying Trust Fabric on every call.

### Service

- **As a Heady service** (e.g., Treasury Nexus), I want to declare a trust threshold for the `treasury:issue` operation and have Trust Fabric automatically enforce it so I do not have to implement my own trust logic.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TF-01 | Trust Score Engine: maintains a score (0–100) per principal, updated on behavioral events. Initial score for new principals: 50. | Given new principal, when first event logged, then score updates within 5s. |
| TF-02 | Trust Signal Ingestion: accept behavioral events (success, failure, anomaly, manual review) via `POST /trust/signal`. | Given signal POST, then score recalculated and persisted within 5s. |
| TF-03 | Trust Threshold Enforcement: services register `POST /trust/threshold {service, operation, min_score}`; Trust Fabric validates principal score on `POST /trust/check {principal_id, operation}`. | Given principal score 40 and min_score 60, then /trust/check returns TRUST_INSUFFICIENT. |
| TF-04 | Trust Attestation Issuance: `POST /trust/attest {principal_id, scope, ttl}` returns signed attestation JWT with score snapshot and timestamp. | Given valid principal + scope, then attestation JWT is verifiable with Trust Fabric public key. |
| TF-05 | Anomaly Detection: statistical baseline per principal; score drops 10 points per 3σ deviation event. | Given agent call volume 10× baseline, then anomaly event fires and score drops. |
| TF-06 | Trust Dashboard: headyme.com view listing all principals with current score, trend (7-day), anomaly flags, and manual override controls. | Given dashboard load, then all active principals shown with score and 7-day trend. |
| TF-07 | MCP Tool: `heady_trust_check` accepts `{principal_id, operation}` returns `{score, threshold, verdict: PASS|FAIL}`. | Given agent call, then verdict returned within 50ms. |
| TF-08 | Manual Score Override: operators can manually adjust a trust score with reason; creates audit record. | Given override, then new score applied and audit record with operator ID and reason stored. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| TF-09 | Trust score webhook: fire `TRUST_SCORE_CHANGED` event to registered webhooks when score changes by > 5 points. |
| TF-10 | Trust history timeline: per-principal event log showing every signal contribution, score delta, and timestamp. |
| TF-11 | Trust attestation verification endpoint: `GET /trust/attest/verify/{attestation_jwt}` returns validity and principal trust state. |
| TF-12 | Trust threshold registry UI: operators can view and edit all registered service thresholds in headyme.com. |
| TF-13 | Bulk trust signal ingestion: batch endpoint for high-frequency signal sources (e.g., API call results). |

### P2 — Future

| ID | Requirement |
|----|-------------|
| TF-14 | Blockchain-anchored verifiable credentials (Phase 3). |
| TF-15 | Third-party trust signal integration (community reputation, external audits). |
| TF-16 | Trust-weighted agent collective decisions. |

---

## 5. User Experience

**Trust Dashboard (headyme.com /trust)**

- Header metrics: total principals, % above 70 (healthy), % below 40 (watch), anomaly count today.
- Principal table: columns for name, type (user/agent/service/key), score gauge (color: green >70, amber 40–70, red <40), 7-day trend arrow, anomaly badge, last active.
- Click row → principal detail: score history chart, event log, active attestations, threshold registrations.
- "Override Score" button → modal with new score + reason field.

**Developer Trust View (headyio.com /portal/trust)**

- My API key trust score card: score, contributing signals (last 7 days), threshold requirements for advanced endpoints.
- "What's limiting my access?" section: lists operations I cannot access and the score gap to unlock them.
- Trust improvement tips: "Complete email verification +5", "Maintain 7-day error-free usage +10".

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│   Signal Sources: heady-production | headyapi-core | heady-     │
│   sentinel | headymcp-core | manual operator actions           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ POST /trust/signal
┌───────────────────────────▼─────────────────────────────────────┐
│                Trust Fabric Service (Cloud Run)                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Score Engine   │  │  Anomaly Detector│  │  Attestation  │  │
│  │  (EWMA + rules) │  │  (baseline stats)│  │  Issuer       │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                    │                     │           │
│  ┌────────▼────────────────────▼─────────────────────▼───────┐  │
│  │              Trust Store (PostgreSQL + TimescaleDB)       │  │
│  │   principals | scores | signals | attestations | thresholds│  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────────┬──┘
             │ /trust/check                                      │ MCP
┌────────────▼──────────────────────────────────────────────────▼─┐
│   Consumers: Treasury Nexus | Voice Vessel | Avatar Forge |    │
│   headymcp-core (heady_trust_check tool)                        │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Runtime: Cloud Run (Node.js / TypeScript)
- Score engine: EWMA (exponentially weighted moving average) + rule-based adjustments
- Anomaly detection: rolling z-score per principal metric (call volume, error rate, latency deviation)
- Store: PostgreSQL + TimescaleDB extension for time-series signal storage
- Attestation: JWT (RS256) with Trust Fabric private key (stored in Sovereign Key Ring, Spec-10)
- Identity: Identity Loom JWT validation
- Signal fan-in: Pub/Sub topic consumed by Trust Fabric

---

## 7. Data Flows

### Trust Signal and Score Update Flow

```
heady-production: agent task completes successfully
  → Publish trust signal: {principal_id: "agent:xyz", event: "TASK_SUCCESS", weight: +2}
  → Trust Fabric: consume from Pub/Sub
  → Score Engine: apply weighted adjustment to principal score
  → Anomaly Detector: compare current metric to 30-day baseline
  → If anomaly: generate ANOMALY signal (additional -10 adjustment)
  → Update trust store
  → If score change > 5: fire TRUST_SCORE_CHANGED webhook
```

### Trust Check Flow (Service Enforcement)

```
Treasury Nexus: POST /trust/check {principal_id: "agent:xyz", operation: "treasury:issue:high_value"}
  → Trust Fabric: look up principal score (Redis cache, 30s TTL)
  → Look up threshold for operation (from threshold registry)
  → Compare: score 72 >= threshold 60 → PASS
  → Return {score: 72, threshold: 60, verdict: "PASS"}
  → Treasury Nexus: proceed with operation
```

### Attestation Flow

```
Agent: POST /trust/attest {principal_id: "agent:xyz", scope: "treasury:authorize", ttl: 3600}
  → Validate requesting principal has authority to request attestation for subject
  → Load current trust score and check > minimum for scope
  → Sign attestation JWT: {sub: principal_id, scp: scope, score: 72, iat, exp}
  → Store attestation record
  → Return signed JWT to agent
  → Agent presents JWT to downstream services as bearer proof
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Score manipulation | All signal sources are authenticated services; no unauthenticated signal ingestion |
| Manual override audit | Every manual override recorded with operator identity, reason, previous score, new score |
| Attestation forgery | Attestations signed with Trust Fabric private key stored in Sovereign Key Ring; verification endpoint public |
| Score cache staleness | Redis cache TTL 30s; stale scores expire before consequential operations can accumulate trust gap |
| Anomaly false positives | Anomaly score penalties require 3 consecutive anomaly events to fully apply; single spikes not penalized |
| Privacy of behavioral data | Signal payloads contain only principal ID and event type; no user content, PII, or request body data |
| Threshold registry access | Threshold registration requires `trust:admin` scope; prevents rogue services from lowering thresholds |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | Principal identity resolution; JWT validation | Phase 1 |
| Heady Sovereign Key Ring (Spec-10) | Private key storage for attestation signing | Phase 1 |
| heady-sentinel repo | Existing anomaly/monitoring surface — signal source | Phase 1 |
| heady-production | Primary signal source (agent task outcomes) | Phase 1 |
| headymcp-core | `heady_trust_check` MCP tool registration | Phase 1 |
| headyapi-core | API gateway for Trust Fabric endpoints | Phase 1 |
| PostgreSQL + TimescaleDB | Trust data persistence with time-series extension | Phase 1 |
| Redis | Score cache for low-latency trust checks | Phase 1 |
| Pub/Sub | Signal fan-in from distributed signal sources | Phase 1 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Trust check latency (p99) | < 50ms (cached) | 30 days post-launch |
| Signal ingestion lag | < 5s from event to score update | 30 days |
| False positive anomaly rate | < 3% of legitimate behavioral spikes flagged | 60 days |
| Trust threshold enforcement accuracy | 100% — no operations proceed below threshold | Ongoing |
| Operator dashboard engagement | Trust dashboard accessed in > 60% of operator sessions with active agents | 30 days |
| Attestation verification success rate | > 99.9% of valid attestations pass verification | 30 days |

---

## 11. Phased Rollout

### Phase 1 — Core Trust Engine (Weeks 1–4)
- Trust Fabric Service on Cloud Run
- Score engine (EWMA + rule-based)
- Signal ingestion from heady-production and heady-sentinel
- Trust check API
- Threshold registry
- Trust dashboard on headyme.com
- MCP tool: `heady_trust_check`

### Phase 2 — Attestations + Anomaly (Weeks 5–8)
- Attestation issuance and verification
- Anomaly detector (rolling z-score)
- Trust score webhooks
- Trust history timeline
- Developer trust view on headyio.com

### Phase 3 — Advanced Trust (Weeks 9–16)
- Blockchain-anchored verifiable credentials
- Third-party trust signal integration
- Trust-weighted agent decisions

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What is the initial trust score formula: pure behavioral EWMA, or does identity verification level also contribute (e.g., +10 for verified email)? | Product / Security | Yes — Phase 1 design |
| Should trust scores be visible to the principal themselves (developer sees their own key score) or operator-only? | Product | No |
| What is the minimum score threshold for the default operations (non-critical API calls)? | Security | Yes |
| Should trust score changes be reversible (i.e., good behavior after anomaly can recover score)? | Product | No |
