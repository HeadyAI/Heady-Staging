# Feature Specification: Heady Persona Studio

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / heady-ai.com / headybuddy.org  
**Status:** Draft

---

## 1. Purpose

Heady Persona Studio is a visual, no-code environment where users design, configure, test, and deploy custom AI personas across the Heady ecosystem. Rather than accepting a single default assistant personality, users compose named personas with distinct communication styles, domain expertise biases, tone profiles, memory access permissions, and tool allowlists. Each persona can be pinned to a domain (e.g., only active in headybuddy.org), shared with others, or sold via the Heady Skill Bazaar.

### Problem Statement
The current Heady AI experience presents a single undifferentiated "assistant" voice regardless of context, user preference, or task type. A user doing legal research needs different framing than one doing creative brainstorming. Without persona tooling, the ecosystem cannot serve the full range of use cases or allow builders to create differentiated AI experiences on top of the Heady platform.

### Goals
1. Enable users to create and activate a custom persona within 10 minutes with no coding required.
2. Support ≥5 distinct persona configurations per user account at launch.
3. Allow persona sharing and remixing with attribution tracking.
4. Give builders a monetization path via the Skill Bazaar integration.
5. Measurably improve task-match satisfaction scores vs. default persona.

### Non-Goals
- Fine-tuning or training custom models per persona (deferred; uses prompt/config layer only).
- Real-time voice cloning for persona voice personas (deferred to media/voice track).
- Enterprise team-level persona governance (v2).
- Persona marketplace payment processing in v1 (listing only; payment via Skill Bazaar).

---

## 2. User Experience

### User Personas (meta-note: these are Persona Studio users, not the AI personas they create)
- **The Tinkerer** — wants to experiment with personality configurations and see immediate results.
- **The Builder** — creating personas to share or sell to other Heady users.
- **The Power Workflow User** — wants different personas locked to different task types (coding, writing, research).

### Core UX Flows

**Persona Creation Flow**
1. User navigates to headyme.com → Persona Studio → "New Persona".
2. Persona Builder canvas opens with four configuration panels:
   - **Identity** — Name, avatar (emoji or upload), one-line description, default greeting.
   - **Communication Style** — Tone slider (formal ↔ casual), verbosity slider (concise ↔ expansive), response format preference (prose / bullets / structured), language (default English + 12 supported languages).
   - **Domain Expertise Bias** — Tag-based domain selection (coding, legal, creative, research, wellness, etc.) that adjusts how the persona weights its reasoning and references.
   - **Permissions & Tools** — Memory access scope (read all / read category-filtered / no memory), tool allowlist (web search, code execution, file access), domain restriction (active everywhere / pinned domains only).
3. Live Preview panel: user types a test prompt and sees a real-time response in the configured persona voice.
4. Save → persona appears in the user's Persona Library.
5. Activate → selected persona becomes the active AI identity for the current session or pinned to a domain.

**Persona Switching**
- Global persona switcher in the headyme.com sidebar: one click to switch active persona.
- Keyboard shortcut (Cmd/Ctrl+Shift+P) opens persona quick-select palette.
- When entering a pinned domain, the system automatically activates the assigned persona and displays a brief confirmation banner.

**Persona Sharing & Remixing**
- "Share" generates a Persona Card (shareable URL) displaying the persona's public config (name, description, style tags, domain biases, author attribution).
- "Remix" creates a copy of a shared persona in the user's Studio for editing.
- Attribution chain is preserved: "Remixed from [OriginalName] by [Author]".
- Builder can mark a persona as "open remix" or "locked" (no remixing allowed).

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Persona Config Service | CRUD API for persona definitions | headyapi.com |
| Persona Config Store | Structured store for persona metadata and config JSON | headysystems.com |
| Persona Renderer | Translates persona config into system prompt + tool config at session start | heady-ai.com |
| Live Preview Service | Lightweight inference endpoint for Studio preview calls | heady-ai.com |
| Persona Library UI | User's collection of created/saved personas | headyme.com |
| Persona Card Service | Generates and serves shareable persona URLs | headyme.com |
| Skill Bazaar Integration | Exposes personas for listing/discovery | Heady Skill Bazaar |

### Persona Config Schema (JSON)
```json
{
  "persona_id": "uuid",
  "owner_user_id": "uuid",
  "name": "string",
  "avatar": "emoji_or_url",
  "description": "string",
  "greeting": "string",
  "style": {
    "tone": 0.0–1.0,
    "verbosity": 0.0–1.0,
    "format": "prose|bullets|structured",
    "language": "en"
  },
  "domain_biases": ["coding", "research"],
  "permissions": {
    "memory_scope": "all|category_filtered|none",
    "memory_categories": ["Project", "Preference"],
    "tools": ["web_search", "code_execution"],
    "domain_pins": ["headybuddy.org"]
  },
  "sharing": {
    "visibility": "private|shared|bazaar",
    "remix_allowed": true,
    "attribution_chain": ["uuid1", "uuid2"]
  },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 4. Data Flows

### Session Activation Flow
```
1. User session starts on any Heady domain
2. Session orchestrator queries Persona Config Service: GET /persona/active {user_id, domain}
3. Returns active persona config JSON
4. Persona Renderer translates config → system prompt fragment + tool permission set
5. System prompt fragment injected into session context
6. Tools filtered to persona allowlist
7. Session proceeds with persona-rendered behavior
```

### Preview Flow
```
1. User edits config in Studio UI
2. User types test prompt in Live Preview panel
3. POST /persona/preview {config_delta, test_prompt}
4. Persona Renderer applies config_delta to base system prompt
5. Preview call to heady-ai.com inference (short timeout, low cost model)
6. Response streamed back to preview panel
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Persona isolation | Personas are user-scoped; no cross-user access without explicit share |
| Shared persona safety | Shared persona configs are reviewed by automated content policy before publication |
| Tool permission enforcement | Persona Renderer enforces tool allowlist at session level; agents cannot exceed it |
| Attribution integrity | Attribution chain stored server-side; client cannot modify it |
| Abuse prevention | Personas flagged for policy violations (e.g., attempting to configure "jailbreak" tone settings) are rejected at write time |
| Data privacy | Persona configs are Tier 2 Personal Data; not used for training without opt-in |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| heady-ai.com session orchestrator (must accept persona system prompt fragments) | heady-ai.com | Required |
| headyapi.com API gateway | headyapi.com | Required |
| Heady Memory Sanctum (for memory scope enforcement) | Second-wave | Complementary |
| Heady Skill Bazaar (for persona listing/monetization) | Second-wave | Complementary |
| headyme.com dashboard shell | headyme.com | Required |
| Content policy service | headysystems.com | Required before sharing feature |

---

## 7. Phased Rollout

### Phase 1 — Core Builder (Weeks 1–4)
- Persona Config Service + Store
- Studio UI: Identity + Communication Style panels
- Persona activation in headyme.com sessions
- Internal alpha only
- Success gate: Create → activate flow works end-to-end; live preview latency < 2s

### Phase 2 — Advanced Config + Permissions (Weeks 5–8)
- Domain Expertise Bias panel
- Permissions & Tools panel
- Memory Sanctum integration (if available)
- Domain pinning
- Closed beta: 100 users
- Success gate: ≥80% of beta users activate at least one custom persona

### Phase 3 — Sharing & Remixing (Weeks 9–12)
- Persona Card shareable URL
- Remix flow with attribution chain
- Content policy review for shared personas
- Open launch
- Success gate: ≥20% of active users have shared at least one persona within 30 days

### Phase 4 — Bazaar Listing (Weeks 13–16)
- Skill Bazaar listing integration
- Featured Persona discovery page
- Builder analytics (impressions, activations, remixes)
- Success gate: ≥50 personas listed in Bazaar; ≥200 cross-user activations

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Should tone/verbosity sliders be continuous or discrete steps? | Design | No |
| What is the max system prompt fragment size from a persona config? | Engineering | Yes — before Phase 1 |
| Do domain expertise biases use retrieval augmentation or just prompt steering? | AI/Engineering | No — prompt steering for v1 |
| How are reported/abusive shared personas handled at scale? | Trust & Safety | No — needed before Phase 3 |
| Should builder analytics be free or part of a premium tier? | Product/Business | No — decide before Phase 4 |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Persona creation rate | ≥50% of active users create ≥1 persona | 30 days post Phase 2 |
| Task-match satisfaction vs. default | ≥15% improvement on user-rated task quality | 60 days post Phase 2 |
| Persona activation per session | ≥70% of sessions use a non-default persona | 90 days post Phase 2 |
| Shared persona remix rate | ≥10% of shared personas are remixed | 60 days post Phase 3 |
| Bazaar listing count | ≥50 personas listed | 30 days post Phase 4 |
