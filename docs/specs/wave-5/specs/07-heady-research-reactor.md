# Heady Research Reactor — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Research panel) + headyapi.com  
**Heady Domain Anchor:** headyme-core, headyapi-core, heady-pythia  

---

## 1. Problem Statement

Research synthesis is one of the highest-value but most time-consuming knowledge tasks. An analyst or researcher reading across 40–60 sources to produce a coherent synthesis document might spend 12–20 hours on what could be accomplished in under 2 hours with the right AI-assisted workflow. Existing tools (Perplexity, ChatGPT with browsing) provide surface-level search summaries but do not support multi-stage deep research: iterative source collection, evidence grading, contradiction detection, gap mapping, and structured synthesis output. Heady has headyapi.com for intelligence routing, heady-pythia as an existing research surface, and pgvector for semantic memory. Research Reactor combines these into a structured, multi-stage research pipeline that produces defensible synthesis artifacts.

**Cost of not solving it:** Heady users' highest-value knowledge work still happens off-platform; headyapi.com monetization potential in enterprise research is unrealized.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Reduce time for a full research synthesis from hours to under 90 minutes | User-reported time savings | ≥ 60% reduction |
| G2 | Surface evidence contradictions and gaps in source sets | Contradiction detection recall | ≥ 80% (vs. human reviewer) |
| G3 | Deliver exportable, citation-complete synthesis documents | Citation completeness score | ≥ 95% of claims have linked sources |
| G4 | Drive repeat usage for ongoing research projects | Users with ≥ 3 research projects | ≥ 25% of MAU within 90 days |
| G5 | Enable developer extensions via headyapi.com | Research API calls | ≥ 8,000 in 90 days |

---

## 3. Non-Goals

- **Not a web search engine.** Research Reactor processes and synthesizes sources; it does not replace Google or Perplexity for quick lookups.
- **Not a citation manager.** Reference database management (Zotero, Mendeley workflows) is out of scope; Research Reactor provides in-document citations, not a standalone reference library.
- **Not a writing editor.** Synthesis documents are research drafts, not polished prose. Final editing is the user's responsibility.
- **Not a data analysis tool.** Quantitative data modeling and statistical computation are out of scope (covered by heady-montecarlo for Monte Carlo modeling).
- **Not a plagiarism checker.** Originality detection is not a V1 feature.

---

## 4. User Stories

**Researcher / analyst**
- As a researcher, I want to define a research question and have Research Reactor propose a source collection strategy so that I know what to search for before I start.
- As a researcher, I want to upload or link 20–50 sources (PDFs, URLs, DOIs) and have Reactor extract, chunk, and embed them so that I can query the full source set semantically.
- As a researcher, I want Reactor to identify where sources contradict each other so that I can address the tension in my synthesis.
- As a researcher, I want to generate a structured synthesis document with inline citations so that I can hand it to a collaborator or client immediately.

**Team lead**
- As a team lead, I want to share a Research Reactor project with a collaborator so that we can both annotate sources and refine the synthesis together.

**Developer**
- As a developer, I want a POST endpoint that accepts a research question and a list of URLs and returns a structured synthesis JSON so that I can embed Research Reactor in my internal knowledge management tool.

---

## 5. Requirements

### P0 — Must Have
- **Research project workspace:** User creates a named project with a research question. Projects persist in the user's headyme.com Research panel.
- **Source ingestion:** Accept URL list (up to 50), PDF uploads (up to 20MB each), arXiv DOIs, and free-text paste. Extract text, chunk at 512 tokens with 64-token overlap, embed with text-embedding-3-large, store in pgvector `research_chunks` table scoped to the project.
- **Semantic query over source set:** User asks natural-language questions against the source set; Reactor retrieves top-K relevant chunks and generates a grounded answer with citations.
- **Contradiction detector:** Identify claim pairs across sources where one source asserts X and another asserts ¬X on the same topic. Surface as a "Tensions" section.
- **Gap mapper:** Given the research question and collected sources, identify 3–5 sub-questions that remain unanswered by the current source set.
- **Synthesis document generator:** On demand, produce a structured synthesis document: executive summary, key findings (with inline citations), tensions, gaps, and source list. Export as Markdown + PDF.
- **headyapi.com endpoint:** `POST /v1/research/ingest`, `POST /v1/research/query`, `POST /v1/research/synthesize` — all JWT-authenticated.

### P1 — Should Have
- **Source quality grader:** Each source receives a quality score based on: publication recency, domain authority, citation count (for academic sources via Semantic Scholar API). Score surfaces in source list.
- **Evidence tagging:** User can tag extracted claims as "supporting", "contradicting", or "tangential" to the research question. Tags persist and filter synthesis generation.
- **Collaborative projects:** Share a project with up to 5 collaborators; shared annotation layer (no concurrent editing conflicts in V1; last-write-wins with activity log).
- **Saved query library:** User can save and replay queries against a project as the source set evolves.

### P2 — Future
- **Live source monitoring** — project registers a watch for new publications matching the research question; new sources auto-ingested.
- **Patent Sentinel integration** — research projects in technical domains can pull prior-art hits as sources.
- **Inter-project synthesis** — combine evidence from two Research Reactor projects into a cross-domain synthesis.

---

## 6. User Experience

**Entry point:** headyme.com → Research panel → "New Project."

**Project setup:**
1. User enters research question (free-text, 1–3 sentences).
2. Reactor suggests 5 search strategies and 3 source types to prioritize.
3. User adds sources (URL paste, PDF upload, arXiv DOI).
4. Ingestion progress bar; estimated time shown.

**Query interface:**
- Chat-style Q&A against the source set, with cited chunks shown on hover.
- Contradiction and gap cards surfaced automatically after ingestion.

**Synthesis generation:**
1. User clicks "Generate Synthesis."
2. Reactor produces the document (2–5 minutes for 50 sources).
3. Document displayed inline with source panel; export to Markdown/PDF.

---

## 7. Architecture

```
headyme.com Research panel
    │
    ▼
Research Reactor Service (new microservice, Cloud Run)
    ├─ Project Manager (CRUD, project metadata in pgvector)
    ├─ Source Ingestion Pipeline
    │   ├─ URL Fetcher (headless browser + text extractor)
    │   ├─ PDF Parser (PyMuPDF)
    │   ├─ arXiv API client
    │   ├─ Chunker + Embedder (text-embedding-3-large)
    │   └─ pgvector writer (research_chunks table, project-scoped)
    ├─ Query Engine (RAG: pgvector semantic search + heady-ai.com LLM)
    ├─ Contradiction Detector (claim extraction + NLI model)
    ├─ Gap Mapper (heady-ai.com LLM + research question framing)
    ├─ Synthesis Generator (heady-ai.com Claude Sonnet/GPT-5)
    ├─ Source Quality Grader (Semantic Scholar API + recency scorer)
    └─ headyapi-core adapter (/v1/research/*)
```

**heady-pythia alignment:** Research Reactor extends heady-pythia's existing research surface; pythia provides the existing UI scaffold, Reactor provides the new pipeline microservice.

---

## 8. Data Flows

```
Source ingestion
    → Source Ingestion Pipeline
    → Text extraction (URL/PDF/arXiv)
    → Chunking + embedding
    → pgvector write (research_chunks, indexed by project_id + embedding)
    → Contradiction Detector: pairwise NLI on top-K claim pairs
    → Gap Mapper: heady-ai.com LLM call
    → Project status updated: "ready for query"

Query
    → User question → pgvector semantic search (top-K chunks, project-scoped)
    → heady-ai.com LLM: grounded answer generation with chunk citations
    → Response + citations returned to UI

Synthesis generation
    → Gap Mapper result + all top-K chunks per sub-finding
    → heady-ai.com LLM: structured synthesis (sections: summary, findings, tensions, gaps)
    → Markdown rendered; PDF export via Pandoc
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Source copyright | Research Reactor stores extracted text in user's private project namespace; no sharing or redistribution outside the user's org |
| Confidential source documents | PDF uploads stored in encrypted org-scoped GCS bucket; not used for model training; deletable by user |
| API key exposure in source URLs | URL ingestion uses server-side fetcher; user credentials never stored or logged |
| Synthesis attribution | All generated synthesis documents carry a machine-generated disclaimer and source list |
| Project sharing | Collaborator access requires explicit invite; no public sharing in V1 |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| pgvector `research_chunks` table + project-scoped index | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM router (query + synthesis) | HeadyAI | Yes — P0 |
| text-embedding-3-large access | OpenAI / heady-ai.com | Yes — P0 |
| headyapi-core route registration | HeadyAPI team | Yes — P0 |
| heady-pythia UI scaffold | heady-pythia team | Yes — P0 |
| Semantic Scholar API credentials | External | No — P1 |
| PDF Parser (PyMuPDF, GCS storage) | Infrastructure | Yes — P0 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- URL + PDF ingestion, chunking, embedding.
- Semantic query (RAG).
- Basic synthesis document (no contradiction detection yet).
- Internal HeadySystems research use.

**Phase 2 — Beta (Weeks 5–8)**
- Contradiction detector live.
- Gap mapper live.
- headyapi.com endpoints open.
- Source quality grader.
- Invite-only beta.

**Phase 3 — Public (Weeks 9–12)**
- Collaborative projects.
- PDF export.
- arXiv DOI ingestion.
- Success metrics review.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Time savings (user-reported) | Survey | 60 days | 60% reduction | 75% reduction |
| Contradiction detection recall | Benchmark test | 60 days | 80% | 90% |
| Citation completeness | Auto-check | Per synthesis | 95% | 99% |
| Users with ≥3 projects | HeadyMetrics | 90 days | 25% of MAU | 40% |
| Research API calls | API telemetry | 90 days | 8,000 | 25,000 |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should Research Reactor support real-time web search (not just pre-ingested sources) in a hybrid mode? | Product | No |
| OQ2 | What NLI model is best for contradiction detection at this scale — use a Hugging Face hosted model or route through heady-ai.com? | Engineering | No |
| OQ3 | Should synthesis documents be versioned so users can compare how the synthesis evolved as they added sources? | Product | No |
| OQ4 | Does storing scraped web content create copyright or ToS exposure? What is the retention policy for extracted URL text? | Legal | No |
