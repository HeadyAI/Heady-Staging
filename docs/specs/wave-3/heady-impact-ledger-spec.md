# Heady Impact Ledger
### Feature Specification — Third Wave
**Version:** 1.0  
**Date:** 2026-03-17  
**Owner:** HeadyConnection.org  
**Domain:** headyconnection.org / headysystems.com  
**Skill Target:** heady-impact-ledger-design

---

## 1. Purpose

Heady Impact Ledger is a structured, real-time record of a nonprofit organization's social impact: funding received, programs delivered, outcomes measured, and beneficiaries served. It functions as the financial and programmatic source of truth for HeadyConnection.org, enabling board reporting, grant compliance, donor transparency, and AI-assisted narrative generation. Unlike standard accounting software, the Impact Ledger links dollar amounts to specific program outcomes and beneficiary counts, creating a unified view of organizational effectiveness.

**Problem Statement:**  
Nonprofits are required to demonstrate impact to funders, regulators, and the public, but this data typically lives in disconnected systems — QuickBooks for finances, spreadsheets for program data, narrative documents for outcomes. Synthesizing a coherent impact story from these fragmented sources is labor-intensive and error-prone. The Heady Impact Ledger consolidates these streams into a single queryable record that automatically feeds dashboards, reports, and grant applications.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Provide a single source of truth for organizational impact data | Zero discrepancies between Ledger and board reports within 60 days |
| G2 | Reduce time to prepare quarterly board reports by 60% | Staff time tracked before and after |
| G3 | Enable grant compliance reporting in one click | Report generation time ≤ 5 minutes per grant |
| G4 | Surface real-time program budget vs. actuals | Dashboard update latency ≤ 1 hour |
| G5 | Feed impact data to Donor Resonance Engine and Grant Constellation | 100% of impact events available to downstream services |

---

## 3. Non-Goals

- **Not a full accounting system.** The Ledger does not replace QuickBooks, Sage Intacct, or other GAAP-compliant accounting tools. It receives summarized financial events, not individual journal entries.
- **Not a payroll system.** Employee compensation and benefits are out of scope.
- **Not a donor database.** Individual donor records, contact management, and giving histories belong to the Donor Resonance Engine.
- **Not a grant application tool.** That is Heady Grant Constellation's domain.
- **Not a public-facing transparency portal.** v1 is internal-only; public reporting is a Phase 4 consideration.

---

## 4. User Stories

### Finance Manager / Executive Director
- As an executive director, I want to see a real-time dashboard of program spending vs. budget so that I can catch overruns early.
- As an executive director, I want to generate a grant compliance report for any active grant in under 5 minutes so that I can meet funder reporting deadlines without manual data assembly.
- As a finance manager, I want to import funding events from the Grant Constellation automatically so that I do not manually enter every awarded grant.

### Program Director
- As a program director, I want to log outcome milestones (e.g., "50 youth served this quarter") against the appropriate program so that our impact data stays current.
- As a program director, I want to see a cost-per-outcome calculation for each program so that I can make evidence-based arguments for funding.

### Board Member
- As a board member, I want a one-page impact summary before every board meeting so that I can fulfill my governance responsibility without digging through spreadsheets.

### AI Services (HeadyAI / Grant Constellation / Donor Resonance Engine)
- As an AI service, I want structured access to current impact data (programs, outcomes, beneficiaries, funding) via a clean API so that I can generate accurate, data-grounded narratives and recommendations.

---

## 5. Requirements

### P0 — Must Have
- **Funding Record Model:** Structured records for each grant, donation, or contract: source, amount, date received, program allocation, reporting requirements, and expiration.
- **Program Registry:** Named programs with descriptions, budget lines, outcome targets, and beneficiary categories.
- **Outcome Logging:** Manual and API-driven entry of outcome milestones (numeric or descriptive) tied to a program and date range.
- **Budget vs. Actuals Tracker:** Per-program view of allocated budget, spent-to-date, and remaining balance, updated via accounting system sync or manual entry.
- **Grant Compliance Report Generator:** Auto-assembled report per active grant, pulling spending, outcomes, and narrative from Ledger data.
- **Impact Dashboard:** Real-time summary: total funding, programs active, beneficiaries served, top outcome metrics.
- **Event Bus Publisher:** Emit structured events (`grant.awarded`, `outcome.logged`, `budget.updated`) for consumption by Grant Constellation, Donor Resonance Engine, and reporting tools.
- **API:** RESTful and event-driven API for all Ledger data, secured with service-to-service authentication.

### P1 — Should Have
- **Accounting System Sync:** One-way import from QuickBooks Online (or CSV) to populate spending actuals without manual re-entry.
- **Fiscal Year Configuration:** Configurable fiscal year start; YTD calculations relative to org's fiscal calendar.
- **Multi-Fund Support:** Track restricted, unrestricted, and temporarily restricted funds per FASB standards.
- **Export:** CSV, PDF, and XLSX export for all reports and datasets.
- **Audit Trail:** Immutable log of all record edits with user ID, timestamp, and prior value.

### P2 — Future Considerations
- Public-facing impact transparency page auto-generated from Ledger data.
- Machine learning-assisted outcome prediction ("at current pace, you will serve 1,200 beneficiaries by year end").
- Multi-org support for fiscal sponsorship arrangements.
- Integration with Salesforce NPSP.

---

## 6. User Experience

### Impact Dashboard
- Hero metrics: Total Funding Active, Programs Running, Beneficiaries Served YTD, Outcomes Logged.
- Program cards: each shows budget gauge, top outcome metric, and last-updated timestamp.
- "Quick Log Outcome" button opens a modal for rapid data entry.

### Program Detail View
- Program header: name, description, start/end dates, lead staff.
- Budget tab: funding sources allocated, spending actuals (from sync), remaining balance, burn rate chart.
- Outcomes tab: timeline of logged milestones, cumulative beneficiary count, cost-per-outcome calculation.
- Reports tab: list of linked grant reports; click to preview or export.

### Grant Compliance Report
- Funder name, grant ID, reporting period auto-populated from Funding Record.
- Sections: Financial Summary (budget vs. actuals), Program Narrative (AI-drafted from outcome data), Outcome Table, Next Steps.
- One-click PDF export with organization letterhead.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Heady Impact Ledger                       │
│                                                                 │
│  ┌───────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │  Funding      │   │  Program         │   │  Outcome      │  │
│  │  Record Store │   │  Registry        │   │  Log          │  │
│  └───────┬───────┘   └────────┬─────────┘   └───────┬───────┘  │
│          └────────────────────┼─────────────────────┘          │
│                               ▼                                 │
│                    ┌──────────────────┐                         │
│                    │  Impact Ledger   │                         │
│                    │  Core DB         │                         │
│                    │  (PostgreSQL)    │                         │
│                    └────────┬─────────┘                         │
│                             │                                   │
│         ┌───────────────────┼─────────────────────┐            │
│         ▼                   ▼                     ▼            │
│  ┌────────────┐   ┌──────────────────┐   ┌──────────────┐      │
│  │  Dashboard │   │  Report          │   │  Event Bus   │      │
│  │  API       │   │  Generator       │   │  Publisher   │      │
│  │  (REST)    │   │  (PDF/XLSX)      │   │  (Pub/Sub)   │      │
│  └────────────┘   └──────────────────┘   └──────┬───────┘      │
│                                                  │              │
│                        ┌─────────────────────────┘              │
│                        ▼                                        │
│         ┌──────────────────────────────────────┐               │
│         │         Downstream Consumers          │               │
│         │  Grant Constellation │ Donor Engine   │               │
│         │  HeadyAI Narratives  │ Board Reports  │               │
│         └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
- Backend: Cloud Run (Node.js / TypeScript)
- Database: PostgreSQL (Cloud SQL) with row-level security per program
- Event Bus: Google Cloud Pub/Sub
- Report Generation: Puppeteer (PDF) + ExcelJS (XLSX) on Cloud Run
- Frontend: React SPA, embedded in headyconnection.org admin panel
- Auth: Heady identity layer; service-to-service via signed JWT

---

## 8. Data Flows

### Funding Record Ingestion (from Grant Constellation)
1. Grant Constellation emits `grant.awarded` event to Pub/Sub topic `heady-impact-events`.
2. Impact Ledger subscriber picks up event; creates Funding Record with amount, funder, program allocation, reporting requirements.
3. Program budget allocation updated; dashboard metrics refreshed.

### Outcome Logging (manual or API)
1. Program director logs an outcome via the UI form (program, metric name, value, date, notes).
2. System validates against program registry (program must exist and be active).
3. Outcome record saved; cost-per-outcome recalculated for affected program.
4. `outcome.logged` event emitted to Pub/Sub for downstream consumers.

### Accounting Sync (QuickBooks)
1. Scheduled job (weekly) or manual trigger pulls transaction data from QuickBooks Online API.
2. Transactions mapped to programs via configurable chart of accounts mapping.
3. Budget actuals updated; discrepancy alerts surfaced if actuals exceed budget line.

### Grant Compliance Report Generation
1. User selects a Funding Record and a reporting period.
2. System assembles: Financial Summary (from budget tracker), Outcome Table (from outcome log), narrative context sent to HeadyAI for paragraph generation.
3. Report rendered to PDF via Puppeteer; stored in R2 with link returned to user.

---

## 9. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Financial data sensitivity | Role-based access: Admin, Finance, Program, Viewer; row-level security on program data |
| Audit integrity | Append-only audit log; no destructive deletes (soft delete with archived flag) |
| Service-to-service auth | Signed JWT with short TTL for all internal API calls |
| Data encryption | AES-256 at rest; TLS 1.3 in transit |
| API rate limiting | Per-service rate limits to prevent data exfiltration |
| Backup | Daily automated backups to Cloud Storage with 90-day retention |

---

## 10. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| Grant Constellation | Internal upstream | Medium — event integration requires Constellation to be live |
| HeadyAI narrative layer | Internal | Low — reports degrade to data-only if AI unavailable |
| QuickBooks Online API | External | Medium — requires API credentials and account mapping setup |
| Google Cloud Pub/Sub | Infrastructure | Low — managed service |
| Cloud SQL PostgreSQL | Infrastructure | Low — managed service |
| Donor Resonance Engine | Internal downstream | Low — Ledger doesn't depend on Donor Engine |

---

## 11. Phased Rollout

### Phase 1 — Core Ledger (Weeks 1–3)
- Data model: Funding Records, Program Registry, Outcome Log.
- Manual data entry UI for all record types.
- Basic dashboard with hero metrics.
- CSV import for historical funding and program data.

### Phase 2 — Reporting (Weeks 4–6)
- Grant compliance report generator (PDF export).
- Budget vs. actuals tracker with manual actuals entry.
- Audit trail implementation.
- XLSX export for all datasets.

### Phase 3 — Integration (Weeks 7–10)
- Event Bus publisher (Pub/Sub) for all impact events.
- Grant Constellation inbound integration (auto-ingest awarded grants).
- QuickBooks Online API sync for spending actuals.
- HeadyAI narrative generation for compliance reports.

### Phase 4 — Enhancement (Post-launch)
- Donor Resonance Engine integration (impact data → donor stories).
- Public impact transparency page.
- Multi-fund FASB accounting support.
- Outcome prediction modeling.

---

## 12. Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| Board report preparation time | ≤ 30 minutes (from hours) | 60 days post-launch |
| Compliance report generation | ≤ 5 minutes per grant | 30 days post-launch |
| Data completeness | ≥ 95% of active grants have linked outcomes | 90 days post-launch |
| Downstream API availability | 99.5% uptime for Grant Constellation and Donor Engine consumers | Ongoing |
| Budget accuracy | ≤ 5% variance between Ledger and accounting system actuals | 90 days post-launch |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Which QuickBooks Online account plan is active at HeadyConnection.org? | Eric | Yes (Phase 3) |
| What fiscal year does HeadyConnection.org use? | Eric | Yes (Phase 1) |
| Are there existing program definitions and outcome metrics to seed the registry? | Eric | Yes (Phase 1) |
| Should board members have direct Ledger access or receive PDF reports only? | Eric | No |
