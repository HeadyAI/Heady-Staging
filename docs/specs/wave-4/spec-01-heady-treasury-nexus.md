# Spec-01: Heady Treasury Nexus

**Wave:** Fourth  
**Feature Name:** Heady Treasury Nexus  
**Skill Counterpart:** `heady-treasury-nexus`  
**Surface Anchors:** headyme.com (command center), headyapi.com (public intelligence interface), headyio.com (developer platform)  
**Repo Anchors:** `HeadyMe/heady-production`, `HeadyMe/headyapi-core`, `HeadyMe/headyio-core`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Treasury Nexus is the financial intelligence and tokenomics engine of the Heady ecosystem. It gives operators, developers, and nonprofit administrators a unified surface to manage token allocations, credit flows, usage-based billing reserves, grant disbursements, and on-chain treasury operations — all wired into the Heady Latent OS. Rather than scattering finance logic across individual services, Treasury Nexus collapses all economic reasoning into a single auditable ledger that headyme.com can project and headyapi.com can expose externally.

**Problem Statement:**  
As Heady scales across services (headymcp.com, headybuddy.org, headyapi.com, headyio.com), revenue flows, credit reserves, and tokenized entitlements are managed in disconnected places. Operators cannot see aggregate treasury health. Developers cannot query remaining credit capacity. Nonprofit administrators at headyconnection.org cannot trace grant disbursements to outcomes. This creates financial opacity, duplicate logic, and compliance risk.

---

## 2. Goals

1. Provide a single treasury ledger tracking all inflows, outflows, reserves, and allocations across Heady surfaces with sub-second read latency.
2. Enable token and credit issuance tied to service events (API call, agent spawn, media render, skill deployment), with automatic deduction and alerting.
3. Expose treasury state as a queryable MCP tool and REST endpoint via headyapi.com so external agents and operators can inspect balance, burn rate, and runway.
4. Support multi-entity treasury management: commercial (HeadySystems), nonprofit (HeadyConnection), and developer (headyio.com accounts) in a single ledger with permission isolation.
5. Achieve full audit trail compliance: every balance mutation is immutable, timestamped, and linked to a causal event or user action.

### Non-Goals (v1)

- Full on-chain settlement or blockchain wallet integration (Phase 2).
- FIAT payment processing or Stripe billing (handled by Heady Monetization Matrix, Spec-06).
- Inter-organization treasury transfers between unrelated entities outside the Heady domain.
- Tax computation or multi-jurisdiction financial reporting.
- Token staking or DeFi yield mechanics.

---

## 3. User Stories

### Operator

- **As a Heady platform operator**, I want to see the aggregate treasury balance across all Heady entities in one dashboard so I can assess financial runway without switching between services.
- **As an operator**, I want to set reserve floors for each service (e.g., headybuddy.org must maintain 10,000 credits) so I receive an alert before a service degrades.
- **As an operator**, I want to view burn rate trends over 7-, 30-, and 90-day windows so I can forecast runway and plan fundraising timing.

### Developer

- **As a headyio.com developer**, I want to query my available credit balance via the Heady API so my agent can self-throttle before hitting a hard limit.
- **As a developer**, I want to receive a webhook event when my credit balance drops below a threshold I set, so I can top up or reduce agent frequency programmatically.
- **As a developer**, I want to trace which specific API calls consumed which credits so I can optimize cost before scaling.

### Nonprofit Administrator

- **As a HeadyConnection administrator**, I want to allocate grant funds to program buckets and track disbursement against each bucket in real time so I can produce accurate donor reports.
- **As a nonprofit admin**, I want the treasury to flag any allocation that would exceed a budget line item before committing, so I never accidentally overdraw a restricted fund.

### Agent

- **As a Heady swarm agent**, I want to declare my credit requirement at spawn time and have the treasury pre-authorize that amount, so I fail gracefully if budget is unavailable rather than running and failing mid-task.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| TN-01 | Treasury Ledger Core: append-only event log with `entity_id`, `account_id`, `amount`, `direction` (credit/debit), `source_type`, `source_id`, and `timestamp`. | Given any balance mutation, when queried, then the full event chain is retrievable and immutable. |
| TN-02 | Balance Snapshot Store: materialized current balances per entity/account updated within 200ms of each ledger event. | Given 100 concurrent mutations, when all resolve, then snapshots reflect the correct final balance. |
| TN-03 | Credit Authorization API: `POST /treasury/authorize` accepts `agent_id`, `amount`, `ttl_seconds`; returns `authorization_id` or `INSUFFICIENT_FUNDS`. | Given an agent requesting 500 credits on an account with 300, then response is `INSUFFICIENT_FUNDS` with `available: 300`. |
| TN-04 | Credit Deduction Commit: `POST /treasury/commit` finalizes an authorization; uncommitted authorizations release after TTL. | Given an uncommitted authorization past TTL, when the next balance read occurs, then the held amount is released. |
| TN-05 | Multi-entity Isolation: each entity (HeadyMe, HeadySystems, HeadyConnection, developer accounts) has isolated ledger partitions with no cross-read without explicit grant. | Given entity A's token, when querying entity B's ledger, then response is `403 FORBIDDEN`. |
| TN-06 | Operator Dashboard Widget: headyme.com command center displays treasury health card (balance, burn rate, runway estimate, reserve status). | Given dashboard load, when treasury data is available, then health card renders within 1s. |
| TN-07 | Alert Engine: configurable thresholds trigger push notification and webhook when balance drops below floor or burn rate exceeds ceiling. | Given balance = floor - 1, when next ledger write occurs, then alert fires within 5 seconds. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| TN-08 | Burn rate trend chart (7/30/90 day) in headyme.com dashboard. |
| TN-09 | Credit issuance API for operators to mint credits against a funding event (grant received, payment processed). |
| TN-10 | MCP tool: `heady_treasury_balance` callable by any authorized agent via headymcp.com. |
| TN-11 | Webhook delivery with retry (3 attempts, exponential backoff) for all treasury events. |
| TN-12 | Per-service credit allocation and sublimit enforcement. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| TN-13 | On-chain settlement layer (EVM-compatible treasury contract). |
| TN-14 | Token exchange rate oracle for cross-currency treasury comparison. |
| TN-15 | Automated grant disbursement scheduler linked to milestone completion events. |

---

## 5. User Experience

**Dashboard Entry Point (headyme.com)**

The Treasury Nexus surface lives under `/treasury` in the headyme.com command center. The primary view is a Treasury Health Card showing:
- Current balance (formatted with entity selector dropdown)
- 30-day burn rate sparkline
- Runway estimate in days at current burn
- Reserve status: green (above floor), amber (within 20% of floor), red (below floor)

Secondary views:
- **Ledger Timeline**: infinite-scroll event list with filter by source type (agent, API, media, skill), direction, and date range.
- **Authorization Queue**: active pre-authorizations with entity, amount, TTL countdown, and manual release button.
- **Allocation Map**: tree view of entity → service → budget lines, showing spent vs. allocated.

**Developer API (headyapi.com)**

```
GET  /v1/treasury/balance         — current balance for authenticated account
POST /v1/treasury/authorize       — pre-authorize a credit amount
POST /v1/treasury/commit/{id}     — commit a pre-authorization
POST /v1/treasury/release/{id}    — manually release a pre-authorization
GET  /v1/treasury/ledger          — paginated ledger events (filterable)
POST /v1/treasury/alert/subscribe — register webhook for balance/burn alerts
```

**Empty / Error States:**
- No ledger history: "Treasury is active — no transactions yet."
- Insufficient funds: inline red banner with exact shortfall and a quick top-up CTA.
- Authorization TTL warning: amber badge on authorization row 60 seconds before expiry.

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   headyme.com (Command Center)              │
│   Treasury Health Card ← headyapi.com /v1/treasury/balance │
└────────────────────┬────────────────────────────────────────┘
                     │ REST / WebSocket
┌────────────────────▼────────────────────────────────────────┐
│              Treasury Nexus Service (Cloud Run)             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Ledger Core │  │ Auth Engine   │  │  Alert Dispatcher │  │
│  │ (append-    │  │ (authorize /  │  │  (threshold watch,│  │
│  │  only Pg)   │  │  commit /     │  │   webhook, push)  │  │
│  └──────┬──────┘  │  release)     │  └──────────────────┘  │
│         │         └───────┬───────┘                         │
│  ┌──────▼────────────────▼──────────────────────────────┐  │
│  │              Balance Snapshot Store (Redis)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Tool calls
┌─────────────────────▼───────────────────────────────────────┐
│             headymcp.com (MCP Tool Layer)                   │
│   heady_treasury_balance | heady_treasury_authorize        │
└─────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Agent Layer (heady-production swarm)           │
│   Pre-authorization at spawn → commit on success →         │
│   auto-release on failure or TTL                            │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Service runtime: Cloud Run (Node.js or Go)
- Ledger: PostgreSQL (append-only, partitioned by entity)
- Balance cache: Redis with pub/sub for snapshot updates
- Event bus: Pub/Sub (Google Cloud or Cloudflare Queues)
- Auth: JWT with entity-scoped claims from Heady Identity Loom (Spec-02)
- API gateway: headyapi-core (rate limiting, auth middleware)

---

## 7. Data Flows

### Agent Credit Pre-authorization Flow

```
Agent spawn request
  → Treasury Nexus: POST /authorize {agent_id, amount, ttl}
  → Ledger Core: write HOLD event
  → Balance Snapshot: decrement available balance
  → Return authorization_id to agent
  → Agent runs task
  → On success: POST /commit/{authorization_id}
    → Ledger Core: write DEBIT event, close HOLD
  → On failure/TTL: HOLD releases, balance restored
```

### Inflow (Credit Mint) Flow

```
Funding event (grant, payment, top-up)
  → Operator calls POST /treasury/issue {entity_id, amount, source_ref}
  → Ledger Core: write CREDIT event
  → Balance Snapshot: increment balance
  → Alert Dispatcher: check if floor alert can be cleared
  → Webhook: fire BALANCE_INCREASED event to subscribers
```

### Alert Flow

```
Ledger write
  → Balance Snapshot update
  → Alert Engine: compare balance against all thresholds for entity
  → If threshold crossed: write ALERT record → push notification + webhook
  → If previously alerted and balance restored: write ALERT_CLEARED
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Entity isolation | Ledger partitioned by `entity_id`; all queries scoped by JWT claim |
| Authorization token reuse | Each `authorization_id` is single-use; committed or TTL-expired IDs are invalidated |
| Ledger immutability | PostgreSQL triggers block UPDATE and DELETE on ledger table; audit log captures all DDL changes |
| Credit issuance privilege | Only `treasury:issue` scoped tokens can mint credits; scope granted to operators only |
| API rate limiting | headyapi-core enforces 100 req/min per account on treasury endpoints |
| PII in ledger | `source_ref` fields are opaque references to upstream records; no PII stored in ledger itself |
| Encryption at rest | All PostgreSQL volumes encrypted with AES-256 |
| Transit security | TLS 1.3 on all inbound/outbound; mTLS between Treasury Nexus and MCP layer |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | JWT issuance and entity-scoped claim validation | Phase 1 |
| headyapi-core | API gateway, rate limiting, routing | Phase 1 |
| headymcp-core | MCP tool registration and dispatch | Phase 1 |
| heady-production | Agent spawn hook for pre-authorization | Phase 1 |
| Heady Monetization Matrix (Spec-06) | Credit issuance from payment events | Phase 2 |
| Cloud Run / Cloudflare Workers | Service hosting | Phase 1 |
| PostgreSQL (Cloud SQL or Neon) | Ledger persistence | Phase 1 |
| Redis | Balance snapshot cache | Phase 1 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Balance query latency (p99) | < 50ms | 30 days post-launch |
| Authorization success rate | > 99.9% when funds available | 30 days |
| Ledger event loss rate | 0% | Ongoing |
| Alert delivery latency | < 5s from threshold crossing | 30 days |
| Developer API adoption | 50% of headyio.com active accounts query balance at least once/week | 60 days |
| Operator dashboard engagement | Treasury health card viewed in > 80% of operator sessions | 30 days |

---

## 11. Phased Rollout

### Phase 1 — Core Ledger (Weeks 1–4)
- Deploy Treasury Nexus service to Cloud Run
- Ledger Core with PostgreSQL append-only schema
- Balance Snapshot Store with Redis
- Basic auth/commit/release API
- headyme.com Treasury Health Card widget
- Alert engine (push notifications only)

### Phase 2 — Developer API + MCP (Weeks 5–8)
- headyapi.com `/v1/treasury` endpoints live
- MCP tools: `heady_treasury_balance`, `heady_treasury_authorize`
- Agent spawn pre-authorization hook in heady-production
- Webhook delivery with retry

### Phase 3 — Multi-Entity + Nonprofit (Weeks 9–12)
- HeadyConnection entity partition with grant fund allocation
- Allocation Map view in headyme.com
- Sublimit enforcement per service
- Burn rate trend charts

### Phase 4 — On-Chain (Post-v1 Roadmap)
- EVM treasury contract for settlement
- Token exchange rate oracle
- Automated grant disbursement scheduler

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What is the canonical credit-to-USD exchange rate used for burn rate displays? | Eric / Finance | No |
| Should authorization TTL be configurable per entity or global? | Engineering | Yes — needed for Phase 1 design |
| Does HeadyConnection require a separate treasury service instance or a partition within the shared service? | Legal/Compliance | No |
| Should the ledger support soft-delete of test/sandbox events? | Engineering | No |
