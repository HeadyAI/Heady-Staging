# Spec-03: Heady Voice Vessel

**Wave:** Fourth  
**Feature Name:** Heady Voice Vessel  
**Skill Counterpart:** `heady-voice-vessel`  
**Surface Anchors:** headybuddy.org (AI companion), headyme.com (command center), headymcp.com (MCP layer)  
**Repo Anchors:** `HeadyMe/headybuddy-core`, `HeadyMe/heady-production`, `HeadyMe/headymcp-core`, `HeadyMe/heady-mobile`  
**Status:** Draft — 2026-03-17  
**Author:** Heady OS / Eric Haywood

---

## 1. Purpose

Heady Voice Vessel is the real-time voice synthesis, streaming, and delivery infrastructure for the Heady ecosystem. It provides any Heady surface — buddy companions, command center interfaces, agent narrations, and developer integrations — with low-latency, character-aware voice output. Voice Vessel sits between the model layer (LLM outputs) and the playback layer (browser audio, mobile speaker, device edge), managing synthesis requests, streaming chunked audio, persisting voice profiles, and enabling voice persona switching.

**Problem Statement:**  
Heady's AI companion (headybuddy.org) and agent surfaces produce text-only responses today. There is no canonical voice synthesis path, no character-specific voice profile, and no streaming infrastructure to deliver audio without full-generation wait times. Developers building voice-enabled experiences on headyio.com have no SDK surface. The result is a product that feels text-first when voice is increasingly expected in companion and assistant contexts.

---

## 2. Goals

1. Synthesize streaming audio from text with first-chunk delivery in under 400ms for standard responses.
2. Support configurable voice personas (tone, pace, character) that can be assigned per buddy companion, agent type, or operator preference.
3. Expose a single streaming API endpoint usable by headybuddy.org, headyme.com, headymcp.com, and external developers via headyapi.com.
4. Persist voice profile definitions in the Heady ecosystem so a user's configured buddy voice is consistent across devices and sessions.
5. Enable voice as a first-class MCP tool so agents can narrate outputs or deliver spoken alerts without additional integration work.

### Non-Goals (v1)

- Real-time voice cloning from user audio (Phase 3).
- Voice-to-voice conversational loop (speech recognition input is Heady Signal Exchange territory, Spec-09).
- Multi-language voice synthesis beyond English (Phase 2).
- Live voice modulation or audio effects processing.
- Telephony / PSTN integration.

---

## 3. User Stories

### Companion User

- **As a headybuddy.org user**, I want my AI companion to speak responses in a voice that matches the persona I chose at setup so the experience feels personal and consistent.
- **As a mobile user**, I want voice playback to begin within a second of submitting a message so I can listen while walking without staring at a screen.
- **As a user**, I want to mute voice output temporarily without changing my voice profile preference so I can use the app silently in a meeting.

### Developer

- **As a headyio.com developer**, I want to call a single streaming endpoint with a text payload and receive chunked audio I can pipe directly to a Web Audio API player so I do not have to integrate a third-party TTS provider myself.
- **As a developer**, I want to register a named voice profile (voice model, speed, pitch character) via API and reference it by ID in synthesis requests so I can reuse it across my application.

### Agent / Operator

- **As a Heady swarm agent**, I want to call an MCP tool (`heady_voice_speak`) with a text payload and have audio delivered to the connected client session so I can narrate task progress without the operator watching a screen.
- **As a platform operator**, I want to configure the default voice for system-level notifications (alerts, status changes) independently from user companion voices.

---

## 4. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| VV-01 | Streaming TTS API: `POST /voice/synthesize` accepts `{text, voice_profile_id, format: "mp3|opus|pcm", stream: true}`; returns chunked audio stream. | Given 200-char input, when stream: true, then first audio chunk returned within 400ms. |
| VV-02 | Voice Profile Registry: CRUD on named voice profiles (`/voice/profiles`). Each profile: `model`, `speed`, `character`, `language`. | Given profile creation, when referenced in synthesis, then correct profile parameters applied. |
| VV-03 | Voice Profile Persistence: profiles stored per user identity (from Identity Loom) and per entity. | Given user change of device, when synthesis called, then same profile used. |
| VV-04 | Default Voice Assignment: users and operators can designate a default profile for buddy, agent, and system voices separately. | Given no `voice_profile_id` in request, when user has default set, then default profile used. |
| VV-05 | Browser SDK: `@heady/voice-vessel` npm package exposes `synthesize(text, profileId)` returning a Web Audio API `AudioNode` for direct playback. | Given npm install, when synthesize called, then audio plays without additional wiring. |
| VV-06 | Mute / Resume: client-side SDK supports `mute()` and `resume()` without canceling the synthesis stream. | Given mute() called mid-stream, when resume() called, then audio resumes from current position. |
| VV-07 | MCP Tool: `heady_voice_speak` accepts `{text, profile_id, session_id}`; routes audio to session's active client. | Given agent calls heady_voice_speak, then audio delivered to correct session within 600ms. |

### P1 — Should Have

| ID | Requirement |
|----|-------------|
| VV-08 | Non-streaming (batch) synthesis: `stream: false` returns complete audio file URL for pre-rendered content. |
| VV-09 | Voice profile preview: `/voice/profiles/{id}/preview` returns a 5-second audio sample with the profile applied to a standard phrase. |
| VV-10 | Usage tracking: synthesis requests logged to Treasury Nexus (Spec-01) with character count for credit deduction. |
| VV-11 | Mobile SDK: React Native wrapper for streaming audio playback. |
| VV-12 | SSML support: basic Speech Synthesis Markup Language tags (`<break>`, `<emphasis>`, `<prosody>`) in synthesis input. |

### P2 — Future

| ID | Requirement |
|----|-------------|
| VV-13 | Multi-language synthesis (Phase 2). |
| VV-14 | Voice cloning from user audio samples (Phase 3). |
| VV-15 | Emotion injection: sentiment-aware voice tone modulation. |

---

## 5. User Experience

**Companion Voice Setup (headybuddy.org)**

During HeadyBuddy onboarding:
1. User reaches "Choose your buddy's voice" step.
2. Six preset voice personas presented as cards (name, character description, sample play button).
3. User taps sample → 5-second preview streams in-browser.
4. User selects preferred voice → profile ID saved to their identity.
5. "Custom" tile available for developers (redirects to headyio.com/voice/profiles).

**In-Session Voice Playback**

- Responses auto-play as streaming audio if voice is enabled.
- Floating player bar shows waveform animation, elapsed/remaining time, mute toggle, and speed selector (0.75×, 1×, 1.25×, 1.5×).
- Long responses visually highlight the currently spoken sentence in the text transcript.
- Voice enable/disable toggle persists to user settings.

**Developer API (headyapi.com)**

```
POST /v1/voice/synthesize          — stream or batch synthesize
GET  /v1/voice/profiles            — list voice profiles for account
POST /v1/voice/profiles            — create named voice profile
GET  /v1/voice/profiles/{id}       — get profile detail
PUT  /v1/voice/profiles/{id}       — update profile
DELETE /v1/voice/profiles/{id}     — delete profile
GET  /v1/voice/profiles/{id}/preview — get preview audio URL
```

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│   Clients: headybuddy.org | headyme.com | headyio.com apps     │
│   SDKs: @heady/voice-vessel (browser) | React Native wrapper   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket / HTTP streaming
┌──────────────────────────▼──────────────────────────────────────┐
│                Voice Vessel Service (Cloud Run)                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Synthesis Router│  │ Profile Store  │  │  Session Router│  │
│  │  (model dispatch)│  │ (CRUD + cache) │  │  (MCP→session) │  │
│  └────────┬─────────┘  └───────┬────────┘  └────────┬───────┘  │
│           │                    │                     │           │
│  ┌────────▼────────────────────▼─────────────────────▼───────┐  │
│  │           Audio Stream Buffer (Cloudflare R2 / GCS)       │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────┬───────────────────────────────────────────────────┘
             │ TTS API calls
┌────────────▼───────────────────────────────────────────────────┐
│  TTS Provider Layer (pluggable)                                │
│  ElevenLabs | OpenAI TTS | Cartesia | self-hosted Coqui        │
└────────────────────────────────────────────────────────────────┘
             │ MCP
┌────────────▼───────────────────────────────────────────────────┐
│   headymcp.com — heady_voice_speak MCP tool                   │
└────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Service runtime: Cloud Run (Node.js / TypeScript)
- Streaming: HTTP chunked transfer encoding + WebSocket for session-targeted delivery
- TTS backend: pluggable provider (ElevenLabs primary, OpenAI TTS fallback)
- Profile storage: PostgreSQL + Redis cache
- Audio buffer: Cloudflare R2 for batch renders; streaming passes through without storage by default
- Identity: Identity Loom JWT validation on all endpoints
- Credit metering: character count → Treasury Nexus deduction event

---

## 7. Data Flows

### Streaming Synthesis Flow

```
Client: POST /voice/synthesize {text: "Hello...", voice_profile_id: "vp_xyz", stream: true}
  → Identity Loom: validate JWT + scope voice:synthesize
  → Treasury Nexus: pre-authorize credits (character_count × rate)
  → Profile Store: load voice_profile_id params
  → TTS Provider: stream synthesis request
  → Provider returns chunked PCM/MP3 stream
  → Voice Vessel: forward chunks to client as HTTP chunked response
  → On stream complete: Treasury Nexus commit authorization
  → Usage event logged
```

### MCP Agent Voice Delivery Flow

```
Agent: heady_voice_speak {text: "Task complete", profile_id: "vp_system", session_id: "sess_abc"}
  → headymcp.com: route to Voice Vessel
  → Session Router: look up WebSocket connection for session_id
  → Synthesize audio stream
  → Push audio chunks to client WebSocket
  → Client: audio plays in session player bar
```

---

## 8. Security and Privacy

| Concern | Control |
|---------|---------|
| Identity on synthesis requests | All `/voice/*` endpoints require Identity Loom JWT with `voice:synthesize` scope |
| Credit pre-authorization | Treasury Nexus authorizes before TTS provider call; uncommitted on provider error |
| Audio data retention | Streaming synthesis: no audio stored. Batch synthesis: audio stored in R2 with 24h TTL, then deleted |
| Provider API keys | TTS provider keys stored in Secret Manager; never exposed to clients or logs |
| Session routing security | Session IDs validated against Identity Loom; cross-session audio injection blocked by session ownership check |
| SSML injection | SSML input sanitized; only whitelisted tags accepted; others stripped silently |
| Rate limiting | 60 synthesis requests/min per account via headyapi-core |

---

## 9. Dependencies

| Dependency | Role | Required For Phase |
|------------|------|--------------------|
| Heady Identity Loom (Spec-02) | JWT validation and scope enforcement | Phase 1 |
| Heady Treasury Nexus (Spec-01) | Credit pre-authorization per synthesis | Phase 1 |
| headymcp-core | MCP tool registration for heady_voice_speak | Phase 1 |
| headybuddy-core | Primary consumer of streaming synthesis | Phase 1 |
| headyapi-core | API gateway, rate limiting | Phase 1 |
| TTS Provider (ElevenLabs / OpenAI TTS) | Actual speech synthesis | Phase 1 |
| Cloudflare R2 / GCS | Batch audio storage | Phase 1 |
| heady-mobile | React Native SDK consumer | Phase 2 |

---

## 10. Success Metrics

| Metric | Target | Evaluation Window |
|--------|--------|-------------------|
| First audio chunk latency (p95) | < 400ms | 30 days post-launch |
| Synthesis error rate | < 0.5% | 30 days |
| Voice feature adoption (headybuddy.org) | > 60% of active users enable voice | 60 days |
| Session-targeted delivery success | > 99.5% | 30 days |
| Developer SDK installs | > 100 projects within 60 days | 60 days |
| Character-to-credit deduction accuracy | 100% | Ongoing |

---

## 11. Phased Rollout

### Phase 1 — Core Streaming (Weeks 1–4)
- Voice Vessel Service on Cloud Run
- Streaming TTS API (ElevenLabs primary)
- Voice Profile Registry (6 preset personas)
- Browser SDK (`@heady/voice-vessel`)
- headybuddy.org voice setup flow and session player
- MCP tool: `heady_voice_speak`
- Treasury Nexus credit metering

### Phase 2 — Developer API + Mobile (Weeks 5–8)
- headyapi.com `/v1/voice` endpoints
- Batch synthesis with R2 storage
- SSML support
- React Native SDK
- Multi-language support (initial: Spanish, French)
- Voice profile preview endpoint

### Phase 3 — Voice Cloning + Emotion (Weeks 9–16)
- User voice cloning from audio samples
- Sentiment-aware tone modulation
- Extended language support

---

## 12. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should Voice Vessel support self-hosted TTS (Coqui) for privacy-sensitive users? | Architecture / Product | No |
| What is the credit rate per character for synthesis? | Finance / Eric | Yes — needed for Treasury metering setup |
| Should batch synthesis audio URLs be shareable or locked to the issuing identity? | Security | No |
| Is there a maximum synthesis request length (character limit) per call? | Engineering | Yes — Phase 1 design |
