# Spec 02 — Heady Impact Ledger

**Wave:** Third Wave  
**Domain:** headyconnection.org / HeadyConnection nonprofit  
**Primary Repos:** headyconnection-core, heady-production, latent-core-dev, headymcp-core  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Impact Ledger is a traceable, narrative-enriched accounting and impact record system for HeadyConnection's nonprofit activities. It is distinct from standard accounting software: it links every financial transaction, grant disbursement, and program expenditure to a concrete outcome narrative — creating the data foundation for grant reports, donor communications, IRS filings, and board accountability. The ledger is designed to be AI-readable and auditable, enabling automated impact narrative generation from real financial and program records.

**Why it matters:** Nonprofits fail audits and lose donor trust not because they misuse money but because they cannot trace funds to outcomes. Impact Ledger closes that traceability gap with an append-only, AI-assisted record that is always ready for reporting.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Every dollar received is linked to at least one outcome narrative within 30 days | Linkage completion rate ≥ 95% |
| G2 | Generate board-ready quarterly impact reports automatically from ledger data | Report generation time ≤ 10 minutes, zero manual data assembly |
| G3 | Achieve ≥ 90% traceability score on next formal audit | Auditor finding count on traceability < 2 |
| G4 | Reduce time spent on grant financial reporting by 60% | Staff hours tracked against baseline |
| G5 | Impact Ledger data feeds Grant Constellation and Donor Resonance Engine without manual export | Zero manual CSV exports required |

---

## 3. Non-Goals

- **Full accounting system replacement** — Impact Ledger is a traceability and narrative layer, not a double-entry accounting system. It integrates with QuickBooks Online or similar; it does not replace it.
- **Payroll or HR** — Employee compensation records are out of scope.
- **Fundraising campaign management** — That is Donor Resonance Engine's domain.
- **Investment portfolio tracking** — Out of scope for v1.

---

## 4. User Stories

**As a program director,** I want to log a program expenditure (e.g., "purchased 50 tablets for youth coding program") and immediately tag it to a grant line item and a program outcome so that the money is always traceable.

**As an executive director,** I want to generate a quarterly impact report that shows, for every funding source: what was received, what was spent, what outcomes were achieved, and what narrative evidence supports each outcome — in under 10 minutes.

**As a board member,** I want a live Impact Dashboard showing total funds by source, expenditure by program area, and outcome achievements to date so that I can fulfill my fiduciary duty at any board meeting.

**As an auditor,** I want to pull a complete transaction-to-outcome chain for any line item — seeing the original receipt, the program event it funded, the outcome recorded, and the staff member who logged it — in a single view.

**As a grant manager,** I want the ledger to automatically pre-populate grant financial reports based on tagged expenditures so that reporting requires review, not assembly.

---

## 5. Requirements

### P0 — Must Have

- **Transaction Registry:** Append-only log of all income (grants, donations, earned revenue) and expenditures tagged with: amount, date, account category, grant/fund source, program area, staff recorder, and optional narrative note.
- **Outcome Tagging:** Each transaction can be linked to one or more program outcomes in the Outcome Registry. Outcome records contain: description, beneficiary count, evidence type (photo, survey, testimonial, metrics), and recording date.
- **Grant Line Tracking:** Transactions are linkable to specific grant line items. Burn rate and balance are auto-calculated per grant.
- **Traceability Score:** Calculated score (0–100) for each grant/fund reflecting the percentage of dollars with complete transaction→outcome chains. Shown prominently on dashboard.
- **Impact Report Generator:** headymcp-core tool `generate_impact_report(period, fund_id)` that assembles a structured report from ledger data — financial summary + narrative outcomes per program area.
- **QuickBooks Integration:** One-way sync of transaction records from QBO to Impact Ledger (read-only pull). Impact Ledger never writes back to QBO.
- **Role-Based Access:** Finance role (full read/write), Program role (write own area, read all), Board role (read-only dashboard), Auditor role (full read + audit trace).

### P1 — Should Have

- **Outcome Evidence Uploads:** Attach photos, PDFs, or survey exports as evidence to outcome records; stored in Cloudflare R2 with signed URLs.
- **Automated Narrative Suggestions:** When a transaction is logged, AI suggests a matching outcome narrative based on similar past entries (via latent-core-dev semantic search).
- **Board Dashboard:** Live visual dashboard — funds received, spent, program outcomes achieved — available at a board-accessible URL (`headyconnection.org/board`).
- **Data API for Sibling Systems:** Secure REST endpoint so Grant Constellation and Donor Resonance Engine can pull aggregated impact data without manual exports.

### P2 — Future

- **IRS Form 990 pre-population** from ledger data.
- **Impact Ledger federated model** — allow peer nonprofits to contribute anonymized impact data for benchmarking.
- **Blockchain anchoring** of audit records for tamper-proof external verification.

---

## 6. User Experience

1. **Entry point:** Impact Ledger section within headyconnection.org admin (`/ledger`).
2. **Dashboard:** Top-level shows four summary tiles: Total Funds YTD, Total Expenditure YTD, Active Grant Count, and Overall Traceability Score. Below: program area breakdown cards.
3. **Transaction entry:** Clean form — amount, direction (in/out), source/destination, account category, fund/grant, program area, narrative note (optional), and "Link Outcome" button.
4. **Outcome linking:** Modal search over existing outcomes or quick-create for a new one. After linking, traceability score updates in real time.
5. **Grant view:** Per-grant detail page showing: budget vs. actual table per line item, burn rate sparkline, transaction list, and a one-click "Generate Financial Report" button.
6. **Impact Report:** Generated report opens as a formatted preview (Markdown → PDF export) with sections: Executive Summary, Financial Summary by Program, Outcomes by Program, Evidence Index. Downloadable as PDF.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│          headyconnection.org UI (/ledger)            │
│          (template-heady-ui micro-frontend)          │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────┐
│              headyconnection-core API               │
│  Transaction service | Outcome service              │
│  Traceability engine | Report generator             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 heady-production                     │
│  transactions (append-only)                         │
│  outcomes (append-only)                             │
│  grant_lines (mutable — balance updates)            │
│  traceability_scores (materialized view)            │
│  audit_trace (append-only)                          │
└───────────┬─────────────────────────────────────────┘
            │                         │
┌───────────▼────────────┐  ┌────────▼───────────────┐
│  latent-core-dev        │  │  headymcp-core          │
│  Outcome embeddings     │  │  generate_impact_report │
│  Semantic suggestion    │  │  tool                   │
└────────────────────────┘  └────────────────────────┘
            │
┌───────────▼────────────┐
│  QuickBooks Online API  │
│  (read-only sync)       │
└────────────────────────┘
```

---

## 8. Data Flows

**Transaction ingestion (manual):**
```
Staff logs transaction in UI
  → Transaction record created (append-only)
  → Audit trace entry written
  → If fund_id matches active grant → grant_lines balance updated
  → Traceability score recalculated for affected fund
  → Narrative suggestion fetched from latent-core-dev (async)
```

**QuickBooks sync (automated):**
```
Nightly Cloudflare Worker calls QBO API
  → Pulls new transactions since last sync
  → Maps to ledger schema (account → program area, memo → narrative)
  → Writes to transactions table with source = "QBO"
  → Flags for human outcome-linking if not auto-matched
```

**Impact report generation:**
```
Staff triggers "Generate Report"
  → headymcp-core: generate_impact_report(period, fund_id)
  → Fetch financial summary from transactions + grant_lines
  → Fetch outcomes linked to transactions in period
  → Fetch evidence records
  → LLM assembles narrative sections
  → Return structured report; rendered to PDF on download
```

**Sibling system data feed:**
```
Grant Constellation / Donor Resonance Engine call:
  GET /api/impact-summary?fund_id=...&period=...
  → Returns aggregated: total_spent, outcome_count, traceability_score
  → No PII or individual transactions exposed
```

---

## 9. Security & Privacy

- `transactions` and `outcomes` tables are INSERT-only from the application layer. Updates to narrative notes go through a separate `transaction_amendments` table that preserves original records.
- Board and public-facing dashboards show only aggregate values — never individual transaction details.
- QuickBooks sync token stored in Cloudflare Secrets. No QBO credentials in source.
- Outcome evidence files stored in Cloudflare R2 with signed, time-limited URLs. No public access.
- PII in outcome narratives (beneficiary names) must be anonymized before any AI processing.
- All access is logged to audit_trace with principal identity, action, and timestamp.
- Compliance: designed to meet IRS Form 990 record-keeping requirements and state charity registration audit standards.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| heady-production — Postgres schema (new tables) | Internal | Migration required |
| headyconnection-core — API service + auth | Internal | Extend with ledger service |
| latent-core-dev — outcome embedding + similarity | Internal | Extend schema; add outcome corpus |
| headymcp-core — `generate_impact_report` tool | Internal | New tool |
| QuickBooks Online API | External | API key + OAuth — procurement needed |
| Cloudflare R2 — evidence storage | Infrastructure | Existing pattern — new bucket |
| PDF export library (e.g., Puppeteer or WeasyPrint) | Internal | Select + integrate |

---

## 11. Phased Rollout

### Phase 1 — Core Ledger (Weeks 1–4)
- Implement transaction and outcome schema in heady-production
- Build transaction entry UI and outcome linking
- Traceability score calculation
- Role-based access setup

### Phase 2 — Integration (Weeks 5–8)
- QuickBooks sync worker
- Grant line item tracking
- AI narrative suggestion (latent-core-dev)
- Data API for sibling systems

### Phase 3 — Reporting (Weeks 9–12)
- `generate_impact_report` MCP tool
- PDF export
- Board Dashboard
- Evidence upload (Cloudflare R2)
- First full quarterly report cycle

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Traceability score (overall) | ~0% (no system) | ≥ 85% |
| Report assembly time | 8–16 hours/quarter | ≤ 30 minutes |
| Grant reporting staff hours | ~20 hrs/grant report | ≤ 8 hrs/grant report |
| Missed outcome linkages per quarter | Unknown | ≤ 5% of transactions |
| Audit findings on traceability | Unknown | 0 |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Does HeadyConnection use QuickBooks Online or another accounting system? | Eric | Yes — determines sync path |
| What is the current grant reporting cadence (monthly/quarterly/annual)? | Program Director | No — affects report scheduling |
| Are beneficiary outcome records subject to FERPA or HIPAA? | Legal | Yes — affects PII handling rules |
| Should traceability scores be visible to all staff or only finance/admin? | Eric | No — default to all, configurable |
