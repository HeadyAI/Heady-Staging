# Spec-04: Heady Avatar Forge

**Wave:** Fourth  
**Feature Name:** Heady Avatar Forge  
**Skill Counterpart:** `heady-avatar-forge`  
**Surface Anchors:** headybuddy.org (AI companion), headyme.com (command center), headyapi.com (public API)  
**Repo Anchors:** `HeadyMe/headybuddy-core`, `HeadyMe/heady-vinci`, `HeadyMe/heady-imagine`, `HeadyMe/heady-production`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Avatar Forge is the visual identity generation, management, and serving layer for the Heady ecosystem. It enables users, AI companions, agents, and services to carry a persistent, customizable visual presence — an avatar — across all Heady surfaces. Avatar Forge generates images from natural language descriptions, maintains version history, serves optimized assets to any Heady domain, and exposes an API for developer-driven avatar generation pipelines.

**Problem Statement:**  
HeadyBuddy companions today present as text-only entities with no persistent visual representation. Users have no way to personalize how their companion looks. Agents, swarm bees, and services have no visual identity for use in dashboards, audit trails, or user-facing displays. Building visual generation ad hoc in each surface would produce inconsistency, duplicated infrastructure, and no reuse of generated assets. A central forge is needed that makes visual identity a platform primitive rather than a per-app feature.

---

## 2. Goals

1. Generate avatar images from natural language descriptions or structured style parameters in under 8 seconds for standard quality, under 20 seconds for high-fidelity.
2. Maintain a versioned avatar history per entity (user, buddy, agent, service) so past avatars can be restored or browsed.
3. Serve avatars as optimized WebP/AVIF assets via CDN with correct sizing for all Heady UI contexts (16px favicon, 48px list, 128px card, 512px profile, 1024px hero).
4. Enable avatar reuse across all Heady domains without per-domain re-upload via a canonical asset URL scheme.
5. Expose generation and management APIs so developers on headyio.com can build avatar-driven experiences in their own applications.

### Non-Goals (v1)

- Animated or video avatar generation (Phase 2 via Heady Media Conductor, Spec-08).
- Real-time avatar puppeteering or facial expression driven by voice/camera input.
- 3D avatar mesh generation.
- Avatar-based identity verification or biometrics.
- User selfie upload and photo-realistic avatar generation (Phase 2).

---

## 3. User Stories

### Companion User

- **As a headybuddy.org user**, I want to generate a unique avatar for my buddy companion by describing it in plain language so I feel a personal connection to my AI companion.
- **As a user**, I want to see my buddy's avatar displayed consistently on the headybuddy.org chat screen, headyme.com sidebar, and mobile app so it feels like a coherent presence.
- **As a user**, I want to browse my avatar generation history and restore a previous version if I prefer an older look.

### Developer

- **As a headyio.com developer**, I want to call an API to generate a branded avatar for a custom agent I am deploying so users of my integration have a visual representation of the agent they are working with.
- **As a developer**, I want avatars served at the correct resolution for each use case via a single URL parameter so I do not have to manage image resizing myself.

### Operator / Agent

- **As a platform operator**, I want to assign default avatar templates to agent types (coordinator, analyst, creator) so the dashboard is visually meaningful even for auto-spawned agents without user customization.
- **As an AI agent**, I want my avatar served correctly in the headyme.com task timeline so operators can visually identify which agent completed which task.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| AF-01 | Image Generation API: `POST /avatar/generate` accepts `{prompt, style, entity_id, entity_type}`; returns `avatar_id` and `asset_url`. | Given valid prompt, when generation completes, then `asset_url` is accessible and correct. |
| AF-02 | Generation Time SLA: standard quality < 8s, high-fidelity < 20s (p95). | Given 10 concurrent standard requests, then all return within 8s p95. |
| AF-03 | Asset Serving: CDN-served URLs with size suffix (`?size=48`, `?size=128`, etc.) returning correctly resized WebP. | Given `?size=48`, then returned image is 48×48px WebP. |
| AF-04 | Avatar Version History: each generated avatar is a version; `GET /avatar/{entity_id}/history` returns all versions. | Given 3 generations for entity, when history queried, then 3 versions returned in reverse-chronological order. |
| AF-05 | Avatar Restore: `POST /avatar/{entity_id}/restore/{version_id}` sets a previous version as active. | Given restore call, then active avatar URL updates to specified version. |
| AF-06 | Canonical Asset URL: `https://assets.headyme.com/avatar/{entity_id}/{size}.webp` resolves to current active avatar for entity. | Given entity_id and size, then URL returns correct current avatar image. |
| AF-07 | Default Avatar Templates: system provides 12 default avatar styles (by agent type and user preference) used when no custom avatar exists. | Given entity with no custom avatar, then default template for their type is returned. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| AF-08 | Style presets: named style libraries (e.g., "Crystal", "Organic", "Neon", "Sketch") selectable without writing a prompt. |
| AF-09 | Generation gallery: headybuddy.org onboarding shows 4 generated variations from user description for selection. |
| AF-10 | MCP tool: `heady_avatar_get` returns current avatar URL for any entity by ID. |
| AF-11 | Usage metering: generation requests logged to Treasury Nexus with credit deduction per generation. |
| AF-12 | Bulk generation: `POST /avatar/generate/batch` accepts array of prompts; returns all `avatar_id`s when complete. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| AF-13 | Animated avatar generation (short looping video). |
| AF-14 | Selfie-based avatar generation from user-uploaded photo. |
| AF-15 | Avatar NFT minting via Treasury Nexus on-chain integration. |

---

## 5. User Experience

**Buddy Avatar Setup (headybuddy.org onboarding)**

1. Step "Give your buddy a face."
2. User sees description field: "Describe your buddy's look" (placeholder: "A wise owl with glowing green eyes, in a starry night style").
3. User types description → clicks "Generate" → gallery of 4 variations loads.
4. User selects favorite → avatar saved.
5. Preview shows avatar in context: chat header, mobile notification dot, headyme.com sidebar.

**Avatar Management (headyme.com `/settings/identity`)**

- Current avatar displayed with "Regenerate" and "Change style" buttons.
- Version history panel: grid of past avatars, each with date and restore button.
- "Default for agents" section: assign a style to auto-spawned agent types.

**Developer API (headyapi.com)**

```
POST /v1/avatar/generate          — generate avatar from prompt
GET  /v1/avatar/{entity_id}       — get active avatar metadata
GET  /v1/avatar/{entity_id}/history  — version history
POST /v1/avatar/{entity_id}/restore/{version_id} — restore version
GET  /v1/avatar/styles            — list available style presets
POST /v1/avatar/generate/batch    — batch generate
```

---

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│   Clients: headybuddy.org | headyme.com | headyio.com apps      │
└───────────────────────────────┬──────────────────────────────────┘
                                │ REST / GraphQL
┌───────────────────────────────▼──────────────────────────────────┐
│                  Avatar Forge Service (Cloud Run)                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Generation      │  │  Asset Manager   │  │  Version Store │  │
│  │ Orchestrator    │  │  (upload/CDN)    │  │  (history)     │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                    │                     │            │
│  ┌────────▼────────────────────▼─────────────────────▼────────┐  │
│  │              Avatar Store (PostgreSQL + metadata)          │  │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬─────────────────────────────────────────────────────┘
             │ Image generation API
┌────────────▼─────────────────────────────────────────────────────┐
│  Image Generation Provider (pluggable)                          │
│  Stable Diffusion (self-hosted) | DALL-E 3 | Flux | Ideogram    │
└────────────┬─────────────────────────────────────────────────────┘
             │ CDN serving
┌────────────▼─────────────────────────────────────────────────────┐
│  Cloudflare R2 + Cloudflare Images (CDN resize/transform)       │
│  Canonical URL: assets.headyme.com/avatar/{entity_id}/{size}    │
└──────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Service runtime: Cloud Run (Node.js / TypeScript)
- Image generation: pluggable provider (DALL-E 3 primary, Flux/SD self-hosted option)
- Asset storage and CDN: Cloudflare R2 + Cloudflare Images (resize on-the-fly)
- Metadata: PostgreSQL (avatars, versions, entity assignments)
- Identity: Identity Loom JWT validation
- Credit metering: Treasury Nexus per generation
- Existing repo hooks: `heady-vinci` and `heady-imagine` serve as implementation entry points

---

## 7. Data Flows

### Generation Flow

```
Client: POST /avatar/generate {prompt: "Wise owl...", entity_id: "user_abc", entity_type: "user"}
  → Identity Loom: validate JWT + scope avatar:generate
  → Treasury Nexus: pre-authorize credits (1 credit per standard generation)
  → Generation Orchestrator: construct provider prompt (system style prefix + user prompt)
  → Image Generation Provider: submit generation job
  → On image return: upload to Cloudflare R2 at canonical path
  → Generate all size variants via Cloudflare Images API
  → Version Store: create new version record, set as active
  → Update entity avatar_id pointer
  → Treasury Nexus: commit authorization
  → Return {avatar_id, asset_url} to client
```

### CDN Serving Flow

```
Browser: GET assets.headyme.com/avatar/user_abc/128.webp
  → Cloudflare CDN: check edge cache
  → Cache miss: origin R2 → Cloudflare Images resize to 128px WebP
  → Cache hit: serve from edge (< 20ms)
  → Cache TTL: 1 hour for active avatar; 24h for historical
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Prompt safety | All generation prompts run through content safety classifier; NSFW, violence, PII prompts rejected with `PROMPT_REJECTED` error |
| Entity ownership | Avatars can only be regenerated or restored by the owning entity's identity (or operator with `avatar:admin` scope) |
| Asset enumeration | CDN URLs require signed URL tokens for private entities; public entities (e.g., system agents) serve openly |
| Provider key security | Image generation API keys stored in Secret Manager; never logged or returned to clients |
| Generation rate limiting | 10 generations/hour per account (standard); 50/hour for `avatar:bulk` scope holders |
| Image content audit | Generated images stored with generation metadata for abuse investigation; no user PII in stored metadata |
| Credit authorization | Pre-authorization required before provider call; failure before provider = no credit deduction |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | JWT validation and entity ownership | Phase 1 |
| Heady Treasury Nexus (Spec-01) | Credit metering per generation | Phase 1 |
| headyapi-core | API gateway, rate limiting | Phase 1 |
| headybuddy-core | Primary consumer for companion avatars | Phase 1 |
| Image Generation Provider (DALL-E 3 / Flux) | Actual image synthesis | Phase 1 |
| Cloudflare R2 + Cloudflare Images | Asset storage and CDN resize | Phase 1 |
| heady-vinci repo | Existing visual generation surface — integration point | Phase 1 |
| heady-imagine repo | Existing imagination layer — integration point | Phase 1 |
| Heady Media Conductor (Spec-08) | Animated avatar generation pipeline | Phase 2 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Generation time p95 (standard) | < 8s | 30 days post-launch |
| Avatar adoption (headybuddy.org) | > 70% of new buddy sessions have a custom or selected avatar | 60 days |
| CDN cache hit rate | > 95% | 30 days |
| Generation error rate | < 2% (excluding prompt safety rejections) | 30 days |
| Prompt safety rejection false positive rate | < 5% of benign prompts rejected | 30 days |
| Developer API avatar generation calls | > 500/week by end of month 2 | 60 days |

---

## 11. Phased Rollout

### Phase 1 — Core Generation + Serving (Weeks 1–4)
- Avatar Forge Service on Cloud Run
- Generation API (DALL-E 3 primary)
- 12 default avatar templates
- Canonical CDN URL scheme (Cloudflare R2 + Images)
- Version history and restore
- headybuddy.org onboarding avatar setup flow
- Treasury Nexus credit metering

### Phase 2 — Developer API + Styles (Weeks 5–8)
- headyapi.com `/v1/avatar` endpoints
- Style presets library (12 named styles)
- Batch generation endpoint
- MCP tool: `heady_avatar_get`
- headyme.com avatar management settings page

### Phase 3 — Animated + Advanced (Weeks 9–16)
- Animated avatar generation (via Media Conductor, Spec-08)
- Selfie-based generation from user photo
- Extended style library

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should `heady-vinci` and `heady-imagine` be merged into Avatar Forge or remain as separate services called by it? | Architecture | Yes — Phase 1 design |
| What is the credit rate per avatar generation (standard vs. high-fidelity)? | Finance / Eric | Yes |
| Are agent type default avatars fixed system assets or generated at first spawn? | Product | No |
| Should historical avatar versions count toward a storage quota per account? | Engineering | No |
