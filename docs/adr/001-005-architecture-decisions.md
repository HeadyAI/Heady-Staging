# ADR-001: Microservices Architecture with 50 Services

**Status:** Accepted  
**Date:** 2026-01-15  
**Author:** Eric Haywood  

## Context

Heady™ is a sovereign AI operating system that needs to handle inference, memory, agent orchestration, security, web serving, and integrations — all simultaneously. The question: monolith vs microservices vs serverless?

## Decision

**50 microservices** organized by domain (Inference, Memory, Agents, Orchestration, Security, Monitoring, Web, Data, Integration, Specialized), each running on its own port (3310–3396+), containerized with Docker, deployed to Cloud Run.

## Rationale

- **Domain isolation**: Each service owns its domain boundary (DDD-aligned)
- **Independent scaling**: Inference services need different resources than web servers
- **Fault isolation**: A crash in the MIDI service doesn't take down the brain
- **Technology diversity**: Services can use Node.js, Go, or Python as needed
- **51 patents**: Each service can independently implement patented algorithms

## Consequences

### Positive

- Service teams (or agents) can work on services independently
- Each service can scale to zero when idle (Cloud Run native)
- Fault blast radius is limited to one service

### Negative

- Operational complexity — need service mesh (Envoy), discovery (Consul), tracing (OpenTelemetry)
- Network latency between services — mitigated by gRPC for internal calls
- Distributed transaction complexity — mitigated by saga pattern coordinator

---

# ADR-002: pgvector Over Pinecone for Vector Memory

**Status:** Accepted  
**Date:** 2026-01-20  

## Decision

Use PostgreSQL with pgvector extension for all vector memory operations instead of managed services like Pinecone, Weaviate, or Qdrant.

## Rationale

- **Data sovereignty**: All vectors stay in our Postgres instance — no third-party access
- **HNSW support**: pgvector supports HNSW indexes with tunable m and ef_construction
- **SQL integration**: Can JOIN embeddings with relational data (users, content, sessions)
- **Cost**: Self-hosted Postgres is dramatically cheaper than managed vector DBs at scale
- **Single source of truth**: No sync issues between relational and vector stores

## Consequences

- Need PgBouncer for connection pooling (50 services)
- Need to tune HNSW parameters (m=32, ef_construction=200) for 384-dim embeddings
- Must manage migrations ourselves (migration service built for this)

---

# ADR-003: Firebase Auth Over Custom Auth

**Status:** Accepted  
**Date:** 2026-01-25  

## Decision

Use Firebase Authentication (Google OAuth, Email/Password, Anonymous) with httpOnly session cookies and a central relay iframe at auth.headysystems.com.

## Rationale

- **Multi-provider**: Google, Email, Anonymous — all built-in
- **Cross-domain**: Relay iframe + postMessage solves the 9-domain auth problem
- **Security**: httpOnly cookies prevent XSS token theft (NO localStorage — ever)
- **Free tier**: Firebase Auth is free up to 50,000 monthly active users

## Consequences

- Need central session server to verify Firebase ID tokens and issue session cookies
- SameSite=None cookies required for cross-domain iframe (reduced CSRF protection — add __Host- prefix)
- Anonymous auth needs abuse prevention (Fibonacci rate limits: 34 req/min)

---

# ADR-004: Sacred Geometry Constants Over Magic Numbers

**Status:** Accepted  
**Date:** 2026-02-01  

## Decision

All system constants derive from φ (1.618...), ψ (0.618...), and the Fibonacci sequence. No arbitrary "magic numbers" anywhere in the codebase.

## Rationale

- **Mathematical harmony**: Constants that relate to each other through golden ratio create naturally balanced systems
- **Consistency**: Instead of debating "should the timeout be 3 seconds or 5 seconds?", use φ² ≈ 2.618s or φ³ ≈ 4.236s
- **51 provisional patents**: Sacred Geometry math is a core IP differentiator
- **CSL gates**: Continuous Semantic Logic uses ψ² (0.382), ψ (0.618), and ψ+0.1 (0.718) as decision boundaries

## Consequences

- Every developer must understand φ-math (training requirement)
- Code is more consistent but less intuitive to newcomers
- Easy to audit: grep for hardcoded numbers — they shouldn't exist

---

# ADR-005: Drupal 11 Headless CMS Over Alternatives

**Status:** Accepted  
**Date:** 2026-02-10  

## Decision

Use Drupal 11 in headless mode with JSON:API for content management (13 content types), connected to vector memory via VectorIndexer webhook.

## Rationale

- **Enterprise-ready**: Drupal handles complex content models natively
- **PHP ecosystem**: Mature, well-documented, extensive module ecosystem
- **JSON:API built-in**: No custom API layer needed
- **Content modeling**: 13 content types (article, documentation, case_study, patent, event, grant_program, agent_listing, investor_update, testimonial, faq, product_catalog, news_release, media_asset) with field-level control
- **HeadyAutoContext**: VectorIndexer webhook fire on content CRUD, auto-embedding into pgvector

## Consequences

- Need Docker container for Drupal alongside Node.js services
- PHP ↔ Node.js bridge via webhook (HTTP, not direct)
- Must maintain Drupal module (heady_content, heady_vector_sync)
