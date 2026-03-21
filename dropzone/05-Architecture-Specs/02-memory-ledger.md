# Feature Spec: Memory Ledger with Temporal and Privacy Controls

**Feature ID:** HEADY-FEAT-002  
**Domain:** headyme.com / heady-ai.com / headybuddy.org  
**Status:** Draft  
**Author:** Eric Haywood  
**Date:** 2026-03-17  
**Version:** 1.0

---

## 1. Problem Statement

AI assistants in the Heady ecosystem currently operate without durable, structured memory. Each session starts cold. Users re-explain context, preferences, project backgrounds, and working styles repeatedly across HeadyBuddy, HeadyAI-IDE, and HeadyWeb interactions. This creates friction, reduces AI utility, and makes Heady feel like a stateless tool rather than a persistent intelligent partner.

Equally important: users have no visibility into what the AI remembers, no ability to correct or delete specific memories, and no temporal controls over how long information is retained. This is both a UX gap and a privacy liability — especially for users handling sensitive professional or personal context.

**Who experiences this:** Every active Heady user. Most acute for users with ongoing projects, recurring workflows, or multi-session work across HeadyBuddy and HeadyAI-IDE.

**Cost of not solving it:** High churn due to stateless experience; inability to compete with persistent AI assistants (ChatGPT Memory, Gemini context); GDPR/CCPA risk from uncontrolled data retention; no foundation for personalized skill behavior.

---

## 2. Goals

| Goal | Measurement | Target |
|---|---|---|
| AI correctly recalls user context without re-prompting | % of sessions where user re-explains previously established context | Reduce from baseline by 70% within 60 days |
| Users can view all stored memories | % users who open Memory Ledger within 14 days of activation | ≥ 50% |
| Users can delete any memory or time-bounded memory set | Delete action completion rate | ≥ 99% success |
| Memory recall improves task quality | User satisfaction rating on memory-augmented sessions vs. cold sessions | ≥ 20% delta |
| No memory persists beyond user-set TTL | Expired memory retention rate after TTL | 0% |

---

## 3. Non-Goals

- **Not a knowledge base or file storage system.** The Memory Ledger stores structured context fragments, not full documents or files.
- **Not cross-user shared memory.** All memories are strictly per-user and cannot be shared between accounts in v1.
- **Not real-time collaborative memory.** Multi-user session memory is a future capability.
- **Not a replacement for project context files.** Users working on large projects should still use file-based context; the Ledger supplements, not replaces, explicit context injection.
- **Not trained into model weights.** Memories are injected at inference time via RAG-style retrieval; they do not fine-tune any model.

---

## 4. User Stories

### Memory Capture

- **As a HeadyBuddy user**, I want Buddy to remember my preferred communication style, recurring projects, and key collaborators after I establish them once, so that every subsequent session feels personally calibrated.
- **As a HeadyAI-IDE user**, I want the IDE to remember my preferred code style, common libraries, and project-level conventions, so that code suggestions match my actual working patterns.
- **As a Heady user**, I want to explicitly save a memory from any conversation ("Remember: my main client is Acme Corp and their deadline is Q3"), so that I control what gets retained.

### Memory Review and Control

- **As a Heady user**, I want to see every memory stored about me, organized by topic and recency, so that I know exactly what context the AI is using.
- **As a Heady user**, I want to edit a stored memory to correct it or update stale information, so that the AI does not operate on outdated context.
- **As a Heady user**, I want to delete any individual memory or an entire category of memories, so that I can remove sensitive or irrelevant context.
- **As a Heady user**, I want to set a global or per-category memory TTL (e.g., "forget all project context after 90 days"), so that my memory does not accumulate stale information indefinitely.

### Privacy and Transparency

- **As a privacy-conscious user**, I want to know exactly when and why a memory was created, including which session and what AI action triggered it, so that memory creation is never opaque.
- **As a Heady user**, I want to pause memory recording for a session ("incognito mode"), so that I can have a confidential conversation without it being stored.
- **As a Heady user**, I want to export my entire Memory Ledger as a structured file, so that I own my data and can migrate or audit it.

---

## 5. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| ML-001 | Structured memory data model: typed fragments (preference, person, project, fact, instruction) with source, timestamp, and TTL | Given a memory is created, Then it includes type, content, source_session_id, created_at, and expires_at |
| ML-002 | Automatic memory extraction: AI identifies memory-worthy facts from conversation and prompts user to save | Given a conversation includes a named preference or fact, Then within the session the AI surfaces a "Save to memory?" prompt |
| ML-003 | Explicit memory save: user can manually save any text as a memory fragment | Given a user types "Remember: [text]", Then a memory fragment is created and confirmed in-session |
| ML-004 | Memory Ledger UI: browsable list of all memories, filterable by type, date range, and source | Given memories exist, When the user opens the Ledger, Then all memories are visible with type, content, source, and expiry |
| ML-005 | Individual memory deletion | Given a memory is displayed, When user selects "Delete", Then the memory is removed within 500ms and no longer injected into future sessions |
| ML-006 | Bulk deletion by category or date range | Given the user selects a category or date range, When they confirm bulk delete, Then all matching memories are removed |
| ML-007 | TTL enforcement: memories with a set expiry are automatically purged at expiry | Given a memory with expires_at = T, When T passes, Then the memory is no longer returned by the retrieval system |
| ML-008 | Incognito session mode: user can start a session where no memories are written or read | Given user activates incognito mode, Then no memories are injected into prompts and no new memories are created for that session |
| ML-009 | Memory retrieval at inference: relevant memories are retrieved and injected into context window before model call | Given a session starts, Then top-K relevant memories are retrieved via semantic similarity and included in system prompt |

### P1 — Should Have

| ID | Requirement |
|---|---|
| ML-010 | Memory edit: user can update the content of any stored memory |
| ML-011 | Per-category TTL settings (e.g., "project memories expire in 90 days, preferences never expire") |
| ML-012 | Memory source transparency: each memory shows which session created it and the original text that triggered it |
| ML-013 | Memory export: full ledger export as JSON or CSV |
| ML-014 | Memory confidence score: AI-extracted memories show a confidence rating; low-confidence memories are flagged for user review |
| ML-015 | Cross-surface memory scope: memories created in HeadyBuddy are available in HeadyAI-IDE and vice versa (user-controlled toggle) |

### P2 — Future Consideration

| ID | Requirement |
|---|---|
| ML-016 | Memory namespaces: separate memory contexts for work, personal, and project contexts |
| ML-017 | Memory sharing: opt-in sharing of specific memories with a team workspace |
| ML-018 | Memory health score: surface stale or potentially inaccurate memories for review |
| ML-019 | On-device memory embedding for privacy-first users |

---

## 6. User Experience

### Memory Ledger Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  MEMORY LEDGER                             [+ Add]  [⚙] │
│─────────────────────────────────────────────────────────│
│  Filter: [All Types ▼]  [All Time ▼]  [Search memories] │
│                                                          │
│  PREFERENCES (8)                                    ▼   │
│  • Preferred language: Python (saved 2026-02-12)   [✎][✗]│
│  • Communication style: concise, no filler phrases       │
│    (saved 2026-01-30)                              [✎][✗]│
│                                                          │
│  PROJECTS (3)                                       ▼   │
│  • HeadyMCP v2 refactor — deadline April 2026           │
│    (saved 2026-03-10, expires 2026-07-01)          [✎][✗]│
│                                                          │
│  PEOPLE (5)                                         ▼   │
│  • Collaborator: Jamie — timezone PST, GitHub: @jtaylor  │
│    (saved 2026-02-28)                              [✎][✗]│
│                                                          │
│  [Export All]  [Delete All]  [Incognito: OFF]           │
└─────────────────────────────────────────────────────────┘
```

### In-Session Memory Capture Flow

```
User: "I always want code examples in TypeScript, not JavaScript."

Buddy: "Got it. Want me to remember that for future sessions?"
       [✓ Save preference]  [✗ Just this session]
```

### TTL Settings Panel

- Global default TTL (never / 30 / 90 / 180 / 365 days)
- Per-category override
- "Forget everything before [date]" bulk purge
- Scheduled purge review: weekly digest of memories nearing expiry

---

## 7. Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    Memory Ledger                         │
│                                                          │
│  ┌───────────┐   ┌─────────────────┐  ┌──────────────┐ │
│  │ Extraction │   │ Memory Store    │  │  Retrieval   │ │
│  │ Engine    │──▶│ (D1 + Vector    │─▶│  Engine      │ │
│  │ (LLM call)│   │  Embeddings)    │  │  (semantic   │ │
│  └───────────┘   └─────────────────┘  │   top-K)     │ │
│                         │             └──────────────┘ │
│                  ┌──────▼──────┐                       │
│                  │   TTL Purge  │                       │
│                  │  (scheduled  │                       │
│                  │   Worker)    │                       │
│                  └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Memory Fragment Data Model

```json
{
  "memory_id": "uuid",
  "user_id": "string",
  "type": "preference | person | project | fact | instruction | event",
  "content": "string (max 500 chars)",
  "embedding": "float[] (stored in vector index)",
  "source": {
    "session_id": "string",
    "surface": "buddy | ide | web | manual",
    "trigger_text": "string (original user utterance)",
    "extraction_confidence": 0.0
  },
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "expires_at": "ISO8601 | null",
  "tags": ["string"],
  "is_deleted": false
}
```

### Storage

| Layer | Technology | Purpose |
|---|---|---|
| Structured store | Cloudflare D1 | Memory metadata, TTL, user queries |
| Vector index | Cloudflare Vectorize | Semantic similarity retrieval at inference time |
| Embedding model | Workers AI (text-embedding model) | Convert memory content to embeddings on write |
| Export / backup | Cloudflare R2 | User-triggered full exports |

### Data Flows

**Memory Extraction (Automatic):**
```
Session ends or checkpoint → Extraction Worker invoked
→ LLM call: "Extract memory-worthy facts from this session"
→ Structured fragments returned → User prompted to confirm save
→ Confirmed fragments written to D1 + embedded + written to Vectorize
```

**Memory Retrieval (At Inference):**
```
New session or message → Memory Retrieval Worker
→ Embed current query/context → Vectorize similarity search (top-K=10)
→ Filter by user_id, not expired, not deleted
→ Inject retrieved memories as structured system prompt block
→ LLM call proceeds with enriched context
```

**TTL Enforcement:**
```
Scheduled Cron Trigger (daily) → Purge Worker
→ Query D1: memories WHERE expires_at < NOW AND is_deleted = false
→ Soft-delete (is_deleted = true) + remove from Vectorize index
→ Write purge record to audit log
```

---

## 8. Security and Privacy

| Concern | Mitigation |
|---|---|
| Memory contents exposed to other users | All D1 and Vectorize queries are user_id-scoped; no cross-user access |
| Sensitive data in memory embeddings | Embeddings are opaque vectors; source text stored encrypted at rest in D1 |
| Memory injection manipulation (prompt injection) | Injected memories are formatted as system-level context, not user-level input; sanitized before injection |
| Unwanted persistent memory after account deletion | All user memory records hard-deleted on account deletion (GDPR Article 17 compliance) |
| Incognito mode bypass | Incognito flag set at session level; Retrieval and Extraction Workers check flag before any read/write |
| Export data leakage | Export files are signed, time-limited R2 presigned URLs; expire after 1 hour |

---

## 9. Dependencies

| Dependency | Owner | Risk |
|---|---|---|
| Cloudflare Vectorize (available in Workers) | Infrastructure | Low |
| Workers AI embedding model | Infrastructure | Low |
| HeadyBuddy session hook (post-session extraction) | HeadyBuddy | High |
| HeadyAI-IDE context injection interface | HeadyAI-IDE | Medium |
| headyme.com Memory Ledger UI route | HeadyMe | Medium |
| User consent framework (first-use opt-in) | Product / Legal | High — required before any auto-extraction |

---

## 10. Phased Rollout

### Phase 1 — Core Storage (Weeks 1–3)
- Memory Fragment data model in D1
- Manual memory save ("Remember: ..." command)
- Basic Memory Ledger UI: view, delete, export
- TTL enforcement cron job

### Phase 2 — Retrieval (Weeks 4–6)
- Vectorize integration and embedding pipeline
- Semantic retrieval at inference (top-K injection)
- Incognito session mode

### Phase 3 — Extraction (Weeks 7–10)
- Automatic extraction from HeadyBuddy sessions
- In-session "Save to memory?" prompt
- Memory confidence scoring
- Memory source transparency in Ledger UI

### Phase 4 — Cross-Surface and Controls (Weeks 11–16)
- HeadyAI-IDE memory scope
- Per-category TTL settings
- Memory edit capability
- Scheduled expiry digest notifications

---

## 11. Success Metrics

| Metric | Target (60 days post-launch) |
|---|---|
| % sessions with at least one memory injected | ≥ 60% of returning users |
| User re-explanation rate | Reduce by 70% vs. cold-session baseline |
| Memory Ledger monthly active viewers | ≥ 40% of memory-enabled users |
| Memory deletion / edit actions per user/month | ≥ 1 (indicates healthy user control) |
| Privacy complaints related to unexpected retention | 0 |

---

## 12. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Should memory extraction run synchronously at session end or async in background? | Engineering | No — async preferred; confirm UX for delayed confirmation |
| What is the maximum number of memories injected per inference call (token budget)? | Engineering / Product | Yes — must define before Phase 2 |
| Should Buddy always prompt to save, or save silently with opt-out? | Product / UX | Yes — affects consent model |
| Are memory embeddings considered personal data under GDPR? | Legal | Yes — affects storage and deletion design |
| How should conflicting memories be handled (user says X in session 1, Y in session 5)? | AI / Product | No — recency wins in v1 |
