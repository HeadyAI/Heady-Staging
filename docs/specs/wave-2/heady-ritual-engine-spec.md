# Feature Specification: Heady Ritual Engine

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / headybuddy.org / headybot.com  
**Status:** Draft

---

## 1. Purpose

Heady Ritual Engine is a scheduled, habit-forming intelligence layer that lets users define recurring AI-powered "rituals" — structured routines that run automatically at set times or triggers and deliver personalized, context-aware outputs directly to the user. A ritual might be a daily morning briefing, a weekly project review, a nightly reflection prompt, a Monday goal-setting session, or a trigger-based check-in when a genome run completes. The Ritual Engine turns Heady from a reactive query-response tool into a proactive ambient intelligence companion.

### Problem Statement
Heady is currently entirely reactive — it only works when a user initiates it. High-value intelligence routines (daily briefings, weekly reviews, progress check-ins) require the user to remember to initiate them and to re-explain the format and context each time. Without proactive, scheduled intelligence, the ecosystem misses the highest-value engagement pattern: the daily habit loop that makes an AI tool indispensable.

### Goals
1. Enable a user to define and activate a new ritual in < 5 minutes.
2. Deliver ritual outputs reliably on schedule with < 2-minute delivery variance from the scheduled time.
3. Support ≥8 ritual output channels at launch (dashboard, email, push notification, in-session prompt).
4. Provide a library of 20+ ritual templates at launch to reduce creation friction.
5. Measurably increase daily active engagement by ≥25% among ritual users vs. non-ritual users.

### Non-Goals
- Real-time streaming rituals (e.g., live stock ticker commentary) — rituals are scheduled, not streaming.
- Ritual sharing or marketplace in v1 (rituals are private; Bazaar listing deferred to v2).
- Voice-delivered rituals (v2 with voice/audio modality track).
- Integration with external calendar systems (Google Calendar, Outlook) in v1 — time-based triggers use internal schedule only.

---

## 2. User Experience

### User Personas
- **The Structured Professional** — wants a daily briefing and weekly review without having to ask for them.
- **The Habit Builder** — using Heady to build better thinking routines (nightly reflection, morning goals).
- **The Ops-Minded Builder** — wants rituals to fire automatically when pipeline events occur (genome completion, threshold crossed).

### Core UX Flows

**Ritual Creation Flow**
1. User navigates to headyme.com → Ritual Engine → "New Ritual".
2. Creation wizard — four steps:
   - **Name & Description** — "Morning Briefing", "Weekly Project Review", etc.
   - **Trigger** — Schedule (daily/weekly/monthly with time picker), or Event (genome run complete, memory count reaches threshold, file written to SWC).
   - **Content** — What should the ritual produce? Options:
     - Select a template (Morning Briefing, Weekly Review, Nightly Reflection, Goal Check-in, Research Pulse, etc.)
     - Customize the template prompt with persona-aware text
     - Set context sources: which SWC folders, which memory categories, which genome results to include
   - **Delivery** — Dashboard card, email digest, push notification (if mobile app), or in-session prompt on next login.
3. Preview: "Here is a sample output based on your current context."
4. Activate → ritual enters the schedule.

**Ritual Execution (Automated)**
1. Ritual Engine scheduler fires at trigger time.
2. Ritual Runner fetches the ritual definition.
3. Context assembler pulls configured sources: Memory Sanctum (filtered by category), SWC files (filtered by folder/tag), Genome results (latest run of specified genome), Insight Graph summaries (if permitted).
4. LLM call: system prompt (persona config if set) + assembled context + ritual template prompt → structured output.
5. Output formatted per delivery channel (Markdown for dashboard/email, plain text for push notification).
6. Output delivered to configured channel(s).
7. Ritual run logged: trigger time, actual execution time, output token count, delivery status.

**Ritual Dashboard (headyme.com/rituals)**
- Ritual list: name, trigger schedule, last run time, last run status, delivery channel badges.
- Click → Ritual Detail: full output history (last 30 runs), run log, edit controls, pause/resume, delete.
- "Run now" button: manually triggers an immediate ritual run (useful for testing or catch-up).
- Status indicators: Active (green), Paused (yellow), Error (red — click for error detail).
- Ritual metrics card: streak counter (consecutive successful runs), engagement rate (% of outputs the user opened/read).

**Template Library**
- 20+ pre-built ritual templates organized by category:
  - **Daily:** Morning Briefing, End-of-Day Wrap-Up, Nightly Reflection, Focus Block Primer
  - **Weekly:** Project Status Review, Research Pulse, Goal Check-In, Skill Development Summary
  - **Event-Triggered:** Genome Run Summary, New Files Added Digest, Memory Milestone Insight
  - **Custom Blank:** Start from scratch with a prompt editor

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Ritual Definition Store | CRUD store for ritual configs (schedule, trigger, template, delivery, context sources) | headysystems.com |
| Ritual Scheduler | Cron-based scheduler that fires ritual triggers on time | headybot.com |
| Event Trigger Listener | Listens for system events (genome complete, file write, memory threshold) and fires event-triggered rituals | headybot.com |
| Ritual Runner | Executes a ritual: assembles context, calls LLM, formats output | heady-ai.com |
| Context Assembler | Fetches and combines context from Memory Sanctum, SWC, Genome results, Insight Graph | headysystems.com |
| Delivery Service | Routes ritual output to configured channels (dashboard, email, push) | headysystems.com |
| Run Log Store | Immutable log of all ritual runs with status and output metadata | headysystems.com |
| Ritual UI | headyme.com/rituals frontend (list, detail, creation wizard) | headyme.com |
| Template Registry | Stores and serves pre-built ritual templates | headysystems.com |

### Ritual Definition Schema
```json
{
  "ritual_id": "uuid",
  "owner_user_id": "uuid",
  "name": "string",
  "description": "string",
  "status": "active|paused|error",
  "trigger": {
    "type": "schedule|event",
    "schedule": {"frequency": "daily|weekly|monthly", "time": "HH:MM", "timezone": "America/Denver", "day_of_week": 1},
    "event": {"event_type": "genome_complete|file_written|memory_threshold", "params": {}}
  },
  "template_id": "uuid|null",
  "custom_prompt": "string|null",
  "context_sources": {
    "memory_categories": ["Project", "Preference"],
    "swc_folders": ["/Projects/MCP"],
    "genome_ids": ["uuid"],
    "insight_graph": false
  },
  "persona_id": "uuid|null",
  "delivery": ["dashboard", "email"],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 4. Data Flows

### Scheduled Trigger Flow
```
1. Ritual Scheduler: every minute, check for rituals with trigger.time == current_time (within 1-min window)
2. For each matching ritual: POST /ritual/run {ritual_id}
3. Ritual Runner fetches ritual definition from Ritual Definition Store
4. Context Assembler: parallel fetch from configured context_sources
   a. Memory Sanctum: GET /memory/retrieve filtered by categories
   b. SWC: GET /swc/search filtered by folders
   c. Genome results: GET /genome/{id}/last_run
5. Assembled context + template/custom prompt → LLM call (with persona system prompt if set)
6. LLM output → Delivery Service
7. Delivery Service routes to configured channels:
   - dashboard: write to Dashboard Card Store
   - email: queue to email service
   - push: queue to push notification service
8. Run log entry created: {ritual_id, triggered_at, executed_at, status, output_token_count, delivery_status}
```

### Event Trigger Flow
```
1. System event fires (e.g., genome run completes: POST /event {type: "genome_complete", genome_id, user_id})
2. Event Trigger Listener checks: does user_id have a ritual with event_type matching this event?
3. If match found: trigger Ritual Runner as above (steps 3–8)
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| User-scoped ritual execution | Rituals run with the same permissions as the user; cannot access data beyond the user's scope |
| Context source authorization | Context Assembler only fetches from sources the user has explicitly configured and is authorized to read |
| Delivery channel authentication | Email delivery uses verified user email; push requires user device token registration |
| Output retention | Ritual output history retained for 90 days; older runs auto-purged |
| No training use | Ritual outputs and context are not used for model training |
| Rate limiting | Maximum 10 rituals per user in v1; maximum 1 execution per ritual per 1-hour window (prevents accidental infinite loops) |
| Error isolation | A ritual execution error is logged and user notified; does not affect other rituals or system components |
| Audit trail | Every ritual run (success or failure) is logged with trigger time, execution time, and delivery status |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| headybot.com scheduler/executor runtime | headybot.com | Required |
| heady-ai.com LLM routing (for ritual LLM call) | heady-ai.com | Required |
| Heady Memory Sanctum (context source) | Second-wave | Complementary |
| Heady Sovereign Workspace Cloud (context source) | Second-wave | Complementary |
| Heady Task Genome (event trigger + context source) | Second-wave | Complementary |
| Heady Persona Studio (persona_id for ritual tone) | Second-wave | Complementary |
| Heady Insight Graph (optional context source) | Second-wave | Complementary |
| Email delivery service (SendGrid or equivalent) | Infrastructure | Required |
| headyme.com dashboard | headyme.com | Required |

---

## 7. Phased Rollout

### Phase 1 — Scheduler + Core Ritual Execution (Weeks 1–4)
- Ritual Definition Store, Scheduler, Ritual Runner
- Schedule triggers only (daily/weekly)
- Delivery: dashboard card only
- Context sources: Memory Sanctum only
- 5 starter templates (Morning Briefing, End-of-Day Wrap-Up, Weekly Review, Goal Check-In, Nightly Reflection)
- Internal alpha: Heady team runs personal rituals
- Success gate: Scheduled rituals fire within 2-minute window; dashboard delivery works end-to-end

### Phase 2 — Email Delivery + More Templates (Weeks 5–8)
- Email delivery channel
- SWC as context source
- Expand to 15 templates
- Ritual Dashboard UI (list + detail)
- Closed beta: 100 users
- Success gate: ≥50% of beta users activate at least one ritual; email delivery rate ≥98%

### Phase 3 — Event Triggers + Full Template Library (Weeks 9–12)
- Event Trigger Listener (genome_complete, file_written)
- Task Genome results as context source
- 20+ templates in Template Library
- Persona-aware ritual tone (if Persona Studio available)
- Open launch
- Success gate: ≥25% increase in daily active engagement among ritual users vs. non-ritual users

### Phase 4 — Insight Graph Integration + Advanced Rituals (Weeks 13–16)
- Insight Graph as optional context source
- Streak counter and engagement analytics in dashboard
- Push notification delivery (if mobile web or app available)
- Custom blank template with prompt editor
- Success gate: ≥30% of active ritual users have a ritual streak ≥7 days

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Should ritual execution be synchronous (user waits) or fully async (delivered when ready)? | Product | Yes — before Phase 1 (async is strongly recommended) |
| How are timezone changes handled for scheduled rituals? | Engineering | No — DST-aware scheduling needed |
| Should ritual output history be searchable? | Product | No — full-text search on ritual history deferred to v2 |
| What is the notification strategy if delivery fails (email bounce, push not registered)? | Engineering | No — fallback to dashboard delivery |
| Should rituals be pauseable by the system (e.g., if user is on vacation / no sessions for 7 days)? | Product | No — user-controlled pause is sufficient for v1 |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Ritual activation rate | ≥40% of active users activate ≥1 ritual | 30 days post Phase 3 |
| Delivery on-time rate | ≥98% of rituals fire within 2-minute window | Ongoing |
| Email delivery success rate | ≥98% | Ongoing |
| Daily active engagement lift | ≥25% higher DAU among ritual users vs. non-ritual users | 60 days post Phase 3 |
| 7-day ritual streak rate | ≥30% of ritual users maintain ≥7-day streak | 60 days post Phase 3 |
| Ritual template usage | ≥80% of new rituals start from a template (validates template value) | 30 days post Phase 3 |
