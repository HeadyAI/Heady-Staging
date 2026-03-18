# Heady Audit Forge — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Audit panel) + headyapi.com  
**Heady Domain Anchor:** heady-logs, heady-traces, headyapi-core, headyme-core  

---

## 1. Problem Statement

Auditability in AI systems is no longer optional. Regulators, enterprise procurement teams, and nonprofit grant funders increasingly require that AI-assisted decisions be traceable, tamper-evident, and reproducible. Heady's existing infrastructure (`heady-logs`, `heady-traces`) captures operational data, but there is no structured, queryable, tamper-evident audit record that can answer: "What decision was made, by which model, on what inputs, with what policy context, at what time, and who authorized it?" Heady Audit Forge builds that layer as a first-class platform capability, turning raw telemetry into a defensible, queryable audit trail suitable for regulatory, legal, and internal accountability purposes.

**Cost of not solving it:** Heady cannot credibly serve regulated industries; Governance Atlas (Wave 5) has no immutable log to anchor to; HeadyConnection grant accountability weakens.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Capture every AI-assisted decision event in an immutable, queryable audit log | Coverage of Heady production AI events | 100% within 60 days |
| G2 | Enable point-in-time reconstruction of any logged decision | Reconstruction success rate | ≥ 99.9% |
| G3 | Deliver regulation-ready audit exports (EU AI Act, SOC 2, HIPAA adjacent) | Time to produce full audit export | < 1 hour |
| G4 | Provide a developer-facing API for third-party audit consumers | headyapi.com audit API calls | ≥ 3,000 in 90 days |
| G5 | Establish tamper evidence for all audit records | Hash chain verification pass rate | 100% |

---

## 3. Non-Goals

- **Not a general application log.** Audit Forge records decision events, not infrastructure metrics (CPU, memory, error rates). heady-logs handles operational logging.
- **Not a real-time alerting system.** Alerting on decision anomalies is handled by heady-sentinel + Governance Atlas; Audit Forge is the record system, not the alerting system.
- **Not a blockchain ledger.** Hash chaining provides tamper evidence without requiring distributed consensus infrastructure.
- **Not a data warehouse.** Audit Forge is not designed for analytical queries across all platform data; it is scoped to decision-event records.
- **Not a SIEM.** Security information and event management is out of scope; Audit Forge is compliance-focused, not security-incident-focused.

---

## 4. User Stories

**Compliance officer / platform admin**
- As a compliance officer, I want to export a structured audit trail for all AI-assisted decisions in a date range, formatted for EU AI Act high-risk system documentation.
- As a platform admin, I want to verify that the audit log has not been tampered with by running a hash chain verification report.
- As a platform admin, I want to search the audit log by actor, model, decision type, or time range so that I can respond to an internal investigation within minutes.

**Legal / finance**
- As a legal team member, I want to retrieve the exact input prompt, model selected, and output received for a specific decision event so that we can defend it in a dispute.

**Developer (headyapi.com)**
- As a developer building a compliance dashboard, I want to query the Audit Forge API for decision events scoped to my org so that I can populate my own audit UI without scraping logs.

---

## 5. Requirements

### P0 — Must Have
- **Decision event schema:** Structured schema for every audit event: `event_id` (UUID), `timestamp` (ISO 8601 UTC), `actor` (user_id|agent_id|system), `decision_type`, `model_id`, `model_version`, `input_hash` (SHA-256 of input), `output_hash` (SHA-256 of output), `policy_context` (JSON, governance policy snapshot), `org_id`, `environment`, `signature` (HMAC of all fields).
- **Hash chain:** Each event record includes `prev_event_hash` linking it to the immediately preceding event in the chain. Full chain can be verified at any time.
- **Ingestion pipeline:** heady-traces and heady-logs emit decision events to Audit Forge ingestion API. Ingest validated events synchronously before acknowledging to source.
- **Query API:** `GET /v1/audit/events` with filters (org_id, actor, model_id, decision_type, time range). Paginated. JWT-authenticated, org-scoped.
- **Chain verification endpoint:** `POST /v1/audit/verify-chain` — computes full HMAC chain for a given time range and returns pass/fail with first breach point if detected.
- **Audit export:** On-demand export of audit events as JSON or CSV for a specified range, with regulatory framework metadata header (EU AI Act, SOC 2 type fields).
- **headyapi.com routing:** All `/v1/audit/*` routes served through headyapi-core gateway.

### P1 — Should Have
- **Full input/output storage (opt-in):** For high-risk systems (as defined in Governance Atlas), store full input text and output text (encrypted, not just hashes) to enable point-in-time reconstruction. Configurable per org and per asset.
- **Retention policies:** Per-org configurable retention (90 days / 1 year / 7 years). Events beyond retention window archived to cold storage (GCS Archive).
- **Audit log UI:** On headyme.com Audit panel, a searchable, filterable event table with chain verification status badge and export button.
- **Webhook delivery:** On new audit event, optionally POST to a configured org webhook endpoint for real-time ingestion into third-party SIEM or GRC tools.

### P2 — Future
- **Cross-org audit federation** for enterprise multi-tenant deployments.
- **Zero-knowledge proof attestation** for sharing audit evidence without exposing raw inputs/outputs.
- **HeadyAudit SDK** for third-party developers to emit their own decision events into Audit Forge.

---

## 6. User Experience

**Audit panel (headyme.com):**
- Event table: `timestamp | actor | decision_type | model | status (pass/fail chain)`.
- Filter bar: date range picker, actor dropdown, model selector.
- "Verify Chain" button: triggers background job and returns pass/fail report.
- "Export" button: date range dialog → generates download link.

**Export format (EU AI Act):**
- JSON with `framework: "EU_AI_ACT_2024"` header.
- Event records mapped to EU AI Act Article 12 (record-keeping) field schema.
- Signed with org's configured audit key.

---

## 7. Architecture

```
heady-traces + heady-logs (source systems)
    │ (decision event emission)
    ▼
Audit Forge Ingestion Service (Cloud Run, synchronous)
    ├─ Event Validator (schema check + HMAC signing)
    ├─ Hash Chain Appender (computes prev_event_hash, appends chain)
    ├─ Audit Event Store (PostgreSQL append-only table, strict no-update/delete policy at DB role level)
    │   └─ Optional: full input/output encrypted blob store (GCS)
    └─ Webhook Dispatcher (async, for real-time third-party delivery)

headyapi-core
    └─ /v1/audit/* routes → Audit Forge Query Service

Audit Forge Query Service
    ├─ Event query engine (filtered reads from audit event store)
    ├─ Chain Verifier (recomputes HMAC chain on-demand)
    └─ Export Generator (JSON/CSV builder)

headyme.com Audit panel
    └─ UI consuming Query Service endpoints
```

---

## 8. Data Flows

```
Decision event (any Heady agent/model call)
    → heady-traces emits AuditEventPayload
    → Ingestion Service: validate schema → compute HMAC → append prev_event_hash
    → Write to audit_events table (PostgreSQL append-only)
    → Optional: if full-capture enabled, encrypt+store input/output to GCS blob
    → Acknowledge to source
    → Optional: dispatch webhook

Audit query (admin/developer)
    → headyapi-core → Query Service
    → Auth check (JWT, org scope)
    → Filtered read from audit_events
    → Paginated JSON response

Chain verification
    → Verify Chain endpoint
    → Read all events in range (ordered by sequence)
    → Recompute HMAC chain; compare stored vs. recomputed
    → Return pass/fail with breach point if detected

Export
    → Export Generator reads filtered events
    → Maps to requested framework schema
    → Writes to temp GCS path → presigned URL → returned to caller
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Tamper evidence | Append-only DB role (no UPDATE/DELETE); HMAC chain; hash chain verification API |
| Input/output confidentiality | Full-capture blobs encrypted with per-org key (AES-256-GCM); keys managed in Heady secrets manager |
| API access control | All audit endpoints require org-scoped JWT; read-only by default; separate write scope for ingestion |
| Retention and deletion | Deletion only via retention policy expiry (not ad-hoc); soft-archive to cold storage before hard delete |
| GDPR right-to-erasure conflict | Audit records for regulatory purposes may override erasure requests; legal team defines the reconciliation policy per jurisdiction |
| Webhook delivery | Webhook payloads contain only event metadata (no raw inputs/outputs); org controls which fields to include |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| heady-traces decision event emission | heady-traces team | Yes — P0 |
| heady-logs decision event emission | heady-logs team | Yes — P0 |
| PostgreSQL append-only audit table (DB role hardening) | HeadyMe engineering | Yes — P0 |
| headyapi-core route registration | HeadyAPI team | Yes — P0 |
| GCS bucket for cold archive + full-capture blobs | Infrastructure | No — P1 |
| Governance Atlas asset policy context snapshot | Governance Atlas team (Wave 5) | No — P1 |
| Heady secrets manager (per-org encryption keys) | HeadyMe engineering | No — P1 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Ingestion pipeline live (event schema + HMAC + chain).
- Append-only PostgreSQL store.
- Basic query API (time range + org filter).
- Heady production platform as first audit source.

**Phase 2 — Beta (Weeks 5–8)**
- Full-capture opt-in (encrypted GCS blobs).
- Chain verification endpoint.
- headyapi.com audit endpoints open.
- Audit panel on headyme.com.
- Export (JSON, EU AI Act schema).

**Phase 3 — Public (Weeks 9–12)**
- Retention policies.
- Webhook delivery.
- SOC 2 type mapping export.
- Governance Atlas integration (policy_context in events).
- Success metrics review.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| AI event coverage | Internal audit | 60 days | 100% | 100% |
| Reconstruction success | Spot-check test | 90 days | 99.9% | 100% |
| Time to audit export | Timer | Per export | < 1 hour | < 15 min |
| headyapi.com audit calls | API telemetry | 90 days | 3,000 | 10,000 |
| Hash chain pass rate | Verify Chain | Weekly | 100% | 100% |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Does GDPR right-to-erasure apply to audit records for high-risk AI systems, and how do we reconcile it? | Legal | Yes — pre-Phase 1 |
| OQ2 | Should the HMAC signing key be org-specific or platform-wide? Org-specific gives better isolation but complicates key rotation. | Engineering | No |
| OQ3 | What is the acceptable ingestion latency (synchronous vs. async) given the "acknowledge after write" requirement? | Engineering | No |
| OQ4 | Should Audit Forge be offered as a standalone service to non-Heady deployments via headyapi.com? | Product | No |
