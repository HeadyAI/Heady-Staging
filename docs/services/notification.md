# Notification Service

**Port:** 3361 | **Pool:** Warm | **Domain:** notify.headysystems.com

## Overview
Handles all notification delivery: in-app alerts, SSE streaming, webhook dispatch, and email notifications.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notify` | Send notification |
| `GET` | `/stream` | SSE notification stream |
| `GET` | `/health` | Health check |

## Notification Types
| Type | Delivery | Latency Target |
|------|----------|----------------|
| `alert` | In-app + SSE | < 1 618ms (φ×1000) |
| `info` | In-app | < 4 236ms (φ³×1000) |
| `webhook` | HTTP POST | < 6 854ms (φ⁴×1000) |
| `email` | SMTP/SendGrid | < 11 090ms (φ⁵×1000) |

## SSE Protocol
```
GET /stream?userId=user_123
Accept: text/event-stream

data: {"type":"alert","title":"Pipeline done","ts":"..."}

data: {"type":"heartbeat","ts":"..."}
```
Heartbeat interval: PHI_TIMING.PHI_5 = 11 090ms
