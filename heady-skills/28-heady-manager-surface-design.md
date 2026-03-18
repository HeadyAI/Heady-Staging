---
name: heady-manager-surface-design
description: Design the Heady Mission Control Manager Surface — a unified dashboard for orchestrating agents, monitoring tasks, managing permissions, and controlling the Heady ecosystem. Use when planning admin UIs, agent dashboards, system health views, or operational control planes.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Manager Surface Design

Use this skill when you need to **design, plan, or extend the Mission Control Manager Surface** — Heady's unified operational dashboard for monitoring, managing, and orchestrating the entire Heady ecosystem.

## When to Use This Skill

- Designing the Mission Control dashboard layout and information architecture
- Planning agent orchestration views — what agents are running, their status, and outputs
- Building task monitoring and management interfaces
- Creating permission management UIs for the delegation vault
- Designing system health and performance dashboards
- Planning the admin and power-user experience for Heady

## Instructions

### 1. Define the Information Architecture

Mission Control organizes information into zones:

| Zone | Purpose | Key Data |
|------|---------|----------|
| **Command Bar** | Quick actions and search | Natural language input, command palette |
| **Agent Roster** | Active agents and their status | Agent name, task, progress, permissions |
| **Task Board** | Current and queued work | Task name, status, owner, priority, ETA |
| **Memory Panel** | Recent memories and context | Latest entries, search, privacy indicators |
| **System Health** | Platform vitals | Latency, error rate, resource usage |
| **Audit Trail** | Recent actions and decisions | Who did what, when, with what permissions |

### 2. Design the Agent Roster View

Show all active Heady agents with real-time status:

```
┌─────────────────────────────────────────┐
│ Agent Roster                    [+ New] │
├─────────┬──────────┬────────┬───────────┤
│ Agent   │ Task     │ Status │ Perms     │
├─────────┼──────────┼────────┼───────────┤
│ Buddy   │ Code rev │ Active │ read,exec │
│ Worker1 │ Tests    │ Queue  │ read,write│
│ Worker2 │ Deploy   │ Done   │ full      │
└─────────┴──────────┴────────┴───────────┘
```

For each agent, support:
- **Inspect** — view current context, memory, and outputs
- **Pause/Resume** — temporarily halt agent execution
- **Revoke** — immediately revoke permissions and stop
- **Logs** — view full execution log with timestamps

### 3. Design the Task Board

Task management with Kanban-style columns:

- **Queued** — tasks waiting for agent assignment
- **In Progress** — actively being worked on
- **Awaiting Approval** — agent completed work, needs user review
- **Done** — completed and verified

Each task card shows:
- Task description and priority
- Assigned agent
- Progress indicator
- Time elapsed
- Permission scope used
- Link to outputs and artifacts

### 4. Build the Permission Manager

A visual interface for the delegation vault:

- **Graph view** — shows delegation chains as a directed graph
- **Table view** — lists all active permissions with scope, duration, and grantor
- **Quick actions** — grant, revoke, modify permissions inline
- **Templates** — apply pre-built permission sets with one click
- **History** — full audit trail of permission changes

### 5. Design System Health Monitoring

Real-time metrics dashboard:

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Agent response latency | All agents | > 5s |
| Memory query time | Memory Ledger | > 2s |
| Error rate | All services | > 1% |
| Active sessions | Session manager | > capacity |
| Module load time | Liquid Registry | > 3s |

Include:
- Sparkline charts for trend visualization
- Alert indicators with severity levels
- Drill-down to specific service logs

### 6. Design the Audit Trail View

Filterable log of all system actions:

- **Columns**: timestamp, actor, action, target, result, permissions used
- **Filters**: by actor, action type, time range, risk level
- **Export**: CSV and JSON export for compliance
- **Playback**: step through a sequence of actions to understand what happened

### 7. Plan Responsive Layouts

Mission Control must work across surfaces:

| Surface | Layout | Priority Zones |
|---------|--------|---------------|
| Desktop (web) | Full dashboard with all zones | All |
| Tablet | Collapsible panels | Agent Roster + Task Board |
| Mobile | Single-zone focus with nav | Command Bar + Task Board |

## Output Format

When designing Manager Surface features, produce:

1. **Wireframes** (ASCII or text-based layout diagrams)
2. **Information architecture** with zone definitions
3. **Component specifications** for each UI panel
4. **Data requirements** — what APIs and data sources each view needs
5. **Interaction patterns** — how users navigate and take actions

## Tips

- **Command bar is king** — power users will drive everything from natural language and keyboard shortcuts
- **Real-time is expected** — agent status and task progress must update live, not on refresh
- **Permissions are always visible** — every action surface should show what permissions are in play
- **Design for glanceability** — the dashboard should convey system health in under 3 seconds
- **Progressive disclosure** — show summary by default, details on drill-down
