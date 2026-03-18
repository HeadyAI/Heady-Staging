# Technical Co-Founder — Job Description

**Company:** HeadySystems Inc.
**Location:** Remote-first (Colorado preferred)
**Stage:** Pre-seed / Accelerator
**Equity:** 10–20% (see structure below)
**Salary:** $0–$60K/year (deferred or part-time during fundraising)
**Posted:** 2026-03-18

---

## About HeadySystems

HeadySystems builds the infrastructure layer for trustworthy, auditable AI. Our flagship product,
**HeadyMCP**, is a 55-tool production AI orchestration server implementing the Model Context
Protocol — the open standard for AI tool integration backed by Anthropic, Google, and OpenAI.

We're not building another chatbot. We're building the **Rails of AI orchestration**: the
framework that makes multi-agent AI systems reliable, auditable, and accessible to organizations
that couldn't otherwise build them.

**Current status:**
- 70+ GitHub repositories across 3 orgs (HeadyAI, HeadyMe, HeadySystems)
- 55 production MCP tools deployed and operational
- 60+ provisional patents in AI orchestration, memory systems, and governance
- 1M+ routing decisions processed through Heady platform
- HeadyConnection.org: mission arm serving equity-focused AI access
- Filing NSF SBIR Phase I ($275K) and entering Innosphere Ventures accelerator

We are looking for a **technical co-founder** who will own the engineering architecture,
scale the platform to enterprise SLA, and partner with the founder to close our Seed round.

---

## The Role

You are not employee #1. You are **co-builder #2** — a partner with meaningful ownership
who shapes the product, architecture, and engineering culture from the ground up.

**You will own:**

- Backend infrastructure: API gateway, auth service, MCP server reliability (99.9% SLA)
- Database architecture: pgvector optimization, Neon Postgres, Upstash Redis pipeline
- Observability stack: OTel GenAI instrumentation, Wide Events, drift detection
- CI/CD and DevOps: Cloud Run deployments, Cloudflare Workers, automated testing
- Security posture: OAuth 2.1 + DPoP implementation, SOC 2 Type II preparation
- Hiring: first engineering hires (post-Seed)
- Technical diligence: co-presenting to investors, customers, and NSF reviewers

**You will NOT own:**
- Product vision (Eric owns this with you as key input)
- Business development (shared)
- HeadyMCP open-source strategy (shared)

---

## What We're Building (Technical Context)

The Heady platform is a **Liquid Latent OS** — every routing decision is a vector, every
threshold is φ-derived. You need to understand and embrace this architecture:

```
φ = 1.618033988749895  (golden ratio)
ψ = 0.618033988749895  (φ⁻¹)

CSL thresholds: MINIMUM=0.500, LOW=0.691, MEDIUM=0.809, HIGH=0.882, CRITICAL=0.927
Arena Mode: TRIVIAL≤0.382 (auto), SIGNIFICANT≤0.618 (async approval), CRITICAL=1.0 (block)
Pipeline: 21-stage HCFullPipeline (CHANNEL_ENTRY → ... → RECEIPT)
Memory: Redis hot (<100ms) → pgvector warm (<500ms) → Qdrant cold (<2000ms)
```

**Tech stack:**
- Node.js 20 + ESM (services) | TypeScript (packages)
- Express 4.21 | Cloudflare Workers (edge)
- PostgreSQL + pgvector 0.8.0 (HNSW) | Upstash Redis
- Cloud Run (us-east1) | Cloudflare Pages/KV/Durable Objects
- Firebase Auth | GCP Secret Manager
- React + Module Federation (frontend)
- OTel + Pino structured logging

---

## Requirements

### Must Have

- [ ] **3+ years backend production experience** — you've operated systems at scale under SLA
- [ ] **Node.js / TypeScript proficiency** — write idiomatic, performant backend code
- [ ] **Database expertise** — pgvector, query optimization, schema design, migrations
- [ ] **Cloud infrastructure** — GCP or AWS, containerization (Docker), CI/CD pipelines
- [ ] **API design** — REST, OAuth 2.x, webhook patterns, versioning
- [ ] **Product thinking** — you can translate user problems into technical solutions
- [ ] **Communication** — written clarity for async-first remote collaboration
- [ ] **Mission alignment** — you care about AI access equity, not just technical excellence

### Strongly Preferred

- [ ] AI/ML infrastructure experience (embedding models, vector search, LLM APIs)
- [ ] MCP protocol familiarity (or willingness to go deep fast)
- [ ] Cloudflare Workers / edge computing
- [ ] Security: OAuth 2.1, PKCE, DPoP, JWT, secrets management
- [ ] Open source contributor (any significant project)
- [ ] Startup experience (seed or Series A stage)

### Not Required

- PhD or advanced degree
- ML research background
- Prior co-founder experience

---

## Equity Structure

### Standard Offer: 10–15%

| Trigger | Shares Vest |
|---------|-------------|
| Cliff: 12 months from start date | 25% of grant |
| Monthly vesting months 13-48 | 1/48 per month |
| **Total vesting period:** 4 years | **Standard Silicon Valley schedule** |

### Accelerated Vesting

- **Seed round close** (≥$500K): 12-month cliff waived → full 25% vests on round close
- **Acquisition**: 100% acceleration on double-trigger (acquisition + role elimination)
- **SBIR Phase II award**: 6-month acceleration

### Mission Bonus Clause

In addition to standard equity, co-founder receives a **Mission Bonus**:

> If HeadyConnection.org achieves 501(c)(3) status AND serves ≥ 1,000 underserved
> individuals with AI tools in any calendar year, the co-founder receives an additional
> **0.5% equity grant** (separate from standard vesting), vesting immediately upon milestone.

This clause exists because we believe the mission arm should be meaningful to everyone
involved — not just the founder.

### Equity Range

The 10–20% range reflects:
- **10%**: Joining post-Innosphere acceptance, with existing $100K investment in place
- **15%**: Joining pre-Innosphere (higher risk, higher reward)
- **20%**: Pre-any external investment, first 90 days (seed-stage co-founder terms)

All equity subject to Board approval and standard 83(b) election recommendation.

---

## What Success Looks Like

**Month 3:** HeadyMCP v2.0 production-ready. 3 design partners running on platform.
SOC 2 audit initiated. NSF SBIR application submitted.

**Month 6:** 2 paying enterprise customers ($50K ARR). 99.9% uptime achieved.
All 130 Cloud Run services on monitored, Aegis φ_health ≥ 1.000 (THRIVING).

**Month 12:** $400K ARR. Seed round closed ($1-2M). Team of 4. Series A roadmap drafted.
HeadyConnection.org 501(c)(3) granted, first grants distributed.

---

## Why This Role Is Different

**1. Real IP moat.** 60+ provisional patents isn't a startup cliché — it's leverage.
CSL routing (22.6% accuracy improvement over boolean) is a defensible technical advantage.

**2. Mission that compounds.** HeadyConnection.org means your work has dual ROI —
commercial success AND community impact. The Mission Bonus clause makes this tangible equity.

**3. φ-architecture is genuinely novel.** Most AI infrastructure is "string glue" around APIs.
Heady's mathematical foundations (CSL thresholds, Mnemosyne decay, Arena Mode governance)
are intellectually serious. You'll think about hard problems, not just CRUD.

**4. Market timing.** MCP crossed 16,000 servers in March 2026. Enterprise adoption is now.
The infrastructure layer is being built RIGHT NOW. Being the standard that enterprises adopt
in the next 18 months defines the category for a decade.

**5. Solo founder with full stack shipped.** Eric built everything you see — 70 repos,
55 MCP tools, 60 patents — alone. You're not inheriting someone else's architectural debt.
You're collaborating with someone who can ship and has taste.

---

## How to Apply

Email **eric@headysystems.com** with subject: **"Co-Founder: [your name]"**

Include:
1. **Two paragraphs** on why this mission resonates with you personally
2. **One technical decision** you made that you'd do differently today, and why
3. **Link to something you built** — GitHub, production system, open-source contribution
4. **Your availability** — timeline to start, current situation

We respond to every application within 48 hours.
We move fast: intro call → technical discussion → reference calls → offer, all within 3 weeks.

---

*HeadySystems Inc. is an equal opportunity employer. We actively seek candidates from
underrepresented backgrounds in tech. Our mission is equity — that starts with our team.*

*headysystems.com | headymcp.com | headyconnection.org*
*© 2026 HeadySystems Inc.*
