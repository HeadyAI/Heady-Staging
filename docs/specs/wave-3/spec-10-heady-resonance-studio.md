# Spec 10 — Heady Resonance Studio

**Wave:** Third Wave  
**Domain:** headyme.com / Creative + AI Tools  
**Primary Repos:** heady-production, headymcp-core, latent-core-dev, headyme-core, headybuddy-core, heady-imagine, ableton-edge-production  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Resonance Studio is a multi-modal creative AI workspace embedded in headyme.com that gives users a unified environment for AI-assisted music composition, visual art generation, narrative writing, and multimedia synthesis. It is purpose-built around the concept of "resonance" — the idea that creative output emerges from the interaction between user intent, AI generation, and iterative feedback — and is structured as a project-based studio where multiple creative modalities coexist in a single session.

Resonance Studio integrates the existing ableton-edge-production cloud MIDI sequencer, heady-imagine visual generation capabilities, and the Heady Latent OS LLM stack into a coherent creative environment — not as separate tools, but as a unified creative session where a concept can flow from words to music to visual without leaving the Studio.

**Why it matters:** The creative tools market is fragmented — users jump between ChatGPT for writing, Midjourney for images, Suno for music, and back again. Resonance Studio makes Heady the single creative environment for multi-modal work, differentiating headyme.com as a platform beyond productivity and into creative expression.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Users can create a multi-modal project (text + image + music) within a single Studio session without switching apps | % of sessions that include ≥ 2 modalities |
| G2 | Each creative layer (text, image, music) generates a first draft in ≤ 15 seconds | P95 generation latency per modality |
| G3 | Studio sessions are persistent — projects are saved, versioned, and resumable across devices | Project persistence rate ≥ 99% |
| G4 | At least 30% of users who try Studio in their first week return for a second session within 7 days | 7-day retention for Studio first users |
| G5 | Resonance Studio drives ≥ 20% increase in time-on-site for headyme.com | Session duration metric |

---

## 3. Non-Goals

- **Professional-grade DAW replacement** — Studio provides accessible AI-assisted music creation. It is not a full Digital Audio Workstation replacing Ableton, Logic, or Pro Tools for professionals.
- **Real-time collaboration** — v1 is single-user. Real-time co-creation sessions are v2.
- **Video generation** — Out of scope for v1; text, image, and music are the three v1 modalities.
- **Commercial licensing for generated content** — Content licensing policy is a legal question outside this spec; v1 makes no claims about commercial use rights.

---

## 4. User Stories

**As a creative user,** I want to describe a concept ("a melancholic rainy afternoon in a neon-lit city") and have Resonance Studio simultaneously generate a short prose passage, an image, and a looping MIDI sequence that all express the same idea — so that I have a multi-modal creative starting point in one action.

**As a musician,** I want to generate a chord progression and melody via natural language, hear it play in the Studio, then download the MIDI file to import into my DAW.

**As a visual artist,** I want to use text generated in the Studio as a prompt for image generation and then iteratively refine the image with follow-up text instructions, staying in a single workflow.

**As a writer,** I want to open a past Studio project, see all my text drafts, images, and music sketches together in their project context, and continue working from where I left off.

**As a HeadyBuddy user,** I want my Buddy to be available inside Studio as a creative collaborator — offering suggestions, helping me iterate on drafts, and remembering my creative preferences across sessions.

---

## 5. Requirements

### P0 — Must Have

- **Studio Session:** A named project that contains: a text canvas, an image board, and a music track list. Sessions are persisted in heady-production and versioned.
- **Text Canvas:** Rich text editor (prose, poetry, lyrics, scripts) with inline AI generation. Highlight any text → "Continue," "Rewrite," "Expand" context actions. Full conversation with headybuddy-core available in a side panel.
- **Image Board:** Prompt-based image generation via heady-imagine. Board holds up to 16 image cards per session. Each image has: prompt, generation params, creation timestamp. Click to expand/download. "Evolve" button: use image as seed for a next-step generation.
- **Music Track (Cloud MIDI):** Integration with ableton-edge-production cloud MIDI sequencer. User inputs natural language music intent ("4/4 time, melancholic, minor key, slow tempo, piano and strings, 8 bars"). System generates MIDI sequence → plays in Studio browser audio player. Download MIDI, adjust parameters, regenerate.
- **Concept Seed Mode:** User enters a single concept phrase → Studio simultaneously generates: text passage (Text Canvas), image (Image Board), and MIDI loop (Music Track) all tuned to that concept. This is the flagship "resonance" experience.
- **Project Persistence + Versioning:** Every generation is saved automatically. Users can browse version history per canvas, board, or track. Session auto-saves every 30 seconds.
- **Export:** Download text (Markdown/TXT), images (PNG/JPG), MIDI files. "Export All" packages a project as a ZIP.

### P1 — Should Have

- **HeadyBuddy Creative Mode:** When the Studio Buddy panel is open, Buddy has creative mode context — it knows the current project theme, recent generations, and creative direction. Buddy suggests next steps, alternative interpretations, and evaluates drafts on request.
- **Style Presets:** Curated creative presets that configure all three modalities at once: "Cosmic Ambient," "Urban Grit," "Studio Baroque," etc. Preset applies style guidance to LLM prompts for consistent aesthetic.
- **Resonance Feedback:** After any generation, user rates it 1–5 stars. Low-rated generations update the session's implicit style preference, steering subsequent generations away from disliked directions.
- **Cross-Modal Influence:** Text generated in the Canvas can be used directly as the image prompt (click "Send to Image Board"). Music mood description can be pre-filled from the text canvas's detected emotional tone.

### P2 — Future

- **Real-time audio generation** (not MIDI, but actual audio via diffusion model).
- **Video storyboard** — generate a sequence of images with transitions.
- **Multi-user co-creation** — shared Studio sessions with presence indicators and turn-taking.
- **Publish to Gallery** — share a Studio project publicly at a headyme.com/gallery URL.

---

## 6. User Experience

**Layout:**
Resonance Studio uses a three-panel layout within headyme.com:
1. **Left panel (Text Canvas):** Scrollable rich text editor. "Generate" button at top. Inline context menu on selection. Version history in footer.
2. **Center panel (Image Board):** Grid of generated images. "Generate Image" button. Click any image to expand with options: download, evolve, use as canvas prompt.
3. **Right panel (Music Track / Buddy):** Tab switch between Music and Buddy.
   - Music tab: single track player UI — tempo, key, mood descriptors shown as chips. MIDI waveform visualization. Play/pause, download, regenerate.
   - Buddy tab: HeadyBuddy chat in creative mode, pre-loaded with project context.

**Top bar:**
- Project name (editable)
- "Concept Seed" button (enters concept → generates across all three panels)
- Style preset picker
- Export All button
- Project history dropdown

**Concept Seed interaction:**
1. User types concept: "a desert at golden hour, ancient and silent"
2. Studio shows three simultaneous loading spinners
3. Within 15 seconds: text passage appears in Canvas, image appears in Image Board, MIDI loop starts playing in Music Track
4. User can click into any panel to iterate independently

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│  headyme.com UI (/studio)                           │
│  Three-panel Studio layout (template-heady-ui)      │
│  Text Canvas │ Image Board │ Music + Buddy          │
└──────────────┬──────────────────────┬───────────────┘
               │ REST / WebSocket     │
┌──────────────▼──────────────────────▼───────────────┐
│              headyme-core API                        │
│  Studio session manager                             │
│  Concept Seed orchestrator                          │
│  Project persistence + versioning                   │
└────────┬──────────────────────────────┬─────────────┘
         │                              │
┌────────▼──────────┐     ┌─────────────▼──────────────┐
│  headymcp-core    │     │  heady-production           │
│  Tool dispatch:   │     │  studio_sessions            │
│  - text generate  │     │  studio_generations         │
│  - image generate │     │  studio_version_history     │
│  - midi generate  │     └────────────────────────────┘
└────────┬──────────┘
         │
┌────────▼──────────────────────────────────┐
│  Generation backends:                      │
│  Text: heady-production LLM router         │
│  Image: heady-imagine (Cloudflare AI /     │
│         external image model)             │
│  Music: ableton-edge-production            │
│         Cloud MIDI Sequencer              │
└────────┬──────────────────────────────────┘
         │
┌────────▼──────────┐  ┌────────────────────┐
│  latent-core-dev  │  │  headybuddy-core   │
│  Style preference │  │  Creative mode     │
│  memory per user  │  │  Buddy session     │
└───────────────────┘  └────────────────────┘
```

---

## 8. Data Flows

**Concept Seed flow:**
```
User enters concept phrase → clicks "Concept Seed"
  → headyme-core Concept Seed Orchestrator:
    → Parallel dispatch via headymcp-core:
      1. text_generate(concept, style_preset, session_context)
      2. image_generate(concept, style_preset)
      3. midi_generate(concept, style_preset)
    → All three run concurrently
    → As each completes, push result to Studio UI via WebSocket
    → Store all three generations in studio_generations
    → Create studio_version_history entry
```

**Iterative text refinement:**
```
User selects text → "Rewrite"
  → headymcp-core: text_generate(selected_text, action="rewrite", session_context)
  → Return new text → offer as replacement or side-by-side comparison
  → User accepts → new version saved to studio_version_history
```

**Resonance feedback loop:**
```
User rates generation (1–5 stars)
  → Feedback written to studio_generations
  → latent-core-dev: update user style preference vector
    (low rating → negative weight on style features of that generation)
  → Subsequent generations in session use updated style vector for steering
```

**MIDI generation:**
```
User describes music intent
  → headymcp-core: midi_generate(intent, params)
  → ableton-edge-production API call: generate MIDI sequence
  → MIDI file URL returned → stored in studio_generations
  → Browser MIDI player loads file → playback starts
  → Download link available
```

---

## 9. Security & Privacy

- Studio sessions and all generated content are private to the user by default. No public access.
- Generated images are stored in Cloudflare R2 with signed, time-limited URLs. No persistent public URLs until user explicitly shares.
- User style preference vectors in latent-core-dev are stored per-user with row-level security.
- ableton-edge-production API credentials stored in headymcp-core secrets management; never in client code.
- Image generation prompts are logged (for moderation/abuse prevention) but not used to train models without explicit user consent.
- Studio sessions are encrypted at rest in heady-production.
- No generated content is used in Heady's model training without opt-in consent.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headyme-core — personal cloud hub API | Internal | Extend with Studio module |
| heady-production — Postgres (new tables) + R2 (images) | Internal | Migration + R2 bucket |
| headymcp-core — tool dispatch (text/image/midi) | Internal | Add midi_generate tool |
| heady-imagine — image generation backend | Internal | Existing — integrate into Studio |
| ableton-edge-production — Cloud MIDI Sequencer | Internal | Existing — add Studio API endpoint |
| latent-core-dev — style preference memory | Internal | Extend with style preference schema |
| headybuddy-core — Creative Mode Buddy | Internal | Add creative_mode context to Buddy |
| Cloudflare R2 — image storage | Infrastructure | Existing pattern — new bucket |

---

## 11. Phased Rollout

### Phase 1 — Studio Core (Weeks 1–6)
- Studio session schema + persistence
- Text Canvas with AI generation
- Image Board with heady-imagine integration
- Concept Seed (all three panels, parallel dispatch)
- Project export (text + images)

### Phase 2 — Music + Memory (Weeks 7–12)
- Music Track with ableton-edge-production MIDI integration
- Browser MIDI player
- Resonance Feedback (ratings → style preference memory)
- Style Presets
- HeadyBuddy Creative Mode integration

### Phase 3 — Polish + Retention (Weeks 13–18)
- Cross-Modal Influence (text → image prompt, text mood → music seed)
- Version history browser
- Project history and resumption
- Style preference personalization refinement
- Performance optimization (generation latency < 15s P95)

---

## 12. Success Metrics

| Metric | Baseline | Target (Phase 2 completion) |
|--------|---------|------------------------------|
| Multi-modal sessions (≥ 2 modalities) | N/A | ≥ 50% of Studio sessions |
| Generation latency P95 | N/A | ≤ 15 seconds per modality |
| Project persistence rate | N/A | ≥ 99% |
| 7-day Studio retention | N/A | ≥ 30% |
| headyme.com time-on-site increase | Baseline | +20% for Studio users |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Does ableton-edge-production have an existing API for programmatic MIDI generation, or does it need to be extended? | Engineering | Yes — determines Phase 1 vs. Phase 2 music capability |
| Which image generation model does heady-imagine currently use? (Cloudflare AI? Stable Diffusion? DALL·E?) | Engineering | No — affects image quality and cost; can document options |
| Should Resonance Studio be gated behind a paid tier or free for all headyme.com users? | Eric | No — out of scope for spec; recommend free in v1 |
| What is the storage budget for Studio images in Cloudflare R2? | Eric | No — can set a per-user quota (e.g., 500MB) in Phase 1 |
