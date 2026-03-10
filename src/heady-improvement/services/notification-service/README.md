# @heady/notification-service

Real-time notification service for the Heady platform via WebSocket, SSE, and internal push APIs.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| WS | /ws?token=... | Token | WebSocket connection |
| GET | /events?token=...&channels=... | Token | SSE stream |
| POST | /broadcast | API Key | Broadcast to channel |
| POST | /notify | API Key | Direct message to user |
| GET | /health | No | Health check |

## Channels

- `system` — platform-wide system notifications
- `alerts` — monitoring and alerting
- `deployments` — deployment status updates
- `agents` — AI agent activity notifications

## WebSocket Protocol

Connect with token: `ws://host:3381/ws?token=<session-token>`

Every message must include a `token` field for re-validation:

```json
{ "action": "subscribe", "channel": "alerts", "token": "<token>" }
{ "action": "unsubscribe", "channel": "alerts", "token": "<token>" }
{ "action": "ping", "token": "<token>" }
```

Heartbeat interval: 13s (FIB[7]). Reconnection uses phi-backoff.

## SSE

```bash
curl -N "http://host:3381/events?token=<token>&channels=system,alerts"
```

Keep-alive: 21s (FIB[8]).

## Rate Limits

34 notifications/min per user (FIB[9]).

## Docker

```bash
docker build -t heady/notification-service .
docker run -p 3381:3381 --env-file .env heady/notification-service
```
