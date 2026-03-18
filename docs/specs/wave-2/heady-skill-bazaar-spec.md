# Feature Specification: Heady Skill Bazaar

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / headyio.com / headyapi.com  
**Status:** Draft

---

## 1. Purpose

Heady Skill Bazaar is a marketplace and discovery layer for Heady-compatible skills, personas, task genomes, and agent configurations. It enables builders in the Heady ecosystem to publish reusable intelligence artifacts, and enables users to discover, install, and activate them with a single click. The Bazaar transforms Heady from a closed ecosystem into a composable platform where the community extends its capabilities.

### Problem Statement
Currently, every Heady user and builder operates in isolation — there is no way to share a well-crafted persona, a proven task genome, or a custom skill with other users. This means high-quality intelligence work is siloed, duplicated effort is rampant, and the ecosystem lacks a community flywheel. Builders have no discovery or monetization path, and users have no way to benefit from the expertise of power users.

### Goals
1. Enable a builder to publish a skill/persona/genome to the Bazaar in < 15 minutes.
2. Enable a user to discover and install a Bazaar item in < 60 seconds.
3. Maintain a quality bar: all published items pass automated safety validation and community rating.
4. Create a builder reputation system that rewards quality contributions.
5. Reach ≥200 published Bazaar items within 90 days of open launch.

### Non-Goals
- Paid/premium monetization in v1 (listing and installation are free; premium tiers are v2).
- Enterprise/team Bazaar (private team namespace for shared items, v2).
- Native mobile app for Bazaar browsing (web-first in v1).
- Heady handling payment processing between builders and users (deferred to v2 business model review).

---

## 2. User Experience

### User Personas
- **The Builder** — a power user or developer who creates high-quality skills, genomes, or personas and wants to share them.
- **The Discoverer** — a user looking for ready-made intelligence tools to accelerate their work.
- **The Remixer** — a user who finds a good Bazaar item, modifies it for their needs, and optionally re-publishes the remix.

### Core UX Flows

**Browsing the Bazaar (headyme.com/bazaar)**
1. Bazaar homepage: featured items carousel, trending this week, new arrivals, category filters (Skills / Personas / Task Genomes / Agent Configs).
2. Category/tag filter sidebar: by domain (coding, legal, research, wellness, creative...), by rating, by install count, by compatibility (requires Memory Sanctum, etc.).
3. Item card: name, author, avatar, short description, category tags, install count, rating (1–5 stars), "Install" CTA.
4. Item detail page: full description, screenshots or demo GIF, version history, reviews, author profile, compatibility requirements, "Install" and "Remix" buttons.

**Installing a Bazaar Item**
1. User clicks "Install" on an item.
2. If the item has dependencies (e.g., "requires Memory Sanctum to be enabled"), a dependency check modal appears: "This item requires Memory Sanctum. Enable it?" Yes/No.
3. Confirm install → item is copied into the user's relevant library (Persona Studio library, Genome Library, Skills list).
4. "Installed! Find it in [Persona Studio / Genome Library / Skills]" confirmation toast.
5. Item is immediately available for activation.

**Publishing to the Bazaar**
1. Builder navigates to any item in their library (Persona Studio, Genome Library, or Skills list).
2. "Publish to Bazaar" button in item detail.
3. Publisher flow:
   - Name, description, category tags (max 5), compatibility requirements, demo notes.
   - Optional: cover image / demo GIF upload.
   - License selection: Open Remix / Attribution-Required / No Remix.
4. Automated safety validation runs (content policy check, schema validation, malicious pattern scan).
5. If validation passes: item is listed in Bazaar (pending community visibility threshold — 1 install before appearing in public browse).
6. Builder receives Bazaar profile credit: install count, rating, and contribution points.

**Builder Profile**
- Public profile page: builder name/handle, avatar, published items, aggregate install count, average rating, contribution score.
- Contribution score increases with: items published (+10), items installed (+1/install), positive reviews received (+2), remixes of your work (+5).
- Top contributors featured on Bazaar homepage.

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Bazaar Catalog Service | CRUD API for listing, metadata, and discovery | headyapi.com |
| Bazaar Catalog Store | Database of all published items with metadata, ratings, install counts | headysystems.com |
| Safety Validation Service | Automated content policy, schema, and malicious pattern checks | headysystems.com |
| Install Service | Copies Bazaar item into user's target library; manages dependencies | headyapi.com |
| Rating & Review Service | Manages per-user ratings and text reviews | headysystems.com |
| Builder Profile Service | Manages builder profiles and contribution scoring | headysystems.com |
| Search & Discovery Engine | Full-text and semantic search over catalog | headysystems.com |
| Bazaar UI | headyme.com/bazaar frontend | headyme.com |
| Builder Dashboard | headyio.com publisher tools | headyio.com |

### Item Types Supported (v1)
| Type | Source Library | Install Target |
|---|---|---|
| Persona | Persona Studio | User's Persona Library |
| Task Genome | Task Genome Library | User's Genome Library |
| Heady Skill (YAML) | Skills Manager | User's Skills list |
| Agent Config | headybot.com config | User's Agent Library |

---

## 4. Data Flows

### Publish Flow
```
1. Builder: POST /bazaar/publish {item_type, item_id, metadata}
2. Bazaar Catalog Service fetches item definition from source library
3. Safety Validation Service runs checks:
   a. Schema validation (is the item well-formed?)
   b. Content policy scan (no harmful instructions, no PII)
   c. Malicious pattern scan (no prompt injection, no external exfil attempts)
4. Validation result: PASS → item created in Catalog Store (status: LISTED)
   FAIL → rejection with specific reason returned to builder
5. Item appears in Bazaar (private until first install or immediate, configurable)
6. Builder profile contribution points updated
```

### Install Flow
```
1. User: POST /bazaar/install {catalog_item_id}
2. Install Service checks user authentication and dependency requirements
3. Install Service fetches item definition from Catalog Store
4. Item copied (deep copy, not linked) into user's target library
5. User's installed_items record updated
6. Catalog Store: install_count incremented for item
7. Builder profile: install_count incremented
8. Confirmation returned to user
```

### Search/Discovery Flow
```
1. User enters search query or applies filters in Bazaar UI
2. GET /bazaar/search {q, category, tags, sort, compatibility}
3. Search & Discovery Engine: full-text search + semantic embedding match
4. Results ranked by: relevance score × (install_count^0.3) × (avg_rating^0.5)
5. Results returned as paginated item cards
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Published item isolation | Bazaar items are copies; original in builder's library is not affected by install activity |
| Safety validation | Automated pre-publish checks; items failing checks are rejected with reason |
| Malicious pattern scan | LLM-assisted scan for prompt injection, exfiltration instructions, harmful content |
| User install isolation | Each install is a deep copy into user's namespace; no shared state between installer and builder |
| Review abuse prevention | Rate limiting on reviews (1 per user per item); flagging system for abusive reviews |
| Builder identity | Builder must have a verified Heady account; display name is their account handle |
| Takedown | Heady Trust & Safety can remove items at any time; builder is notified |
| No data collection on installs | Installing a Bazaar item does not grant the item's creator access to the installing user's data |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| Heady Persona Studio (source of persona items) | Second-wave | Complementary |
| Heady Task Genome (source of genome items) | Second-wave | Complementary |
| headyio.com Builder Dashboard shell | headyio.com | Required for publisher UX |
| headyme.com dashboard (for Bazaar browse UI) | headyme.com | Required |
| headyapi.com API gateway | headyapi.com | Required |
| Content policy / Safety Validation Service | headysystems.com | Required before open publish |

---

## 7. Phased Rollout

### Phase 1 — Catalog Infrastructure (Weeks 1–4)
- Bazaar Catalog Service and Store
- Safety Validation Service (schema + basic content policy)
- Internal publish flow (Skills YAML only)
- Internal alpha: Heady team publishes 10 seed skills
- Success gate: Publish + install round-trip works end-to-end; safety validation catches 100% of injected test violations

### Phase 2 — Personas + Genomes (Weeks 5–8)
- Persona and Task Genome item types added
- Install Service with dependency checking
- Builder Profile Service
- Bazaar browse UI (headyme.com) — basic list view
- Closed beta: 50 builders
- Success gate: ≥20 items published; install flow works for all item types

### Phase 3 — Discovery + Reviews (Weeks 9–12)
- Search & Discovery Engine (full-text + semantic)
- Rating & Review Service
- Bazaar homepage with featured/trending/new
- Open launch
- Success gate: ≥200 items published within 30 days of open launch

### Phase 4 — Builder Tools + Contribution Score (Weeks 13–16)
- headyio.com Builder Dashboard with analytics (views, installs, ratings)
- Contribution score + leaderboard
- Featured contributor program
- Success gate: Top 10 builders each have ≥5 items with ≥4.0 avg rating

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Should item installation create a linked copy (updates propagate) or a frozen copy? | Product | Yes — architectural decision before Phase 1 |
| Who owns Trust & Safety for takedowns? | Operations | No — needed before open launch |
| Should search results be personalized (e.g., prefer items matching user's domain biases)? | Product | No — relevance + popularity ranking is acceptable for v1 |
| What is the plan for monetization in v2? Revenue share model? | Business | No — out of scope for v1 |
| How are version updates to published items handled? Auto-update for installers? | Engineering | No — decide before Phase 3 |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Published items at open launch | ≥50 (seeded) | Phase 3 launch day |
| Published items 30 days post-launch | ≥200 | 30 days post Phase 3 |
| Install conversion rate (views → installs) | ≥25% | 30 days post Phase 3 |
| Safety validation false-negative rate | 0% (no malicious items published) | Ongoing |
| Average item rating | ≥3.8/5.0 | 60 days post Phase 3 |
| Builder retention | ≥50% of builders who publish one item publish a second within 60 days | 60 days post Phase 3 |
