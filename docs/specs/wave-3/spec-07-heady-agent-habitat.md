# Spec 07 — Heady Agent Habitat

**Wave:** Third Wave  
**Domain:** headysystems.com / Swarm Orchestration  
**Primary Repos:** headysystems-core, heady-production, headymcp-core, headybot-core, latent-core-dev, template-swarm-bee  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Agent Habitat is the persistent execution environment and memory management layer for Heady's agent population. Where Swarm Covenant defines what agents are allowed to do, Agent Habitat defines where they live: their persistent memory structures, tool context, lifecycle state, and execution substrate. A "habitat" is a named, versioned environment that one or more agents are deployed into — with its own memory namespace, tool bindings, access scope, and observation hooks.

The Habitat system addresses a critical gap in multi-agent orchestration: agents that share memory promiscuously conflict; agents with no memory forget context between tasks; agents with no observation hooks are impossible to debug. Habitat provides the structured environment that makes agents both powerful and governable.

**Why it matters:** The Hugging Face multi-agent research context confirmed that the highest-quality agent systems in 2026 use external structured stores with short-term vs. long-term memory separation, lifecycle hooks, and observability as first-class features. Agent Habitat operationalizes all of these for the Heady swarm.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Every Heady agent operates within a named, versioned Habitat — zero agents running without a habitat | Non-habitat agent count = 0 |
| G2 | Agent memory recall latency ≤ 50ms for short-term memory, ≤ 500ms for long-term semantic recall | P95 memory latency |
| G3 | Habitat state is fully observable — every memory write, tool call, and lifecycle event is logged | Habitat observation completeness ≥ 99% |
| G4 | A developer can create a new Habitat from a template and deploy an agent into it in ≤ 10 minutes | End-to-end habitat provisioning time |
| G5 | Memory compaction runs automatically and reduces long-term memory store size by ≥ 40% without semantic loss | Compaction efficiency metric |

---

## 3. Non-Goals

- **Agent task scheduling or routing** — Handled by headysystems-core orchestration and Swarm Covenant.
- **Agent capability definition** — Each agent's tools are defined in its class spec and Covenant; Habitat provides the execution environment.
- **User-facing conversation UI** — That is HeadyBuddy Shell.
- **Cross-habitat communication protocol** — Bees communicate via pub/sub (Covenant governs); Habitat scopes memory to its own namespace.

---

## 4. User Stories

**As a swarm architect,** I want to create a "Grant Research Habitat" that includes a shared memory namespace for all grant-related agents, pre-loaded with the HeadyConnection mission profile and past grant data, so that every agent in that habitat starts with the right context.

**As a developer,** I want to deploy a new agent into an existing habitat and have it immediately access the habitat's shared memory and tool bindings without any additional configuration.

**As a platform operator,** I want to observe the live state of any habitat — its active agents, recent memory operations, tool calls, and lifecycle events — in real time so that I can diagnose issues without inserting debug code.

**As an agent runtime,** I need a memory API that provides: write-to-short-term, flush-to-long-term, semantic-recall(query), and compact-long-term — so that memory management is handled by the platform, not reimplemented in each agent.

**As an engineering lead,** I want habitats to have clear lifecycles (provisioning, active, draining, archived) so that I can manage resource usage and prevent habitat sprawl.

---

## 5. Requirements

### P0 — Must Have

- **Habitat Schema:** A named, versioned environment record containing: habitat_id, name, description, agent_class_list, memory_namespace, tool_bindings, access_scope (which heady-production resources the habitat can touch), lifecycle_state, and covenant_version_required.
- **Short-Term Memory Store:** In-process or Redis-based key-value store scoped to a single agent session. Auto-expired after TTL (default: 2 hours). Used for working context within a task.
- **Long-Term Memory Store:** pgvector-backed semantic store in latent-core-dev, scoped to the habitat's memory_namespace. Persists across agent sessions. Supports write, semantic_recall(query, top_k), and delete operations.
- **Memory API:** headymcp-core tool suite: `memory_write(key, value, scope)`, `memory_recall(query, scope, top_k)`, `memory_flush(session_id)`, `memory_compact(namespace)`. Scope = "short" | "long" | "habitat".
- **Lifecycle Manager:** Handles habitat state transitions: provisioned → active → draining → archived. Draining gracefully concludes in-flight agent work before archiving.
- **Observation Hooks:** Every memory operation and tool call within a habitat is logged to the Habitat Observation Log (append-only). Hooks are injected at the habitat level, not per-agent.
- **Habitat Templates:** Pre-built habitat configs for common Heady patterns: nonprofit_research_habitat, cloud_ops_habitat, creative_habitat, devops_habitat. Stored in headysystems-core.

### P1 — Should Have

- **Memory Compaction:** Scheduled job that runs `memory_compact(namespace)` on each habitat's long-term store — clusters semantically similar memories, summarizes redundant entries, reduces store size while preserving semantic coverage. Configurable schedule (default: weekly).
- **Habitat Inspector UI:** Real-time view of a habitat's active agents, memory state (entry count, last write, semantic clusters), recent observation log, and resource usage.
- **Habitat Cloning:** Fork an existing habitat (including its memory namespace snapshot) for development/testing without affecting the production habitat.
- **Cross-Habitat Memory Bridges:** Explicit, governed bridges that allow a habitat to read (not write) from another habitat's long-term store. Requires covenant-level approval.

### P2 — Future

- **Federated Habitat Network** — Habitats across HeadyMe, HeadySystems, and HeadyConnection orgs can form a federated mesh with governed cross-org memory sharing.
- **Habitat versioning with rollback** — Snapshot and restore full habitat state (memory + config) to a prior checkpoint.
- **Self-adapting memory policies** — Habitat automatically adjusts TTLs and compaction frequency based on observed agent behavior patterns.

---

## 6. User Experience

1. **Entry point:** Agent Habitat panel at `headysystems.com/habitats` and via headymcp-core habitat tools.
2. **Habitat list:** Cards showing: habitat name, active agent count, memory namespace size (entries + MB), lifecycle state badge, last activity.
3. **Habitat detail:** Tabs — Overview | Agents | Memory | Observations | Settings.
   - Overview: health summary, resource usage gauges.
   - Agents: live list of agents in habitat, each with status, last action, covenant version.
   - Memory: short-term and long-term memory stats; semantic cluster visualization; recent memory operations feed.
   - Observations: time-series log of all habitat events — filterable by agent, event type, and time range.
   - Settings: habitat config YAML (read-only for non-owners), lifecycle controls (drain/archive).
4. **Create Habitat:** Wizard with steps: Select template → Name + description → Configure tool bindings → Set access scope → Review covenant requirements → Provision.
5. **Memory Inspector:** For any memory entry: key, value (truncated), embedding visualization (2D projection), scope, agent that wrote it, timestamp, and semantic neighbors.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│  headysystems.com UI (/habitats)                    │
│  (template-heady-ui micro-frontend)                 │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────┐
│             headysystems-core                        │
│  Habitat Manager  │  Lifecycle Manager              │
│  Observation Hook │  Memory Compaction Scheduler    │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────────┐
│  heady-production   │  │  headymcp-core           │
│  habitat_registry   │  │  Memory API tools:       │
│  habitat_obs_log    │  │  memory_write            │
│  habitat_lifecycle  │  │  memory_recall           │
└──────────┬──────────┘  │  memory_flush            │
           │             │  memory_compact          │
┌──────────▼──────────┐  └────────────┬─────────────┘
│  latent-core-dev    │               │
│  Long-term semantic │  ┌────────────▼─────────────┐
│  memory store       │  │  Redis / KV              │
│  (pgvector,         │  │  Short-term memory store │
│  namespace-scoped)  │  │  (session-scoped, TTL)   │
└─────────────────────┘  └──────────────────────────┘
           │
┌──────────▼──────────┐
│  template-swarm-bee │
│  headybot-core      │
│  (agents call       │
│  Memory API via MCP │
│  within their       │
│  signed habitat)    │
└─────────────────────┘
```

---

## 8. Data Flows

**Agent startup in habitat:**
```
Agent instantiates with habitat_id reference
  → Habitat Manager validates habitat is active
  → Covenant Engine validates agent's covenant matches habitat requirement
  → Agent receives: habitat_token, memory_namespace, tool_bindings
  → Short-term memory session initialized (Redis TTL set)
  → Observation hook attached (all memory/tool calls tagged with agent_id + habitat_id)
  → active_agents count incremented in habitat_registry
```

**Memory write (agent during task):**
```
Agent calls memory_write(key, value, scope="long")
  → headymcp-core Memory API receives call
  → Validate habitat_token + covenant
  → Embed value via latent-core-dev
  → Write to pgvector (habitat memory_namespace)
  → Log to habitat_obs_log: agent_id, operation, key, timestamp
```

**Semantic recall:**
```
Agent calls memory_recall(query, scope="long", top_k=5)
  → headymcp-core Memory API receives call
  → Embed query via latent-core-dev
  → Cosine similarity search in habitat memory_namespace
  → Return top_k results with similarity scores
  → Log to habitat_obs_log
  → Return to agent within 500ms P95
```

**Memory compaction:**
```
Scheduled job (weekly or manual trigger)
  → For each habitat in active state
  → Fetch all entries in memory_namespace
  → Cluster by semantic similarity
  → For clusters with >N near-duplicate entries: summarize → replace cluster with summary entry
  → Delete superseded entries
  → Log compaction report to habitat_obs_log
```

---

## 9. Security & Privacy

- Memory namespaces are strictly isolated by habitat. No agent can access another habitat's memory without an explicit, governance-approved Cross-Habitat Memory Bridge.
- Habitat tokens are JWT-scoped to habitat_id + agent_id; validated on every Memory API call.
- Observation Log is INSERT-only from the hook layer; readable by operator and owner roles.
- Long-term memory contents may include sensitive context (mission profiles, grant data). Access requires habitat owner role.
- Memory compaction is non-destructive for 30 days: superseded entries are soft-deleted and recoverable within the grace period.
- LLM calls in memory compaction summarization use the same PII-stripped context rules as other Heady LLM operations.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headysystems-core — core service | Internal | Extend with Habitat module |
| headymcp-core — Memory API tools | Internal | New tool group |
| latent-core-dev — long-term semantic store (pgvector) | Internal | Extend with habitat namespace support |
| heady-production — Postgres (new tables) | Internal | Migration required |
| Redis / Cloudflare KV — short-term memory | Infrastructure | Select + provision |
| template-swarm-bee — habitat startup hook | Internal | Add habitat initialization to lifecycle |
| headybot-core — agent runtime integration | Internal | Add habitat token management |
| Swarm Covenant (Spec 06) — covenant validation at habitat entry | Internal | Spec 06 Phase 1+ |

---

## 11. Phased Rollout

### Phase 1 — Habitat Foundation (Weeks 1–4)
- Habitat schema + Registry
- Lifecycle Manager (provisioning + active + archiving)
- Short-term memory (Redis/KV session store)
- Observation hook basic logging

### Phase 2 — Long-Term Memory (Weeks 5–8)
- latent-core-dev namespace support
- Memory API tools in headymcp-core (write, recall, flush)
- Habitat templates (4 standard types)
- Covenant integration at habitat entry

### Phase 3 — Intelligence + UI (Weeks 9–12)
- Memory compaction scheduler
- Habitat Inspector UI
- Habitat Cloning
- Memory Inspector with 2D semantic visualization
- Full habitat audit cycle

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Agents without habitat | Unknown (no enforcement) | 0 |
| Short-term memory recall latency (P95) | N/A | ≤ 50ms |
| Long-term semantic recall latency (P95) | N/A | ≤ 500ms |
| Habitat observation completeness | 0% | ≥ 99% |
| New habitat provisioning time | Hours (manual) | ≤ 10 minutes |
| Compaction memory reduction | N/A | ≥ 40% |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Is Cloudflare KV sufficient for short-term memory, or is a dedicated Redis instance needed for performance? | Engineering | Yes — affects Phase 1 infrastructure choice |
| What is the maximum expected long-term memory store size per habitat (entries, GB)? | Engineering | No — affects pgvector index config |
| Should memory compaction summarization use the main heady-production LLM router or a dedicated lightweight model? | Engineering | No — can default to main router |
| Who owns a habitat — a person, a team, or a project? | Eric | No — recommend project-level ownership for v1 |
