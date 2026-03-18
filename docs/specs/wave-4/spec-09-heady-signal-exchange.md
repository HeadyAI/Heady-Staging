# Spec-09: Heady Signal Exchange

**Wave:** Fourth  
**Feature Name:** Heady Signal Exchange  
**Skill Counterpart:** `heady-signal-exchange`  
**Surface Anchors:** headyme.com (command center), headymcp.com (MCP layer), headysystems.com (core architecture), headyapi.com (public interface)  
**Repo Anchors:** `HeadyMe/heady-production`, `HeadyMe/headymcp-core`, `HeadyMe/headysystems-core`, `HeadyMe/headyapi-core`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Signal Exchange is the real-time event, signal, and message bus that binds the Heady ecosystem together. It provides a durable, typed, schema-validated event backbone over which all Heady services — treasury changes, trust score mutations, voice sessions, agent task completions, avatar generations, and API events — publish and subscribe to signals. Signal Exchange replaces ad-hoc webhook patterns and point-to-point integrations with a fan-out, filterable, ordered, and auditable signal fabric.

**Problem Statement:**  
Today Heady's services communicate via direct REST calls and unstructured webhooks. There is no canonical event schema, no durable signal log, no subscription fanout (one event → many consumers), and no real-time push to browser or mobile clients. As the fourth-wave feature set grows, the coupling between services via direct HTTP calls becomes an architectural liability: a change to Treasury Nexus requires updating callers in Trust Fabric, Voice Vessel, and Monetization Matrix. Signal Exchange decouples this by providing a publish-once, subscribe-many fabric.

---

## 2. Goals

1. Provide a typed, schema-validated signal bus where any Heady service or authorized developer can publish events and any authorized subscriber can receive them in real time.
2. Deliver signals to subscribers via WebSocket (browser/mobile clients), Server-Sent Events (SSE), webhook (external developers), and inter-service Pub/Sub (internal services).
3. Persist all signals with a configurable retention window so late-joining subscribers can replay missed events.
4. Expose a developer-facing subscription API via headyapi.com so external applications can subscribe to Heady platform events without polling.
5. Support rich signal filtering (by type, entity, source, tag) so subscribers receive only the signals relevant to them.

### Non-Goals (v1)

- General-purpose message queue replacing internal Pub/Sub for compute workloads.
- Cross-organization federated signal exchange with non-Heady systems.
- Signal transformation or processing pipeline (CEP — complex event processing) — v1 is fan-out only.
- End-to-end encrypted signal payloads (payload-level encryption is Phase 2 via Sovereign Key Ring).
- Point-to-point direct messaging between users (that is a social feature, not a signal bus).

---

## 3. User Stories

### Service / Agent

- **As a Heady service** (e.g., Treasury Nexus), I want to publish a `BALANCE_CHANGED` event to Signal Exchange once and have it automatically delivered to Trust Fabric, Monetization Matrix, and any subscribed developer webhooks so I do not have to maintain a list of callers.
- **As a swarm agent**, I want to subscribe to `TASK_ASSIGNED` signals on my session channel via MCP so I receive new work items in real time without polling.

### Developer

- **As a headyio.com developer**, I want to subscribe to `AGENT_TASK_COMPLETED` events for agents running under my account so I can trigger downstream logic in my application when Heady completes work.
- **As a developer**, I want to filter my subscription to only signals from a specific entity or tagged with a specific label so I am not overwhelmed with irrelevant events.

### Operator

- **As a platform operator**, I want to view a live signal stream in headyme.com, filtered by service and signal type, so I can watch real-time system activity during an incident or deployment.
- **As an operator**, I want to replay the last 1 hour of signals for a specific service so I can reconstruct event sequence during a post-incident review.

### Browser / Mobile Client

- **As a headybuddy.org user**, I want my browser to receive a `VOICE_SYNTHESIS_READY` signal via WebSocket so the UI can trigger audio playback immediately without polling the voice API.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| SE-01 | Signal Schema Registry: typed signal schemas (JSON Schema) per event type; publishers validate against schema before publish. | Given invalid signal payload, when published, then rejected with schema validation error. |
| SE-02 | Publish API: `POST /signal/publish {type, source, entity_id, payload}` authenticated by Identity Loom; persists signal and fans out to subscribers. | Given valid signal, when published, then delivered to all matching subscribers within 200ms. |
| SE-03 | WebSocket Subscription: `ws://signal.headyme.com/v1/subscribe` with filter params; signals pushed in real time. | Given subscriber connected with filter, when matching signal published, then signal received < 200ms. |
| SE-04 | Webhook Subscription: developers register `POST /signal/subscribe {types[], filter, webhook_url}`; signals delivered via HTTP POST to URL. | Given webhook registered, when matching signal published, then webhook called within 500ms. |
| SE-05 | Signal Replay: `GET /signal/replay {type, entity_id, from_timestamp, to_timestamp}` returns ordered signal history within retention window. | Given replay request for last 1 hour, then all matching signals returned in chronological order. |
| SE-06 | Signal Retention: all signals retained for configurable window (default: 7 days for events, 90 days for audit-class signals). | Given signal published 6 days ago, when replayed, then signal returned. |
| SE-07 | Live Signal Stream (headyme.com): operator UI at `/signals` shows live feed with type filter, source filter, entity filter, pause/resume. | Given operator filters by type=BALANCE_CHANGED, then only that type shown in feed. |
| SE-08 | MCP Tool: `heady_signal_publish` accepts `{type, payload, entity_id}` and publishes to Signal Exchange. | Given agent calls tool, then signal delivered to subscribers within 200ms. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| SE-09 | SSE (Server-Sent Events) subscription: alternative to WebSocket for browser clients that prefer unidirectional streaming. |
| SE-10 | Signal acknowledgment: webhook subscribers confirm delivery with 200 response; unacknowledged signals retry (3×, exponential backoff). |
| SE-11 | Subscription management portal: headyio.com developers can view, edit, and delete their subscriptions. |
| SE-12 | Signal volume metrics: per-type and per-source signal counts available on headyme.com operator dashboard. |
| SE-13 | Signed signal payloads: HMAC-SHA256 signature header on webhook deliveries for subscriber verification. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| SE-14 | Complex event processing (CEP): rules that detect patterns across multiple signals and emit derived signals. |
| SE-15 | End-to-end encrypted payloads (Sovereign Key Ring integration). |
| SE-16 | Federated signal exchange with partner ecosystems. |

---

## 5. User Experience

**Live Signal Stream (headyme.com /signals)**

- Top bar: filter by type (multi-select dropdown), source service (multi-select), entity ID (text search), severity (info/warn/error).
- Live feed: scrolling signal cards showing signal type badge (color-coded by category), source, entity ID, timestamp, payload preview.
- "Pause" button to freeze feed for inspection.
- Click signal card → detail modal with full payload JSON, subscriber delivery status, and replay button.
- "Replay" panel: date/time range pickers + "Load History" button appends historical signals to feed.

**Developer Subscription Portal (headyio.com /portal/signals)**

- Active subscriptions table: subscription ID, signal types, filter summary, endpoint, last delivered, status.
- "New Subscription" modal: type selector (checkboxes from schema registry), filter builder (entity ID, tag), delivery method (webhook/SSE), endpoint field.
- Per-subscription delivery log: last 50 deliveries with status (delivered/retried/failed).

---

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│   Publishers: all Heady services + authorized developers        │
│   (Treasury Nexus, Trust Fabric, Voice Vessel, agents, etc.)    │
└────────────────────────┬─────────────────────────────────────────┘
                         │ POST /signal/publish
┌────────────────────────▼─────────────────────────────────────────┐
│              Signal Exchange Service (Cloud Run)                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Ingest &        │  │  Fan-out Router  │  │  Replay Store │  │
│  │  Validation      │  │  (match, route,  │  │  (TimescaleDB)│  │
│  │  (schema check)  │  │   deliver)       │  │               │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │           │
│  ┌────────▼─────────────────────▼─────────────────────▼───────┐  │
│  │              Signal Store (PostgreSQL + TimescaleDB)       │  │
│  │   signals | subscriptions | schema_registry | dlq         │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────────┬──┘
             │ WebSocket / SSE push              │ HTTP webhook
┌────────────▼────────────────┐     ┌────────────▼────────────────┐
│  Browser/Mobile clients     │     │  External developer apps    │
│  headyme.com | headybuddy  │     │  (webhook endpoints)        │
└─────────────────────────────┘     └─────────────────────────────┘
             │ Internal Pub/Sub
┌────────────▼─────────────────────────────────────────────────────┐
│  Internal Service Consumers: Trust Fabric | Monetization Matrix │
│  | Avatar Forge | Media Conductor | heady-production            │
└──────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Runtime: Cloud Run (Node.js / TypeScript)
- WebSocket: native Node.js ws with connection registry in Redis
- Internal fan-out: Google Cloud Pub/Sub topics per signal category
- Signal store: PostgreSQL with TimescaleDB for time-series queries and replay
- Schema registry: JSON Schema stored in PostgreSQL with caching
- Identity: Identity Loom JWT
- Webhook delivery: Cloud Tasks queue with retry

---

## 7. Data Flows

### Publish and Fan-Out Flow

```
Service: POST /signal/publish
  {type: "BALANCE_CHANGED", source: "treasury-nexus", entity_id: "user_abc",
   payload: {old_balance: 100, new_balance: 50, direction: "debit"}}
  → Identity Loom: validate JWT + scope signal:publish
  → Schema Registry: validate payload against BALANCE_CHANGED schema
  → Store signal in TimescaleDB (append)
  → Fan-out Router: find all subscriptions matching type + entity_id filters
  → For each subscription:
    → WebSocket: push to connected browser sessions
    → SSE: push to SSE connections
    → Webhook: enqueue to Cloud Tasks
    → Internal Pub/Sub: publish to treasury-events topic
  → Return {signal_id, delivered_to: N}
```

### Browser Real-Time Subscription Flow

```
headyme.com: establish ws://signal.headyme.com/v1/subscribe
  ?filter=type:BALANCE_CHANGED,TRUST_SCORE_CHANGED&entity=user_abc
  → Authenticate via JWT query param
  → Register connection in Redis connection registry {ws_id, filters, identity}
  → On matching signal: push to ws connection
  → On disconnect: deregister from Redis
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Publisher authentication | All publish calls require Identity Loom JWT with `signal:publish` scope |
| Subscriber scope isolation | Subscriptions for entity-scoped signals only delivered to entities owning or granted access to that entity_id |
| Webhook payload signing | All webhook deliveries include `X-Heady-Signature: hmac-sha256={sig}` so subscribers can verify |
| Signal payload PII | Signal payloads are stripped of PII by publishers; schema registry enforces no-PII fields for standard types |
| Replay access control | Replay endpoint requires same identity scope as the subscription would require |
| DLQ (dead letter queue) | Undeliverable webhook signals moved to DLQ after 3 retries; operator visible in headyme.com |
| Rate limiting | Publishers: 1,000 signals/min per service; developers: 100/min per account |
| Retention controls | Signals purged after retention window; GDPR deletion requests purge entity-linked signals |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | JWT validation for publishers and subscribers | Phase 1 |
| headyapi-core | API gateway for developer-facing endpoints | Phase 1 |
| headymcp-core | `heady_signal_publish` MCP tool registration | Phase 1 |
| PostgreSQL + TimescaleDB | Signal store and replay | Phase 1 |
| Redis | WebSocket connection registry; subscription index cache | Phase 1 |
| Google Cloud Pub/Sub | Internal service fan-out | Phase 1 |
| Cloud Tasks | Webhook delivery queue with retry | Phase 1 |
| All fourth-wave services | Primary signal publishers (Treasury, Trust, Voice, Avatar, Media, Billing) | Phase 1 |
| Heady Sovereign Key Ring (Spec-10) | Payload encryption (Phase 2) | Phase 2 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Signal delivery latency (WebSocket, p95) | < 200ms | 30 days post-launch |
| Webhook delivery success rate (including retries) | > 99.5% | 30 days |
| Signal fan-out accuracy (delivered to all matching subs) | 100% | Ongoing |
| Replay data completeness | 100% within retention window | 30 days |
| Developer subscription adoption | 30% of active headyapi.com developers create at least one subscription | 60 days |
| WebSocket connection drop rate | < 1% per hour (excluding client-initiated disconnects) | 30 days |

---

## 11. Phased Rollout

### Phase 1 — Core Bus (Weeks 1–4)
- Signal Exchange Service on Cloud Run
- Publish API with schema validation
- WebSocket subscription
- Signal retention (TimescaleDB)
- Signal replay API
- Internal Pub/Sub fan-out to Trust Fabric, Monetization Matrix
- headyme.com live signal stream view
- MCP tool: `heady_signal_publish`

### Phase 2 — External Developer Subscriptions (Weeks 5–8)
- Webhook subscriptions with HMAC signing and retry
- SSE subscription endpoint
- Subscription management portal on headyio.com
- Signal volume metrics dashboard
- Developer subscription API via headyapi.com

### Phase 3 — Advanced Signal (Weeks 9–16)
- Complex event processing rules
- End-to-end payload encryption (Sovereign Key Ring)
- Federated signal exchange

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should Signal Exchange be the internal Pub/Sub replacement for all Heady services, or remain an additional layer above existing Pub/Sub? | Architecture | Yes — Phase 1 design |
| What is the canonical signal type taxonomy (categories, naming conventions)? | Engineering / Product | Yes — needed for schema registry setup |
| Should webhook retry be synchronous (blocking next signal) or async (independent retry queue per subscription)? | Engineering | Yes |
| Are there signal types that should be encrypted end-to-end in v1 (not Phase 2)? | Security | No |
