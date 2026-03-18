# Spec-05: Heady API Agora

**Wave:** Fourth  
**Feature Name:** Heady API Agora  
**Skill Counterpart:** `heady-api-agora`  
**Surface Anchors:** headyapi.com (public intelligence interface), headyio.com (developer platform), headyme.com (command center)  
**Repo Anchors:** `HeadyMe/headyapi-core`, `HeadyMe/headyio-core`, `HeadyMe/headydocs`, `HeadyMe/heady-docs`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady API Agora is the public-facing API marketplace and developer discovery layer for the Heady ecosystem. It transforms headyapi.com from a pure API gateway into a discoverable, documented, and monetizable marketplace where Heady's internal capabilities — intelligence routing, memory, voice, avatar, treasury, MCP tools, and more — are published as versioned, subscribable API products that external developers can explore, test, and purchase access to.

**Problem Statement:**  
The Heady platform has deep capabilities (31 MCP tools, autonomous orchestration, 3D vector memory, voice synthesis, avatar generation, and more) but they are exposed only to internal surfaces. There is no public discovery layer, no self-serve subscription mechanism, no unified API reference, and no try-before-you-buy sandbox. Developers who want to build on Heady must gain access through offline channels, slowing ecosystem growth and developer network effects.

---

## 2. Goals

1. Publish all Heady API capabilities as browsable, versioned API products in a public marketplace at headyapi.com.
2. Enable self-serve developer onboarding: account creation, API key issuance, plan selection, and sandbox access without human intervention.
3. Provide interactive API documentation (OpenAPI-based, try-it-live) for every published endpoint.
4. Integrate Heady Monetization Matrix (Spec-06) so access tiers (free, developer, pro, enterprise) are enforced at the gateway and developers can upgrade in-product.
5. Support third-party API publishing: allow selected partners to publish their own API products through the Agora marketplace with Heady managing auth, billing, and gateway.

### Non-Goals (v1)

- B2C consumer app marketplace (this is a developer/API marketplace only in v1).
- Self-serve partner API publishing portal (Phase 2; v1 requires Heady team to onboard partner products).
- GraphQL-only API surface (REST and MCP tool APIs are the v1 scope; GraphQL wrapper is Phase 2).
- API versioning deprecation enforcement automation (manual version lifecycle in v1).
- SLA monitoring and uptime guarantees published to developers (Phase 2).

---

## 3. User Stories

### External Developer

- **As an external developer**, I want to browse Heady API products at headyapi.com and understand what each does, what it costs, and how to call it without signing up, so I can make an informed decision before committing.
- **As a developer**, I want to sign up, receive an API key, and make my first test call inside a live sandbox within 5 minutes of landing on headyapi.com.
- **As a developer**, I want to subscribe to a plan and have rate limits and quotas automatically enforced at the gateway so I do not need to worry about accidental overage charges.
- **As a developer**, I want a dashboard showing my API usage by product, endpoint, date range, and error rate so I can optimize and debug my integration.

### Heady Operator

- **As a platform operator**, I want to publish a new internal Heady API capability as a marketplace product by filling out a form (name, description, endpoint mapping, pricing tier) without writing gateway config files.
- **As an operator**, I want to see aggregate marketplace health: total API calls by product, active subscribers, revenue, and error rates.

### Partner API Publisher (Phase 2)

- **As a Heady partner**, I want to submit my API for marketplace listing and have Heady handle auth, billing, and gateway routing so I only maintain my backend service.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| AA-01 | Product Catalog: headyapi.com public listing of all published API products with name, description, version, category, and pricing tier. | Given catalog page load, then all active products displayed without sign-in. |
| AA-02 | Self-Serve Signup: developer can create an account, verify email, and receive an API key in under 5 minutes. | Given email registration, when email verified, then API key issued and displayed. |
| AA-03 | Interactive Docs: OpenAPI 3.1 spec for each product rendered as try-it-live docs (Swagger/Scalar-based). | Given docs page, when developer fills params and clicks "Try," then real API call made and response shown. |
| AA-04 | Plan Subscription: developers can subscribe to Free, Developer, Pro tiers; plan limits enforced at headyapi-core gateway. | Given Free plan (100 calls/day), when 101st call made, then `429 QUOTA_EXCEEDED` returned. |
| AA-05 | Usage Dashboard: developer portal shows calls by product/endpoint, date range, quota used, error rate. | Given dashboard load, when usage exists, then chart and table rendered within 2s. |
| AA-06 | API Key Management: create, name, revoke, and set expiry on API keys from developer portal. | Given key revocation, when revoked key used within 30s, then `401 REVOKED_KEY` returned. |
| AA-07 | Sandbox Environment: each product has a sandbox mode (rate-limited, uses sample data) accessible on Free tier without billing. | Given sandbox call, then response contains `X-Heady-Sandbox: true` header. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| AA-08 | Webhook registry: developers can register webhooks for Heady events (e.g., balance alert, agent status) via the portal. |
| AA-09 | Product versioning UI: operator can publish new API version and mark old version as deprecated with sunset date shown in docs. |
| AA-10 | Developer changelog feed: per-product changelog visible in portal so developers can track breaking changes. |
| AA-11 | Postman / OpenAPI export: download OpenAPI spec or Postman collection for any product. |
| AA-12 | API status page: public status page at status.headyapi.com showing per-product uptime and incident history. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| AA-13 | Partner self-serve API publishing portal. |
| AA-14 | GraphQL API layer on top of REST products. |
| AA-15 | API analytics export (CSV/webhook) for enterprise subscribers. |

---

## 5. User Experience

**Public Catalog (headyapi.com)**

Hero: "Build on Heady — AI-native APIs for intelligence, voice, memory, and agents."

Product grid:
- Cards showing: product icon, name, short description, category tag (Intelligence / Voice / Identity / Media / Treasury), version badge, and plan badge (Free / Developer+).
- Filter sidebar: category, plan level, new/updated tag.
- Click product → product detail page with full description, endpoint list, pricing, quick-start snippet, and "Try it" button.

**Onboarding (headyapi.com/signup)**

1. Email + password (or Google/GitHub via Identity Loom).
2. Email verification.
3. "Choose a plan" screen (Free, Developer $29/mo, Pro $99/mo).
4. Immediate API key display: "Your key: `hdy_live_...`" + copy button.
5. Quick-start guide: 3-line cURL example for the most popular endpoint.

**Developer Portal (/portal)**

- Overview: usage summary card, active subscriptions, recent API calls feed.
- Products: list of subscribed products with call count, quota bar, docs link.
- Usage: date-range chart (calls/errors), breakdown by endpoint.
- Keys: active keys table with create/revoke/set-expiry controls.
- Billing: current plan, upgrade/downgrade, invoice history (via Monetization Matrix).

---

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│   headyapi.com Public Catalog + Developer Portal (Next.js)      │
└────────────────────────┬─────────────────────────────────────────┘
                         │ REST
┌────────────────────────▼─────────────────────────────────────────┐
│               API Agora Backend (Cloud Run)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Product Registry│  │  Developer Portal│  │  Analytics    │  │
│  │  (catalog CRUD)  │  │  (accounts, keys)│  │  Aggregator   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │           │
│  ┌────────▼─────────────────────▼─────────────────────▼───────┐  │
│  │               Agora Store (PostgreSQL)                     │  │
│  │   products | subscriptions | api_keys | usage_events       │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────────┐
│   headyapi-core (Existing API Gateway)                          │
│   Rate limiting | Plan enforcement | Key auth | Usage logging   │
└────────────┬──────────────────────────────────────────────────┬──┘
             │                                                   │
┌────────────▼──────────────┐              ┌────────────────────▼─┐
│  Heady Internal Services  │              │  Partner API Backends │
│  (Voice, Avatar, Treasury,│              │  (Phase 2)            │
│   Identity, Media, etc.)  │              └──────────────────────┘
└───────────────────────────┘
```

**Tech Stack:**
- Portal frontend: Next.js (React) via template-heady-ui with Module Federation
- Backend: Cloud Run (Node.js / TypeScript)
- API docs rendering: Scalar (OpenAPI 3.1)
- API gateway: headyapi-core (existing, extended with plan enforcement)
- Store: PostgreSQL
- Auth: Identity Loom JWT
- Billing: Heady Monetization Matrix (Spec-06)
- Usage events: streamed to ClickHouse or BigQuery for analytics aggregation

---

## 7. Data Flows

### Developer Onboarding Flow

```
Developer: POST /agora/signup {email, password, plan: "free"}
  → Identity Loom: create new user identity
  → Send verification email
  → On verification: create developer account record
  → Issue initial API key (scoped to Free plan limits)
  → Register key in headyapi-core rate limit store
  → Return {api_key, dashboard_url}
```

### API Call Flow (Enforced)

```
Developer: GET /v1/voice/synthesize {headers: {Authorization: "Bearer hdy_live_..."}}
  → headyapi-core: extract API key
  → Look up key → linked account → plan → quota
  → Check quota: if exceeded → 429 QUOTA_EXCEEDED
  → If OK: forward to target service
  → Log usage event: {key_id, product, endpoint, timestamp, response_code, latency}
  → Return response to developer
  → Usage event: streamed to analytics aggregator
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Key security | API keys hashed at rest (HMAC-SHA256); only the prefix shown after creation |
| Key revocation | Revoked keys propagated to headyapi-core within 30s via Identity Loom revocation mechanism |
| Rate limit bypass | All plan limits enforced at gateway (headyapi-core), not in Agora backend |
| Sandbox isolation | Sandbox calls routed to stub services; never reach production data stores |
| Abuse detection | Anomalous call volume (10× baseline) triggers automatic key suspension and alert |
| GDPR / PII | Developer account data (email, usage) subject to GDPR deletion on request; no PII in usage event logs |
| Plan downgrade | Downgrade enforces lower quota immediately; no grace period for abuse prevention |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| headyapi-core | Existing API gateway — extended with plan enforcement | Phase 1 |
| Heady Identity Loom (Spec-02) | Developer identity, API key issuance | Phase 1 |
| Heady Monetization Matrix (Spec-06) | Plan subscription, billing, invoice | Phase 2 |
| heady-docs / headydocs | API reference documentation source | Phase 1 |
| ClickHouse / BigQuery | Usage analytics aggregation | Phase 1 |
| Heady Treasury Nexus (Spec-01) | Credit quota management for developer accounts | Phase 2 |
| template-heady-ui | Portal frontend scaffold | Phase 1 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Time to first API call (new signup) | < 5 minutes | 30 days post-launch |
| Developer signups | 200 in first 60 days | 60 days |
| Active API keys (calling at least once/week) | 50% of registered developers | 60 days |
| Docs page engagement (avg time on product page) | > 3 minutes | 30 days |
| Free → paid plan conversion rate | > 8% | 90 days |
| API error rate (developer-caused 4xx excluded) | < 0.5% 5xx | 30 days |

---

## 11. Phased Rollout

### Phase 1 — Catalog + Self-Serve (Weeks 1–4)
- headyapi.com public catalog with initial 8 products
- Developer signup + API key issuance
- Free + Developer plans enforced in headyapi-core
- Interactive docs for all v1 products
- Usage dashboard in developer portal
- Sandbox environment

### Phase 2 — Billing + Monetization (Weeks 5–8)
- Heady Monetization Matrix integration for Pro plan billing
- Invoice history in developer portal
- Webhook registry
- Product versioning UI + changelog feed
- API status page

### Phase 3 — Partner Publishing (Weeks 9–16)
- Partner self-serve API publishing portal
- Revenue sharing model for partner products
- GraphQL API layer

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| What are the exact rate limits for Free / Developer / Pro tiers across products? | Product / Finance | Yes — Phase 1 design |
| Should the public catalog be indexed by search engines (SEO) or require sign-in? | Marketing | No |
| Does the sandbox environment need data isolation per developer or can it share a common sandbox tenant? | Engineering / Security | Yes |
| Which 8 Heady API products are included in the v1 catalog launch? | Product | Yes |
