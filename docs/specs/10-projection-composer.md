# Feature Spec: Projection Composer for Context-Driven UI/App Delivery

**Feature ID:** HEADY-FEAT-010  
**Domain:** headyme.com / headysystems.com / heady-ai.com  
**Status:** Draft  
**Author:** Eric Haywood  
**Date:** 2026-03-17  
**Version:** 1.0

---

## 1. Problem Statement

Heady's surfaces today present a static set of UI elements regardless of what the user is doing, what context they are working in, or what capabilities are relevant to the current task. A user doing legal research sees the same surface as a user writing code. A user deep in a client project sees the same default layout as a first-time user. The UI does not adapt to context.

In a true AI operating system, the interface should be a dynamic composition of the most relevant apps, tools, widgets, and information surfaces for the current moment — assembled from the user's installed modules, active work area, memory context, and current task state. This is the Projection Composer: a context-aware layer that assembles and presents the optimal UI surface based on what the system knows about the user's present need.

**Who experiences this:** All Heady users, especially power users with complex workflows; users switching between work areas and task types; developers building context-responsive applications on HeadyIO.

**Cost of not solving it:** Static UI creates cognitive friction; users must manually navigate to relevant tools; Heady cannot differentiate as an "OS" versus a static chat interface; developers cannot build context-responsive Heady experiences; no foundation for the "liquid latent OS" vision.

---

## 2. Goals

| Goal | Measurement | Target |
|---|---|---|
| UI adapts to active work area context within 2 seconds of area switch | Context switch → UI adaptation latency | < 2 seconds p95 |
| Relevant modules surface automatically without user configuration | % of surfaced modules user engages with within session | ≥ 40% |
| Users can customize and override projection compositions | % of users who modify at least one projection within 30 days | ≥ 25% |
| Developers can register context-aware UI modules via HeadyIO | # of third-party UI modules registered within 30 days of developer availability | ≥ 5 |
| Context accuracy: projected modules match user's stated needs | User explicit dismiss rate for auto-projected modules | < 20% |

---

## 3. Non-Goals

- **Not a full no-code app builder.** Developers build UI modules in code; the Projection Composer assembles them contextually, it does not generate them.
- **Not a real-time generative UI system (in v1).** Compositions are assembled from pre-built registered modules, not generated on the fly by an LLM.
- **Not a replacement for existing navigation.** Users can always access all surfaces directly; projection augments, it does not gate.
- **Not a personalization engine for marketing.** Projection Composer serves task-relevant utility; it is not an engagement or conversion optimization layer.
- **Not a layout editor.** Users can control which modules appear and in what order; pixel-level layout customization is not in scope.

---

## 4. User Stories

### Context-Driven UI Adaptation

- **As a Heady user switching to my "Client: Acme" work area**, I want the surface to automatically surface my Acme-relevant tools (project notes, relevant connectors, active tasks for that area) without navigating, so that I can start work immediately.
- **As a HeadyBuddy user working on a code review task**, I want GitHub, diff viewer, and code formatting tools to surface contextually, so that the right tools are in front of me without manual navigation.
- **As a Heady user starting a research task**, I want web search, citation manager, and note-taking widgets to appear in my surface automatically, so that my research workspace self-assembles.

### Composition Management

- **As a Heady user**, I want to see what projection the system has composed for my current context and why each module was included, so that the composition is transparent, not magical.
- **As a Heady user**, I want to dismiss a module from the current projection, so that I can clean up my surface without changing the underlying projection rules.
- **As a Heady user**, I want to add a module to my projection for the current context, so that I can customize what is shown beyond the system defaults.
- **As a Heady user**, I want to save a custom projection as my default for a specific work area or task type, so that the same composition appears automatically next time.

### Developer Surface

- **As a developer on HeadyIO**, I want to register a UI module with context signals (surfaces it should appear on, work area types it matches, task types it supports), so that my module appears contextually in the right situations.
- **As a developer**, I want to define the trigger conditions for my module as a declarative JSON schema, so that I do not need to write runtime matching logic.

---

## 5. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| PC-001 | Module context manifest: each UI module declares context signals (surfaces, task_types, work_area_tags, keywords, required_connectors) | Given a module manifest with context signals, When context matches, Then the module is included in the projection |
| PC-002 | Projection Engine: given current context (area, task, active skills, surface), compute ordered list of relevant modules | Given area A is active with task type "research", Then the Projection Engine returns a ranked list of matching modules within 500ms |
| PC-003 | Dynamic UI composition: the Heady surface renders the top-N projected modules in the primary work surface | Given the projection returns 3 modules, Then those 3 modules are rendered in the surface on area switch |
| PC-004 | Projection transparency: users can open "Why this projection?" to see which context signals triggered each module | Given a projection is displayed, When user taps "Why?", Then each module shows its matched context signals |
| PC-005 | Module dismiss: user can dismiss any module from the current projection for this session | Given module M is in projection, When user dismisses it, Then it is removed from the current session projection and preference is recorded |
| PC-006 | Manual add: user can add any installed module to the current projection | Given user opens "Add to surface", Then all installed modules are listed and selection adds it to projection |

### P1 — Should Have

| ID | Requirement |
|---|---|
| PC-007 | Saved projections: user can save the current projection composition as a named preset for a work area or task type |
| PC-008 | Projection preview: before switching areas, user sees a preview of what the projection will look like |
| PC-009 | Context signal weighting: module authors can weight signals (e.g., "strong match on task_type=code; weak match on keyword=debug") |
| PC-010 | Projection history: user can see what projections were displayed in past sessions |
| PC-011 | Developer context signal debugger: tool that shows a developer exactly which signals matched or did not match for their module |

### P2 — Future Consideration

| ID | Requirement |
|---|---|
| PC-012 | Generative projection: LLM generates a custom UI composition from scratch for novel contexts (no pre-built module required) |
| PC-013 | Collaborative projections: teams share a projection preset for a shared work area |
| PC-014 | Projection A/B testing for developers |
| PC-015 | Wearable / ambient surface projection (minimal UI for limited-display devices) |

---

## 6. User Experience

### Projected Surface (Work Area: Client Research)

```
┌─────────────────────────────────────────────────────────┐
│  HEADY  ● Client Research              [⚙ Projection]  │
│─────────────────────────────────────────────────────────│
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │  📋 ACTIVE TASKS    │  │  🔍 DEEP RESEARCH       │  │
│  │  Research: Q1 Report│  │  Skill: Deep Research   │  │
│  │  ● Running (Step 4) │  │  Pack (active)          │  │
│  │  [View in Control]  │  │  [Open new research]    │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │  📂 DRIVE: ACME     │  │  ✉ GMAIL (work@co.com) │  │
│  │  Recent: Q1 Draft   │  │  3 unread from Jamie    │  │
│  │  [Open in Drive]    │  │  [Open in Gmail]        │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                          │
│  Surfaced because: area=Client Research, task=research  │
│  [Why this projection?]  [+ Add module]  [Save preset]  │
│─────────────────────────────────────────────────────────│
│  HeadyBuddy: [ Ask anything about this project...     ] │
└─────────────────────────────────────────────────────────┘
```

### Projection Transparency Panel ("Why?")

```
┌─────────────────────────────────────────────────────────┐
│  WHY THIS PROJECTION?                                    │
│─────────────────────────────────────────────────────────│
│  Active Tasks                                           │
│  ✓ area=Client Research  ✓ task_type=any               │
│  Always shown when tasks are running                    │
│                                                          │
│  Deep Research Pack (Skill)                             │
│  ✓ task_type=research  ✓ area_tag=research              │
│                                                          │
│  Drive: Acme (Connector)                                │
│  ✓ connector in area connector scope                    │
│                                                          │
│  Gmail (work@co.com)                                    │
│  ✓ connector in area connector scope  ✓ unread=true    │
│                                                          │
│  [Customize rules]                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Architecture

### Projection Engine

```
Context Input:
  {
    area_id: "client-research",
    area_tags: ["research", "client"],
    active_task_type: "research",
    surface: "buddy",
    active_skills: ["deep-research-pack"],
    installed_modules: ["active-tasks", "drive-acme", "gmail-work", "github"],
    connector_scope: ["drive-acme", "gmail-work"]
  }

Projection Algorithm:
  For each installed module M:
    score(M) = Σ signal_weight(s) for each context signal s that matches M's manifest
    
  Return modules where score(M) > threshold, ordered by score descending
  Apply max_modules cap (default: 4 visible slots)
```

### Module Context Manifest Schema

```json
{
  "module_id": "deep-research-pack",
  "ui_manifest": {
    "display_name": "Deep Research",
    "icon": "search",
    "surfaces": ["buddy", "web"],
    "context_signals": [
      { "signal": "task_type", "value": "research", "weight": 1.0 },
      { "signal": "task_type", "value": "analysis", "weight": 0.7 },
      { "signal": "area_tag", "value": "research", "weight": 0.8 },
      { "signal": "keyword", "value": "report", "weight": 0.5 }
    ],
    "priority_boost": 0.0,
    "always_show_if": [],
    "never_show_if": []
  }
}
```

### Context Resolution Pipeline

```
Area switch / session start → Context Resolver Worker
→ Read active area config (area_id, area_tags, connector_scope)
→ Read active task state from Mission Control (task_type, step)
→ Read active skills from Liquid Module Registry
→ Read installed modules (all)
→ Pass context to Projection Engine
→ Projection Engine scores all modules → returns ranked list
→ Write projection result to session KV (TTL = session duration)
→ Emit projection event → headyme.com UI updates
```

### Storage

| Entity | Store | Purpose |
|---|---|---|
| Module UI manifests | Cloudflare D1 (part of module manifest) | Context signal declarations |
| Current projection (per session) | Cloudflare KV (TTL = session) | Fast reads for UI rendering |
| User projection preferences (saves, dismisses) | Cloudflare D1 | Personalization input |
| Saved projection presets | Cloudflare D1 | Named user presets per area/task_type |

---

## 8. Security and Privacy

| Concern | Mitigation |
|---|---|
| Projection leaking context from wrong work area | Projection Engine inputs are area-scoped; context resolver enforces area boundary |
| Third-party module context manifest abuse (claiming broad context) | Context signals are declared in manifest; Heady reviews signal claims on module submission |
| Projection data used for cross-user profiling | Projection computations are per-user, ephemeral; no cross-user signal sharing |
| Module rendering security (malicious UI widget) | All UI module widgets are sandboxed in an iframe with strict CSP; no direct DOM access to Heady core |

---

## 9. Dependencies

| Dependency | Owner | Risk |
|---|---|---|
| Liquid Module Registry (HEADY-FEAT-004) for installed modules and manifests | Module Registry team | High — module list and manifests are the input |
| Work-Area Orchestrator (HEADY-FEAT-003) for area context | Work area team | High — area context is a primary signal |
| Mission Control (HEADY-FEAT-005) for active task type | Mission Control team | Medium — task context enriches projection |
| headyme.com dynamic layout engine | HeadyMe | High — requires a slot-based dynamic layout system |
| HeadyIO developer portal (context manifest schema docs) | HeadyIO | Medium |

---

## 10. Phased Rollout

### Phase 1 — Engine and Static Projection (Weeks 1–5)
- Module context manifest schema (extend Module Registry)
- Projection Engine Worker (scoring algorithm)
- Context Resolver Pipeline (area + connector signals only)
- Basic dynamic layout: top-N modules rendered in surface
- Projection transparency ("Why?") panel

### Phase 2 — Personalization (Weeks 6–10)
- Module dismiss (session-level)
- Manual add module to projection
- Saved projection presets
- User preference feedback loop (dismisses inform weights)

### Phase 3 — Richer Context (Weeks 11–15)
- Task type signal from Mission Control
- Active skill signal from Skill Foundry
- Projection preview on area switch
- Developer context signal debugger

### Phase 4 — Generative (Weeks 16+)
- LLM-generated projection for novel contexts (P2)
- Collaborative projection sharing
- Wearable / ambient surface projection

---

## 11. Success Metrics

| Metric | Target (60 days post-launch) |
|---|---|
| Context switch → UI adaptation latency (p95) | < 2 seconds |
| % of projected modules engaged with within session | ≥ 40% |
| Module dismiss rate (auto-projected modules) | < 20% |
| % of users who save ≥ 1 projection preset | ≥ 25% |
| Developer UI modules registered | ≥ 5 within 30 days of developer availability |

---

## 12. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| How many surface slots (module panels) does the default layout support? | UX / Engineering | Yes — determines max_modules cap |
| Should projection adapt in real time as task type changes mid-session or only on area switch? | Product | No — area switch only in v1; real-time in v2 |
| Are UI module widgets isolated in iframes or rendered directly in the Heady DOM? | Engineering / Security | Yes — iframe isolation is preferred; confirm performance impact |
| How should projection handle surface transitions (e.g., Buddy → IDE)? | Product / UX | No — separate projection contexts per surface in v1 |
| Does the Projection Engine run client-side or server-side? | Engineering | No — server-side in v1 for privacy; client-side caching acceptable |
