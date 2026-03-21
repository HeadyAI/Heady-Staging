# Heady Governance Atlas — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Governance panel) + headyapi.com  
**Heady Domain Anchor:** headyme-core, headyapi-core, heady-sentinel  

---

## 1. Problem Statement

By mid-2026, the EU AI Act's high-risk provisions are fully in force, Colorado's AI regulations are active, and the FTC's AI compliance program is issuing enforcement actions. Enterprise teams deploying AI systems face a governance gap: they have AI capabilities in production but lack a structured, auditable map of which AI systems exist, what risk tier they sit in, who owns them, what policies govern them, and whether those policies are currently satisfied. Heady's production platform (heady-production, heady-ai.com, headymcp-core) already orchestrates multiple AI agents and model calls. Governance Atlas turns the Heady control plane into a governance-aware registry that maps AI assets, tracks compliance posture, and publishes attestations.

**Cost of not solving it:** Regulatory exposure for Heady and its enterprise customers; missed opportunity to lead in AI governance tooling as it becomes mandatory infrastructure.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Map all AI systems in a Heady deployment to a governance registry | % of production AI assets registered | 100% for Heady's own platform within 60 days |
| G2 | Continuously check policy compliance posture for each registered asset | Compliance check latency | < 15 minutes from policy change to posture update |
| G3 | Generate regulation-ready attestation reports (EU AI Act, NIST AI RMF) | Time to produce attestation report | < 30 minutes for a full deployment |
| G4 | Alert on governance drift within SLA | Mean time to governance alert | < 30 minutes after drift detected |
| G5 | Expose governance data via headyapi.com | API calls from enterprise consumers | ≥ 5,000 in 90 days |

---

## 3. Non-Goals

- **Not a legal compliance guarantee.** Governance Atlas provides a documentation and monitoring layer; it does not certify regulatory compliance or replace legal counsel.
- **Not a security scanner.** Vulnerability scanning and penetration testing are out of scope (covered by heady-sentinel).
- **Not an HR governance tool.** Human workforce policy management is out of scope; Atlas governs AI systems only.
- **Not a vendor risk management platform.** Third-party SaaS governance (beyond AI systems Heady interacts with) is out of scope for V1.
- **Not a procurement system.** Budget approval and contract management for AI tools are not in scope.

---

## 4. User Stories

**Platform admin / CTO**
- As a platform admin, I want a single view that shows every AI agent, model call, and automated decision system in our Heady deployment so that I can answer "what AI is running here?" in under a minute.
- As a CTO preparing for an EU AI Act audit, I want to export an attestation report that maps each high-risk system to its risk tier, owner, data inputs, output controls, and monitoring status.
- As a platform admin, I want to be alerted when a governance policy check fails so that I can remediate before it becomes a compliance incident.

**Policy author**
- As a policy author, I want to define governance rules in a YAML policy document so that checks can be automated without requiring engineering involvement for each new rule.

**Developer (headyapi.com)**
- As a developer integrating via headyapi.com, I want to programmatically query the governance registry so that my internal compliance dashboard stays current without manual exports.

---

## 5. Requirements

### P0 — Must Have
- **AI asset registry:** A structured registry of AI assets deployed in a Heady environment. Each record: asset ID, type (agent|model|tool|workflow), owner, deployment surface, risk tier (EU AI Act taxonomy), last-updated, status (active|inactive|deprecated).
- **Auto-discovery hook:** Governance Atlas listens to heady-sentinel pub/sub events and headymcp-core tool registration events to auto-detect new AI assets and prompt for registration.
- **Policy engine:** YAML-defined governance policies that specify required fields, permitted configurations, and check conditions per asset type. Policies evaluated on a schedule and on asset change events.
- **Compliance posture dashboard:** Per-asset compliance status (pass|warn|fail) with last-checked timestamp and remediation link. Accessible on headyme.com Governance panel.
- **Governance drift alerting:** Failed policy checks publish to heady-sentinel as `governance.policy_fail` events; in-app notifications triggered for assigned owners.
- **Attestation report generator:** On-demand PDF/JSON report mapping all assets to their governance status, suitable for EU AI Act and NIST AI RMF documentation.
- **headyapi.com endpoints:** `GET /v1/governance/registry`, `GET /v1/governance/asset/{id}`, `GET /v1/governance/report`, `POST /v1/governance/asset` — all JWT-authenticated with org-scoped authorization.

### P1 — Should Have
- **Risk tier classifier:** LLM-assisted classification tool that takes an asset description and suggests the appropriate EU AI Act risk tier with rationale, for use during registration.
- **Policy-as-code linter:** CLI tool (headyio.com SDK) that validates governance policy YAML files before deployment.
- **Change history log:** Immutable append-only log of all registry changes, with actor ID and timestamp. Exportable for audit.
- **Multi-environment support:** Atlas can manage governance registries for multiple environments (dev/staging/prod) with environment-level policy overrides.

### P2 — Future
- **Automated remediation suggestions** for common policy failures (e.g., "This agent lacks a human review gate — here's a config snippet to add one").
- **Heady Audit Forge integration** (Wave 5) — Governance Atlas feeds the Audit Forge immutable log.
- **Third-party AI asset import** (OpenAI Assistants, Anthropic Claude deployments) via API scrape.

---

## 6. User Experience

**Entry point:** headyme.com → Governance panel → "Register AI Asset" or auto-prompt from heady-sentinel.

**Registry view:**
- Table of all AI assets with inline compliance status badges (pass/warn/fail).
- Filter by: environment, risk tier, owner, status.
- Click-through to asset detail: full policy check results, history, attestation snippet.

**Attestation report generation:**
1. User clicks "Generate Report" → selects framework (EU AI Act | NIST AI RMF | custom).
2. System runs fresh policy checks on all assets.
3. Report generated as PDF within 5 minutes.
4. Downloadable and shareable (with access control).

**Policy editor:**
- Monaco-style YAML editor in headyme.com with schema hints.
- "Validate" button runs linter before saving.

---

## 7. Architecture

```
headyme.com Governance panel
    │
    ▼
Governance Atlas Service (new microservice, Cloud Run)
    ├─ Asset Registry (pgvector governance_registry table)
    ├─ Auto-Discovery Listener (subscribes to heady-sentinel pub/sub)
    ├─ Policy Engine (YAML policy loader + evaluator)
    │   ├─ Policy Store (pgvector governance_policies table)
    │   └─ Policy Evaluator Worker (scheduled + event-driven)
    ├─ Attestation Report Generator (heady-ai.com LLM for narrative + template engine for PDF)
    ├─ Change History Logger (append-only audit_log table)
    ├─ Risk Tier Classifier (heady-ai.com LLM call)
    └─ headyapi-core route adapter (/v1/governance/*)

heady-sentinel integration
    └─ Subscribes to: tool_registered, agent_started, model_call_routed
    └─ Publishes: governance.policy_fail, governance.asset_drift
```

---

## 8. Data Flows

```
New AI asset detected (heady-sentinel event)
    → Auto-Discovery Listener
    → Registry check: already registered?
    → If no: prompt admin to complete registration (in-app notification)
    → If yes: trigger immediate policy evaluation

Policy evaluation (scheduled, every 15 min + on-demand)
    → Policy Engine reads governance_policies
    → Per asset: evaluate all applicable policies
    → Write results to governance_registry (compliance_status field)
    → Failed checks: publish governance.policy_fail to heady-sentinel
    → Trigger owner notification

Attestation report request
    → Governance Atlas Service
    → Fresh policy evaluation run
    → heady-ai.com LLM: generate narrative summaries per asset
    → Template engine: compose PDF with asset table + narrative
    → PDF written to secure storage, presigned URL returned
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Registry data sensitivity | Governance registry contains system architecture details; access scoped to org admins only; no public read |
| Policy YAML injection | Policy YAML parsed with strict schema validation; no code execution in policy engine |
| Attestation report confidentiality | Reports stored in org-scoped S3 bucket with presigned URL access; URLs expire after 48 hours |
| Change history integrity | Append-only log table; no DELETE or UPDATE permissions at DB level; write access audit-logged |
| API authorization | All /v1/governance/* endpoints require org-scoped JWT; rate-limited at 100 req/min per org |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| heady-sentinel pub/sub event registry (new event types) | Sentinel team | Yes — P0 |
| headymcp-core tool registration events | HeadyMCP team | Yes — P0 |
| pgvector governance tables schema | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM (narrative + classification) | HeadyAI | Yes — P0 |
| headyapi-core route registration | HeadyAPI team | Yes — P0 |
| headyio.com SDK CLI tool support | HeadyIO team | No — P1 |
| Heady Audit Forge (Wave 5) | Audit Forge team | No — P2 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Asset registry (manual registration only).
- Basic policy engine (5 seed policies: owner required, risk tier required, last-reviewed < 90 days, description required, environment tagged).
- Compliance posture dashboard.
- Internal Heady platform assets as first registered set.

**Phase 2 — Beta (Weeks 5–8)**
- Auto-discovery from heady-sentinel events.
- Governance drift alerting.
- Attestation report generator (EU AI Act framework).
- headyapi.com endpoints live.
- Beta access for select enterprise HeadyConnection partners.

**Phase 3 — Public (Weeks 9–12)**
- NIST AI RMF framework template.
- Risk tier classifier.
- Multi-environment support.
- Policy-as-code linter in headyio.com SDK.
- Change history log.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Heady platform asset registration | Registry | 60 days | 100% | 100% |
| Posture update latency | Monitoring | 30 days | < 15 min | < 5 min |
| Time to attestation report | Timer | Per report | < 30 min | < 10 min |
| Governance alert MTTA | Monitoring | 30 days | < 30 min | < 10 min |
| headyapi.com governance calls | API telemetry | 90 days | 5,000 | 15,000 |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should policy definitions ship with defaults, or require admins to configure from scratch? Default policies reduce time-to-value. | Product | No |
| OQ2 | How do we handle assets that span multiple environments in a single registration record? | Engineering | No |
| OQ3 | Should the EU AI Act attestation template be reviewed by an EU AI Act legal specialist before public launch? | Legal | Yes — pre-Phase 3 |
| OQ4 | Do we support a "governance waiver" workflow for assets that fail a policy but have a documented exception? | Product | No |
