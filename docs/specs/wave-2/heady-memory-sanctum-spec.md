# Feature Specification: Heady Memory Sanctum

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / heady-ai.com  
**Status:** Draft

---

## 1. Purpose

Heady Memory Sanctum is a persistent, user-sovereign long-term memory layer for the Heady ecosystem. It solves the fundamental problem that AI sessions are stateless — every conversation forgets everything the user taught, shared, or built previously. The Sanctum captures, indexes, retrieves, and governs durable memory across all Heady services, turning each session into a continuation rather than a reset.

### Problem Statement
Users across headyme.com, headybuddy.org, and heady-ai.com currently re-explain their preferences, context, goals, and history at the start of every session. This creates friction, degrades output quality, and makes the ecosystem feel transactional rather than relational. The cost of not solving it is low retention, shallow personalization, and competitive vulnerability against memory-native AI products.

### Goals
1. Reduce session re-priming time by ≥80% for returning users within 60 days of launch.
2. Enable AI agents across Heady domains to share a consistent, consented memory substrate.
3. Give users full visibility and control over every stored memory artifact.
4. Achieve zero unauthorized memory disclosure events (security SLA from day one).
5. Support memory-driven personalization that measurably improves task completion quality.

### Non-Goals
- Real-time cross-user memory sharing (this is v2; single-user memory is the v1 target).
- Integration with third-party memory providers (e.g., Mem.ai) in this wave.
- Memory synthesis or AI-generated "life summaries" (deferred to Heady Insight Graph spec).
- Legal hold or e-discovery tooling (out of scope for nonprofit and consumer contexts).

---

## 2. User Experience

### User Personas
- **The Power User** — heavy daily Heady session user who teaches the AI their preferences, projects, and vocabulary over time.
- **The Casual Returner** — monthly user who expects the AI to remember their last major project without re-explaining it.
- **The Privacy Sentinel** — user who wants to use memory features but demands full audit visibility and delete-on-demand.

### Core UX Flows

**Memory Write Flow**
1. During any session, the AI detects a memory-worthy signal (user correction, explicit instruction, factual anchor, preference statement).
2. A lightweight banner appears: "I'll remember that [summary]. Tap to review or skip."
3. User can confirm, edit the memory text, categorize it (Preference / Project / Identity / Fact), or dismiss.
4. Confirmed memory is written to the Sanctum with timestamp, source session ID, and user-defined label.

**Memory Read Flow (Agent-Side)**
1. At session start, the orchestrating agent queries the Sanctum with a context vector derived from the session topic and user ID.
2. Top-K relevant memories are injected into the system prompt as a structured block: `[MEMORY: label | category | date]`.
3. The agent may surface a memory inline: "Based on your earlier note that you prefer concise responses, I'll keep this short."

**Memory Management UI (headyme.com dashboard)**
- Memory Library view: chronological list with search, filter by category, and bulk select.
- Memory Detail drawer: full text, source session, usage history (how often retrieved), and edit/delete controls.
- Trust Levels: memories can be tagged Low / Medium / High trust; low-trust memories flag AI outputs for review.
- Export: one-click JSON export of all memories.
- Global delete: "Wipe all memories" with 24-hour undo window.

---

## 3. Architecture

### Components

| Component | Role | Domain/Service |
|---|---|---|
| Memory Ingestion API | Accepts new memory writes from agents and users | headyapi.com |
| Memory Vector Store | Semantic embedding index for similarity retrieval | headysystems.com |
| Memory Metadata DB | Structured store for labels, categories, timestamps, usage stats | headysystems.com |
| Sanctum Access Control | Enforces per-user memory isolation and consent scopes | headysystems.com |
| Memory Retrieval API | Returns top-K memories given a query vector | headyapi.com |
| Management UI | headyme.com dashboard component | headyme.com |
| Audit Log Store | Immutable append-only log of all memory reads and writes | headysystems.com |

### High-Level Topology

```
[Any Heady Agent]
      │
      ▼
[Memory Retrieval API] ──► [Vector Store] ──► ranked memory candidates
      │
      ▼
[Sanctum Access Control] ── enforces user consent scope
      │
      ▼
[Agent receives injected memory block]

[User / Agent] ──► [Memory Ingestion API] ──► [Vector Store + Metadata DB + Audit Log]
```

### Technology Choices
- **Vector Store:** Cloudflare Vectorize or Pinecone (per headysystems.com infrastructure preference); namespace-per-user isolation.
- **Embedding Model:** text-embedding-3-small (OpenAI) or a self-hosted equivalent via heady-ai.com routing.
- **Metadata DB:** PostgreSQL (Cloud Run) with row-level security enforcing user_id scope.
- **Audit Log:** append-only table in PostgreSQL; no UPDATE or DELETE permissions on the log table role.

---

## 4. Data Flows

### Write Path
```
1. Agent or User → POST /memory/ingest {user_id, text, category, session_id, trust_level}
2. Sanctum Access Control validates JWT, checks consent scope
3. Text → Embedding Model → vector
4. Vector + metadata written to Vector Store (namespace: user_id)
5. Metadata row inserted to Metadata DB
6. Write event appended to Audit Log
7. 200 OK {memory_id, preview}
```

### Read Path
```
1. Agent → POST /memory/retrieve {user_id, query_text, top_k, min_trust_level}
2. Sanctum Access Control validates JWT
3. query_text → Embedding Model → query vector
4. Vector Store similarity search (namespace: user_id) → top_k candidates
5. Metadata DB join → enriched memory objects
6. Read event appended to Audit Log
7. 200 OK {memories: [{id, label, category, text, score, date}]}
```

### Delete Path
```
1. User → DELETE /memory/{memory_id}
2. Access Control verifies ownership
3. Soft-delete flag set in Metadata DB (retained 24h for undo)
4. Hard-delete scheduled job removes vector + metadata after 24h
5. Delete event appended to Audit Log (permanent)
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| User isolation | Namespace-per-user in vector store; row-level security in metadata DB |
| Authentication | JWT from heady-ai.com auth service; short-lived tokens (15 min) |
| Encryption at rest | AES-256 for all memory text and metadata |
| Encryption in transit | TLS 1.3 on all API endpoints |
| Consent gate | Memory write requires explicit user consent flag in account settings |
| Audit trail | Immutable log of every read and write; accessible to user in dashboard |
| Right to deletion | Full wipe within 48 hours of user request (GDPR/CCPA compliant) |
| Data residency | US-only default; EU residency flag available at account level |
| Agent scope limits | Agents may only read memories tagged for their domain scope |

### Privacy Classification
Memory text is classified as **Tier 1 Personal Data** — highest internal sensitivity level. No memory data is used for model training without explicit, separate opt-in.

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| heady-ai.com auth service (JWT issuance) | heady-ai.com | Required — must be live before Sanctum |
| Embedding model API (OpenAI or self-hosted) | headysystems.com | Required |
| Cloudflare Vectorize or Pinecone account | Infrastructure | Required |
| headyme.com dashboard shell | headyme.com | Required for Management UI |
| headyapi.com API gateway | headyapi.com | Required |
| Heady Context Capsule Mesh (for session context vectors) | Second-wave | Complementary — enhances read quality |

---

## 7. Phased Rollout

### Phase 1 — Foundation (Weeks 1–4)
- Stand up Memory Ingestion and Retrieval APIs
- Implement vector store with namespace isolation
- Basic metadata DB with audit log
- Internal alpha: memory read/write via API only (no UI)
- Success gate: P99 retrieval latency < 300ms

### Phase 2 — Agent Integration (Weeks 5–8)
- Integrate memory injection into HeadyBuddy and HeadyAI session orchestrators
- Implement consent banner in chat UI
- Trust level filtering active
- Closed beta: 50 invited users
- Success gate: 70% of beta users confirm at least one memory within first week

### Phase 3 — Management UI (Weeks 9–12)
- Full Memory Library UI in headyme.com dashboard
- Export, bulk delete, category filter
- Audit log visible to users
- Open to all Heady accounts
- Success gate: <5% of users request support for memory-related issues; session re-priming complaints drop ≥50%

### Phase 4 — Cross-Domain Scope (Weeks 13–16)
- Domain scope tagging (which agents can read which memory categories)
- HeadyBot and HeadyIO agent access
- API key-based third-party agent access (with user consent)
- Success gate: Memory retrieval active in ≥3 Heady domains

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Which vector store: Cloudflare Vectorize vs Pinecone? Cost at scale? | Infrastructure | Yes — before Phase 1 |
| Should memory trust levels be user-set, AI-inferred, or both? | Product | No — can ship with user-set only |
| What is the maximum memory count per user before retrieval degrades? | Engineering | No — test during Phase 1 alpha |
| Do memories sync across devices in real time or on session start? | Engineering | No — session-start sync acceptable for v1 |
| Should the audit log be exportable separately from memory data? | Legal/Product | No — can add in Phase 3 |

---

## 9. Success Metrics

| Metric | Target | Measurement Window |
|---|---|---|
| Session re-priming time reduction | ≥80% reduction vs. baseline | 60 days post Phase 3 launch |
| Memory adoption rate | ≥60% of active users have ≥1 confirmed memory | 30 days post Phase 3 |
| Retrieval latency P99 | < 300ms | Ongoing |
| Unauthorized memory access incidents | 0 | Ongoing |
| User-initiated memory deletes | < 10% of created memories (signals healthy trust) | 90 days post launch |
