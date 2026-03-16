---
name: heady-liquid-stream
description: Use when implementing hybrid transport protocols combining WebSocket control plane with SSE data plane and HTTP/2 multiplexing. Handles token streaming, session management, reconnection, and channel multiplexing. Keywords include streaming, WebSocket, SSE, HTTP/2, transport, real-time, token stream, multiplexing.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidStream
  absorption_source: "OpenClaw JSON-over-WebSocket → hybrid WS + SSE + HTTP/2"
  super_prompt_section: "§5.1"
---

# Heady™ Liquid Stream (LiquidStream)

## When to Use This Skill

Use this skill when:
- Implementing real-time streaming between client and server
- Setting up the hybrid transport layer (WS control + SSE data)
- Managing HTTP/2 multiplexed connections
- Handling reconnection and Last-Event-ID recovery

## Architecture

### Dual-Plane Design

| Plane | Transport | Purpose |
|---|---|---|
| **Control** | WebSocket | Cancel, feedback, approvals, channel management |
| **Data** | SSE (Server-Sent Events) | Token streaming, AI responses, progress updates |

### Why Dual-Plane?

- SSE has native `Last-Event-ID` reconnection — zero data loss
- WebSocket for bidirectional control without disrupting data streams
- HTTP/2 multiplexing allows multiple SSE streams over single TCP connection
- Separate failure domains — control can fail without losing data stream

### Connection Lifecycle

```
Client Connect
  ├─ 1. WebSocket handshake (control)
  │     └─ Firebase JWT auth
  ├─ 2. SSE connection (data)
  │     └─ Channel IDs for multiplexing
  ├─ 3. Awareness CRDT sync (if collaborative session)
  └─ 4. Ready → <250ms first-token latency target
```

## Instructions

### Setting Up a Stream

1. Establish WebSocket control connection with JWT auth
2. Open SSE data connection with channel ID
3. Register event handlers for both planes
4. Implement `Last-Event-ID` based reconnection for SSE
5. Set heartbeat interval on WebSocket (φ⁷ = 29,034ms)

### Multiplexing Channels

Each SSE stream carries a channel ID:
- `ai-response` — token-by-token AI output
- `progress` — task progress updates
- `system` — health, alerts, notifications
- `collaboration` — CRDT sync deltas

## Output Format

- Stream Configuration (JSON)
- Connection Health Metrics
- Reconnection Events Log
