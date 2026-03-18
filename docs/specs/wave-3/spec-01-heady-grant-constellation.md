# Spec 01 — Heady Grant Constellation

**Wave:** Third Wave  
**Domain:** headyconnection.org / HeadyConnection nonprofit  
**Primary Repos:** headyconnection-core, heady-production, headymcp-core  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Grant Constellation is an AI-assisted grant discovery, qualification, drafting, and tracking system built natively into the HeadyConnection nonprofit infrastructure. It replaces manual grant prospecting with an always-on intelligent constellation of specialized agents — each responsible for one grant domain (arts, technology, education, community, environmental) — that continuously monitors funding landscapes, matches opportunities to HeadyConnection's mission profile, and surfaces fully prepared application drafts for human review and submission.

**Why it matters:** Nonprofit grant funding is resource-intensive and systematically overlooked in the AI tooling space. HeadyConnection routinely misses application windows and over-extends staff time on prospecting. Grant Constellation converts that burden into a passive, curated pipeline.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Surface 10+ qualified grant opportunities per calendar quarter | Opportunities logged in Grant Registry per quarter |
| G2 | Reduce grant research time by 70% | Time-tracked against pre-system baseline |
| G3 | Deliver ready-to-submit draft applications for ≥80% of surfaced opportunities | Draft completion rate in application queue |
| G4 | Zero missed deadlines for tracked opportunities | Missed deadline count = 0 |
| G5 | Full audit trail for every application — narrative, data sources, and submission record | Audit log completeness score ≥ 95% |

---

## 3. Non-Goals

- **Direct submission to grant portals** — Grant Constellation prepares and queues drafts; human staff authorize and submit. Automated submission is deferred to v2 once audit confidence is established.
- **Financial accounting or fund tracking** — That is the domain of Heady Impact Ledger (Spec 02).
- **Federal contracting or procurement** — Constellation focuses on foundation and private grants; federal procurement has different compliance requirements and is out of scope for v1.
- **Donor relationship management** — Covered by Heady Donor Resonance Engine (Spec 03).

---

## 4. User Stories

**As a HeadyConnection program director,** I want to open Grant Constellation and see a ranked list of currently open grant opportunities matched to our mission so that I can prioritize which applications to pursue this week.

**As a HeadyConnection staff member,** I want to click into any surfaced opportunity and find a pre-drafted narrative, budget template, and organizational eligibility summary so that I can submit with minimal additional work.

**As an executive director,** I want to see a constellation map — a visual graph of active, pending, and submitted grants by domain, funder, and award amount — so that I have a strategic view of our funding pipeline.

**As a program director,** I want to receive a calendar alert 30 days and 7 days before each grant deadline so that I never miss a window.

**As an auditor,** I want to inspect every AI-generated narrative with a full provenance trail — which data sources were used, which mission statements were drawn from, and which human reviewed the draft — so that I can verify responsible AI use.

---

## 5. Requirements

### P0 — Must Have

- **Grant Discovery Agent:** Continuous background agent monitoring federal registries (grants.gov), private foundations (Candid, Foundation Directory), and regional funders. Runs on a 48-hour refresh cycle via headymcp-core tool dispatch.
- **Mission Match Engine:** Semantic matching between discovered opportunities and HeadyConnection's active mission profile stored in latent-core-dev (pgvector). Outputs a match score 0–100.
- **Grant Registry:** Structured data store (Postgres + pgvector in heady-production) tracking opportunity name, funder, deadline, award range, eligibility criteria, match score, status, and assigned staff.
- **Draft Application Generator:** On demand, calls headymcp-core to generate application narrative sections (executive summary, project description, organizational capacity, evaluation plan, budget narrative) from mission profile + program data.
- **Deadline Tracker + Alerts:** Push notifications (headybuddy-core) and email (headyconnection-core) 30 days, 14 days, and 7 days before each deadline.
- **Human Review Gate:** All AI-generated drafts are locked in "Pending Review" status until a named staff member explicitly approves. No draft advances without a human approval event logged.
- **Audit Log:** Immutable record of every action — discovery, match scoring, draft generation, edit, approval, submission — stored in heady-production audit ledger.

### P1 — Should Have

- **Constellation Map UI:** Interactive visual graph (React micro-frontend via template-heady-ui) showing grant opportunities by domain cluster, deadline proximity, and status. Nodes sized by award amount.
- **Eligibility Pre-screen:** Before surfacing an opportunity, the agent runs an eligibility check against org profile (501c3 status, geography, program type, revenue band). Ineligible opportunities are suppressed.
- **Application Version History:** Full version history for each application draft, allowing rollback to any prior state.
- **Collaborative Editing:** Multiple staff members can annotate and co-edit a draft application in real time via headyconnection-core workspace.

### P2 — Future

- **Automated submission connectors** to major grant portals (SurveyMonkey Apply, Foundant, Fluxx).
- **Funder relationship memory** — track past interactions, prior awards, and program officer notes linked to Donor Resonance Engine.
- **Cross-nonprofit benchmarking** — anonymized grant success rate comparison with peer organizations (requires data sharing consortium).

---

## 6. User Experience

1. **Entry point:** Grant Constellation panel within the HeadyConnection dashboard (`headyconnection.org/grants`).
2. **Home view:** Two-panel layout. Left: list of active opportunities sorted by match score × deadline urgency. Right: Constellation Map showing all tracked grants as a radial cluster graph by domain.
3. **Opportunity card:** Click any opportunity to open a detail drawer: funder profile, eligibility summary, AI match explanation, draft status, deadline countdown, assigned staff.
4. **Draft editor:** Inline narrative editor with section tabs (Summary, Project, Org, Evaluation, Budget). Each section shows the AI draft alongside a diff view of any human edits. "Approve Section" button per section; master "Approve Draft" button requires all sections approved.
5. **Deadline alerts:** Smart notification system sends alerts via email and HeadyBuddy push. Alerts escalate in urgency as deadline approaches.
6. **Audit viewer:** Admin-only tab showing complete lineage of each draft — data sources, generation timestamps, edit history, approver identities.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│               headyconnection.org UI                │
│   Grant Constellation Panel (template-heady-ui)     │
└────────────────┬────────────────────────────────────┘
                 │ REST / MCP tools
┌────────────────▼────────────────────────────────────┐
│            headymcp-core (Tool Dispatch)             │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  Discovery Agent  │  │  Match + Draft Agent     │ │
│  │  (48hr cron)      │  │  (on-demand via MCP)     │ │
│  └────────┬─────────┘  └─────────────┬────────────┘ │
└───────────┼─────────────────────────┼───────────────┘
            │                         │
┌───────────▼─────────────────────────▼───────────────┐
│               heady-production                       │
│  Grant Registry (Postgres)  │  Audit Ledger          │
│  Mission Profile (pgvector  │  (append-only table)   │
│  via latent-core-dev)       │                        │
└─────────────────────────────────────────────────────┘
            │                         │
┌───────────▼────────────┐  ┌────────▼───────────────┐
│  headyconnection-core  │  │  headybuddy-core        │
│  Email alerts, shared  │  │  Push notification      │
│  workspace, staff auth │  │  alerts, companion UI   │
└────────────────────────┘  └────────────────────────┘
```

**Key components:**
- **Discovery Agent:** Cloudflare Worker (scheduled) that queries external funding APIs, normalizes results, and writes to Grant Registry.
- **Match Engine:** Python service in heady-production that embeds opportunity text via latent-core-dev and computes cosine similarity against mission profile vectors.
- **Draft Generator:** headymcp-core tool `generate_grant_application` — accepts opportunity ID, pulls mission profile and program data, calls LLM with structured prompt chain, returns section-by-section draft.
- **Audit Ledger:** Postgres append-only table (INSERT-only role) with row-level security; readable by admin principals only.

---

## 8. Data Flows

**Discovery flow:**
```
External APIs (grants.gov, Candid) 
  → Discovery Agent (Cloudflare Worker)
  → Normalize & deduplicate
  → Write to Grant Registry (heady-production Postgres)
  → Trigger match scoring job
```

**Match scoring flow:**
```
New opportunity in Grant Registry
  → Embed opportunity text (latent-core-dev embedding service)
  → Cosine similarity vs. mission profile vectors
  → Write match_score + match_explanation to Grant Registry
  → If match_score ≥ 70 → flag as "Active Opportunity"
  → Notify assigned staff via headyconnection-core + headybuddy-core
```

**Draft generation flow:**
```
Staff clicks "Generate Draft" on opportunity
  → headymcp-core tool call: generate_grant_application(opportunity_id)
  → Fetch opportunity detail + mission profile + program data
  → LLM prompt chain → section drafts
  → Store draft in Grant Registry with status = "Pending Review"
  → Audit log entry written
```

**Approval flow:**
```
Staff reviews sections → approves each
  → All sections approved → Draft status = "Ready for Submission"
  → Final audit log entry with approver identity + timestamp
  → Deadline tracker remains active until submission confirmed
```

---

## 9. Security & Privacy

- All grant data (narratives, org financials referenced in applications) stored in heady-production with row-level security; only HeadyConnection principals can read/write.
- External funding API credentials stored in Cloudflare Secrets, never in source code or logs.
- Audit ledger is INSERT-only from application layer; read access requires admin role. This ensures tamper-evident provenance.
- AI-generated narratives must display a clear "AI-Assisted Draft — Human Review Required" banner in UI until all sections are approved.
- No grant application data is shared with third-party LLM providers without explicit data processing agreements.
- PII (staff names, org financials) redacted from LLM prompt context; only non-sensitive mission and program descriptions passed to model.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headymcp-core — `generate_grant_application` tool | Internal | New tool — must be built |
| latent-core-dev — embedding service | Internal | Existing — extend mission profile schema |
| heady-production — Postgres Grant Registry table | Internal | New table — migration required |
| headyconnection-core — staff auth + workspace | Internal | Existing — add Grant panel role |
| headybuddy-core — push notifications | Internal | Existing — add grant alert type |
| grants.gov API | External | Public API — no auth required |
| Candid / Foundation Directory API | External | Requires API key — procurement needed |
| Cloudflare Workers (scheduled triggers) | Infrastructure | Existing pattern — new worker instance |

---

## 11. Phased Rollout

### Phase 1 — Foundation (Weeks 1–4)
- Build Grant Registry schema in heady-production
- Implement Discovery Agent (grants.gov only)
- Implement match engine with mission profile seeding
- Deadline tracker + email alerts

### Phase 2 — Drafting (Weeks 5–8)
- Build `generate_grant_application` MCP tool
- Build draft editor UI in Grant Constellation panel
- Implement human review gate and approval workflow
- Audit ledger implementation

### Phase 3 — Constellation (Weeks 9–12)
- Constellation Map visual graph
- Expand Discovery Agent to Candid + regional funders
- Eligibility pre-screen logic
- HeadyBuddy push alert integration
- Staff training and first live grant cycle

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Qualified opportunities surfaced/quarter | 0 (manual) | ≥ 10 |
| Grant research hours/quarter | ~40 hrs | ≤ 12 hrs |
| Draft completion rate | 0% | ≥ 80% |
| Missed deadlines | Unknown | 0 |
| Audit log completeness | N/A | ≥ 95% |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Which Candid tier API plan does HeadyConnection have access to? | Eric / Finance | Yes — affects discovery scope |
| Who is the designated grant application approver? | Eric | Yes — needed for review gate config |
| Should grant narratives be stored in the main heady-production DB or a dedicated headyconnection-core DB for data residency? | Engineering | Yes — architectural decision |
| Should match score threshold (70) be configurable per program? | Product | No — can be hardcoded for v1 |
