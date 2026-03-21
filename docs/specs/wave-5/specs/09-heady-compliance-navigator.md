# Heady Compliance Navigator — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Compliance panel) + headyapi.com  
**Heady Domain Anchor:** headyme-core, headyapi-core, heady-sentinel, heady-logs  

---

## 1. Problem Statement

AI regulation has arrived in force. By August 2026 the EU AI Act high-risk provisions are fully enforced, Colorado's AI law is active, and the FTC is issuing enforcement actions against deceptive AI marketing. Organizations deploying AI face a compliance landscape that is sprawling, rapidly evolving, and deeply technical. Compliance teams lack tools that can continuously map their AI systems to the regulations that apply to them, surface emerging regulatory changes, and generate the documentation artifacts required for audits. Heady's Governance Atlas (Wave 5) handles internal policy; Compliance Navigator handles external regulatory alignment — turning the regulatory environment into a navigable, auto-mapped, continuously monitored surface.

**Cost of not solving it:** Enterprise customers face regulatory exposure; Heady's platform cannot credibly serve regulated industries; Governance Atlas operates without a regulatory ground truth layer.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Map each registered AI asset to all applicable regulations automatically | % of assets with complete regulatory mapping | ≥ 95% within 30 days of asset registration |
| G2 | Surface regulatory changes within 24 hours of publication | Median lag from regulation publication to Navigator alert | ≤ 24 hours |
| G3 | Reduce compliance documentation preparation time | User-reported hours saved per compliance review | ≥ 8 hours |
| G4 | Produce regulation-ready compliance gap reports on demand | Time to gap report | < 45 minutes |
| G5 | Establish headyapi.com as a compliance intelligence endpoint | API calls from compliance consumers | ≥ 4,000 in 90 days |

---

## 3. Non-Goals

- **Not a legal opinion provider.** Compliance Navigator surfaces regulatory requirements and gaps; it does not constitute legal advice and does not replace legal counsel.
- **Not a contract compliance tool.** Vendor contract review and SLA compliance are out of scope.
- **Not a financial regulatory tool.** SOX, SEC reporting, and financial compliance frameworks are not in scope for V1 (AI regulation focus only).
- **Not a real-time regulatory feed.** Compliance Navigator ingests regulatory updates on a daily polling cadence, not sub-second streaming.
- **Not a remediation executor.** Navigator identifies gaps and suggests remediation steps; it does not automatically apply changes to production systems.

---

## 4. User Stories

**Compliance officer**
- As a compliance officer, I want to register our AI deployments and receive an automatic mapping of which regulations apply to each system so that I do not have to manually track which laws cover which tools.
- As a compliance officer, I want to be alerted when a regulatory update changes the compliance posture of a registered asset so that I can act before the next audit cycle.
- As a compliance officer, I want to generate a compliance gap report for the EU AI Act in under an hour so that I can brief the board before our upcoming audit.

**Legal team**
- As a legal team member, I want a structured regulatory question-and-answer interface so that I can ask "Does our recommendation engine fall under EU AI Act Article 6 requirements?" and receive a reasoned answer with regulation references.

**Developer**
- As a developer, I want to query the compliance status of a specific AI asset via headyapi.com so that my internal GRC tool can pull live compliance posture without manual exports.

---

## 5. Requirements

### P0 — Must Have
- **Regulatory framework library:** Pre-loaded library of AI-relevant regulations: EU AI Act (full text, articles mapped), NIST AI RMF 1.0, Colorado SB 205, FTC AI guidance, GDPR AI-relevant articles, and US Executive Order 14110 AI provisions. Each regulation broken into requireable units (articles/sections).
- **Asset-to-regulation mapper:** Given a registered AI asset (from Governance Atlas) and its risk tier, automatically map it to all applicable regulatory requirement units. Mapping stored as `asset_regulation_matrix` in pgvector.
- **Compliance posture checker:** For each asset-regulation pair, check whether the asset's Governance Atlas record satisfies the requirement. Output: satisfied | gap | unknown.
- **Gap report generator:** On demand, produce a structured gap report: for a given asset or full deployment, list all unsatisfied requirements with requirement text, gap description, and suggested remediation step.
- **Regulatory change monitor:** Daily polling of official regulatory sources (EUR-Lex, FTC, NIST) and legal news aggregators. Detect changes; re-evaluate affected asset-regulation mappings; alert owners.
- **Q&A interface:** Conversational interface in HeadyBuddy (and headyme.com Compliance panel) for asking regulation questions. Answers grounded in the regulatory library with article citations.
- **headyapi.com endpoints:** `GET /v1/compliance/asset/{id}/status`, `POST /v1/compliance/report`, `GET /v1/compliance/regulations`, `GET /v1/compliance/alerts` — all JWT-authenticated.

### P1 — Should Have
- **Regulation change digest:** Weekly email digest of regulatory developments relevant to a user's registered asset types. Configurable by framework and jurisdiction.
- **Custom regulation import:** User can upload a jurisdiction-specific regulation document (PDF) and have Compliance Navigator parse it into requireable units and add it to the library.
- **Remediation playbook links:** For common gap types (e.g., "missing human oversight gate"), link to a Heady or external remediation guide rather than just describing the gap.
- **Governance Atlas sync:** When a governance policy check fails, Compliance Navigator automatically re-evaluates the affected asset-regulation pairs and flags any new compliance gaps.

### P2 — Future
- **Multi-jurisdiction conflict resolver** — surface cases where two regulations have conflicting requirements and suggest a compliant-with-both approach.
- **Compliance score trending** — track compliance posture over time and report improvement velocity.
- **Third-party audit firm export** — structured export format compatible with Big 4 audit firm AI compliance templates.

---

## 6. User Experience

**Entry point:** headyme.com → Compliance panel → Asset compliance view.

**Asset compliance view:**
- Per-asset regulation matrix: rows = applicable regulations, columns = requirement units, cells = satisfied / gap / unknown.
- Filter by: framework, jurisdiction, gap status.
- Click cell: full requirement text + Heady's assessment + remediation suggestion.

**Gap report:**
1. User selects scope (single asset or full deployment) and framework.
2. Navigator runs fresh posture check.
3. Report generated as structured PDF: executive summary, gap table, remediation priority ranking.

**Q&A interface:**
- User asks: "What does Article 13 of the EU AI Act require for our recommendation engine?"
- Navigator returns: requirement text, applicability assessment for the asset, current satisfaction status.

---

## 7. Architecture

```
headyme.com Compliance panel + headybuddy.org Q&A interface
    │
    ▼
Compliance Navigator Service (new microservice, Cloud Run)
    ├─ Regulatory Library Store (pgvector, regulations + requirement_units tables)
    ├─ Asset-Regulation Mapper (rule-based + LLM-assisted, reads Governance Atlas)
    ├─ Posture Checker (evaluates asset record against requirement unit criteria)
    ├─ Gap Report Generator (heady-ai.com LLM for narrative + template engine for PDF)
    ├─ Regulatory Change Monitor (daily scheduled worker)
    │   ├─ EUR-Lex poller
    │   ├─ FTC RSS poller
    │   ├─ NIST publications poller
    │   └─ Change classifier (LLM: is this a material change to a tracked regulation?)
    ├─ Q&A Engine (RAG over regulatory library + heady-ai.com LLM)
    └─ headyapi-core adapter (/v1/compliance/*)

Governance Atlas integration
    └─ Reads asset_regulation_matrix; syncs on asset record update
```

---

## 8. Data Flows

```
New asset registered (Governance Atlas event)
    → Asset-Regulation Mapper reads asset risk tier + type
    → Maps to applicable regulations (all requirement units)
    → Posture Checker: for each requirement unit, check asset record
    → Write asset_regulation_matrix to pgvector
    → Alert: gaps found (heady-sentinel event + in-app notification)

Daily regulatory change scan
    → Change Monitor polls EUR-Lex, FTC, NIST
    → LLM classifier: material change? Yes/No
    → If yes: identify affected requirement units
    → Re-run Posture Checker for all assets linked to those units
    → If new gaps found: alert owners; publish heady-sentinel event

Gap report request
    → Fresh Posture Checker run (full or single-asset scope)
    → Gap Report Generator: heady-ai.com LLM narrative per gap
    → Template engine: PDF with exec summary + gap table + remediation priorities
    → Presigned URL returned

Compliance Q&A
    → User question → RAG over regulations table (pgvector semantic search)
    → Top-K requirement units retrieved
    → heady-ai.com LLM: grounded answer with article citations
    → Response + citations returned
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Regulatory library accuracy | Library sourced from official texts; changes reviewed by legal team before publication; version-controlled |
| Asset data in compliance checks | Compliance Navigator reads Governance Atlas records in-org; no cross-org data sharing |
| Q&A accuracy | Answers carry explicit disclaimer: "AI-generated, not legal advice"; grounded in cited regulation text |
| Custom regulation uploads | User-uploaded regulation documents stored in encrypted org-scoped GCS; not shared across orgs |
| Report confidentiality | Gap reports stored with presigned URL access (48-hour expiry); org-scoped authorization |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| Governance Atlas asset registry (asset risk tier + record) | Governance Atlas team (Wave 5) | Yes — P0 |
| pgvector regulatory library + matrix schema | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM (mapper + report + Q&A) | HeadyAI | Yes — P0 |
| headyapi-core route registration | HeadyAPI team | Yes — P0 |
| EUR-Lex, FTC, NIST polling access | External (public) | Yes — P0 |
| heady-sentinel event types for compliance alerts | Sentinel team | Yes — P0 |
| Legal review of regulatory library accuracy | Legal | Yes — pre-Phase 1 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- EU AI Act + NIST AI RMF in regulatory library.
- Asset-to-regulation mapping for 5 seed asset types.
- Basic posture checker (required fields only).
- Internal Heady platform as first consumer.

**Phase 2 — Beta (Weeks 5–8)**
- Colorado SB 205, FTC guidance, GDPR AI articles added to library.
- Regulatory change monitor live.
- Gap report generator.
- headyapi.com endpoints open.
- Compliance Q&A interface.

**Phase 3 — Public (Weeks 9–12)**
- Custom regulation import.
- Governance Atlas sync.
- Remediation playbook links.
- Weekly regulation digest.
- Success metrics review.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Asset regulatory mapping coverage | Registry | 30 days | 95% | 99% |
| Regulatory alert latency | Monitoring | 30 days | ≤ 24 hours | ≤ 8 hours |
| Hours saved per compliance review | Survey | 60 days | 8 hours | 14 hours |
| Time to gap report | Timer | Per report | < 45 min | < 15 min |
| headyapi.com compliance calls | API telemetry | 90 days | 4,000 | 12,000 |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should the regulatory library be open-sourced or treated as a proprietary asset? Open-sourcing builds trust and community; proprietary creates differentiation. | Product/Legal | No |
| OQ2 | How do we handle jurisdictional ambiguity when an asset's data crosses borders (e.g., EU users on a US-deployed system)? | Legal | No |
| OQ3 | What is the protocol when a regulatory change creates a gap in an asset that was previously fully compliant? Who gets alerted and what is the SLA for remediation? | Product | No |
| OQ4 | Should Compliance Navigator surface potential compliance issues in Heady's own platform (self-compliance) as a trust signal for enterprise customers? | Product | No |
