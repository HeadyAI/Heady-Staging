---
name: heady-memory-ledger-design
description: Design the Heady Memory Ledger with temporal indexing and privacy controls. Use when architecting persistent memory systems, defining retention policies, building privacy-aware recall, implementing memory expiry and redaction, or designing the ledger schema for Heady personal memory.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Memory Ledger Design

Use this skill when you need to **architect, extend, or refine the Heady Memory Ledger** — the persistent, privacy-aware memory layer that gives Heady long-term recall with temporal indexing and user-controlled data governance.

## When to Use This Skill

- Designing the memory ledger schema and storage architecture
- Defining retention policies — what is kept, for how long, and why
- Building privacy controls — redaction, expiry, user-initiated deletion
- Implementing temporal queries — "what did I work on last Tuesday?"
- Adding new memory entry types to the ledger
- Auditing memory access patterns for compliance

## Instructions

### 1. Define the Ledger Schema

The Memory Ledger is an append-only log with these core fields:

| Field | Type | Description |
|-------|------|-------------|
| `entry_id` | UUID | Unique identifier |
| `timestamp` | ISO-8601 | When the memory was created |
| `source` | enum | `user`, `buddy`, `agent`, `system` |
| `category` | string | Semantic category (e.g., `code-context`, `preference`, `conversation`, `fact`) |
| `content` | text | The memory content |
| `embedding` | vector | Semantic embedding for similarity search |
| `privacy_level` | enum | `public`, `private`, `sensitive`, `ephemeral` |
| `retention_policy` | object | When and how to expire or archive |
| `tags` | array | User and system tags for filtering |
| `access_log` | array | Record of every read access |

### 2. Design Temporal Indexing

Enable time-aware queries:

- **Primary index**: `timestamp` for chronological retrieval
- **Secondary index**: `category + timestamp` for filtered temporal queries
- **Windowed queries**: support `from/to` date ranges
- **Relative queries**: parse natural language ("last week", "yesterday morning")
- **Decay scoring**: older memories score lower in relevance unless pinned

Example temporal query:
```
Query: "What code did I review last Friday?"
Resolution:
  1. Parse "last Friday" → 2026-03-13
  2. Filter: category IN (code-context, conversation) AND date = 2026-03-13
  3. Rank by relevance within time window
  4. Return top results with timestamps
```

### 3. Implement Privacy Controls

Every memory entry has a privacy level that controls access:

| Level | Who Can Access | Auto-Expiry | Shareable |
|-------|---------------|-------------|-----------|
| `public` | Any Heady agent | Never | Yes |
| `private` | User + Buddy only | Configurable | No |
| `sensitive` | User only (Buddy needs approval) | 30 days default | No |
| `ephemeral` | Current session only | End of session | No |

**User controls:**
- View all memories by category, time, or privacy level
- Redact specific memories (replaces content, keeps metadata shell)
- Bulk delete by time range, category, or tag
- Export personal data (GDPR-style data portability)
- Set default privacy level for new memories

### 4. Define Retention Policies

```yaml
retention_policies:
  default:
    ttl: 365d
    archive_after: 180d
    review_prompt: 90d
  ephemeral:
    ttl: session
  sensitive:
    ttl: 30d
    auto_redact: true
  pinned:
    ttl: never
    requires: explicit-user-pin
```

**Archival behavior:**
- Archived memories are moved to cold storage
- They remain searchable but with higher latency
- Archived memories do not count against active memory limits

### 5. Design Memory Access Logging

Every access to the ledger is logged:

```json
{
  "entry_id": "uuid",
  "accessed_by": "buddy | agent-name | user",
  "access_type": "read | search | export",
  "timestamp": "ISO-8601",
  "query_context": "why this memory was accessed",
  "result": "returned | denied | redacted"
}
```

### 6. Plan Memory Lifecycle

```
Create → Index → Active → [Archive | Redact | Delete]
                   ↑
                 Pin (prevents expiry)
```

- New memories are immediately indexed (embedding + temporal + category)
- Active memories are available for fast retrieval
- Retention policy triggers move memories to archive, redact, or delete
- Users can pin memories to prevent automatic expiry

## Output Format

When designing or extending the Memory Ledger, produce:

1. **Schema definition** with field types and constraints
2. **Retention policy configuration**
3. **Privacy control matrix**
4. **Temporal query examples**
5. **Access logging specification**
6. **Migration plan** (if modifying existing schema)

## Tips

- **Append-only by default** — treat the ledger as an immutable log; deletes are soft (redaction) unless user explicitly purges
- **Privacy is non-negotiable** — never expose sensitive memories without explicit user consent
- **Temporal context is powerful** — "what was I doing when X happened?" is a killer query; make it fast
- **Embeddings enable semantic recall** — combine temporal filtering with vector similarity for best results
- **Keep the access log honest** — it is the audit trail for memory governance
