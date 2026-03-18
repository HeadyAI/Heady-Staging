---
name: heady-cross-device-handoff
description: Design the Heady Cross-Device Handoff Mesh for seamless task and context transfer between Android, desktop, and web surfaces. Use when planning device-to-device continuity, session migration, work-area synchronization, or multi-device orchestration.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Cross-Device Handoff

Use this skill when you need to **design, implement, or troubleshoot cross-device handoff** — Heady's ability to seamlessly transfer tasks, context, and work areas between Android, desktop, and web surfaces.

## When to Use This Skill

- Designing the handoff protocol between Heady surfaces
- Planning session migration — moving active work from one device to another
- Building work-area synchronization across devices
- Defining conflict resolution when the same work-area is active on multiple devices
- Optimizing handoff latency and reliability

## Instructions

### 1. Define the Handoff Data Model

Every handoff transfers a context bundle:

```yaml
handoff_bundle:
  id: uuid
  timestamp: ISO-8601
  source_device:
    id: device-uuid
    surface: android | desktop | web
    session_id: session-uuid
  target_device:
    id: device-uuid
    surface: android | desktop | web
  context:
    active_task: task-object
    work_area: work-area-snapshot
    memory_window: recent-memory-entries[]
    agent_state: active-agents-and-progress
    ui_state: scroll-position, open-panels, focus
  permissions:
    delegated_scopes: scope[]
    expiry: ISO-8601
  priority: low | normal | urgent
```

### 2. Design the Handoff Protocol

The handoff follows a three-phase protocol:

**Phase 1 — Announce:**
```
Source device broadcasts: "I have a handoff ready"
  - includes: bundle summary (size, task type, urgency)
  - target: specific device or "any available"
```

**Phase 2 — Negotiate:**
```
Target device responds: "I can accept this handoff"
  - includes: surface capabilities, available resources
  - source confirms or selects different target
```

**Phase 3 — Transfer:**
```
Source sends full context bundle
  - encrypted in transit
  - target acknowledges receipt
  - source marks handoff as transferred
  - source optionally keeps read-only copy
```

### 3. Handle Work-Area Synchronization

When a work area is shared across devices:

| Scenario | Resolution |
|----------|-----------|
| Single writer | Only one device can edit; others are read-only observers |
| Handoff | Ownership transfers; source becomes read-only |
| Conflict | Last-write-wins with undo history preserved on both sides |
| Offline | Queue changes locally; sync and merge when reconnected |

### 4. Define Device Capability Matrix

Not all surfaces have the same capabilities:

| Capability | Android | Desktop | Web |
|-----------|---------|---------|-----|
| Full IDE | No | Yes | Partial |
| File system access | Sandboxed | Full | No |
| Background agents | Limited | Full | Limited |
| Notifications | Push | System | Browser |
| Biometric auth | Yes | Varies | No |

Handoff must **adapt the context** to the target surface's capabilities:
- IDE-specific state is stripped when handing off to Android
- File paths are translated to cloud references when moving to Web
- Agent configurations are scaled to match device resources

### 5. Optimize Handoff Performance

Latency targets:

| Handoff Type | Target Latency | Strategy |
|-------------|---------------|----------|
| Quick switch | < 2s | Pre-sync context in background |
| Full migration | < 10s | Incremental transfer, lazy load details |
| Offline resume | < 5s after reconnect | Local cache + delta sync |

Techniques:
- **Pre-warming** — predict likely handoff targets and pre-sync context
- **Incremental transfer** — send critical state first, details later
- **Compression** — compress memory and agent state for transfer
- **Local cache** — keep recent context on all devices for instant resume

### 6. Plan Security for Handoff

- **Encryption** — all handoff data is encrypted end-to-end between devices
- **Authentication** — both devices must prove identity before transfer
- **Permission scoping** — delegated permissions in the bundle respect the target device's trust level
- **Expiry** — handoff bundles expire after a configurable timeout (default: 5 minutes)
- **Audit** — every handoff is logged in the trust receipt ledger

## Output Format

When designing handoff features, produce:

1. **Context bundle schema**
2. **Protocol sequence diagram** (text-based)
3. **Device capability matrix**
4. **Conflict resolution rules**
5. **Performance targets and optimization strategies**
6. **Security requirements**

## Tips

- **Handoff should feel instant** — pre-sync aggressively so the transfer itself is just a pointer swap
- **Degrade gracefully** — if a capability isn't available on the target, hide it rather than error
- **Users don't think in devices** — they think in tasks; the handoff should be task-centric, not device-centric
- **Test the offline case** — real users switch devices while on the subway, in elevators, and between wifi networks
- **Keep the bundle small** — transfer references to large data (files, embeddings), not the data itself
