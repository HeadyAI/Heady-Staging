<!--
  © 2026 Heady Systems LLC.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
# Heady — HeadyMemory Product Specification

> Memory system powering Buddy, IDE, and Enterprise continuity.  
> **Sources:** `src/vector-memory.js` (19KB), `src/vector-federation.js` (12KB), `src/vector-pipeline.js` (6KB), `src/continuous-learning.js` (14KB), `src/routes/memory.js` (24KB)

---

## Why Memory Matters

HeadyMemory is what transforms Heady from a tool you use into a companion that knows you. Without memory, every session starts cold. With memory, Buddy remembers your preferences, IDE recalls your codebase patterns, and the platform learns from every execution.

---

## Architecture Overview

```
User Actions
    ↓
vector-pipeline.js (6KB)
    → Chunk, embed, annotate
    ↓
vector-memory.js (19KB)
    → Store, retrieve, decay, search
    ↓
vector-federation.js (12KB)
    → Cross-scope federation, consistency
    ↓
continuous-learning.js (14KB)
    → Pattern extraction, optimization feedback
    ↓
memory.js routes (24KB)
    → REST API: CRUD, search, bulk ops
```

---

## Memory Types

| Type | Content | Persistence | Example |
|------|---------|-------------|---------|
| **Conversational** | Chat history, Q&A context | Session → optional persist | "Earlier today you asked about Docker compose" |
| **Procedural** | How-to patterns, workflow steps | Long-term | "You usually deploy with `npm run build && coolify push`" |
| **Semantic** | Concepts, relationships, knowledge graph | Long-term | "HeadyManager depends on HeadyBrain and HeadyLens" |
| **Episodic** | Specific events, debugging sessions | Medium-term with decay | "Last Tuesday's outage was caused by port conflict" |
| **Preference** | User settings, style choices, tool preferences | Permanent until changed | "You prefer dark theme and TypeScript" |

---

## Memory Scopes

| Scope | Boundary | Shared With | Example |
|-------|----------|-------------|---------|
| **Personal** | Single user | User's own devices only | Personal preferences, habits |
| **Project** | Git repo / workspace | Project collaborators | Codebase patterns, architecture decisions |
| **Team** | Organization | Team members | Shared workflows, policies |
| **System** | Heady platform | All users (anonymized) | Common patterns, best practices |

---

## 3D Vector Protocol

Memory is embedded in a 3-dimensional vector space:

| Dimension | What It Encodes | How It's Used |
|-----------|----------------|---------------|
| **Semantic** | Meaning/content (via nomic-embed-text on Ollama) | Similarity search, related memory retrieval |
| **Temporal** | When it was created/last accessed | Recency-weighted retrieval, decay scheduling |
| **Relevance** | Contextual importance score (0.0–1.0) | Priority ranking, memory consolidation |

### Embedding Pipeline

```
Raw input → vector-pipeline.js
    → Chunking (context-aware splits)
    → Embedding (nomic-embed-text via Ollama, FREE, local)
    → Annotation (metadata: timestamp, scope, type, source)
    → Storage (vector-memory.js)
    → Federation (vector-federation.js, cross-scope sync)
```

---

## Retention & Decay

| Memory Type | Default Retention | Decay Model |
|-------------|------------------|-------------|
| Conversational | 7 days (unless bookmarked) | Linear decay |
| Procedural | 1 year | Exponential decay with usage boost |
| Semantic | Permanent | No decay (manual cleanup only) |
| Episodic | 90 days | Exponential decay |
| Preference | Permanent | No decay |

**Consolidation:** Episodic memories that recur (same pattern observed 3+ times) are promoted to Procedural or Semantic memories.

---

## Memory API (via `src/routes/memory.js`, 24KB)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/memory/store` | POST | Store a new memory vector |
| `/api/memory/search` | POST | Semantic search across memories |
| `/api/memory/retrieve/:id` | GET | Get specific memory by ID |
| `/api/memory/update/:id` | PUT | Update memory content/metadata |
| `/api/memory/delete/:id` | DELETE | Remove a memory |
| `/api/memory/bulk` | POST | Bulk operations (store/delete) |
| `/api/memory/context` | POST | Get contextually relevant memories for a query |
| `/api/memory/health` | GET | Memory system health check |

---

## Privacy Controls

### Default Posture: Cloud (Synchronized)

Memory stored on Bossgame P6 (user's own infrastructure), synchronized via vector-federation across devices. NOT third-party cloud storage.

### User Controls

| Control | Options | Default |
|---------|---------|---------|
| **Memory On/Off** | Global toggle | On |
| **Type Toggles** | Enable/disable per type (conversational, procedural, etc.) | All on |
| **Scope Limits** | Restrict to personal only, allow project/team/system | Personal + Project |
| **Retention Override** | Custom retention periods per type | Platform defaults |
| **Export** | Download all memories as JSON | Available |
| **Delete All** | Nuclear option — wipe all memories | Available |
| **Forget Specific** | "Forget everything about X" | Available |

### Data Handling

- All embeddings generated locally via Ollama (no data sent to third-party for embedding)
- Memory search happens on-device (Bossgame P6)
- Federation syncs encrypted vectors between user's own devices only
- Enterprise tier: customer-provided encryption keys

---

## How Memory Powers Each Surface

### HeadyBuddy (Companion)

- Remembers conversation history across sessions
- Learns daily patterns ("You usually check Slack before standup")
- Personalized suggestions based on procedural memory
- "Hey Buddy, what were we working on yesterday?" → Episodic recall

### HeadyAI-IDE (Developer)

- Codebase-aware completions (project-scoped semantic memory)
- "You fixed a similar bug last week in auth.js" → Episodic + Procedural
- Remembers refactoring preferences and coding style
- Arena Mode results stored as procedural memory for strategy optimization

### Enterprise Platform

- Team-shared workflow patterns
- Policy compliance memory ("Last deployment that violated X was rolled back")
- Cost optimization learning ("This query pattern costs $0.03 less via Gemini")
- Audit trail enrichment with contextual memory

---

## Integration with Continuous Learning

`continuous-learning.js` (14KB) connects memory to active improvement:

```
Memory patterns observed
    → Pattern extraction
    → Self-optimizer.js feedback loop
    → HeadyVinci pattern recognition
    → Updated routing weights / strategy preferences
    → Better Arena Mode strategy selection over time
```
