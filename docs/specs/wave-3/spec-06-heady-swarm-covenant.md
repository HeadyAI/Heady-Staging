# Spec 06 — Heady Swarm Covenant

**Wave:** Third Wave  
**Domain:** headysystems.com / Swarm Orchestration  
**Primary Repos:** headysystems-core, heady-production, headymcp-core, headybot-core, latent-core-dev, template-swarm-bee  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Swarm Covenant is the governance, lifecycle, and behavioral contract layer for Heady's swarm agent ecosystem. While headybot-core and template-swarm-bee define how individual swarm bees are built and communicate, Swarm Covenant defines the social contract that governs their collective behavior: what a bee is allowed to do, how bees coordinate, what happens when a bee violates its contract, and how the swarm topology routes work in a safe, auditable, and recoverable way.

The Covenant is a living specification — not just documentation — that is machine-readable, version-controlled, and enforced at runtime by the Covenant Engine. Each swarm bee signs a covenant when instantiated; the engine monitors compliance throughout the bee's lifecycle.

**Why it matters:** Multi-agent orchestration without behavioral contracts is brittle and ungovernable. As Heady's swarm grows (new bees for grant research, donor resonance, infrastructure, deployment, etc.), the absence of a governance layer creates emergent misbehavior, resource conflicts, and audit impossibility. Swarm Covenant is the rule of law for the swarm.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Every swarm bee at instantiation must pass a covenant compliance check before it enters active status | Non-compliant bee activation count = 0 |
| G2 | All covenant violations are detected, logged, and the offending bee is quarantined within 10 seconds | P95 violation-to-quarantine time |
| G3 | Covenant specs are version-controlled and any change requires a review + merge process (no ad-hoc runtime edits) | Unreviewed covenant change count = 0 |
| G4 | Any operator can inspect the covenant state of any bee or the full swarm within 5 seconds | Time-to-covenant-state query |
| G5 | Swarm topology routing decisions are logged with covenant justification so post-hoc analysis is possible | Routing decision audit completeness ≥ 98% |

---

## 3. Non-Goals

- **Individual bee capability implementation** — Covenant governs behavior; capability is each bee's own concern.
- **Swarm task assignment or scheduling** — Task routing is handled by headysystems-core orchestration; Covenant provides the behavioral rails it operates within.
- **Model selection for individual agents** — Out of scope; model routing is handled by heady-production.
- **Human-to-agent conversation management** — That is HeadyBuddy Shell's domain.

---

## 4. User Stories

**As a swarm architect,** I want to define a covenant spec for a new class of bee (e.g., "Grant Discovery Bee") that specifies its allowed tools, resource limits, communication topology, and escalation behavior — and have that covenant automatically enforced when any bee of that class is instantiated.

**As a platform operator,** I want to be alerted immediately when any bee violates its covenant (e.g., attempts to call a tool it is not authorized to use) and have the bee automatically quarantined pending review.

**As an auditor,** I want to pull a complete covenant audit trail for any bee — showing its instantiation, covenant version it signed, every action it took, and any violations — so that I can review its behavior history.

**As a developer building a new bee,** I want the covenant spec to be a clear, structured YAML file with documented fields so that I can write a valid covenant without reading the entire Covenant Engine source.

**As an engineering lead,** I want a Swarm Covenant Dashboard that shows: active bee count, covenant versions in use, topology map, and any active violations — so that I have full situational awareness of the swarm.

---

## 5. Requirements

### P0 — Must Have

- **Covenant Spec Format:** Versioned YAML schema defining a bee's: allowed MCP tools, resource limits (memory, call rate, execution time), permitted communication peers (pub/sub topics), escalation policy (who to notify on failure), shutdown behavior, and metadata (class, wave, owner).
- **Covenant Registry:** heady-production table storing all versioned covenant specs. Each spec is immutable once published; new versions create new records. Bees always reference a specific covenant version.
- **Covenant Engine (Runtime Enforcer):** Middleware layer in headymcp-core and headybot-core that validates every bee action against its signed covenant in real time. Blocks disallowed tool calls, enforces rate limits, and triggers violation events.
- **Covenant Signing at Instantiation:** When a bee starts (template-swarm-bee lifecycle), it must reference a valid covenant version and receive a signed covenant token. Bees without a valid token cannot call MCP tools.
- **Violation Handler:** When a covenant violation is detected: log the event, quarantine the bee (suspend its MCP tool access), notify the owner via headybuddy-core, and create a Violation Record for review.
- **Covenant Audit Log:** Append-only record of every covenant-gated action — tool call attempt, allowed/blocked result, bee ID, covenant version, timestamp.
- **CLI / API for Covenant Ops:** Operators can: list active bees + covenant status, inspect a bee's covenant, manually quarantine/release a bee, promote a new covenant version.

### P1 — Should Have

- **Covenant Diff Viewer:** When a new covenant version is published, show a human-readable diff vs. the prior version. Requires approval before active deployment.
- **Topology Map:** Visual representation of the swarm — bees as nodes, pub/sub communication edges between them, covenant version badges, and quarantine indicators.
- **Covenant Inheritance:** A "base covenant" for all bees with common defaults; class-specific covenants extend the base. Reduces duplication.
- **Graceful Degradation Mode:** When a bee's covenant is about to expire (version sunset), it receives a warning and continues operating in read-only mode until renewed. Prevents hard failures.

### P2 — Future

- **Cross-swarm covenant federation** — multiple Heady swarms can share a federated covenant registry.
- **Covenant compliance scoring** — long-term behavioral track record per bee class, used for trust tier elevation.
- **Automated covenant generation** — from a natural language bee description, generate a starter covenant YAML draft.

---

## 6. User Experience

1. **Entry point:** Swarm Covenant panel at `headysystems.com/swarm` (admin) and via headymcp-core covenant tools.
2. **Covenant Registry view:** Table of all covenant specs: class name, version, active bee count, status (active/deprecated/draft). Click to view full YAML spec.
3. **Active Swarm view:** Live table of all active bees: bee ID, class, covenant version, status (active/quarantined/draining), last action, owner.
4. **Violation log:** Feed of recent violations with: bee ID, violation type, attempted action, time, and resolution status. Click to see full bee covenant audit trail.
5. **Covenant editor:** YAML editor with schema validation, diff preview vs. prior version, and a "Publish" flow that requires peer review.
6. **Topology Map:** Interactive force-directed graph. Click any bee to see its covenant summary in a side panel.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│  headysystems.com UI (/swarm)                       │
│  (template-heady-ui micro-frontend)                 │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────┐
│             headysystems-core                        │
│  Covenant Engine      │  Violation Handler          │
│  Topology Router      │  Covenant Ops API           │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────────┐
│  heady-production   │  │  headymcp-core           │
│  covenant_registry  │  │  Runtime enforcement     │
│  covenant_audit_log │  │  middleware (every tool  │
│  violation_records  │  │  call validated against  │
│  active_bees        │  │  signed covenant token)  │
└─────────────────────┘  └────────────┬─────────────┘
                                       │
                         ┌─────────────▼────────────┐
                         │  template-swarm-bee       │
                         │  headybot-core            │
                         │  (bee instances sign and  │
                         │  refresh covenant tokens) │
                         └──────────────────────────┘
                                       │
                         ┌─────────────▼────────────┐
                         │  headybuddy-core          │
                         │  Violation alerts         │
                         └──────────────────────────┘
```

---

## 8. Data Flows

**Bee instantiation flow:**
```
New bee instance starts (template-swarm-bee lifecycle hook)
  → Bee sends: class_id, covenant_version, owner, purpose
  → Covenant Engine: validate covenant_version exists + is active
  → If valid: issue signed_covenant_token (JWT, scoped to bee ID)
  → Bee stores token; includes in every MCP tool call
  → active_bees record created with status = "active"
```

**Runtime enforcement flow:**
```
Bee calls MCP tool (e.g., search_grants)
  → headymcp-core middleware intercepts
  → Validate signed_covenant_token (not expired, valid signature)
  → Check tool against bee's allowed_tools in covenant spec
  → Check call rate against resource_limits
  → If all pass: forward tool call → return result
  → If violation: block call, log to covenant_audit_log,
    trigger violation_handler
```

**Violation handling flow:**
```
Violation detected
  → Create violation_record (bee_id, violation_type, attempted_action, timestamp)
  → Update active_bees status = "quarantined"
  → Revoke bee's covenant token (invalidated in headymcp-core)
  → Notify owner via headybuddy-core push
  → Bee can no longer execute MCP tool calls
  → Operator reviews → can release (restore token) or terminate bee
```

---

## 9. Security & Privacy

- Signed covenant tokens use HS256 (minimum) with headymcp-core's signing key. Tokens are short-lived (TTL: 4 hours); bees must refresh.
- Covenant Engine is a hard enforcement layer, not advisory. Every MCP tool call goes through it.
- Covenant Registry is write-protected: no bee can modify its own covenant. Only covenant-operator role can publish new versions.
- Covenant audit log is INSERT-only from application layer; readable by operator and auditor roles.
- Violation records are never purged; retained permanently for auditability.
- Quarantined bees cannot communicate with other bees via pub/sub (Covenant Engine blocks pub/sub dispatch too).

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headysystems-core — orchestration engine | Internal | Extend with Covenant module |
| headymcp-core — tool call middleware | Internal | Add enforcement middleware layer |
| heady-production — Postgres (new tables) | Internal | Migration required |
| template-swarm-bee — lifecycle hook integration | Internal | Add covenant signing to instantiation |
| headybot-core — bee runtime integration | Internal | Add covenant token management |
| headybuddy-core — violation alerts | Internal | Add covenant alert type |

---

## 11. Phased Rollout

### Phase 1 — Covenant Foundation (Weeks 1–4)
- Covenant spec YAML schema design and validation
- Covenant Registry schema in heady-production
- Covenant signing at bee instantiation (template-swarm-bee)
- Basic audit log

### Phase 2 — Runtime Enforcement (Weeks 5–8)
- Covenant Engine middleware in headymcp-core
- Violation Handler + quarantine
- Violation alerts via headybuddy-core
- Covenant Ops API (CLI)

### Phase 3 — Governance UI (Weeks 9–12)
- Swarm Covenant Dashboard (registry + active bees + violations)
- Covenant Diff Viewer + approval flow
- Topology Map visualization
- Covenant Inheritance base spec
- First full swarm-wide covenant audit

---

## 12. Success Metrics

| Metric | Baseline | 90-Day Target |
|--------|---------|---------------|
| Non-compliant bee activations | Unknown (no enforcement) | 0 |
| Violation-to-quarantine time (P95) | N/A | ≤ 10 seconds |
| Covenant audit completeness | 0% | ≥ 98% |
| Unreviewed covenant changes | N/A (no version control) | 0 |
| Time-to-covenant-state query | N/A | ≤ 5 seconds |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| What pub/sub infrastructure do swarm bees currently use? (Cloudflare Queues? Redis pub/sub?) | Engineering | Yes — affects Covenant Engine pub/sub enforcement |
| Should covenant tokens use a Heady-internal signing service or Cloudflare Workers KV for token storage? | Engineering | Yes — architectural decision |
| What is the maximum number of concurrent bees expected in the near term? | Eric | No — affects scaling design but not Phase 1 |
| Should existing bees (pre-Covenant) be retroactively assigned covenants or quarantined until they are updated? | Eric | Yes — migration strategy needed before Phase 1 |
