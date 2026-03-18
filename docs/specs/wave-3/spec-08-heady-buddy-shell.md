# Spec 08 — Heady Buddy Shell

**Wave:** Third Wave  
**Domain:** headybuddy.org / AI Companion Productization  
**Primary Repos:** headybuddy-core, heady-production, headymcp-core, latent-core-dev, heady-mobile, heady-desktop  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Buddy Shell is the productized interaction layer for HeadyBuddy — the enclosure, presence system, and extensible plugin architecture that transforms HeadyBuddy from a backend AI companion service into a fully shipped native experience on mobile (iOS/Android) and desktop (macOS/Windows/Linux). The Shell provides: a persistent companion presence (ambient overlay, always-available panel, notification surface), a character/persona system that shapes how HeadyBuddy speaks and behaves per user configuration, a plugin architecture so HeadyBuddy can gain new capabilities without core code changes, and a self-hosted/hybrid deployment path for privacy-first users.

**Why it matters:** headybuddy-core already provides persistent memory, chat, and creative tools. But a backend service without a productized shell is invisible to end users. Buddy Shell is the gap between "this works in the API" and "this is the product people actually use and love."

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | HeadyBuddy Shell ships as a functional mobile and desktop application with core companion features | App store submission / desktop installer available |
| G2 | Users report a persistent presence experience — Buddy feels "always there" vs. "a chat window I open" | UX survey: ≥ 75% of users agree with "persistent presence" statement |
| G3 | Plugin system supports at least 5 first-party plugins at launch | Plugin count at launch |
| G4 | Self-hosted deployment path available and documented for privacy-first users | Self-host guide published; functional test passing |
| G5 | Session-to-session memory continuity: returning users immediately experience a buddy that remembers context from their last session | Memory continuity score (user study) ≥ 80% |

---

## 3. Non-Goals

- **Heady Buddy backend capability development** — Shell productizes the existing headybuddy-core service; it does not extend its AI capabilities directly.
- **Web application** — headybuddy.org web interface is a separate concern. Shell is native mobile/desktop only.
- **Enterprise/team deployment** — v1 Shell is personal (single-user). Team configurations are v2.
- **Heady Device Twin Grid integration** — That is Spec 09. Shell v1 operates within a single device context.

---

## 4. User Stories

**As a HeadyBuddy user on mobile,** I want a persistent ambient indicator that Buddy is active — not just a chat app I launch — so that it feels like a companion that's present throughout my day.

**As a user configuring my experience,** I want to choose Buddy's persona (tone, communication style, character name) from a set of presets or customize it, so that the companion matches my personality and preferences.

**As a developer,** I want to install a HeadyBuddy plugin (e.g., "Grant Research Mode" for HeadyConnection staff) that adds new capabilities to my Buddy session without recompiling the app, so that Buddy grows with my needs.

**As a privacy-conscious user,** I want to run HeadyBuddy Shell in self-hosted mode where all memory and conversation data stays on my local machine or private server, so that I never have to trust a third-party cloud with my personal companion data.

**As a returning user,** I want to open Buddy Shell after a week away and have Buddy naturally reference our previous conversations and ongoing tasks — without me having to re-establish context — so that continuity is automatic.

---

## 5. Requirements

### P0 — Must Have

- **Native Shell Application:**
  - Mobile: React Native app targeting iOS 16+ and Android 13+.
  - Desktop: Electron or Tauri app targeting macOS 13+, Windows 11, Ubuntu 22.04+.
  - Built from heady-mobile and heady-desktop repos respectively.
- **Persistent Presence Layer:**
  - Mobile: floating action button / always-accessible quick-reply surface in notification shade.
  - Desktop: system tray icon with quick-compose overlay; minimizes to tray, never fully "quits."
- **Conversation Core:** Full conversation UI — message thread, typing indicator, multimedia support (images, files), code blocks with syntax highlighting.
- **Persona System:** User configures Buddy's persona: name (e.g., "Buddy", "Sage", "Nova"), tone (casual / professional / playful), verbosity (concise / balanced / detailed). Persona config stored in headybuddy-core and applied to all LLM prompt contexts for that user.
- **Plugin Architecture:** Plugins are YAML-declared capability packages that add new MCP tool bindings and prompt context injectors to a user's Buddy session. Loaded dynamically at session start. First-party plugins: grant_research, impact_reporting, cloud_ops, creative_studio, devops_pulse.
- **Session Memory Continuity:** On app open, Buddy automatically loads the last session's short-term memory and recalls long-term context from latent-core-dev. No explicit "start new chat" required.
- **Cloud + Self-Hosted Mode:** Cloud mode: all data routed through heady-production (secure, encrypted). Self-hosted mode: Shell connects to a local headybuddy-core instance (Docker Compose provided); all memory stored on-device or on private server.

### P1 — Should Have

- **Notification Intelligence:** Buddy surfaces proactive notifications — "Your grant deadline is in 7 days," "Deployment Pulse flagged a warning on your Cloud Run service" — pulled from connected Heady services via headymcp-core.
- **Voice Mode (Opt-in):** Local voice input (on-device STT) + TTS output for hands-free companion interaction. Voice pipeline stays local in self-hosted mode.
- **Plugin Marketplace:** In-app browsable catalog of available plugins with install/uninstall controls.
- **Theme + Appearance:** Light/dark mode, accent color picker, Buddy avatar customization (from a set of illustrated presets).

### P2 — Future

- **Multi-device sync** via Heady Device Twin Grid (Spec 09).
- **Team/family mode** — shared Buddy session with multiple members.
- **Companion learning** — Buddy proactively surfaces personalized suggestions based on long-term memory patterns.

---

## 6. User Experience

**Mobile Shell:**
1. **Onboarding:** 4-screen setup flow: Connect Heady account → Name your Buddy → Choose persona preset → Enable plugins. Buddy sends a personalized first message.
2. **Home screen widget:** Compact "Buddy is here" indicator with quick-compose tap target.
3. **Full conversation view:** Clean thread UI with Buddy avatar. Subtle ambient glow effect indicating Buddy is "present." Long-press message to copy, share, or react.
4. **Quick-access drawer:** Swipe from edge → shows Buddy quick-compose, active plugin indicators, and notification queue.
5. **Settings:** Persona editor, plugin management, privacy controls (cloud vs. self-hosted), appearance.

**Desktop Shell:**
1. **System tray:** Heady Buddy icon in tray. Click → floating companion panel slides in from corner (50% height, 380px wide, soft shadow, rounded corners).
2. **Panel:** Conversation thread with Buddy avatar floating above. Minimize to tray with click.
3. **Command palette:** `Ctrl+Space` → inline quick-prompt bar anywhere on screen. Dismiss with Escape.
4. **Plugin panels:** Some plugins add persistent side panels (e.g., Deployment Pulse plugin adds a mini status bar at panel footer).

---

## 7. Architecture

```
┌──────────────────────────────────────────────────────┐
│  HeadyBuddy Shell (Mobile / Desktop)                 │
│  React Native (iOS/Android) │ Tauri/Electron (Desktop)│
│  Plugin loader │ Persona config │ Presence manager   │
└──────────────────┬───────────────────────────────────┘
                   │ HTTPS / WebSocket
         ┌─────────▼──────────┐
         │  Cloud Mode        │     ┌──────────────────┐
         │  heady-production  │  OR │  Self-hosted     │
         │  headybuddy-core   │     │  headybuddy-core │
         │  (multi-model,     │     │  (Docker Compose │
         │  persistent mem)   │     │  local instance) │
         └─────────┬──────────┘     └──────────┬───────┘
                   │                            │
         ┌─────────▼────────────────────────────▼───────┐
         │              headymcp-core                    │
         │  Persona-aware prompt context                 │
         │  Plugin MCP tool bindings                     │
         │  Notification event subscription             │
         └─────────┬─────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  latent-core-dev   │
         │  User long-term    │
         │  memory (pgvector) │
         └────────────────────┘
```

---

## 8. Data Flows

**App startup / session init:**
```
Shell app opens
  → Authenticate user (headybuddy-core JWT)
  → Load persona config from user profile
  → Load active plugins → fetch tool bindings via headymcp-core
  → Load last short-term memory session
  → Recall top-5 long-term memory entries (recency-weighted)
  → Compose Buddy greeting using persona + recalled context
  → Display greeting in conversation UI
```

**User message flow:**
```
User sends message
  → Plugin context injectors add relevant context (e.g., grant status if grant_research plugin active)
  → Persona tone wrapper applied to prompt context
  → headymcp-core routes to LLM with full context
  → Response streamed back to Shell UI
  → Response written to short-term memory
  → If memory_significance > threshold: flush to latent-core-dev long-term store
```

**Self-hosted mode:**
```
User configures self-hosted endpoint in Shell settings
  → Shell connects to local headybuddy-core (Docker Compose)
  → All memory operations go to local pgvector instance
  → LLM calls routed through local Ollama or user-configured API endpoint
  → No data leaves device unless user explicitly enables cloud sync
```

---

## 9. Security & Privacy

- Cloud mode: all data encrypted in transit (TLS 1.3) and at rest in heady-production. User memory namespace is isolated by user_id with row-level security.
- Self-hosted mode: Shell never contacts heady-production; all data stays on-device or private server. Docker Compose package signed and verified.
- Persona configs (including custom names and styles) are stored per-user and never shared with other users or used in model training.
- Plugin YAML declarations are reviewed and signed before listing in the Plugin Marketplace. Unsigned plugins cannot be installed in cloud mode; only in self-hosted mode (with warning).
- Notification Intelligence pulls only aggregated event summaries from connected services, not raw data. User controls which services Buddy can pull from in Settings.
- Biometric unlock (Face ID / Touch ID) required on mobile by default; configurable.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headybuddy-core — AI companion backend | Internal | Existing — extend with plugin + persona APIs |
| heady-production — user profile, memory, auth | Internal | Existing — extend with persona storage |
| headymcp-core — tool dispatch + plugin bindings | Internal | Extend with plugin tool loader |
| latent-core-dev — long-term memory | Internal | Existing — user memory namespace |
| heady-mobile — React Native shell app | Internal | Existing repo — build/extend |
| heady-desktop — Tauri/Electron shell app | Internal | Existing repo — build/extend |
| Docker Compose — self-hosted bundle | Infrastructure | New compose file for self-host distribution |
| App store accounts (Apple, Google Play) | External | Existing or to establish |

---

## 11. Phased Rollout

### Phase 1 — Core Shell (Weeks 1–6)
- Mobile React Native app (iOS + Android) — conversation core + persistent presence
- Desktop Tauri app (macOS primary) — tray + floating panel
- Persona system (presets only, no custom editor)
- Cloud mode only
- Session memory continuity

### Phase 2 — Plugins + Self-Host (Weeks 7–12)
- Plugin architecture + first 5 first-party plugins
- Self-hosted Docker Compose bundle
- Plugin Marketplace (in-app)
- Notification Intelligence
- Desktop Windows + Linux builds

### Phase 3 — Polish + Voice (Weeks 13–18)
- Voice mode (mobile primary)
- Appearance/theme customization
- Custom persona editor
- App store submission + public release
- Self-host documentation + guide

---

## 12. Success Metrics

| Metric | Baseline | Target (by Phase 3) |
|--------|---------|---------------------|
| App available on iOS + Android | No | Yes |
| Persistent presence UX score | N/A | ≥ 75% agree |
| Plugins available at launch | 0 | ≥ 5 |
| Self-hosted mode functional | No | Yes |
| Memory continuity score | N/A | ≥ 80% |
| 30-day retention (mobile) | N/A | ≥ 40% |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Tauri vs. Electron for desktop — what is the current state of heady-desktop? | Engineering | Yes — affects desktop tech stack decision |
| Is a React Native bridge to headybuddy-core already in place, or does it need to be built? | Engineering | Yes — determines Phase 1 effort |
| Which LLM should self-hosted mode use by default? (Ollama + Llama 3?) | Eric | No — can document options; no single default required |
| Should the Plugin Marketplace require in-app purchases for third-party plugins in v2? | Eric | No — out of scope for v1 |
