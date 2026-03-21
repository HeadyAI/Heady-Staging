# Heady Grant Constellation
### Feature Specification — Third Wave
**Version:** 1.0  
**Date:** 2026-03-17  
**Owner:** HeadyConnection.org  
**Domain:** headyconnection.org / heady-ai.com  
**Skill Target:** heady-grant-constellation

---

## 1. Purpose

Heady Grant Constellation is a nonprofit grant intelligence and lifecycle management system. It aggregates public and private grant opportunities, maps them against the organization's active programs and impact metrics, auto-generates tailored application narratives using AI, tracks submission states, and closes the loop by feeding award data back into the Heady Impact Ledger. The goal is to dramatically compress the grant research-to-submission cycle for small nonprofits with lean staff.

**Problem Statement:**  
Nonprofit grant teams spend the majority of their time on discovery (finding relevant funders) and narrative formatting (rewriting the same mission content for each application template), rather than on strategy or program delivery. HeadyConnection.org is a small nonprofit where a single operator often manages grant work alongside other roles. A purpose-built constellation tool that surfaces right-fit opportunities and generates compliant draft narratives closes this capacity gap without adding headcount.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Reduce time from grant discovery to first draft by 70% | Tracked via session logs: time between search and draft export |
| G2 | Surface at least 20 high-fit grant opportunities per month | Opportunity feed volume; fit score ≥ 0.75 |
| G3 | Maintain 100% of active applications in a tracked pipeline | Zero untracked submissions 30 days post-launch |
| G4 | Improve win rate by enabling better narrative personalization | Year-over-year award conversion rate |
| G5 | Feed awarded grants directly into the Impact Ledger | 100% of closed awards reflected in Impact Ledger within 24 hours |

---

## 3. Non-Goals

- **Not a grant payment processor.** Heady Grant Constellation does not handle financial transactions, disbursements, or fund accounting. That is the role of the Heady Impact Ledger.
- **Not a compliance audit tool.** 990 filings, financial audits, and legal compliance remain external processes.
- **Not a CRM replacement.** Funder relationship management depth (call notes, personal connections) is out of scope for v1.
- **Not a grant writing service.** Constellation generates drafts; final editorial review and submission remain with human staff.
- **Not multi-org.** v1 serves only HeadyConnection.org; multi-tenant nonprofit support is a future consideration.

---

## 4. User Stories

### Nonprofit Program Director
- As a nonprofit program director, I want to see a curated list of grants matching our current programs so that I can prioritize which opportunities are worth pursuing without spending hours on research.
- As a nonprofit program director, I want a fit-score explanation for each grant so that I can quickly understand why it was recommended and what parts of our work to emphasize.
- As a nonprofit program director, I want to generate a first-draft narrative using our existing impact data so that I can submit applications faster without repeating boilerplate writing.

### Grant Administrator
- As a grant administrator, I want a pipeline board showing all active applications by stage (research, drafting, submitted, awarded, declined) so that nothing falls through the cracks.
- As a grant administrator, I want deadline reminders sent via HeadyBuddy notifications so that I never miss a submission window.
- As a grant administrator, I want to export a formatted application package (PDF or DOCX) so that I can submit to funders who require offline submissions.

### Executive Director
- As an executive director, I want a quarterly grant performance summary so that I can report to the board on pipeline health and award rates.
- As an executive director, I want awarded grants to automatically update our Impact Ledger so that program budgets reflect real-time funding status.

---

## 5. Requirements

### P0 — Must Have
- **Grant Discovery Feed:** Pull opportunities from public sources (Grants.gov, Foundation Center open data, state portals) filtered by NTEE codes matching HeadyConnection.org programs.
- **Fit Scoring Engine:** Score each grant opportunity (0–1.0) against organizational profile: mission alignment, eligibility, budget range, geography, program area.
- **Narrative Draft Generator:** Using Heady AI, generate a tailored draft for each application section (executive summary, program description, evaluation plan, budget narrative) seeded from organization profile and impact data.
- **Application Pipeline:** Kanban-style board with stages: Discovery → Qualifying → Drafting → Submitted → Awarded / Declined. Each card holds deadline, funder name, amount, fit score, and linked draft.
- **Deadline Alerting:** Push notifications via HeadyBuddy and email at 30-day, 14-day, and 3-day intervals before submission deadlines.
- **Impact Ledger Integration:** Awarded grants automatically push a funding event to the Heady Impact Ledger with amount, funder, program tag, and reporting requirements.

### P1 — Should Have
- **Funder Profile Pages:** Auto-generated profiles for each funder with giving history, average award size, typical eligibility notes, and past grantees (where public).
- **Draft Version History:** Track edits to draft narratives with diff view and rollback.
- **Letter of Inquiry (LOI) Mode:** Shorter draft format for funders requiring LOI before full application.
- **Collaboration Comments:** Allow multiple team members to annotate draft sections.

### P2 — Future Considerations
- Multi-organization support for consulting or umbrella nonprofits.
- AI-powered funder prospecting from LinkedIn/foundation websites.
- Integration with Salesforce Nonprofit Success Pack (NPSP).
- Grant ROI analysis: program cost-per-outcome vs. award size.

---

## 6. User Experience

### Discovery View
- Grid of grant cards, each showing: funder name, deadline, amount range, fit score badge (color-coded), program tag.
- Filter bar: date range, amount, program area, source, fit score threshold.
- One-click "Add to Pipeline" with stage selector.

### Draft Studio
- Split-pane: left panel shows grant requirements; right panel shows editable AI draft.
- Section navigator (executive summary, program description, budget narrative, evaluation plan).
- Inline AI suggestions: "Strengthen this paragraph," "Add a metric here," "Shorten to word limit."
- Export to PDF or DOCX.

### Pipeline Board
- Kanban columns per stage.
- Card color indicates urgency (red = <7 days, yellow = <14 days, green = >14 days).
- Click card to open detail drawer with full draft, funder profile, and activity log.

### Notification Center
- HeadyBuddy surfaces deadline alerts as conversational nudges: "The XYZ Foundation application is due in 3 days — want to review the draft?"

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Heady Grant Constellation                  │
│                                                                 │
│  ┌───────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │  Grant Feed   │   │  Fit Scoring     │   │  Draft Studio │  │
│  │  Aggregator   │──▶│  Engine (AI)     │──▶│  (HeadyAI)    │  │
│  │  (Grants.gov, │   │  Mission match,  │   │  Narrative gen│  │
│  │  Foundation   │   │  eligibility,    │   │  Section edit │  │
│  │  APIs, RSS)   │   │  budget range)   │   │  Export DOCX  │  │
│  └───────────────┘   └──────────────────┘   └───────┬───────┘  │
│                                                      │          │
│  ┌───────────────┐   ┌──────────────────┐            │          │
│  │  Pipeline     │◀──│  Application     │◀───────────┘          │
│  │  Board        │   │  Store (DB)      │                       │
│  │  (Kanban UI)  │   │  Postgres + R2   │                       │
│  └───────┬───────┘   └──────────────────┘                       │
│          │                                                       │
│          ▼                                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │             HeadyConnection.org Integrations               │  │
│  │   Impact Ledger  │  HeadyBuddy Alerts  │  Email/Calendar  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
- Backend: Cloud Run (Node.js / TypeScript)
- Database: PostgreSQL (Cloud SQL) + Cloudflare R2 for document storage
- AI Layer: HeadyAI routing → Perplexity for research, local LLM for draft generation
- Frontend: React SPA hosted on Cloudflare Pages, embedded in headyconnection.org
- Auth: Heady identity layer (OAuth2 + JWT)
- Notifications: HeadyBuddy webhook bridge + SendGrid email

---

## 8. Data Flows

### Grant Discovery Flow
1. Scheduled job (Cloud Scheduler, daily) queries Grants.gov API, Foundation Directory feeds, and configured RSS sources.
2. New opportunities deduplicated against existing grant store (hash on funder + deadline + title).
3. Fit Scoring Engine runs each new grant through the organizational profile vector match.
4. Opportunities with fit score ≥ 0.50 inserted into the Discovery feed; below-threshold records archived.

### Draft Generation Flow
1. User clicks "Generate Draft" on a pipeline card.
2. System assembles a context bundle: grant requirements, organizational profile (mission, programs, past outcomes), fit score rationale.
3. Context bundle sent to HeadyAI → routed to draft generation model.
4. Draft sections returned and stored in Application Store (versioned).
5. User edits trigger incremental re-saves; draft history maintained.

### Award → Impact Ledger Flow
1. User moves pipeline card to "Awarded" stage and inputs award amount + reporting requirements.
2. System emits a `grant.awarded` event to the Heady internal event bus.
3. Impact Ledger consumer picks up the event and creates a new funding record.
4. Program budget allocation triggered for linked program tags.

---

## 9. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Funder data sensitivity | Public funder data only in v1; no scraping of private databases |
| Draft narrative IP | Drafts stored encrypted at rest (AES-256 via Cloud SQL); R2 objects use server-side encryption |
| Access control | Role-based: Admin (full), Editor (draft + pipeline), Viewer (read-only) |
| API keys | All external API credentials stored in Google Secret Manager; never in code |
| Data residency | All data stored in US regions; compliant with standard nonprofit data handling |
| Audit log | All pipeline state changes and draft edits logged with user ID and timestamp |

---

## 10. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| Grants.gov API | External API | Low — stable public API; fallback to RSS |
| Heady Impact Ledger | Internal | Medium — must be deployed before full award flow works |
| HeadyAI routing layer | Internal | High — draft generation requires AI routing to be live |
| HeadyBuddy notification bridge | Internal | Low — alerts degrade gracefully to email |
| HeadyConnection.org org profile data | Data | Medium — profile must be populated before fit scoring works |
| Cloud SQL (PostgreSQL) | Infrastructure | Low — managed service |
| Cloudflare R2 | Infrastructure | Low — managed service |

---

## 11. Phased Rollout

### Phase 1 — Foundation (Weeks 1–4)
- Deploy grant feed aggregator with Grants.gov + 2 foundation RSS sources.
- Build organizational profile data model and seed with HeadyConnection.org data.
- Basic fit scoring (keyword + NTEE code match).
- Simple list view of discovered grants; manual "Add to Pipeline."
- Pipeline board (Kanban) with 5 stages.

### Phase 2 — Intelligence (Weeks 5–8)
- AI-powered fit scoring using vector similarity on mission statement.
- Draft Studio with section-by-section narrative generation.
- Draft versioning and export (PDF, DOCX).
- Deadline alerting via email.

### Phase 3 — Integration (Weeks 9–12)
- Impact Ledger integration: awarded grants push funding events.
- HeadyBuddy notification bridge for conversational deadline alerts.
- Funder profile pages.
- Quarterly performance dashboard for board reporting.

### Phase 4 — Enhancement (Post-launch)
- LOI mode.
- Collaboration comments.
- Additional funder data sources.
- Multi-org support exploration.

---

## 12. Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| Time to first draft | ≤ 15 minutes from opportunity selection | 30 days post-launch |
| Opportunities surfaced | ≥ 20 high-fit/month | Monthly |
| Pipeline coverage | 100% of active applications tracked | 30 days post-launch |
| Award conversion rate | ≥ 25% improvement YoY | 12 months |
| Draft export usage | ≥ 80% of submitted applications used a Constellation draft | 90 days post-launch |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Which foundation directory APIs are accessible within nonprofit budget? | Eric / Product | Yes (Phase 2) |
| What is the org profile data format for mission/program descriptions? | Eric | Yes (Phase 1) |
| Should the Impact Ledger integration use a synchronous API call or event bus? | Architecture | Yes (Phase 3) |
| Will board-level reporting need SSO/separate login? | Eric | No |
