# Heady Swarm Covenant
### Feature Specification — Third Wave
**Version:** 1.0  
**Date:** 2026-03-17  
**Owner:** headysystems.com / headybot.com  
**Domain:** headysystems.com, headybot.com, heady-ai.com  
**Skill Target:** heady-swarm-covenant

---

## 1. Purpose

Heady Swarm Covenant is the governance, trust, and coordination protocol layer for multi-agent swarms operating within the Heady ecosystem. As the number of autonomous Heady agents grows — spanning research, writing, data, deployment, grant, and donor workflows — Swarm Covenant defines the rules by which agents cooperate: delegation authority, resource access limits, inter-agent messaging semantics, conflict resolution, human escalation thresholds, and a shared audit trail of every agent action. It is the social contract of the Heady swarm.

**Problem Statement:**  
When multiple autonomous agents operate in parallel on complex tasks, coordination failures emerge: duplicate work, conflicting state writes, resource contention, infinite delegation loops, and actions taken without proper authorization. Without a governing layer, agent swarms become unpredictable and unsafe. Swarm Covenant solves this by establishing a binding, runtime-enforced protocol that all Heady agents must follow before acting on shared resources or delegating tasks.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Prevent unauthorized agent actions across all shared Heady resources | Zero unauthorized resource writes in production after launch |
| G2 | Enable safe parallel agent execution with zero conflicting state writes | Conflict rate ≤ 0 in production; detected and resolved in staging |
| G3 | Provide a complete, queryable audit trail of every agent action | 100% of agent actions traceable to initiating human request |
| G4 | Enable configurable human escalation gates for high-stakes agent decisions | Escalation triggers working for all defined sensitive action types |
| G5 | Reduce swarm coordination overhead so agents spend ≥ 80% of time on task | Coordination overhead time tracked per swarm run |

---

## 3. Non-Goals

- **Not an agent execution runtime.** Swarm Covenant governs agents; it does not run them. Agent execution is handled by Heady Agent Habitat.
- **Not an LLM inference layer.** Covenant deals with protocol and governance, not model routing or inference.
- **Not a workflow orchestration engine.** Sequential task pipelines are managed by other Heady services. Covenant governs the trust and access layer beneath workflows.
- **Not a user-facing product.** Swarm Covenant is infrastructure; end users interact with agents, not with Covenant directly.
- **Not a billing or quota system.** API usage metering for cost management is separate.

---

## 4. User Stories

### Agent (Machine Principal)
- As an agent, I want to query the Covenant before writing to a shared resource so that I can confirm I have the required authorization and avoid conflicting writes.
- As an agent, I want to register a sub-task delegation with the Covenant so that the delegation chain is tracked and loop detection can fire if needed.
- As an agent, I want to receive a structured permission token that I can present to downstream services so that I do not need to re-authenticate at each step.

### Platform Engineer
- As a platform engineer, I want to define per-role capability profiles (what a "research agent" vs. a "deployment agent" is allowed to do) so that I can enforce least-privilege across the swarm.
- As a platform engineer, I want to inspect the full delegation tree of any swarm run so that I can debug unexpected behaviors.
- As a platform engineer, I want to set escalation thresholds (e.g., "any agent that wants to run `forge apply` on production must escalate to a human") so that high-risk actions are never taken autonomously.

### Engineering Lead
- As an engineering lead, I want a real-time dashboard showing active swarm runs, agent delegation depth, and resource locks so that I have situational awareness of what the system is doing.

---

## 5. Requirements

### P0 — Must Have
- **Capability Profile Registry:** Named profiles defining allowed resource access, action types, delegation depth, and escalation thresholds (e.g., `research-agent`, `deploy-agent`, `grant-agent`).
- **Authorization Gate API:** Agents call `covenant.authorize(agent_id, action, resource)` before any shared resource write; Covenant returns `ALLOW`, `DENY`, or `ESCALATE`.
- **Delegation Registry:** Tracks delegation chains (parent agent → child agent → grandchild agent) with cycle detection; rejects delegations that would create loops or exceed max delegation depth.
- **Permission Token Issuance:** On ALLOW, Covenant issues a short-lived signed JWT that the agent presents to downstream services, encoding: agent_id, capability scope, resource target, expiry.
- **Human Escalation Channel:** When `ESCALATE` is returned, a structured escalation request is routed to HeadyBuddy and the relevant human operator with full context; agent pauses pending human decision.
- **Audit Log:** Append-only log of every authorization request: agent, action, resource, decision, token issued, delegation parent.
- **Resource Lock Manager:** Optimistic locking for shared resources; agents declare intent to write, Covenant detects conflicts and returns `CONFLICT` with resolution options.

### P1 — Should Have
- **Swarm Run Tracker:** Each top-level human request spawns a named swarm run; all agent actions within that run tagged with the run ID for traceability.
- **Dashboard:** Real-time view of active swarm runs, delegation trees, resource locks, and escalation queue.
- **Policy Editor:** Visual editor for capability profiles; no code required to adjust thresholds.
- **Anomaly Detection:** Flag unusual delegation depth, unusually high action rates, or repeated ESCALATE patterns.

### P2 — Future Considerations
- Formal verification of capability policies using policy-as-code (e.g., OPA / Rego).
- Cross-ecosystem federation: Covenant policies shared with external trusted agent systems.
- Agent reputation scoring: track historical behavior to dynamically adjust trust levels.

---

## 6. User Experience

### Platform Dashboard
- Active Swarm Runs panel: run ID, initiating user, start time, agent count, current delegation depth, health status.
- Delegation Tree Visualizer: expandable tree showing parent → child agent relationships for a selected run.
- Resource Lock Map: which resources are currently locked, by which agent, for how long.
- Escalation Queue: pending human decisions with context cards; approve/deny buttons.
- Audit Log Explorer: searchable by agent, resource, action, or time range.

### HeadyBuddy Escalation
- "Agent `heady-grant-agent` wants to execute `forge apply` on production infrastructure. This action requires your approval. [Approve] [Deny] [View Details]"
- Agent pauses until human responds; timeout results in auto-deny after configurable window.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Heady Swarm Covenant                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Covenant API (Cloud Run)                  │ │
│  │  /authorize  /delegate  /lock  /release  /escalate        │ │
│  └───────────────────────────────────────────────────────────┘ │
│           │               │               │                     │
│           ▼               ▼               ▼                     │
│  ┌───────────────┐ ┌────────────────┐ ┌──────────────────────┐ │
│  │  Capability   │ │  Delegation    │ │  Resource Lock       │ │
│  │  Profile      │ │  Registry      │ │  Manager             │ │
│  │  Registry     │ │  + Cycle Det.  │ │  (Redis / Memstore)  │ │
│  └───────────────┘ └────────────────┘ └──────────────────────┘ │
│           │               │               │                     │
│           └───────────────┼───────────────┘                     │
│                           ▼                                     │
│                  ┌──────────────────┐                           │
│                  │  Token Issuer    │                           │
│                  │  (Signed JWT)    │                           │
│                  └──────────┬───────┘                           │
│                             │                                   │
│         ┌───────────────────┼──────────────────┐                │
│         ▼                   ▼                  ▼                │
│  ┌────────────┐  ┌───────────────────┐  ┌──────────────┐       │
│  │  Audit     │  │  Escalation       │  │  Swarm Run   │       │
│  │  Log (GCS) │  │  Router           │  │  Tracker     │       │
│  │  (append   │  │  (HeadyBuddy +    │  │  (Postgres)  │       │
│  │   only)    │  │   Email)          │  │              │       │
│  └────────────┘  └───────────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
- Covenant API: Cloud Run (Node.js / TypeScript)
- Capability Profiles: stored in PostgreSQL; hot-cached in Redis
- Delegation Registry: PostgreSQL with adjacency list model
- Resource Locks: Redis (Memorystore) with TTL-based lock expiry
- Token Issuance: RS256 JWT signed with Heady signing key
- Audit Log: append-only Cloud Storage JSONL + BigQuery for analytics queries
- Escalation: HeadyBuddy webhook bridge; SendGrid email
- Frontend: React SPA on Cloudflare Pages

---

## 8. Data Flows

### Authorization Request Flow
1. Agent calls `POST /authorize` with `{agent_id, action, resource, run_id}`.
2. Covenant fetches agent's capability profile; checks action against allowed actions.
3. Checks resource lock state; if locked by another agent, returns `CONFLICT`.
4. Checks escalation threshold; if action requires human approval, returns `ESCALATE`.
5. If all checks pass: acquires optimistic resource lock; issues signed JWT; returns `ALLOW`.
6. Audit log entry written.

### Delegation Flow
1. Parent agent calls `POST /delegate` with `{parent_agent_id, child_agent_id, sub_task, run_id}`.
2. Covenant validates delegation depth (max depth from capability profile).
3. Cycle detection runs on delegation graph; rejects if loop detected.
4. Delegation record created; child agent receives inherited (but potentially narrower) capability scope.
5. Child agent proceeds with delegated capabilities; parent agent monitors via run tracker.

### Escalation Flow
1. Covenant returns `ESCALATE` to agent.
2. Agent sends `POST /escalation/create` with full action context.
3. Escalation Router sends structured request to HeadyBuddy and email.
4. Human responds: Approve or Deny.
5. Covenant receives decision; either issues ALLOW token or returns final DENY to agent.
6. Agent resumes (if approved) or gracefully terminates sub-task (if denied).

---

## 9. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Token forgery | JWT signed with RSA-256; public key distributed to all verifying services |
| Privilege escalation | Agents cannot grant capabilities they do not themselves hold (token capability ceiling) |
| Audit immutability | Audit log written to append-only GCS bucket; no delete IAM on log bucket |
| Lock poisoning | Resource locks have mandatory TTL (max 5 minutes); no indefinite locks |
| Delegation loops | Graph cycle detection on every delegation request; O(n) traversal with depth cap |
| API access | Covenant API requires valid Heady service identity JWT; not exposed to public internet |

---

## 10. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| Heady Agent Habitat | Internal | High — Habitat is the runtime; Covenant is the governance layer |
| HeadyAI routing | Internal | Low — Covenant does not call LLMs directly |
| HeadyBuddy notification bridge | Internal | Medium — escalations require HeadyBuddy to be live |
| Redis (Memorystore) | Infrastructure | Low — managed service |
| Cloud SQL PostgreSQL | Infrastructure | Low — managed service |
| Heady identity / signing keys | Internal | High — token issuance requires key management |
| Heady Cloud Forge | Internal | Low — Forge is a regulated resource; Covenant governs Forge access |

---

## 11. Phased Rollout

### Phase 1 — Core Governance (Weeks 1–4)
- Capability profile registry with 3–5 initial profiles.
- Authorization Gate API (allow/deny only; no escalation yet).
- Delegation registry with cycle detection.
- Audit log.

### Phase 2 — Safety Layer (Weeks 5–7)
- Escalation channel via HeadyBuddy.
- Resource lock manager (Redis).
- Permission token issuance (signed JWT).
- Swarm run tracker.

### Phase 3 — Visibility (Weeks 8–10)
- Dashboard: delegation trees, lock map, escalation queue.
- Anomaly detection for unusual delegation patterns.
- Policy editor (no-code profile editing).

### Phase 4 — Enhancement (Post-launch)
- OPA/Rego policy-as-code integration.
- Agent reputation scoring.
- Cross-ecosystem federation.

---

## 12. Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| Unauthorized resource writes | 0 in production | Ongoing |
| Conflicting state writes | 0 (all detected and resolved) | Ongoing |
| Escalation response time | ≤ 15 minutes average human response | 30 days post-launch |
| Authorization API latency | p99 ≤ 50ms | Ongoing |
| Audit trace coverage | 100% of agent actions traceable | Launch day |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What is the initial set of capability profiles needed for Wave 3 agents? | Eric / Platform | Yes (Phase 1) |
| Should escalation timeout result in auto-deny or auto-approve for non-destructive actions? | Eric | Yes (Phase 2) |
| What is the maximum delegation depth for initial profiles? | Platform | Yes (Phase 1) |
| Should all Heady agents be required to use Covenant from day one, or phased by agent type? | Eric | Yes (Phase 1) |
