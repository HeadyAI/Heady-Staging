# Feature Spec: Heady Arena — Multi-Model Comparison and Route Selection

**Feature ID:** HEADY-FEAT-009  
**Domain:** heady-ai.com / headyme.com  
**Status:** Draft  
**Author:** Eric Haywood  
**Date:** 2026-03-17  
**Version:** 1.0

---

## 1. Problem Statement

The AI model landscape has become a market of meaningfully differentiated offerings. GPT-4o, Claude 3.5, Gemini 1.5 Pro, Mistral Large, and emerging open-weight models each have distinct capability profiles, latency characteristics, cost curves, and behavioral styles. Heady users — especially researchers, developers, and knowledge workers — often want to know which model performs best for a specific task type, but have no way to compare them directly within a unified surface.

Current routing in the Heady ecosystem is either fixed (one model per surface) or opaque (auto-routing with no user visibility). Users cannot learn from model differences, cannot validate routing decisions, and cannot build institutional knowledge about which models serve their use cases best. For an ecosystem positioning itself as an intelligence routing hub, the absence of comparative evaluation is a capability gap and a missed positioning opportunity.

**Who experiences this:** Power users who care about AI quality for specific task types; developers evaluating which model to pin for a given workflow; researchers who need to understand model behavioral differences; any user making high-stakes decisions with AI assistance.

**Cost of not solving it:** Missed differentiation vs. single-model products; user frustration with opaque routing; inability to build empirical model knowledge; lost opportunity to serve enterprise customers who need model governance and audit.

---

## 2. Goals

| Goal | Measurement | Target |
|---|---|---|
| Users can run the same prompt against ≥ 2 models in one interaction | Arena session completion rate | ≥ 85% |
| Users can compare outputs side-by-side and rate preferences | % of Arena sessions with at least one user preference vote | ≥ 60% |
| Heady can recommend optimal route based on accumulated preference data | Route recommendation accuracy vs. user explicit choice | ≥ 80% match |
| Arena sessions inform permanent route selection for a skill or work area | % of Arena sessions followed by explicit route save | ≥ 20% |
| Arena is accessible in ≤ 2 interactions from any active session | Entry friction measurement | ≤ 2 taps/clicks from Buddy or Web |

---

## 3. Non-Goals

- **Not a public model leaderboard.** Arena generates personal preference data, not a public ranking; aggregated data may inform Heady recommendations but no public benchmark is published.
- **Not a model training interface.** User preferences are used for routing intelligence, not for fine-tuning any model.
- **Not unlimited model access.** Model availability is limited to Heady's integrated routing pool; Arena cannot add arbitrary new models without integration work.
- **Not a real-time model benchmark for enterprise procurement.** This is a user-facing productivity tool; formal enterprise benchmarking is a separate track.
- **Not a chat product.** Arena is an evaluation surface; ongoing conversation happens in Buddy or Web, not Arena.

---

## 4. User Stories

### Comparison Sessions

- **As a Heady user**, I want to enter a prompt once and see it answered by 2–4 different models side-by-side, so that I can directly compare outputs without copy-pasting between products.
- **As a Heady user**, I want to see which model produced each output, or optionally blind-test (model names hidden until after I rate), so that I can test my own assumptions about model quality.
- **As a HeadyBuddy user**, I want to run my current conversation prompt through Arena mid-session, so that I can quickly validate whether a different model would respond better before committing.

### Rating and Preference Capture

- **As a Heady user**, I want to vote for the best response in an Arena session, so that my preference is recorded and used to improve future routing for my use cases.
- **As a Heady user**, I want to add a note to my preference vote ("This model was clearer but the other was more thorough"), so that I can record qualitative reasoning alongside the binary preference.
- **As a Heady user**, I want to see my past Arena sessions and how my preferences have trended over time, so that I can build a personal model for which AI I trust for which task type.

### Route Selection

- **As a Heady user**, I want to select one model's output as "use this as the answer" and have the Arena result applied to my current session, so that Arena evaluation flows back into active work.
- **As a Heady user**, I want to save my model preference for a specific task type ("for code review, always use Claude") so that future tasks of that type are automatically routed there.
- **As a Heady AI routing system**, I want to use accumulated user preference data to recommend optimal model routing for new tasks, so that the right model is used by default without requiring Arena every time.

---

## 5. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| HA-001 | Arena session: user inputs a prompt; system sends it to 2–4 configured models in parallel; responses displayed side-by-side | Given user submits an Arena prompt, Then responses from all selected models appear within max_model_latency + 2s |
| HA-002 | Model selector: user can choose which models to include in the comparison (from available pool) | Given the model pool has 5 models, When user opens Arena, Then they can select 2–4 for comparison |
| HA-003 | Side-by-side layout: responses displayed in equal-width panels with model label (or blind label if blind mode enabled) | Given 2 models are selected, Then responses appear in two equal panels |
| HA-004 | Preference vote: user can select a winner for the session; vote is recorded with session metadata | Given an Arena session completes, When user votes for Model A, Then the vote is persisted with prompt, task_type, and model_ids |
| HA-005 | Apply selection: user can select one response and apply it to their active session or clipboard | Given user selects "Use this response", Then the chosen output is applied to the current context |
| HA-006 | Blind mode: model names are hidden until after the user votes | Given blind mode is enabled, When session completes, Then labels show "Model A / Model B" until user votes; names revealed after vote |

### P1 — Should Have

| ID | Requirement |
|---|---|
| HA-007 | Preference history: a personal log of all Arena sessions with prompts, selected winner, and model names |
| HA-008 | Route save: user can save a preference as a routing rule for a specific task type or skill |
| HA-009 | AI route recommendation: based on accumulated preferences, Heady suggests optimal model for new tasks in routing dialog |
| HA-010 | Task type tagging: Arena sessions can be tagged by task type (research, code, creative, analysis) to enable per-type routing rules |
| HA-011 | Speed / cost indicators: alongside each model response, show latency and estimated token cost |
| HA-012 | Note on vote: free-text field alongside preference vote for qualitative reasoning |

### P2 — Future Consideration

| ID | Requirement |
|---|---|
| HA-013 | Multi-turn Arena: run a full conversation with 2+ models in parallel (each model sees the same history) |
| HA-014 | Shared Arena sessions: share an Arena result URL with a collaborator |
| HA-015 | Aggregated preference analytics: show community trends (anonymized) for which models excel at which task types |
| HA-016 | Enterprise model governance: admins set allowed model pool for their organization |

---

## 6. User Experience

### Arena Entry Points

1. From Buddy: "Compare in Arena" button on any AI response
2. From HeadyWeb: "Open Arena" button in toolbar
3. Direct: heady-ai.com/arena

### Arena Main View

```
┌─────────────────────────────────────────────────────────────┐
│  HEADY ARENA                    [Blind Mode: ON]  [Settings]│
│─────────────────────────────────────────────────────────────│
│  Models: [● GPT-4o] [● Claude 3.5] [○ Gemini 1.5] [+ Add] │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Your prompt:                                         │   │
│  │ [Compare these two approaches to database sharding  ]│   │
│  │ [and recommend one for a high-read, low-write       ]│   │
│  │ [SaaS application.                                  ]│   │
│  └─────────────────────────────────────────────────────┘   │
│  [▶ Run Comparison]                                         │
│─────────────────────────────────────────────────────────────│
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │  MODEL A           │  │  MODEL B           │           │
│  │  (blind)           │  │  (blind)           │           │
│  │  ──────────────    │  │  ──────────────    │           │
│  │  For high-read     │  │  The key tradeoff  │           │
│  │  SaaS, horizontal  │  │  in your scenario  │           │
│  │  sharding with     │  │  comes down to     │           │
│  │  consistent hashing│  │  read replica vs.  │           │
│  │  is the standard   │  │  hash-based        │           │
│  │  approach...       │  │  sharding...       │           │
│  │                    │  │                    │           │
│  │  ⏱ 1.2s  ~$0.004  │  │  ⏱ 0.9s  ~$0.003  │           │
│  │  [✓ Prefer This]   │  │  [✓ Prefer This]   │           │
│  │  [Apply to Session]│  │  [Apply to Session]│           │
│  └────────────────────┘  └────────────────────┘           │
│                                                             │
│  [Skip rating]          [Save preference as routing rule]  │
└─────────────────────────────────────────────────────────────┘
```

### Post-Vote Reveal (Blind Mode)

```
  ✓ You preferred:  MODEL A = GPT-4o    MODEL B = Claude 3.5 Sonnet

  Your vote: GPT-4o  [Note: "More structured, better for technical docs"]
  [Save routing rule: Use GPT-4o for code/architecture tasks]  [Dismiss]
```

### Personal Preference Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  MY ARENA HISTORY                            [Export]   │
│─────────────────────────────────────────────────────────│
│  ROUTING RULES                                          │
│  • Code / Architecture → GPT-4o (saved 2026-03-17)     │
│  • Research / Synthesis → Claude 3.5 (saved 2026-03-10)│
│                                                          │
│  RECENT SESSIONS (24)                                   │
│  Mar 17  Code task   GPT-4o ✓ vs Claude  GPT-4o won   │
│  Mar 15  Research    Claude ✓ vs GPT-4o  Claude won    │
│  Mar 12  Creative    Gemini ✓ vs GPT-4o  Gemini won    │
│                                                          │
│  MODEL PREFERENCE SUMMARY                               │
│  GPT-4o: 12 wins (50%)  Claude: 8 wins (33%)  Gemini: 4 │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Architecture

### Core Components

```
┌──────────────────────────────────────────────────────────┐
│                      Heady Arena                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Arena Orchestrator (Cloudflare Worker)            │  │
│  │  Receives prompt → fan-out to N model endpoints   │  │
│  │  in parallel → collects responses → returns array  │  │
│  └────────────────────────────────────────────────────┘  │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Model Router (heady-ai.com)                      │    │
│  │  Routes each fan-out request to correct provider │    │
│  │  (OpenAI, Anthropic, Google, Mistral, etc.)      │    │
│  └──────────────────────────────────────────────────┘    │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Preference Store (D1)                           │    │
│  │  arena_sessions, votes, routing_rules             │    │
│  └──────────────────────────────────────────────────┘    │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Route Recommendation Engine                     │    │
│  │  Queries preference store to suggest model for   │    │
│  │  incoming task type                              │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Arena Session Data Model

```json
{
  "session_id": "uuid",
  "user_id": "string",
  "created_at": "ISO8601",
  "prompt": "string",
  "task_type": "code | research | creative | analysis | other | null",
  "blind_mode": true,
  "models_compared": ["gpt-4o", "claude-3-5-sonnet"],
  "responses": [
    { "model_id": "gpt-4o", "response_text": "string", "latency_ms": 1200, "tokens_used": 450, "estimated_cost_usd": 0.004 },
    { "model_id": "claude-3-5-sonnet", "response_text": "string", "latency_ms": 900, "tokens_used": 380, "estimated_cost_usd": 0.003 }
  ],
  "preferred_model": "gpt-4o | null",
  "preference_note": "string | null",
  "preference_recorded_at": "ISO8601 | null",
  "area_id": "string | null"
}
```

### Route Recommendation Algorithm (v1)

For each task type, compute preference score per model:

```
preference_score(model, task_type) = 
  wins(model, task_type) / total_sessions(task_type) 
  weighted by recency (sessions in last 30 days ×1.5, older ×1.0)

recommend = argmax(preference_score)
confidence = wins / total; if confidence < 0.6 and total < 5: show "not enough data"
```

---

## 8. Security and Privacy

| Concern | Mitigation |
|---|---|
| Prompt data sent to multiple model providers | Users are informed that Arena sends their prompt to selected providers; consent is part of Arena onboarding |
| Model provider data retention of Arena prompts | Each provider's data retention policy is disclosed; users can use providers with no-retention agreements (e.g., OpenAI Zero Data Retention for eligible tiers) |
| Preference data used to identify user behavior | Preference data is user-scoped; no cross-user analysis without explicit aggregation opt-in |
| Sensitive prompts in Arena history | Arena history is user-owned and private; users can delete individual sessions or full history |
| Arena cost running up unexpectedly | Arena sessions have a configurable token budget cap; cost estimate shown before each run |

---

## 9. Dependencies

| Dependency | Owner | Risk |
|---|---|---|
| heady-ai.com Model Router (multi-provider routing) | HeadyAI | High — must support fan-out pattern |
| OpenAI, Anthropic, Google, Mistral API keys in Cloudflare Secrets | Infrastructure | Medium — key management and cost controls |
| headyme.com Arena UI route | HeadyMe | Medium |
| Liquid Module Registry (for future Arena-as-skill) | Module Registry team | Low |
| Memory Ledger (for storing task_type tags, HEADY-FEAT-002) | Memory team | Low |

---

## 10. Phased Rollout

### Phase 1 — Core Arena (Weeks 1–5)
- Arena Orchestrator Worker (fan-out to 2 models)
- Model selector (2 models minimum)
- Side-by-side response display
- Blind mode
- Preference vote and storage
- Apply response to session

### Phase 2 — Personalization (Weeks 6–10)
- Preference history dashboard
- Route save as routing rule
- Task type tagging
- Speed / cost indicators
- Note on vote

### Phase 3 — Routing Intelligence (Weeks 11–16)
- Route Recommendation Engine
- Routing rule surfaced in Buddy / Web model selector
- AI recommendation confidence display
- Arena entry from mid-Buddy session

### Phase 4 — Scale (Weeks 17+)
- Multi-turn Arena
- Up to 4 models simultaneously
- Aggregated community preference analytics (opt-in)
- Enterprise model governance

---

## 11. Success Metrics

| Metric | Target (60 days post-launch) |
|---|---|
| % of power users who complete ≥ 1 Arena session per week | ≥ 30% of users with ≥ 5 active sessions/week |
| Arena session preference vote rate | ≥ 60% of sessions with a vote |
| Route save rate (Arena → routing rule) | ≥ 20% of sessions |
| Route recommendation accuracy vs. user explicit choice | ≥ 80% match (after ≥ 5 sessions per task type) |
| User-reported AI quality improvement using saved routing rules | ≥ 25% vs. default routing |

---

## 12. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Which models are in the initial Arena pool? | Product / heady-ai.com | Yes — must finalize before Phase 1 |
| What is the token budget cap per Arena session (affects cost)? | Product / Engineering | Yes — must set before launch to control costs |
| Should Arena cost be included in user's Heady subscription or billed separately? | Product / Finance | Yes — pricing model decision |
| How should Arena handle model rate limits or API errors mid-session? | Engineering | No — degrade gracefully; show available responses; log error |
| Is task_type tagging manual or AI-inferred? | Product / AI | No — AI-inferred in v1; user can override |
