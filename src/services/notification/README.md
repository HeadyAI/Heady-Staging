# Heady™ Notification Service — Real-time Multi-Channel Notifications

> Port: 3361 | WebSocket + SSE + Push
> Author: Eric Haywood <eric@headysystems.com>
> © 2026 HeadySystems Inc. — 51 Provisional Patents

## Overview

Real-time notification delivery via WebSocket, Server-Sent Events (SSE), and NATS JetStream. Features per-frame token revalidation on WebSocket, φ-weighted batch delivery channels, deduplication, read/unread tracking, and pgvector persistence for semantic notification search.

## φ-Scaled Constants

| Constant | Value | Derivation |
|---|---|---|
| Normal batch window | 21 000ms | fib(8) × 1000 |
| Low batch window | 89 000ms | fib(11) × 1000 |
| Max connections | 233 | fib(13) |
| Heartbeat interval | 29 034ms | PHI_TIMING.PHI_7 |
| Reconnect base | 1 618ms | PHI_TIMING.PHI_1 |
| Queue depth | 233 | fib(13) |
| Dedup window | 55 000ms | fib(10) × 1000 |
| Persist buffer | 377 | fib(14) |
| Frame revalidation | every 5th | fib(5) |

## Notification Types

`system`, `alert`, `task_complete`, `agent_update`, `security`

## Delivery Channels

- **critical**: Immediate delivery (0ms delay)
- **normal**: Batched every fib(8) = 21 seconds
- **low**: Batched every fib(11) = 89 seconds

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/stream/:userId` | SSE stream |
| WS | `/ws/:userId` | WebSocket stream |
| POST | `/notify` | Send notification |
| POST | `/broadcast` | Broadcast to all |
| POST | `/read` | Mark notification read |
| GET | `/unread/:userId` | Get unread count |
| GET | `/metrics` | Prometheus metrics |

## Quick Start

```bash
cd services/notification
npm install
SERVICE_PORT=3361 node index.js
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SERVICE_PORT` | Listen port | 3361 |
| `NATS_URL` | NATS server URL | nats://localhost:4222 |
