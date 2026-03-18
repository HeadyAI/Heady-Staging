---
name: heady-projection-composer
description: Design the Heady Projection Composer for context-driven UI and app delivery. Use when building adaptive interfaces that reshape based on user intent, composing liquid UI projections from modular components, or designing the projection engine that maps tasks to optimal surface layouts.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Projection Composer

Use this skill when you need to **design, build, or extend the Projection Composer** — Heady's engine for dynamically composing and delivering user interfaces and app experiences based on the current task, context, and device.

## When to Use This Skill

- Designing the projection engine that maps user intent to UI layouts
- Building adaptive interfaces that reshape based on context
- Composing modular UI projections from component libraries
- Defining projection templates for common task patterns
- Planning the rendering pipeline from context signal to rendered surface
- Optimizing projection performance and transition animations

## Instructions

### 1. Define the Projection Model

A projection is a context-driven UI composition:

```yaml
projection:
  id: uuid
  name: human-readable-name
  trigger:
    intent: what the user is trying to do
    context_signals:
      - task_type: coding | reviewing | researching | communicating
      - active_tools: [heady-coder, heady-memory]
      - urgency: low | normal | high
      - device: android | desktop | web
  layout:
    type: single-pane | split | dashboard | focus
    components:
      - slot: primary
        component: code-editor
        config: { language: typescript, theme: dark }
      - slot: secondary
        component: chat-panel
        config: { context: current-task }
      - slot: sidebar
        component: file-tree
        config: { root: workspace }
  transitions:
    enter: fade-in | slide-right | instant
    exit: fade-out | slide-left | instant
    duration_ms: 200
```

### 2. Design the Projection Engine

The engine transforms context into UI:

```
Context Signals → Intent Classifier → Template Matcher → Layout Composer → Renderer

1. COLLECT context signals (task, tools, device, user preferences)
2. CLASSIFY user intent from signals
3. MATCH intent to projection template (or compose dynamically)
4. RESOLVE component dependencies and data bindings
5. RENDER the projection on the target surface
6. ADAPT in real-time as context changes
```

### 3. Build the Component Library

Projections are composed from modular components:

| Component | Purpose | Slots |
|-----------|---------|-------|
| `code-editor` | Code editing with syntax highlighting | primary, secondary |
| `chat-panel` | Conversation with Buddy or agents | primary, secondary, sidebar |
| `file-tree` | Workspace file navigation | sidebar |
| `terminal` | Command execution | primary, secondary |
| `diff-viewer` | Code diff visualization | primary |
| `memory-browser` | Browse and search memory ledger | sidebar, secondary |
| `task-board` | Kanban-style task management | primary |
| `metrics-dashboard` | Charts and data visualization | primary |
| `approval-dialog` | Permission consent and review | overlay |
| `playback-viewer` | Trust receipt action replay | primary, secondary |

Each component exposes:
- **Props** — configurable parameters
- **Events** — actions the component can emit
- **Bindings** — data sources the component can consume

### 4. Define Projection Templates

Pre-built compositions for common scenarios:

**Coding Template:**
```yaml
intent: coding
layout: split
components:
  primary: code-editor
  secondary: terminal
  sidebar: file-tree
```

**Review Template:**
```yaml
intent: code-review
layout: split
components:
  primary: diff-viewer
  secondary: chat-panel
  sidebar: file-tree
```

**Research Template:**
```yaml
intent: researching
layout: single-pane
components:
  primary: chat-panel
  sidebar: memory-browser
```

**Monitoring Template:**
```yaml
intent: monitoring
layout: dashboard
components:
  primary: metrics-dashboard
  secondary: task-board
  sidebar: agent-roster
```

### 5. Implement Adaptive Transitions

Projections adapt as context changes:

| Trigger | Transition | Example |
|---------|-----------|---------|
| Task switch | Full projection swap | User moves from coding to reviewing |
| Tool activation | Component addition | Agent starts → agent-roster appears in sidebar |
| Focus change | Layout resize | User focuses on terminal → terminal expands |
| Device switch | Full re-layout | Handed off from desktop to mobile |

**Transition rules:**
- Minimize visual disruption — prefer component swaps over full re-layouts
- Preserve user focus — don't move the element the user is actively interacting with
- Animate smoothly — 200ms transitions feel responsive without being jarring
- Allow override — user can pin layouts to prevent automatic changes

### 6. Handle Multi-Device Projections

When the same work area spans devices:

- **Leader/follower** — one device is the primary editor, others mirror read-only
- **Complementary** — each device shows a different zone (e.g., phone shows chat, desktop shows code)
- **Independent** — each device runs its own projection based on local context

### 7. Plan the Rendering Pipeline

Performance targets:

| Stage | Target | Strategy |
|-------|--------|----------|
| Intent classification | < 50ms | Lightweight local model |
| Template matching | < 10ms | Pre-indexed lookup |
| Component resolution | < 100ms | Lazy load with cache |
| First paint | < 300ms | Critical path rendering |
| Full interactive | < 500ms | Progressive hydration |

## Output Format

When designing Projection Composer features, produce:

1. **Projection model schema**
2. **Engine pipeline diagram**
3. **Component library catalog**
4. **Template definitions** for target scenarios
5. **Transition rules and animations**
6. **Performance budget**

## Tips

- **Context is king** — the best projection is the one the user didn't have to ask for
- **Components are the atoms** — invest in a strong component library; projections are just compositions
- **Transitions matter** — a jarring layout change breaks flow; smooth transitions feel intelligent
- **User override wins** — if the user manually arranges their workspace, respect it until they signal otherwise
- **Start with templates** — dynamic composition is powerful but complex; ship templates first, add intelligence later
- **Test on real tasks** — a projection that looks good in a wireframe but breaks real workflows is worthless
