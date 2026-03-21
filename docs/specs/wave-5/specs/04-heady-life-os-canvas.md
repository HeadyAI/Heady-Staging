# Heady Life OS Canvas — Feature Specification
**Wave:** Five  
**Version:** 1.0.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Systems  
**Primary Surface:** headyme.com (Life OS tab) + headybuddy.org  
**Heady Domain Anchor:** headyme-core, headybuddy-core, headyos-core  

---

## 1. Problem Statement

Knowledge workers, creators, and founders manage their lives across a fragmented set of tools — task managers, note apps, calendars, goal trackers, journaling platforms — none of which maintain a unified picture of the person's intentions, priorities, values, or trajectory. The result is context loss, decision fatigue, and a persistent gap between what someone wants to do with their life and what they actually do with their days. HeadyMe is already positioned as an AI-powered personal command center. The Life OS Canvas turns that positioning into a tangible, persistent, AI-maintained workspace where a user's entire operating context — domains, goals, constraints, relationships, recurring reviews — lives in one place and is actively tended by HeadyBuddy.

**Cost of not solving it:** headyme.com remains a dashboard rather than a life-scale platform; HeadyBuddy conversations are reactive rather than proactively aligned to the user's stated intentions.

---

## 2. Goals

| # | Goal | Measurement | Target |
|---|------|-------------|--------|
| G1 | Create a persistent, user-maintained life operating context | Users with fully configured Canvas | ≥ 40% of MAU within 90 days |
| G2 | Improve HeadyBuddy response relevance via Canvas context injection | User satisfaction with proactive suggestions | ≥ 4.3 / 5 |
| G3 | Drive weekly review engagement | Weekly review completion rate | ≥ 50% of Canvas users |
| G4 | Establish headyme.com as daily-return destination | DAU/MAU ratio for Canvas users | ≥ 0.45 |
| G5 | Seed Life OS data as input for Wellness Mirror and Learning Spiral | Cross-feature data connections enabled | ≥ 30% of Canvas users link ≥ 2 Wave 5 features |

---

## 3. Non-Goals

- **Not a task manager.** Canvas captures context, goals, and domains — not individual to-dos. It does not replace Todoist, Linear, or similar tools, though it can integrate with them.
- **Not a calendar.** Scheduling and time-blocking are not in Canvas; it is a semantic layer, not a scheduling layer.
- **Not a public profile.** Canvas data is private by default; no public profile or social sharing in V1.
- **Not a financial planner.** Financial goals can be listed as a domain but deep financial modeling is out of scope.
- **Not a rigid template system.** Canvas does not force users into a fixed structure; it is a flexible workspace with optional guided frameworks.

---

## 4. User Stories

**Individual user**
- As a user setting up for the first time, I want a guided 15-minute Canvas setup where HeadyBuddy helps me define my life domains, top priorities, and a 90-day intention so that I have a meaningful starting context.
- As a user reviewing my week, I want the Weekly Review flow to pull my Canvas context and prompt reflections that are actually relevant to my stated goals.
- As a user about to make a major decision, I want to open Decision Theater (Wave 5 companion) and have it automatically load my Canvas context as the decision framing.
- As a user whose priorities have shifted, I want to update my Canvas and see HeadyBuddy's suggestions recalibrate accordingly.

**Power user**
- As a power user, I want to write my Canvas in Markdown and sync it bidirectionally with Notion or Obsidian so that I maintain one source of truth.
- As a power user, I want to expose my Canvas via the headyapi.com API so that my own scripts can read and extend it.

---

## 5. Requirements

### P0 — Must Have
- **Canvas data model:** Structured JSON schema with: life domains (array), active goals per domain (array), values/principles (array), current 90-day intention (text), key relationships (array, optional), constraints/non-negotiables (array), review cadence preference.
- **Guided setup flow:** HeadyBuddy-led onboarding conversation that populates the Canvas schema through dialogue. Completable in 15 minutes. Skippable; manual editing always available.
- **Canvas editor UI:** On headyme.com Life OS tab, a structured form + free-text editor that reflects the Canvas schema. Auto-saves.
- **Context injection:** Canvas summary injected into HeadyBuddy system context on each session start. Budget: 500 tokens max for Canvas summary.
- **Weekly Review flow:** Structured prompt sequence triggered by HeadyBuddy on the user's chosen review day. Reviews canvas goals vs. recent activity, surfaces a reflection and next-week intention.
- **MCP tool hook:** `heady_lifeos_get_canvas`, `heady_lifeos_update_domain`, `heady_lifeos_log_review` on headymcp-core.

### P1 — Should Have
- **Cross-feature linking:** Canvas can declare which Wave 5 features are "active" (Wellness Mirror, Learning Spiral, etc.), and those features receive the relevant Canvas domain as context.
- **Notion/Obsidian sync:** Bidirectional sync via headyio.com SDK connector. Markdown export/import. Conflict resolution: last-write-wins with diff preview.
- **Intention timeline:** Visual timeline on headyme.com showing 90-day intention history, with brief note on how each intention evolved.
- **Framework suggestions:** Optional guided frameworks (e.g., "Ikigai", "OKRs", "7 Areas of Life") that map onto the Canvas schema. User can adopt one as a structural overlay.

### P2 — Future
- **Relationship graph** — named key relationships with interaction log, keyed to headybuddy.org conversation history.
- **Life OS public API** for third-party tools to read (with user permission) Canvas domain priorities.
- **Canvas versioning** — full history with diffing and rollback.

---

## 6. User Experience

**Entry point:** headyme.com → Life OS tab → Setup prompt for new users; Canvas view for returning users.

**Setup flow (new user):**
1. HeadyBuddy greets and explains the Canvas concept in 2 sentences.
2. Asks: "What are the 3–7 main areas of your life that matter most right now?" User responds naturally; Buddy extracts and confirms domain labels.
3. Per domain: "What's your top goal in [domain] for the next 90 days?"
4. Values prompt: "What are 2–3 principles you want to guide your decisions?"
5. Setup complete: Canvas displayed as visual card grid on headyme.com.

**Weekly Review:**
1. HeadyBuddy sends a nudge on the user's chosen day.
2. Review conversation: "Last week you intended to [X]. How did that go?" → free-text → reflection → "What's your top intention for this coming week in [domain]?"
3. Review summary written to Canvas log.

---

## 7. Architecture

```
headyme.com Life OS tab + headybuddy.org
    │
    ▼
Life OS Canvas Service (new microservice, Cloud Run)
    ├─ Canvas Schema Store (pgvector canvas table, JSONB)
    ├─ Guided Setup Orchestrator (HeadyBuddy intent: "canvas-setup")
    ├─ Canvas Editor API (CRUD endpoints)
    ├─ Context Packer (compresses canvas to ≤500 token summary)
    ├─ Weekly Review Orchestrator (scheduled trigger + HeadyBuddy intent)
    ├─ Cross-Feature Context Dispatcher (pushes relevant domain to Wellness Mirror, Learning Spiral)
    ├─ Notion/Obsidian Sync Adapter (bidirectional, via headyio-core)
    └─ MCP Tool Adapter (3 tools on headymcp-core)
```

**headyos-core linkage:** Life OS Canvas is the primary user-facing expression of headyos-core's "continuous AI reasoning" mission — it provides the semantic substrate for all proactive HeadyBuddy behaviors.

---

## 8. Data Flows

```
Canvas setup
    → HeadyBuddy dialogue → structured extraction (heady-ai.com LLM)
    → Canvas schema JSON → written to pgvector canvas table
    → Context Packer generates 500-token summary
    → Summary injected into HeadyBuddy session context on next start

Weekly Review (scheduled trigger)
    → HeadyBuddy nudge sent
    → User response → Review Orchestrator
    → LLM reflection generation (heady-ai.com)
    → Review summary appended to canvas log
    → Optional: Canvas goal update if user revises intention

Cross-feature context dispatch
    → Life OS Canvas Service reads active domain links
    → Pushes domain context to Wellness Mirror / Learning Spiral services
    → Those services use domain as framing for suggestions and sessions

Notion/Obsidian sync
    → headyio-core connector polls for changes (5-min interval)
    → Diff detected → conflict resolution → Canvas table updated or Notion updated
```

---

## 9. Security and Privacy

| Concern | Mitigation |
|---------|------------|
| Canvas data sensitivity | Canvas stored in encrypted user namespace; never surfaced in shared or training datasets |
| Context injection scope | Only Canvas summary (not raw values/goals) injected into model context; full Canvas never sent to external APIs |
| Third-party sync | Notion/Obsidian OAuth scoped to single workspace; tokens in secrets manager; user can revoke at any time |
| Data portability | Full Canvas export (JSON + Markdown) available on demand |
| Retention | User can reset or delete Canvas at any time; deletion cascades to cross-feature links |

---

## 10. Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| headybuddy-core intent classification ("canvas-setup", "weekly-review") | HeadyBuddy team | Yes — P0 |
| pgvector canvas table schema | HeadyMe engineering | Yes — P0 |
| heady-ai.com LLM (extraction + reflection) | HeadyAI | Yes — P0 |
| Context injection hook in HeadyBuddy session init | HeadyBuddy team | Yes — P0 |
| headymcp-core tool registration | HeadyMCP team | Yes (MCP tools) |
| headyio-core Notion connector | HeadyIO team | No — P1 |
| Wellness Mirror cross-feature API | Wellness Mirror team (Wave 5) | No — P1 |
| Learning Spiral cross-feature API | Learning Spiral team (Wave 5) | No — P1 |

---

## 11. Phased Rollout

**Phase 1 — Alpha (Weeks 1–4)**
- Canvas data model + editor UI + guided HeadyBuddy setup.
- Context injection into HeadyBuddy.
- Weekly Review flow (manual trigger only).
- Internal HeadySystems dogfood.

**Phase 2 — Beta (Weeks 5–8)**
- Scheduled Weekly Review nudges.
- MCP tools live.
- Cross-feature links to Wellness Mirror and Learning Spiral.
- Invite-only beta via headyconnection.org community.

**Phase 3 — Public (Weeks 9–12)**
- Notion/Obsidian sync.
- Framework suggestions overlay.
- Intention timeline.
- Full public launch with onboarding sequence.

---

## 12. Success Metrics

| Metric | Tool | Window | Success | Stretch |
|--------|------|--------|---------|---------|
| Canvas configuration rate | HeadyMetrics | 90 days | 40% of MAU | 60% |
| Suggestion satisfaction | In-app rating | 60 days | 4.3 / 5 | 4.7 / 5 |
| Weekly review completion | HeadyMetrics | 60 days | 50% of Canvas users | 65% |
| DAU/MAU (Canvas users) | HeadyMetrics | 90 days | 0.45 | 0.60 |
| Cross-feature links | HeadyMetrics | 90 days | 30% of Canvas users link ≥2 features | 50% |

---

## 13. Open Questions

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ1 | Should Canvas be shareable with a trusted partner (e.g., coach, spouse) with explicit consent? | Product | No |
| OQ2 | What is the right Canvas summary compression strategy to stay within 500 tokens while preserving the most useful context? | Engineering | No |
| OQ3 | Should HeadyBuddy proactively suggest Canvas updates when it detects a shift in the user's expressed priorities? | Product | No |
| OQ4 | Do we support team/org Life OS Canvases for small teams, or stay individual-only in V1? | Product | No |
