# Feature Spec: Mission Control Manager Surface

**Feature ID:** HEADY-FEAT-005  
**Domain:** headyme.com / heady-ai.com  
**Status:** Draft  
**Author:** Eric Haywood  
**Date:** 2026-03-17  
**Version:** 1.0

---

## 1. Problem Statement

As Heady users run more agents, automations, connectors, and multi-step workflows, they have no unified surface to monitor, manage, and intervene in what is happening across the ecosystem in real time. Activity is fragmented: Buddy conversations are in one place, IDE tasks in another, automations fire silently, and there is no aggregate view of in-flight work, pending approvals, failures, or system health.

This creates a dangerous "dark execution" problem — users authorize agents but cannot observe what they are doing. They discover failures after the fact, cannot redirect in-flight work, and have no way to prioritize or triage competing agent requests. Power users managing complex workflows need a command-and-control surface analogous to a flight operations center.

**Who experiences this:** Power users, professionals managing client work, developers running multi-step automations, and anyone using Heady in agentic mode with more than two concurrent tasks.

**Cost of not solving it:** Erodes trust in agentic AI; increases anxiety about what agents are doing; prevents adoption of autonomous workflows; no competitive parity with enterprise workflow tools that offer run-level visibility.

---

## 2. Goals

| Goal | Measurement | Target |
|---|---|---|
| Users can see all in-flight tasks and agent activity in one view | % of agentic users who check Mission Control ≥ once per active session | ≥ 60% |
| Users can pause, redirect, or cancel any task in ≤ 2 interactions | Task intervention completion rate | ≥ 95% |
| Pending approvals surface and are acted on within session | Approval response rate within 10 minutes of surfacing | ≥ 80% |
| System health issues are surfaced proactively | Time from connector failure to Mission Control alert | < 60 seconds |
| Users do not miss critical failures | % of task failures acknowledged within 30 minutes | ≥ 90% |

---

## 3. Non-Goals

- **Not a real-time data analytics dashboard.** Mission Control is operational, not analytical; historical reporting is a separate surface.
- **Not a debugging tool for developers.** Developer-level logs and traces live in HeadyIO; Mission Control surfaces user-relevant operational status.
- **Not a notification center replacement.** It surfaces in-context operational state; push notifications for out-of-app alerts are handled separately.
- **Not a full automation builder.** Users can redirect and modify running tasks, but designing new automations happens in other surfaces.

---

## 4. User Stories

### Real-Time Visibility

- **As a Heady power user**, I want to see all active agent tasks across all work areas in a single view, so that I know what my AI is currently doing.
- **As a Heady user**, I want to see the current step and progress of any running multi-step task, so that I can assess whether it is working correctly.
- **As a Heady user**, I want to see which connectors and resources each task is using, so that I understand the blast radius of any agent action.
- **As a Heady user**, I want to see all pending approval requests queued for my action, so that I can unblock waiting agents quickly.

### Intervention

- **As a Heady user**, I want to pause a running task and resume it later, so that I can interrupt agent work when I need to take manual control.
- **As a Heady user**, I want to cancel a task entirely, so that I can stop an agent that is going in the wrong direction.
- **As a Heady user**, I want to redirect a running task with a new instruction, so that I can correct course without starting over.
- **As a Heady user**, I want to approve or deny a pending permission escalation from Mission Control, so that I can unblock agents from a central location.

### Health and Alerting

- **As a Heady user**, I want to see the health status of all active connectors, so that I know if an integration has failed before it affects my work.
- **As a Heady user**, I want to be alerted when a task fails or stalls, so that I can take action quickly.

---

## 5. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| MC-001 | Active task list: shows all in-flight tasks with task name, initiating surface, current step, status (running/paused/pending/failed), and work area | Given tasks are running, When user opens Mission Control, Then all active tasks are listed with status within 2 seconds |
| MC-002 | Task detail panel: selecting a task shows full step history, current step, resources in use, and permission grants active | Given a task is selected, Then step-by-step execution log is visible with timestamps |
| MC-003 | Task cancellation: user can cancel any running task; agent receives cancellation signal and stops gracefully | Given user selects "Cancel" on task T, Then T transitions to "Cancelled" within 3 seconds and agent halts |
| MC-004 | Task pause / resume: user can pause a running task and resume it | Given user pauses task T, Then T is suspended; When user resumes, Then T continues from last checkpoint |
| MC-005 | Pending approvals queue: all permission escalation requests displayed with context and one-click approve/deny | Given agent P emits an escalation request, Then it appears in Mission Control approvals queue within 5 seconds |
| MC-006 | Connector health panel: shows status of all configured connectors (healthy/degraded/failed) with last-checked timestamp | Given a connector call fails, Then connector status updates to "degraded" within 60 seconds |
| MC-007 | Failure alerts: failed tasks are surfaced with a visual indicator and can be expanded to see error detail | Given task T fails, Then Mission Control shows a failure badge and the error message is accessible in the detail panel |

### P1 — Should Have

| ID | Requirement |
|---|---|
| MC-008 | Task redirection: user can inject a new instruction into a running task ("pivot to X instead") |
| MC-009 | Cross-area view: Mission Control can show tasks from all work areas or filter to active area |
| MC-010 | Task priority reordering: user can reprioritize queued tasks |
| MC-011 | System health summary at top of Mission Control: total active tasks, pending approvals count, failed tasks count, connector health count |
| MC-012 | Historical task log: completed and cancelled tasks visible for past 24 hours |
| MC-013 | Task notifications: in-app banner when task completes, fails, or requires approval |

### P2 — Future Consideration

| ID | Requirement |
|---|---|
| MC-014 | Mobile Mission Control (Android widget showing task count and pending approvals) |
| MC-015 | Scheduled task management: view, modify, cancel recurring automations |
| MC-016 | SLA / time-budget tracking: surface when a task is running longer than expected |

---

## 6. User Experience

### Mission Control Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  MISSION CONTROL                            [All Areas ▼]│
│─────────────────────────────────────────────────────────│
│  ● 3 RUNNING  ⚠ 1 PENDING APPROVAL  ✗ 1 FAILED         │
│                                                          │
│  ACTIVE TASKS                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ● Research: Q1 Competitive Report     [Buddy]    │   │
│  │   Step 4/7: Fetching SEC filings...   Area: Work │   │
│  │   Resources: web:read, drive:write               │   │
│  │   [Pause] [Cancel] [Detail ▶]                    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ● Code Review: PR #142              [IDE Agent]  │   │
│  │   Step 2/4: Analyzing diff...        Area: Work  │   │
│  │   Resources: github:read                         │   │
│  │   [Pause] [Cancel] [Detail ▶]                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  PENDING APPROVALS (1)                                  │
│  ⚠ Buddy wants to send an email draft                  │
│    Scope: gmail:send  Session: Research task            │
│    [Approve] [Deny] [Review Draft ▶]                    │
│                                                          │
│  CONNECTOR HEALTH                                       │
│  ● Gmail: Healthy   ● GitHub: Healthy   ✗ Notion: Error │
│                                                          │
│  FAILED (1)                                             │
│  ✗ Daily Summary Automation — Notion write failed       │
│    2 hours ago  [Retry] [Detail ▶]                      │
└─────────────────────────────────────────────────────────┘
```

### Task Detail Panel

```
┌──────────────────────────────────────────┐
│  Research: Q1 Competitive Report   [Pause][Cancel] │
│  Started: 4:22 PM  Elapsed: 18min        │
│──────────────────────────────────────────│
│  STEP HISTORY                            │
│  ✓ 1. Retrieve market data from web      │
│  ✓ 2. Search SEC EDGAR for filings       │
│  ✓ 3. Extract key financial metrics      │
│  ● 4. Fetching SEC filings (in progress) │
│  ○ 5. Synthesize findings                │
│  ○ 6. Draft report structure             │
│  ○ 7. Write to Drive                     │
│                                          │
│  ACTIVE GRANTS                           │
│  web:read  drive:write (expires 1hr)     │
│                                          │
│  [Redirect Task: "Also include..."]      │
└──────────────────────────────────────────┘
```

---

## 7. Architecture

### Core Components

```
┌──────────────────────────────────────────────────────────┐
│                    Mission Control                        │
│                                                          │
│  ┌───────────────┐  ┌──────────────────┐               │
│  │  Task State   │  │  Approval Queue  │               │
│  │  (Durable     │  │  (Durable Object │               │
│  │   Objects,    │  │   per user)      │               │
│  │   per task)   │  └──────────────────┘               │
│  └───────────────┘                                      │
│         ↑                    ↑                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Task Event Stream (WebSocket / SSE)             │   │
│  │  Agents emit: step_started, step_complete,       │   │
│  │  step_failed, approval_request, task_complete    │   │
│  └──────────────────────────────────────────────────┘   │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Mission Control UI (headyme.com)                │   │
│  │  React + real-time subscription (SSE)            │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Task State Model

```json
{
  "task_id": "uuid",
  "user_id": "string",
  "area_id": "string",
  "name": "string",
  "surface": "buddy | ide | web | bot",
  "status": "queued | running | paused | pending_approval | completed | failed | cancelled",
  "steps": [
    {
      "step_number": 1,
      "description": "string",
      "status": "pending | running | completed | failed",
      "started_at": "ISO8601",
      "completed_at": "ISO8601 | null",
      "error": "string | null"
    }
  ],
  "resources_in_use": [{ "type": "connector", "id": "string", "actions": ["read"] }],
  "active_grant_ids": ["string"],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Event Stream Protocol

Agents publish events via headymcp.com to a task event stream:

```json
{ "event": "step_started", "task_id": "...", "step_number": 4, "description": "Fetching SEC filings" }
{ "event": "step_complete", "task_id": "...", "step_number": 4 }
{ "event": "approval_request", "task_id": "...", "scope": "gmail:send", "draft_id": "..." }
{ "event": "task_failed", "task_id": "...", "error": "Notion API returned 503" }
```

Mission Control UI subscribes via SSE to `/api/tasks/stream?user_id=X` and renders real-time updates.

### Storage

| Entity | Store |
|---|---|
| Task state | Cloudflare Durable Objects (one per task, long-lived) |
| Task event log | Cloudflare D1 (queryable history) |
| Approval queue | Cloudflare Durable Object per user |
| Connector health state | Cloudflare KV with 60s TTL |

---

## 8. Security and Privacy

| Concern | Mitigation |
|---|---|
| Unauthorized task cancellation | Task control actions require authenticated session; only task owner (user_id match) can cancel/pause |
| Agent ignoring cancellation signal | MCP layer checks task status before each step; running agents halt on "cancelled" status |
| Approval queue manipulation | Approval queue stored server-side in Durable Object; client cannot inject fake approval records |
| Task event stream eavesdropping | SSE stream is user-scoped and requires auth token; no cross-user event leakage |
| Sensitive task data in step logs | Step descriptions are generated by agents; PII scrubbing filter applied before storage |

---

## 9. Dependencies

| Dependency | Owner | Risk |
|---|---|---|
| MCP layer task event emission | HeadySystems | High — all agents must emit structured events |
| Cloudflare Durable Objects for task state | Infrastructure | Medium — need to design DO lifecycle carefully |
| Permission Vault escalation events (HEADY-FEAT-001) | Permission team | High — approval queue feeds from escalation events |
| Work-Area Orchestrator area context (HEADY-FEAT-003) | Work area team | Medium — for area-filtered view |
| headyme.com SSE subscription infrastructure | HeadyMe | Medium |

---

## 10. Phased Rollout

### Phase 1 — Visibility (Weeks 1–5)
- Task state model and Durable Objects
- Agent event emission protocol in MCP layer
- Task list and status view in Mission Control
- Connector health panel
- Task failure surfacing

### Phase 2 — Control (Weeks 6–9)
- Task pause / resume / cancel
- Pending approvals queue (linked to Permission Vault)
- Task detail panel with step history
- SSE real-time stream

### Phase 3 — Intelligence (Weeks 10–14)
- Task redirection
- Cross-area task view
- Historical task log (24hr)
- System health summary bar
- In-app banner notifications

### Phase 4 — Mobile and Scale (Weeks 15+)
- Android Mission Control widget
- Scheduled automation management
- SLA / time-budget tracking

---

## 11. Success Metrics

| Metric | Target (60 days post-launch) |
|---|---|
| % of agentic users who check Mission Control ≥ once per session | ≥ 60% |
| Mean time to respond to pending approval | < 5 minutes |
| Task cancellation success rate (agent halts within 3s) | ≥ 99% |
| Failed task acknowledgment rate (within 30 min) | ≥ 90% |
| User-reported trust in agentic automation | ≥ 4.0/5 post-launch survey |

---

## 12. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| Should task state Durable Objects persist indefinitely or have a max TTL (e.g., 30 days)? | Engineering | No — 30-day TTL default; user can archive |
| Does Mission Control require its own dedicated route or is it embedded in headyme.com sidebar? | UX | No — sidebar panel preferred for always-accessible visibility |
| What is the maximum number of concurrent tasks per user the system should support in v1? | Engineering | No — recommend 10; queue additional tasks |
| Should redirect instruction be injected as a new system message or modify the existing task plan? | AI / Engineering | Yes — defines agent integration requirements |
