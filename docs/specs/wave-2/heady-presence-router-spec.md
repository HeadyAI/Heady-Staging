# Feature Specification: Heady Presence Router

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / heady-ai.com / headymcp.com  
**Status:** Draft

---

## 1. Purpose

Heady Presence Router is the intelligent session-state and signal-routing layer that understands where the user is, what they're doing, and which Heady agent or service should be active — and seamlessly transitions context as the user moves across devices, domains, or modalities. It is the "nervous system" that makes the Heady ecosystem feel like one continuous, aware experience rather than a collection of disconnected apps.

### Problem Statement
Users interact with the Heady ecosystem across multiple domains (headyme.com, headybuddy.org, headybot.com), devices (desktop, mobile, tablet), and modalities (text chat, voice, task execution). Each context switch currently produces a cold start. The system does not know that the user who just left headyme.com is the same person now opening headybuddy.org on their phone. There is no signal about what the user was doing, how engaged they are, or what state they expect to resume. This creates fragmentation and reduces the ecosystem's value as a unified ambient intelligence.

### Goals
1. Maintain a live, consented presence state for each active user that updates within 1 second of a session event.
2. Intelligently route new session starts to the appropriate agent/persona based on presence state and domain.
3. Enable context-preserving handoffs between domains, devices, and modalities using Context Capsule Mesh.
4. Respect explicit user control: presence can be paused, masked, or scoped to specific domains.
5. Reduce average context re-establishment time at session start by ≥60% vs. cold-start baseline.

### Non-Goals
- Location-based presence (GPS or network-based location tracking is not used — presence is signal-based).
- Presence sharing between users (user-to-user presence visibility is out of scope).
- Real-time collaborative session piggyback (two users joining the same session simultaneously, v2).
- Integration with external presence systems (Slack status, calendar status) in v1.

---

## 2. User Experience

### User Personas
- **The Multi-Device Worker** — switches between laptop and phone throughout the day and expects seamless continuity.
- **The Flow-State User** — deeply engaged in a long task and does not want to lose thread when their browser sleeps or they step away.
- **The Privacy-First User** — wants the benefits of presence routing but demands explicit control over what is tracked and when.

### Core UX Flows

**Presence-Aware Session Resume**
1. User left a session on headyme.com and returns hours later on a different device.
2. Presence Router detects the new session event (user ID authenticated, domain known).
3. Checks presence state: last active domain, last capsule created, active persona, current task genome.
4. New session loads with a subtle "Resume?" banner: "You were working on [goal/label]. Continue where you left off?"
5. User taps "Continue" → Context Capsule is resolved and session begins with prior context.
6. User taps "Start fresh" → cold-start session with no injected context.

**Domain Transition Signal**
1. User navigates from headyme.com to headybuddy.org (or clicks a domain-cross link).
2. Presence Router intercepts the domain transition event.
3. Router evaluates: does the user have an active task or capsule? What persona is active?
4. If yes and target domain is context-compatible: Presence Router pre-stages a capsule for the arriving session.
5. headybuddy.org session start receives the pre-staged capsule and loads context silently (no banner — just works).
6. User experiences continuity without any action.

**Presence Control Panel (headyme.com → Settings → Presence)**
- Current status indicator: Active / Idle / Do Not Disturb
- Active presence scope: list of domains where presence is tracked (toggle per domain)
- Pause all: pauses all presence tracking (still authenticates, but no state is captured)
- Clear presence state: wipes current presence signals and resets to cold-start behavior
- Last 7 presence events: read-only log of when/where the system detected session transitions

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Presence Signal Collector | Receives session start/end/transition events from all Heady domains | headymcp.com |
| Presence State Store | Per-user current presence record (active domain, device, capsule_id, persona_id, last_seen) | headysystems.com |
| Routing Intelligence | Evaluates presence state and determines capsule-injection or persona-activation recommendation for new sessions | heady-ai.com |
| Capsule Pre-Stager | Pre-creates or caches context capsule for anticipated domain transitions | headymcp.com |
| Presence API | Exposes presence read/write endpoints to all Heady domains | headyapi.com |
| Presence Control UI | User-facing presence management panel in headyme.com settings | headyme.com |
| Privacy Enforcer | Applies user's presence scope settings before any state is captured or shared | headysystems.com |

### Presence State Schema
```json
{
  "user_id": "uuid",
  "last_active_at": "ISO8601",
  "last_active_domain": "headyme.com",
  "last_active_device_class": "desktop|mobile|tablet",
  "active_persona_id": "uuid|null",
  "active_capsule_id": "uuid|null",
  "active_genome_id": "uuid|null",
  "presence_mode": "active|idle|dnd|paused",
  "allowed_domains": ["headyme.com", "headybuddy.org"],
  "signals": [
    {"event": "session_start|session_end|domain_transition|capsule_create", "domain": "string", "at": "ISO8601"}
  ]
}
```

---

## 4. Data Flows

### Session Start Flow (with Presence)
```
1. User authenticates on any Heady domain
2. Domain emits POST /presence/signal {user_id, event: "session_start", domain, device_class}
3. Privacy Enforcer checks: is this domain in user's allowed_domains? If not, signal is dropped
4. Presence State Store updates: last_active_domain, last_active_at, device_class
5. Session orchestrator queries: GET /presence/recommend {user_id, target_domain}
6. Routing Intelligence evaluates presence state:
   - Active capsule available? → recommend capsule injection
   - Active persona? → recommend persona activation
   - Idle > 24h? → recommend cold start
7. Recommendation returned to session orchestrator
8. Session starts with recommended context (or cold start)
```

### Domain Transition Flow (Anticipated)
```
1. User on Domain A clicks link to Domain B
2. Domain A emits POST /presence/signal {event: "domain_transition", from: "A", to: "B"}
3. Routing Intelligence detects transition, checks if Domain B can receive context
4. If yes: Capsule Pre-Stager creates/refreshes context capsule and stages it for Domain B session start
5. Domain B session start receives pre-staged capsule (bypassing cold start delay)
```

### Presence Update Flow (Background)
```
1. Every 60 seconds, active session emits a heartbeat: POST /presence/signal {event: "heartbeat", domain}
2. Presence State Store updates last_active_at
3. If no heartbeat for 10 minutes: presence_mode set to "idle"
4. If no heartbeat for 4 hours: active_capsule_id cleared (too stale to be useful)
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Explicit consent gate | Presence tracking is off by default; user must enable it in account settings |
| Domain scope | Users control which domains participate in presence tracking; non-listed domains receive no presence data |
| Signal minimization | Presence signals contain only: user_id, event type, domain, timestamp — no content |
| State data classification | Presence state is Tier 2 Personal Data; retained for 30 days maximum |
| No content capture | Presence Router never captures message content, only structural session signals |
| Pause and clear | User can pause or wipe presence state at any time with immediate effect |
| Device fingerprinting | Not used — device class (desktop/mobile/tablet) is inferred from User-Agent header only |
| Audit log | User can view last 7 presence events in Control Panel |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| All Heady domain session orchestrators (must emit presence signals) | Multiple domains | Required — coordination needed |
| headymcp.com MCP layer (for cross-domain signal routing) | headymcp.com | Required |
| Heady Context Capsule Mesh (for capsule pre-staging and injection) | Second-wave | Complementary |
| Heady Persona Studio (for persona_id in presence state) | Second-wave | Complementary |
| headyapi.com API gateway | headyapi.com | Required |
| headyme.com dashboard (Presence Control UI) | headyme.com | Required |

---

## 7. Phased Rollout

### Phase 1 — Signal Collection + State Store (Weeks 1–4)
- Presence Signal Collector
- Presence State Store
- Privacy Enforcer (domain scope enforcement)
- Session start/end signals from headyme.com only
- Internal alpha
- Success gate: State updates within 1 second of session event; privacy scope enforcement tested

### Phase 2 — Routing Intelligence + Resume Banner (Weeks 5–8)
- Routing Intelligence with capsule recommendation
- Resume banner in headyme.com session start
- Idle and cold-start thresholds
- Closed beta: 50 users
- Success gate: ≥70% of returning sessions receive a correct resume recommendation

### Phase 3 — Cross-Domain + Presence Control UI (Weeks 9–12)
- Multi-domain signal collection (headybuddy.org, heady-ai.com)
- Capsule Pre-Stager for anticipated domain transitions
- Presence Control Panel in headyme.com settings
- Open launch
- Success gate: Context re-establishment time reduced ≥60% vs. cold-start baseline

### Phase 4 — Full Ecosystem + Device Continuity (Weeks 13–16)
- All Heady domains emit presence signals
- Mobile/tablet device class detection and cross-device resume
- Heartbeat with active capsule freshness scoring
- Success gate: ≥50% of multi-domain users use presence-assisted resume at least once per week

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Should presence tracking be opt-in or opt-out? (Privacy-first default = opt-in) | Product/Legal | Yes — before Phase 1 |
| Which domains are required to emit signals at launch vs. later phases? | Engineering | Yes — coordination needed before Phase 1 |
| How long should an active capsule be considered "fresh"? (Suggest 4 hours) | Product | No |
| Should the resume banner be shown every time or only after a configurable idle threshold? | Design | No |
| Is device continuity in Phase 4 dependent on mobile app existence? | Engineering | No — web-based mobile is sufficient |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Presence state update latency | < 1 second P99 | Ongoing |
| Resume accuracy | ≥85% of resume recommendations rated as relevant by user | 30 days post Phase 2 |
| Context re-establishment time reduction | ≥60% reduction vs. cold-start | 60 days post Phase 3 |
| Presence opt-in rate | ≥40% of active users enable presence tracking | 30 days post Phase 3 |
| Privacy incidents (unauthorized presence data access) | 0 | Ongoing |
