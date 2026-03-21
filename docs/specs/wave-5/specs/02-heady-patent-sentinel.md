# Heady Patent Sentinel — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (IP Intelligence panel) + headyapi.com  
**Heady Domain Anchor:** heady-sentinel (existing), headyapi-core, headyme-core  

---

## 1. Problem Statement

Innovation teams at technology companies spend $50,000–$200,000 per year on patent search and monitoring services that are fragmented, slow, and disconnected from their actual R&D workflows. By 2026 the EU AI Act and growing USPTO examination AI-use policies mean that organizations developing AI-adjacent technologies must proactively document prior art discovery to demonstrate good-faith novelty analysis. Heady's existing `heady-sentinel` surface and `headyapi-core` provide an intelligence dispatch layer that can be extended into a continuous patent monitoring and novelty-scoring engine without rebuilding from scratch.

**Cost of not solving it:** IP risk accumulates silently; competitive intelligence on adversarial filers is missed; headyapi.com's monetization case weakens.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Deliver automated prior-art discovery for new invention disclosures | Time from disclosure to prior-art report | < 4 hours |
| G2 | Monitor adversarial patent filings in real time | Median lag from USPTO/EPO publication to alert | < 48 hours |
| G3 | Provide novelty gap scoring to guide claim differentiation | Accuracy of novelty score vs. attorney judgment | ≥ 80% agreement in blind test |
| G4 | Establish headyapi.com as the standard Heady IP intelligence endpoint | API calls in 90 days post-launch | ≥ 10,000 |
| G5 | Reduce IP team research hours per filing | Self-reported hours saved per disclosure | ≥ 6 hours |

---

## 3. Non-Goals

- **Not a legal opinion engine.** Patent Sentinel surfaces signals and scores but explicitly does not provide legal advice or replace patent attorney review.
- **Not a patent drafting tool.** Claims drafting is a separate initiative; Sentinel focuses on search, monitoring, and scoring.
- **Not a trademark or copyright monitor.** Scope is patents and patent applications only in V1.
- **Not a prosecution management system.** Deadline tracking, office action responses, and docketing are out of scope.
- **Not a public patent database.** Sentinel is a consumer of databases (USPTO, EPO, Google Patents), not a host.

---

## 4. User Stories

**IP analyst / in-house counsel**
- As an IP analyst, I want to submit an invention disclosure and receive a ranked prior-art report within 4 hours so that I can brief the attorney before the week's end.
- As an IP analyst, I want to set up a "watch" on competitor patent families so that I am alerted when new continuations are filed.
- As an IP analyst, I want a novelty gap score for my draft claims so that I know which claim elements need strengthening before filing.

**Executive / R&D leader**
- As a CTO, I want a portfolio landscape view showing our filing density vs. competitor density across technology clusters so that I can identify white-space opportunities.

**Developer (headyapi.com)**
- As a developer integrating via headyapi.com, I want a REST endpoint that accepts claim text and returns a prior-art hit list with similarity scores so that I can embed IP intelligence in my internal R&D tool.

---

## 5. Requirements

### P0 — Must Have
- **Disclosure ingestion:** Accept free-text invention disclosure (or structured form) and extract key technical claims, keywords, and CPC/IPC class suggestions.
- **Prior-art search:** Fan-out search across USPTO full-text, EPO Espacenet, Google Patents, and arXiv preprints. Return top-20 hits with similarity score and abstracted relevance note.
- **Watch list monitoring:** User configures watches on assignees, inventors, keywords, or CPC classes. Nightly delta query; new hits trigger in-app notification and optional email digest.
- **Novelty gap scoring:** Given disclosure text and prior-art hits, compute a 0–100 novelty score per claim element, with a brief differentiation rationale.
- **headyapi.com endpoint:** `POST /v1/patent/prior-art-search`, `POST /v1/patent/novelty-score`, `GET /v1/patent/watch-alerts`. Rate-limited, JWT-authenticated.
- **heady-sentinel integration:** Patent Sentinel runs as a new watcher on the existing `heady-sentinel` pub/sub scaffold. New event types: `patent.prior_art_result`, `patent.watch_alert`, `patent.novelty_score`.

### P1 — Should Have
- **Portfolio landscape chart:** Bubble chart on headyme.com IP panel showing patent count by technology cluster for user's organization vs. configured competitors.
- **Claim differentiation assistant:** Conversational flow in HeadyBuddy that takes a novelty gap score and helps the user draft a differentiated claim element.
- **Export to PDF:** One-click prior-art report export, formatted for attorney handoff.
- **EU AI Act documentation mode:** When enabled, Sentinel appends a standardized prior-art discovery declaration to each report suitable for high-risk AI system documentation.

### P2 — Future
- **USPTO PAIR integration** for live prosecution status on owned applications.
- **Inter-partes review (IPR) risk scoring** for issued patents in the owned portfolio.
- **Collaborative annotations** where multiple team members can mark and discuss prior-art hits.

---

## 6. User Experience

**Entry point:** headyme.com → IP Intelligence panel → "New Disclosure" button; or `heady-sentinel` alert card linking to Sentinel detail view.

**Disclosure flow:**
1. User pastes or types invention description (or uploads a Word/PDF disclosure form).
2. Sentinel extracts claims and suggests CPC classes (user confirms or edits).
3. Search fans out; progress indicator shows databases being queried.
4. Results page: ranked hit table with similarity heatmap, novelty gap score per element, and download button.

**Watch alert flow:**
1. User creates a watch (assignee name, keyword, or CPC class).
2. Dashboard widget shows watch list with hit counts and last-checked timestamp.
3. New hit generates an in-app notification badge and can trigger an email digest (daily or immediate).

---

## 7. Architecture

```
headyme.com (IP Intelligence panel)
    │
    ▼
Patent Sentinel Service (new microservice, Cloud Run)
    ├─ Disclosure Ingestion Parser (LLM extraction via heady-ai.com)
    ├─ Search Dispatcher
    │   ├─ USPTO Full-Text API client
    │   ├─ EPO OPS API client
    │   ├─ Google Patents API client
    │   └─ arXiv API client
    ├─ Novelty Scorer (embedding comparison via pgvector + LLM reranker)
    ├─ Watch Engine (scheduled workers, Pub/Sub trigger)
    └─ heady-sentinel event publisher

headyapi-core (API Gateway)
    └─ /v1/patent/* routes → Patent Sentinel Service

heady-sentinel (existing)
    └─ Patent event types appended to event registry
```

**Embeddings:** Disclosure and prior-art abstracts embedded with text-embedding-3-large; stored in dedicated `patent_vectors` table in pgvector.

---

## 8. Data Flows

```
Disclosure submitted
    → Ingestion Parser (heady-ai.com LLM call)
    → CPC class suggestions + claim extraction
    → Search Dispatcher (parallel API calls, timeout: 90s)
    → Results aggregated, deduplicated
    → Novelty Scorer (embedding similarity + LLM reranker)
    → Report written to pgvector (patent_reports table)
    → headyme.com result render + heady-sentinel event

Watch Engine (nightly cron)
    → Per-watch delta query against USPTO/EPO
    → New hits compared against stored watch baseline
    → Delta alerts published to heady-sentinel pub/sub
    → In-app notification + optional email digest
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Disclosure confidentiality | Disclosures encrypted at rest (AES-256); not used for model training; isolated per org namespace |
| API key security | headyapi.com keys are scoped (read-only vs. full); rotatable; displayed once at creation |
| Competitive intelligence data | Watch list configurations treated as confidential; not surfaced in any shared dataset |
| Third-party API terms | USPTO/EPO/Google Patents APIs used within published terms of service; rate limits respected |
| Attorney-client privilege | Sentinel outputs carry "AI-generated, not legal advice" watermark; privilege warnings on export templates |
| EU AI Act compliance | High-risk designation check on submission; if user indicates AI system classification, EU documentation mode auto-enabled |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| USPTO full-text search API access | External (USPTO) | Yes — P0 |
| EPO OPS API credentials | External (EPO) | Yes — P0 |
| heady-ai.com LLM router (extraction + reranker) | HeadyAI | Yes — P0 |
| pgvector `patent_vectors` table provisioning | HeadyMe engineering | Yes — P0 |
| heady-sentinel event registry extension | Sentinel team | Yes — P0 |
| headyapi-core route registration | HeadyAPI team | Yes — P0 |
| Google Patents API access | External (Google) | No — P1 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Disclosure ingestion + USPTO search only.
- Novelty gap scoring (basic embedding similarity, no LLM reranker).
- Internal test with HeadySystems R&D disclosures.

**Phase 2 — Beta (Weeks 5–8)**
- EPO and arXiv search added.
- Watch list engine live.
- headyapi.com endpoints open to beta API consumers.
- heady-sentinel event types active.

**Phase 3 — Public (Weeks 9–12)**
- Google Patents added.
- PDF export and EU AI Act documentation mode.
- Portfolio landscape chart.
- Success metrics review; V2 roadmap for PAIR integration scoped.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Time to prior-art report | Internal timer | Per query | < 4 hours | < 2 hours |
| Watch alert latency | Monitoring | 30 days | < 48 hours | < 24 hours |
| Novelty score accuracy | Blind attorney test | 60 days | 80% agreement | 90% |
| headyapi.com patent calls | API telemetry | 90 days | 10,000 | 30,000 |
| Hours saved per disclosure | User survey | 90 days | 6 hours | 10 hours |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should Sentinel cache USPTO/EPO results to reduce API costs, and what is the acceptable staleness window? | Engineering | No |
| OQ2 | Does the EU AI Act documentation mode require legal review of its template language before launch? | Legal | No |
| OQ3 | Should novelty scores be stored permanently or expire after a configurable period? | Product | No |
| OQ4 | Are there USPTO fair-use restrictions on storing and displaying full-text patent abstracts? | Legal | Yes — pre-launch |
