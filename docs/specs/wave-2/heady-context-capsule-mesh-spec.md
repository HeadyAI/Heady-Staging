# Feature Specification: Heady Context Capsule Mesh

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headysystems.com / heady-ai.com / headymcp.com  
**Status:** Draft

---

## 1. Purpose

Heady Context Capsule Mesh is a cross-session, cross-domain context packaging and routing system. A "capsule" is a structured, serialized snapshot of the relevant context from a session — intent, working state, artifacts, active persona, memory refs, and partial results — that can be handed off between Heady domains, agents, or sessions without loss of meaning. The "Mesh" is the routing and resolution layer that ensures the right context arrives at the right agent at the right time.

### Problem Statement
When a user switches from headybuddy.org to heady-ai.com, or when an orchestrator hands a subtask to a specialist agent, all session context is currently lost. Each agent starts cold. This creates disjointed experiences, forces users to re-explain their situation, and prevents multi-agent workflows from working cohesively across Heady's domain topology.

### Goals
1. Achieve zero-re-explanation handoffs between any two Heady domains for 90% of context-transfer events.
2. Enable a context capsule to be created, transmitted, and resolved in < 500ms end-to-end.
3. Support both user-initiated ("pick this up in a new session") and agent-initiated (orchestrator-to-specialist) context transfers.
4. Allow capsules to be stored, named, and reopened like bookmarks for complex ongoing work.
5. Respect per-domain privacy scopes — a capsule passed to headybot.com should only contain what headybot.com is authorized to see.

### Non-Goals
- Real-time shared context between two simultaneously active users (multi-user co-session, v2).
- Full conversation transcript transfer (capsules carry structured context, not raw logs).
- Capsule-based versioning as a replacement for session replay (out of scope).
- Capsule transfer to external AI services (Claude, GPT) outside the Heady ecosystem (v2).

---

## 2. User Experience

### User Personas
- **The Domain Hopper** — starts research on heady-ai.com and wants to continue writing on headyme.com without re-explaining.
- **The Multi-Agent Workflow Builder** — building a pipeline where a research agent hands a capsule to a writer agent and then a reviewer agent.
- **The Context Bookmarker** — wants to save a complex mid-session state and return to it later without losing the thread.

### Core UX Flows

**User-Initiated Capsule Creation**
1. During any session, user sees a "Capsule" button in the session header.
2. Tapping it opens a modal: "Save this context as a capsule. It will carry your current goal, working notes, active persona, and relevant memory refs."
3. User names the capsule ("Product research — MCP competitors") and optionally annotates it.
4. Capsule is created and a link/token is generated.
5. User can: "Open in new session" (on the same domain), "Send to [domain]" (opens target domain with capsule pre-loaded), or "Save to Capsule Library" for later use.

**Agent-Initiated Capsule Handoff**
1. Orchestrating agent determines a subtask requires a specialist agent on another domain.
2. Orchestrator calls Capsule Mesh API: POST /capsule/create with a structured context payload.
3. Capsule Mesh applies destination-domain privacy scope filter.
4. Returns capsule_token.
5. Orchestrator passes capsule_token to the destination agent.
6. Destination agent calls POST /capsule/resolve {capsule_token} and receives the filtered context.
7. Destination agent proceeds with context pre-loaded — no re-explanation.

**Capsule Library (headyme.com)**
- Named capsule list with: name, origin domain, destination domains, creation date, status (active / expired / resolved).
- Click → Capsule Detail: structured context fields, privacy scope summary, audit of which agents accessed it.
- "Reopen" → launches a new session with the capsule pre-loaded.
- Expiry management: capsules expire after 7 days by default; user can extend or set permanent.

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Capsule Creator | Serializes session state into a structured capsule object | heady-ai.com |
| Capsule Store | Persistent store for capsule objects with TTL and access tracking | headysystems.com |
| Capsule Mesh Router | Routes capsule tokens to correct store location; applies privacy scope filters | headymcp.com |
| Privacy Scope Enforcer | Applies per-domain data access policies to capsule content before delivery | headysystems.com |
| Capsule Resolver | Accepts a token from any agent and returns the scoped capsule payload | heady-ai.com |
| Capsule Library UI | User dashboard for managing saved capsules | headyme.com |
| Session Integrator | Injects resolved capsule context into session at start | heady-ai.com |

### Capsule Schema (JSON)
```json
{
  "capsule_id": "uuid",
  "owner_user_id": "uuid",
  "created_at": "ISO8601",
  "expires_at": "ISO8601",
  "origin_domain": "heady-ai.com",
  "label": "string",
  "annotation": "string",
  "context": {
    "goal": "string (current user intent)",
    "working_notes": "string (partial results or AI working state)",
    "artifacts": [{"id": "uuid", "type": "file|url|snippet", "ref": "string"}],
    "active_persona_id": "uuid|null",
    "memory_refs": ["memory_id"],
    "task_genome_id": "uuid|null",
    "session_depth": "integer (turns so far)"
  },
  "access_scopes": {
    "allowed_domains": ["headyme.com", "headybot.com"],
    "allowed_agent_ids": ["agent_uuid"]
  },
  "access_log": [{"agent_id": "uuid", "domain": "string", "accessed_at": "ISO8601"}]
}
```

---

## 4. Data Flows

### User-Initiated Capsule Flow
```
1. User triggers capsule creation in session UI
2. Session state snapshot sent to Capsule Creator
3. Capsule Creator serializes: goal, working_notes, artifact refs, active_persona_id, memory_refs
4. POST /capsule/create {owner_user_id, context, access_scopes, label}
5. Capsule Store persists capsule, returns capsule_id + capsule_token (signed JWT)
6. UI presents capsule token (shareable link or domain-send option)
```

### Agent Handoff Flow
```
1. Orchestrator builds context payload for specialist agent
2. POST /capsule/create {owner_user_id, context, access_scopes: {allowed_domains: [dest]}}
3. Capsule Mesh Router receives create request, assigns to appropriate store partition
4. Returns capsule_token
5. Orchestrator passes capsule_token to destination agent call
6. Destination agent: POST /capsule/resolve {capsule_token, requesting_domain, agent_id}
7. Capsule Mesh Router validates token, fetches capsule
8. Privacy Scope Enforcer filters capsule.context to allowed fields for requesting_domain
9. Returns scoped capsule payload
10. Access log entry written
```

### Capsule Expiry Flow
```
1. Background job runs every hour
2. Identifies capsules where expires_at < NOW() and no active sessions reference them
3. Soft-deletes capsule (status: EXPIRED)
4. After 24h grace, hard-deletes from store
5. User notified via dashboard badge if they had saved capsules expire
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Capsule token format | Signed JWT with user_id, capsule_id, expiry; not guessable |
| Scope enforcement | Privacy Scope Enforcer strips disallowed fields before any agent receives capsule content |
| Access logging | Every capsule resolution is logged with agent_id, domain, and timestamp |
| Expiry | Default 7-day TTL; enforced server-side regardless of token validity |
| Memory ref privacy | Memory refs in capsules only return memory content if the receiving agent has Memory Sanctum read permission |
| Cross-domain leakage | Capsules addressed to one domain cannot be resolved by another domain (enforced by Mesh Router) |
| User revocation | User can invalidate a capsule token at any time from Capsule Library |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| heady-ai.com session orchestrator (must expose state-snapshot API) | heady-ai.com | Required |
| headymcp.com MCP layer (for cross-domain routing) | headymcp.com | Required |
| Heady Memory Sanctum (for memory_refs in capsules) | Second-wave | Complementary |
| Heady Persona Studio (for active_persona_id in capsules) | Second-wave | Complementary |
| Heady Task Genome (for task_genome_id in capsules) | Second-wave | Complementary |
| headyme.com dashboard | headyme.com | Required for Capsule Library UI |

---

## 7. Phased Rollout

### Phase 1 — Core Capsule Create/Resolve (Weeks 1–4)
- Capsule Creator, Store, Resolver
- Basic context fields: goal, working_notes, artifacts
- Token-based access (no privacy scope filtering yet)
- Internal alpha: manual API testing
- Success gate: Capsule create → resolve round-trip < 500ms P99

### Phase 2 — Privacy Scope + Agent Handoff (Weeks 5–8)
- Privacy Scope Enforcer
- Capsule Mesh Router with domain-scope enforcement
- Agent-initiated capsule creation in headybot.com and heady-ai.com orchestrators
- Access logging
- Closed beta: 3 internal Heady domain pairs
- Success gate: Zero unauthorized cross-domain context leakage in test suite

### Phase 3 — User UI + Capsule Library (Weeks 9–12)
- Capsule Library in headyme.com
- User-initiated capsule creation from session UI
- "Send to domain" flow
- Expiry management UI
- Open beta
- Success gate: ≥30% of cross-domain transitions use capsule handoff

### Phase 4 — Ecosystem Integration (Weeks 13–16)
- Memory Sanctum, Persona Studio, Task Genome context fields active in capsules
- Capsule suggestions ("You have an unresolved capsule from your last session — continue?")
- MCP-level capsule routing for external MCP-compatible agents
- Success gate: Capsule-assisted cross-domain handoffs rated ≥4.2/5 for context continuity

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| How is "session state snapshot" exposed by the heady-ai.com orchestrator? What fields are available? | Engineering | Yes — before Phase 1 |
| Should capsule tokens be single-use or multi-use? | Product | Yes — before Phase 2 |
| What is the maximum capsule payload size? (Suggest 32KB) | Engineering | No |
| Should capsule expiry be configurable per capsule or globally per user? | Product | No |
| How do we handle capsules referencing deleted memory or persona objects? | Engineering | No |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Handoff latency P99 | < 500ms create-to-resolve | Ongoing |
| Zero-re-explanation rate | ≥90% of capsule-assisted sessions rated as "no re-explanation needed" | 60 days post Phase 3 |
| Cross-domain capsule usage | ≥30% of cross-domain transitions use capsule | 90 days post Phase 3 |
| Unauthorized scope leakage incidents | 0 | Ongoing |
| Capsule Library engagement | ≥40% of capsule creators return to their Capsule Library | 30 days post Phase 3 |
