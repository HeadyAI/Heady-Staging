# Spec-08: Heady Media Conductor

**Wave:** Fourth  
**Feature Name:** Heady Media Conductor  
**Skill Counterpart:** `heady-media-conductor`  
**Surface Anchors:** headyme.com (command center), headyapi.com (public API), headybuddy.org (companion), headyio.com (developer platform)  
**Repo Anchors:** `HeadyMe/heady-vinci`, `HeadyMe/heady-imagine`, `HeadyMe/heady-production`, `HeadyMe/headyapi-core`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Media Conductor is the unified media pipeline orchestration layer for the Heady ecosystem. It provides a single, composable interface for generating, transforming, sequencing, and delivering any media artifact — images, audio, video, animations, and mixed-media compositions — through a directed pipeline with defined stages, provider routing, quality gates, and delivery destinations. Where Voice Vessel (Spec-03) and Avatar Forge (Spec-04) are specialized generation services, Media Conductor is the general-purpose pipeline engine that can coordinate both of them, along with any other media provider, in multi-step media production workflows.

**Problem Statement:**  
Heady's creative surface (heady-vinci, heady-imagine, heady-resonance-studio from Wave 3) and companion features require multi-step media production: generate a base image, composite a voice-over, add motion, export in multiple formats, and deliver to CDN. Today these are disconnected operations. There is no pipeline abstraction, no provider-routing intelligence, no quality gate between stages, and no unified delivery layer. Each feature builds its own ad-hoc chain, resulting in duplicated infrastructure and inability to reuse media production work.

---

## 2. Goals

1. Provide a declarative pipeline specification (JSON) that defines media generation stages, transformations, routing, and delivery in a single artifact.
2. Execute multi-stage media pipelines asynchronously with progress tracking, error recovery, and partial result delivery.
3. Route each pipeline stage to the optimal provider (based on capability, latency, cost, and trust score) with automatic fallback.
4. Expose pipeline results as CDN-served assets via a canonical URL scheme consistent with Avatar Forge's asset serving model.
5. Enable operators and developers to define reusable pipeline templates and instantiate them with variable substitution.

### Non-Goals (v1)

- Real-time streaming media composition (live video mixing, live A/V streaming) — pipeline latency targets are seconds, not frames.
- Audio recording or live capture from user microphone/camera (input capture is Signal Exchange territory, Spec-09).
- Social media distribution or publishing integrations (Phase 2).
- On-premise media processing (all pipeline stages execute in Heady cloud in v1).
- Fine-grained video editing with timeline scrubbing (v1 produces complete assets, not editables).

---

## 3. User Stories

### Operator / Product Builder

- **As a platform operator**, I want to define a pipeline template that takes a text prompt, generates an image, adds a voice narration, and exports both as a composite video, so I can produce rich media for headybuddy.org companion updates without manual steps.
- **As an operator**, I want to monitor all running pipelines in headyme.com with stage-by-stage progress and ETA so I know when media will be ready and can catch failures early.

### Developer

- **As a headyio.com developer**, I want to POST a pipeline spec and receive a `pipeline_id` I can poll for status and results so I can integrate asynchronous media production into my application without managing provider credentials.
- **As a developer**, I want to use a library of pre-built pipeline templates (image + audio → video, image + avatar → animated buddy, text → podcast episode) so I do not have to author pipeline JSON from scratch for common use cases.

### Companion / Agent

- **As a headybuddy companion**, I want to trigger the "animated greeting" pipeline template with my avatar and a greeting message and receive a short animated video I can display in the chat header on special occasions.
- **As a Heady swarm agent**, I want to call an MCP tool to run a named pipeline template with variable substitution so I can produce media artifacts as part of a larger task without understanding pipeline internals.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| MC-01 | Pipeline Spec: JSON schema defining `stages[]` (each with `type`, `provider`, `inputs`, `outputs`, `on_error`) and `delivery` (CDN path, formats). | Given valid spec, when submitted, then all stages validated and pipeline ID returned. |
| MC-02 | Async Pipeline Execution: `POST /media/pipeline` returns `pipeline_id`; `GET /media/pipeline/{id}/status` returns current stage, % complete, and ETA. | Given pipeline submitted, when running, then status endpoint reflects current stage within 5s. |
| MC-03 | Stage Types (v1): `image_generate`, `audio_generate`, `video_compose`, `image_transform` (resize/crop/overlay), `audio_mix`. | Given spec with 3 stage types, then each stage executes with correct provider. |
| MC-04 | Provider Routing: per-stage provider selection based on capability registry; automatic fallback if primary provider returns error. | Given primary provider fails, when fallback configured, then pipeline continues on fallback without manual intervention. |
| MC-05 | Pipeline Templates: library of 6 built-in named templates; `POST /media/pipeline/template/{name}` with variable map instantiates and runs. | Given template "image_voice_video" with {prompt, voice_text}, then pipeline executes and produces video. |
| MC-06 | Asset Delivery: completed pipeline outputs uploaded to CDN at `assets.headyme.com/media/{pipeline_id}/{asset_name}.{ext}`. | Given pipeline complete, then asset URL accessible from CDN within 30s. |
| MC-07 | Treasury Credit Metering: each stage credits consumed from Treasury Nexus; pipeline pre-authorized before execution begins. | Given insufficient credits, when pipeline submitted, then 402 INSUFFICIENT_CREDITS before execution starts. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| MC-08 | Pipeline webhook: `on_complete` and `on_error` webhook delivery with full result payload. |
| MC-09 | Pipeline history: `GET /media/pipeline` returns paginated list of past pipelines with status, duration, credits consumed. |
| MC-10 | Custom provider registration: operators can register proprietary or partner media providers with capability tags. |
| MC-11 | MCP tool: `heady_media_run` accepts template name + variables; returns pipeline_id. |
| MC-12 | Pipeline dry-run: `?dry_run=true` validates spec and estimates credits/time without executing. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| MC-13 | Real-time streaming stage output (low-latency preview frames during generation). |
| MC-14 | Social media publishing integrations. |
| MC-15 | User-editable pipeline stage insertion (interactive editing). |

---

## 5. User Experience

**Pipeline Monitor (headyme.com /media/pipelines)**

- Active pipelines table: pipeline ID (auto-named from template), submitted by, template name, current stage, progress bar, ETA.
- Click row → pipeline detail: stage timeline (each stage as a node with status icon, provider used, duration, output preview thumbnail).
- "Cancel" button for running pipelines.
- Completed pipeline: asset gallery with download buttons and CDN URL copy.

**Developer API (headyapi.com)**

```
POST /v1/media/pipeline           — submit pipeline spec
GET  /v1/media/pipeline/{id}      — status and result
POST /v1/media/pipeline/template/{name} — run named template
GET  /v1/media/pipeline/templates — list available templates
GET  /v1/media/pipeline           — history (paginated)
POST /v1/media/pipeline/{id}/cancel — cancel running pipeline
GET  /v1/media/providers          — list available providers and capabilities
```

**v1 Pipeline Template Catalog**

| Template Name | Description | Stages |
|---|---|---|
| `text_to_image` | Text prompt → image | image_generate |
| `text_to_audio` | Text prompt → audio narration | audio_generate |
| `image_voice_video` | Image + voice text → narrated video | image_generate, audio_generate, video_compose |
| `avatar_greeting` | Avatar ID + greeting text → animated greeting video | image_transform, audio_generate, video_compose |
| `podcast_episode` | Outline text → structured audio podcast | audio_generate × N, audio_mix |
| `brand_card` | Prompt + brand style → styled image set (3 sizes) | image_generate, image_transform × 3 |

---

## 6. Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│   Clients: headyme.com | headybuddy.org | headyio.com apps       │
└────────────────────────┬──────────────────────────────────────────┘
                         │ REST / Webhook
┌────────────────────────▼──────────────────────────────────────────┐
│              Media Conductor Service (Cloud Run)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Pipeline Engine │  │ Provider Router  │  │ Template Store │  │
│  │  (stage executor)│  │ (capability map, │  │ (CRUD + vars)  │  │
│  │                  │  │  fallback logic) │  │                │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                     │                     │            │
│  ┌────────▼─────────────────────▼─────────────────────▼────────┐  │
│  │              Pipeline Store (PostgreSQL)                    │  │
│  │   pipelines | stages | providers | templates | assets      │  │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬─────────────────────────────────────────────────────┘
             │ Stage API calls
┌────────────▼──────────────────────────────────────────────────────┐
│  Media Provider Layer                                            │
│  Image: DALL-E 3 | Flux | Stable Diffusion                      │
│  Audio: ElevenLabs | OpenAI TTS (via Voice Vessel, Spec-03)     │
│  Video: Runway ML | Kling | Luma                                │
│  Transform: Cloudflare Images | FFmpeg (Cloud Run sidecar)      │
└────────────────────────────────────────────────────────────────┘
             │ CDN delivery
┌────────────▼──────────────────────────────────────────────────────┐
│  Cloudflare R2 + CDN                                             │
│  assets.headyme.com/media/{pipeline_id}/{asset}                 │
└──────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Runtime: Cloud Run (Node.js / TypeScript)
- Pipeline execution: async job queue (Cloud Tasks or BullMQ on Redis)
- Provider registry: configuration-driven capability map in PostgreSQL
- Video composition: Runway ML API (primary), FFmpeg Cloud Run sidecar (local compose)
- Asset storage: Cloudflare R2
- Identity: Identity Loom JWT
- Credit metering: Treasury Nexus per stage
- Integration with Voice Vessel (Spec-03) for audio stages and Avatar Forge (Spec-04) for image stages

---

## 7. Data Flows

### Pipeline Execution Flow

```
Client: POST /media/pipeline {spec: {stages: [...], delivery: {cdn_path: "..."}}}
  → Identity Loom: validate JWT + scope media:pipeline
  → Validate spec schema
  → Estimate total credits for all stages
  → Treasury Nexus: pre-authorize total credits
  → Create pipeline record (status: QUEUED)
  → Enqueue pipeline job (Cloud Tasks)
  → Return {pipeline_id, status: "QUEUED", estimated_duration_s}

Pipeline Job Executor:
  → For each stage in order:
    → Provider Router: select optimal provider for stage type
    → Call provider API with stage inputs
    → On success: store stage output as intermediate artifact
    → On error: try fallback provider → if all fail, mark stage FAILED
    → Post stage output to next stage's input
  → On all stages complete:
    → Upload all outputs to Cloudflare R2
    → Set pipeline status: COMPLETE
    → Treasury Nexus: commit pre-authorization
    → Fire on_complete webhook
```

### Template Instantiation Flow

```
Client: POST /media/pipeline/template/image_voice_video
  {variables: {prompt: "Mountain sunrise", voice_text: "Feel the morning glow."}}
  → Template Store: load "image_voice_video" spec
  → Substitute variables into stage input fields
  → Submit as standard pipeline spec
  → Execute as above
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Provider API key security | All provider keys in Secret Manager; never in pipeline spec or logs |
| Content safety | Image and video generation prompts run through content classifier before provider dispatch |
| Asset access control | CDN URLs include signed tokens for private pipelines; public pipelines serve openly |
| Credit pre-authorization | Full pipeline credit cost authorized before any stage executes |
| Pipeline cancellation | Cancelled pipelines stop at next stage boundary; completed stages' credits consumed |
| Template injection | Variable substitution sanitized; template spec fields that accept user input are validated against allowlist |
| Pipeline history privacy | Pipeline records visible only to owning identity; operators with `media:admin` scope can view all |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | JWT validation and pipeline ownership | Phase 1 |
| Heady Treasury Nexus (Spec-01) | Credit pre-authorization per pipeline | Phase 1 |
| Heady Voice Vessel (Spec-03) | Audio stage provider (internal) | Phase 1 |
| Heady Avatar Forge (Spec-04) | Image stage provider (internal) | Phase 1 |
| headyapi-core | API gateway and rate limiting | Phase 1 |
| headymcp-core | `heady_media_run` MCP tool | Phase 1 |
| Cloudflare R2 | Asset storage and CDN delivery | Phase 1 |
| Cloud Tasks / BullMQ | Async job queue | Phase 1 |
| Runway ML / FFmpeg | Video composition providers | Phase 1 |
| heady-vinci repo | Existing visual generation surface — integration point | Phase 1 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| Pipeline completion rate (no error) | > 95% | 30 days post-launch |
| Average single-stage pipeline duration | < 15s for image, < 5s for audio | 30 days |
| 3-stage pipeline (image+audio+video) duration | < 90s p95 | 30 days |
| CDN asset availability after completion | > 99.9% | 30 days |
| Provider fallback success rate | > 85% when primary fails | 60 days |
| Developer template usage | > 200 template runs/week by day 60 | 60 days |

---

## 11. Phased Rollout

### Phase 1 — Core Pipeline Engine (Weeks 1–5)
- Media Conductor Service on Cloud Run
- Stage types: image_generate, audio_generate, image_transform, audio_mix
- Provider routing (DALL-E 3, ElevenLabs, Cloudflare Images)
- 4 of 6 built-in templates
- Pipeline status API + headyme.com pipeline monitor
- Treasury Nexus credit metering

### Phase 2 — Video + Full Templates (Weeks 6–10)
- `video_compose` stage type (Runway ML + FFmpeg)
- All 6 built-in templates
- Pipeline webhook delivery
- MCP tool: `heady_media_run`
- Developer portal history view
- Pipeline dry-run

### Phase 3 — Advanced + Custom Providers (Weeks 11–16)
- Custom provider registration
- Real-time preview frames
- Social media publishing integrations

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should Voice Vessel be called internally by Media Conductor or is it a separate HTTP call from within the pipeline? | Architecture | Yes — Phase 1 design |
| What is the credit rate per media pipeline stage type? | Finance / Eric | Yes |
| Should pipelines be serialized (stages run one at a time) or support parallel branches? | Engineering | No — default serial is fine for v1 |
| Is there a maximum pipeline duration or stage count for v1? | Engineering | Yes |
