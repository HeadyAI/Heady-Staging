# Heady Agent Habitat
### Feature Specification — Third Wave
**Version:** 1.0  
**Date:** 2026-03-17  
**Owner:** headysystems.com / headybot.com  
**Domain:** headysystems.com, headybot.com, headyio.com  
**Skill Target:** heady-agent-habitat

---

## 1. Purpose

Heady Agent Habitat is the managed execution environment for all Heady autonomous agents. It provides a secure, isolated, resource-governed sandbox in which each agent runs — with defined tool access, memory scoping, session lifecycle management, and Swarm Covenant integration. Habitat abstracts the complexity of running agents at scale: developers define an agent via a declarative manifest, and Habitat handles provisioning, execution, tooling injection, memory management, and graceful teardown.

**Problem Statement:**  
Without a managed execution layer, each new Heady agent requires custom scaffolding: its own Cloud Run configuration, tool wiring, memory session management, and security controls. This creates duplicated effort, inconsistent behavior across agents, and a maintenance burden as the agent count grows. Heady Agent Habitat standardizes agent execution so that building a new Heady agent means writing a manifest and business logic — not re-architecting infrastructure.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Reduce time to deploy a new Heady agent from days to under 4 hours | Measured from manifest creation to first successful run |
| G2 | Enforce resource limits on all running agents | Zero agents exceeding defined CPU/memory/token budgets in production |
| G3 | Provide every agent with structured memory access (read/write) scoped to its session | Memory access audit shows zero cross-session leaks |
| G4 | Integrate with Swarm Covenant for all inter-agent and resource-access calls | 100% of agent external actions gated through Covenant |
| G5 | Support at least 50 concurrent agent sessions with p99 startup latency ≤ 10 seconds | Load test result |

---

## 3. Non-Goals

- **Not an LLM.** Habitat runs agents; it does not provide inference. Agents call HeadyAI for model access.
- **Not a user-facing chat interface.** The conversation layer lives in HeadyBuddy. Habitat is the backend runtime.
- **Not a Kubernetes cluster.** Habitat uses Cloud Run as the execution substrate; cluster-level orchestration is out of scope.
- **Not a workflow DAG engine.** Sequential task chains are a higher-level concern. Habitat runs individual agent sessions.
- **Not a data pipeline.** Batch data processing is separate from agent execution.

---

## 4. User Stories

### Developer
- As a developer, I want to define a new Heady agent using a YAML manifest (tools, memory scope, capability profile, resource limits) so that I can deploy an agent without writing infrastructure code.
- As a developer, I want to test my agent in a sandboxed dev environment that mirrors production so that I can iterate safely.
- As a developer, I want to see real-time logs for my agent session so that I can debug behavior without grepping through raw Cloud Run logs.

### Platform Engineer
- As a platform engineer, I want to set global resource quotas per agent type (max concurrent sessions, max token budget per session, max wall time) so that runaway agents cannot exhaust platform resources.
- As a platform engineer, I want to see a dashboard of all active agent sessions with health signals so that I can identify stuck or overrunning agents.

### Agent (Machine Principal)
- As an agent, I want to call a structured memory API to read and write session-scoped context so that I maintain coherent state across multi-step tasks without relying on the LLM's context window alone.
- As an agent, I want to call registered tools (search, file I/O, API calls) via a standardized interface so that I do not need to manage individual API credentials.

---

## 5. Requirements

### P0 — Must Have
- **Agent Manifest Format:** YAML definition covering: agent name, capability profile (references Swarm Covenant), tools list, memory scope (session/global/persistent), resource limits (max concurrent sessions, max token budget, max wall time), and entry point.
- **Agent Launcher:** API and CLI to start, list, and stop agent sessions from a manifest.
- **Session Isolation:** Each agent session runs in an isolated Cloud Run container instance with its own ephemeral filesystem and network namespace.
- **Tool Registry:** Registered tool definitions (search, file read/write, HTTP call, HeadyAI call, Pub/Sub emit) that agents can invoke via a standardized internal API. Tools are injected based on manifest declaration.
- **Session Memory API:** Read/write API for structured session memory: `memory.set(key, value, scope)`, `memory.get(key, scope)`. Scopes: `session` (ephemeral), `persistent` (survives session end).
- **Swarm Covenant Integration:** All tool invocations and resource writes pass through Covenant authorization before execution.
- **Session Logs:** Structured per-session logs (agent ID, session ID, action, input, output, timestamp) streamed to Cloud Logging.
- **Resource Enforcement:** Hard limits on CPU, memory, token budget, and wall time; session terminated if limits exceeded.

### P1 — Should Have
- **Dev Sandbox Environment:** Isolated Habitat instance for development with mock external APIs and reduced resource limits.
- **Agent Registry:** Searchable catalog of all deployed agents with descriptions, capability profiles, and usage statistics.
- **Warm Pool:** Pre-warmed container pool for high-priority agent types to reduce cold-start latency.
- **Session Replay:** Reconstruct the full execution trace of a past session from logs for debugging.
- **Health Monitor Integration:** Push session health signals to Deployment Pulse.

### P2 — Future Considerations
- Multi-region agent execution for latency-sensitive deployments.
- Persistent agent identities that carry memory across sessions (long-running agent personas).
- Agent versioning and A/B testing framework.
- Cost attribution per agent session.

---

## 6. User Experience

### Agent Registry (Developer Dashboard)
- List of all deployed agents: name, status (active/inactive), last run, average session duration, session count.
- Click to view manifest, recent session logs, and capability profile.
- "New Agent" button opens manifest editor (YAML with validation and AI-assisted scaffolding).

### Session Monitor (Platform Dashboard)
- Real-time table of active sessions: agent name, session ID, start time, elapsed time, tool calls made, token budget used/remaining.
- Color-coded resource usage: green (healthy), yellow (approaching limit), red (at limit).
- "Kill Session" action for stuck or runaway sessions.
- Session log viewer: filterable timeline of actions within a selected session.

### CLI (`heady-habitat`)
```
heady-habitat deploy --manifest agents/grant-agent.yaml
heady-habitat run heady-grant-agent --input '{"task": "find grants for youth programs"}'
heady-habitat status --session abc123
heady-habitat logs --session abc123 --follow
heady-habitat kill --session abc123
```

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Heady Agent Habitat                        │
│                                                                 │
│  ┌───────────────┐   ┌──────────────────────────────────────┐  │
│  │  Agent        │   │  Habitat API (Cloud Run)              │  │
│  │  Registry     │◀──│  /deploy /run /status /logs /kill     │  │
│  │  (Postgres)   │   └──────────────┬───────────────────────┘  │
│  └───────────────┘                  │                           │
│                                     ▼                           │
│                    ┌────────────────────────────────┐           │
│                    │   Session Launcher              │           │
│                    │   Cloud Run Job per session     │           │
│                    │   Injects: tools, memory client,│           │
│                    │   Covenant client, resource caps│           │
│                    └───────────────┬────────────────┘           │
│                                    │                            │
│        ┌───────────────────────────┼──────────────────┐         │
│        ▼                           ▼                  ▼         │
│  ┌──────────────┐  ┌─────────────────────────┐  ┌──────────┐  │
│  │  Session     │  │  Tool Registry           │  │  Swarm   │  │
│  │  Memory API  │  │  (Search, File, HTTP,    │  │  Covenant│  │
│  │  (Redis +    │  │   HeadyAI, Pub/Sub emit) │  │  Client  │  │
│  │   Postgres)  │  │                         │  │          │  │
│  └──────────────┘  └─────────────────────────┘  └──────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Session Logs → Cloud Logging → Deployment Pulse         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
- Habitat API: Cloud Run (Node.js / TypeScript)
- Agent Sessions: Cloud Run Jobs (one per session); isolated execution
- Session Memory: Redis (Memorystore) for session-scoped; PostgreSQL for persistent
- Tool Registry: Cloud Run internal service with registered tool handlers
- Covenant Client: library injected into each session container
- Session Logs: Cloud Logging + structured log export to BigQuery
- CLI: Node.js CLI (`heady-habitat`)
- Auth: Heady service identity JWT

---

## 8. Data Flows

### Agent Deployment Flow
1. Developer runs `heady-habitat deploy --manifest agent.yaml`.
2. Habitat API validates manifest (schema, capability profile exists, tools registered).
3. Agent registered in Agent Registry with validated manifest stored.
4. Container image pre-built with injected tool SDK and memory client.
5. Deployment confirmed; agent ready to run.

### Session Execution Flow
1. Client calls `POST /run` with agent name and input payload.
2. Habitat API creates session record; launches Cloud Run Job with manifest-defined resource limits.
3. Agent container starts; session memory initialized.
4. Agent calls tools via Tool Registry; each call passes through Covenant authorization.
5. Agent writes state to Session Memory as needed.
6. On completion (or timeout), agent emits result payload; session terminated; memory cleaned (session scope).
7. Session log finalized.

### Memory Access Flow
1. Agent calls `memory.set("key", value, "session")` → stored in Redis with session-scoped TTL.
2. Agent calls `memory.get("key", "persistent")` → fetched from PostgreSQL persistent store.
3. Persistent memory writes require Covenant authorization (resource: `persistent-memory`).

---

## 9. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Session isolation | Each session runs in a separate Cloud Run Job instance; no shared filesystem |
| Tool access control | Tools injected only if declared in manifest AND allowed by Covenant capability profile |
| Memory scope leakage | Session memory uses session-ID-prefixed keys in Redis; no cross-session key access possible |
| Resource exhaustion | Hard CPU/memory/token/wall-time limits enforced by Cloud Run and Habitat runtime |
| Credential injection | API keys injected via Secret Manager at container startup; never passed in input payload |
| Log data sensitivity | Logs may contain task inputs; access restricted to Platform role; PII scrubber applied to logs |

---

## 10. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| Heady Swarm Covenant | Internal | High — all tool calls require Covenant authorization |
| HeadyAI routing | Internal | High — agents call HeadyAI for inference |
| Cloud Run Jobs | Infrastructure | Low — stable GCP service |
| Redis (Memorystore) | Infrastructure | Low — managed service |
| Cloud SQL PostgreSQL | Infrastructure | Low — managed service |
| Heady Deployment Pulse | Internal downstream | Low — Habitat pushes session health; Pulse is consumer |
| Heady Cloud Forge | Internal | Low — Forge provisions Habitat infrastructure resources |

---

## 11. Phased Rollout

### Phase 1 — Core Runtime (Weeks 1–4)
- Agent manifest format and validation.
- Habitat API: deploy, run, status, kill.
- Session isolation via Cloud Run Jobs.
- Tool Registry with 3 core tools: HeadyAI call, HTTP GET, Pub/Sub emit.
- Session logs to Cloud Logging.
- Resource enforcement (wall time + memory).

### Phase 2 — Memory + Governance (Weeks 5–8)
- Session Memory API (Redis + PostgreSQL).
- Swarm Covenant integration for tool calls.
- CLI (`heady-habitat`).
- Dev sandbox environment.
- Platform dashboard: active session monitor.

### Phase 3 — Intelligence (Weeks 9–12)
- Agent Registry with catalog UI.
- Warm pool for priority agents.
- Session Replay.
- Additional tool registrations (file I/O, search, Grant Constellation, Impact Ledger).
- Deployment Pulse integration.

### Phase 4 — Enhancement (Post-launch)
- Persistent agent identities.
- Agent versioning and A/B.
- Multi-region execution.

---

## 12. Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| Agent deployment time | ≤ 4 hours from manifest to first run | Per deployment |
| Session startup latency (p99) | ≤ 10 seconds | Load test |
| Resource limit violations | 0 in production | Ongoing |
| Covenant integration coverage | 100% of tool calls authorized | Launch day |
| Session trace coverage | 100% of sessions fully logged | Ongoing |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What is the initial set of agents that must be deployable on Habitat launch? | Eric | Yes (Phase 1) |
| Should persistent memory be scoped per-agent or per-organization? | Platform | Yes (Phase 2) |
| What is the maximum token budget per session for cost control? | Eric | Yes (Phase 1) |
| Should Cloud Run Jobs or standard Cloud Run services be used for session isolation? | Platform | Yes (Phase 1) |
