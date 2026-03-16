---
name: heady-liquid-channel
description: Use when routing messages across communication platforms, managing multi-channel delivery, or integrating new messaging services. Supports 22+ channels including Discord, Slack, WhatsApp, Telegram, Signal, Teams, Matrix, Email, SMS, Nostr, IRC, and custom webhooks. Keywords include messaging, channel routing, multi-platform, notification, communication hub, message bus.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidChannel
  absorption_source: "OpenClaw 22+ messaging channels → extended with Nostr, Matrix, IRC"
  super_prompt_section: "§5.1"
---

# Heady™ Liquid Channel (LiquidChannel)

## When to Use This Skill

Use this skill when:
- Routing messages to multiple communication platforms simultaneously
- Integrating a new messaging service into the Heady ecosystem
- Managing notification preferences and delivery rules
- Building cross-platform communication workflows

## Architecture

### Supported Channels (22+)

| Category | Channels |
|---|---|
| **Chat** | Discord, Slack, Teams, Matrix |
| **Messaging** | WhatsApp (Baileys), Telegram (grammY), Signal, SMS (Twilio) |
| **Social** | Nostr, IRC |
| **Email** | SMTP/IMAP, headyme.com sovereign inbox |
| **Webhooks** | Custom HTTP/WebSocket endpoints |
| **Push** | Mobile push (FCM/APNs), Desktop notifications |

### Routing Logic

```
Message Intent → Channel Router
  ├─ Priority: User's preferred channel (from buddy_configs)
  ├─ Fallback: Next available channel in preference order
  ├─ Broadcast: Fan-out to all enabled channels
  └─ Smart: CSL-gated channel selection based on content type
```

### Channel Adapters

Each channel has a standardized adapter interface:
- `send(message, options)` — deliver message
- `receive(handler)` — listen for incoming
- `status()` — channel health check
- `rateLimit()` — current rate limit state

## Instructions

### Adding a New Channel

1. Create adapter implementing the standard interface
2. Register in channel registry with capability flags
3. Configure auth (OAuth2/API key/webhook secret)
4. Set rate limits and retry policies
5. Enable in user's notification preferences

### Message Routing

1. Classify message type (alert, notification, conversation, broadcast)
2. Check user channel preferences
3. Apply routing rules (smart/preferred/broadcast)
4. Transform message format per channel requirements
5. Deliver with retry and fallback chain

## Output Format

- Delivery Receipt (JSON with per-channel status)
- Channel Health Report
- Routing Decision Trace
