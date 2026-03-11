# Notification Service

Real-time notification delivery service for the HEADY platform with support for WebSocket, Server-Sent Events (SSE), and Web Push channels.

## Overview

The notification service provides three complementary channels for delivering notifications:

- **WebSocket**: Full-duplex, persistent connections with per-frame token revalidation
- **Server-Sent Events (SSE)**: Unidirectional streaming with automatic reconnection
- **Web Push**: Background notification delivery via Web Push API

All channels enforce HEADY's zero-trust security model with continuous token validation and confidence-based decision gates.

## Architecture

### Components

- **WebSocket Handler**: Manages persistent connections with frame-level authentication
- **SSE Handler**: Server-Sent Events streaming with health monitoring
- **Push Handler**: Web Push subscription management and delivery
- **CSL Gates**: Confidence-weighted security decisions for all operations
- **Structured Logger**: JSON logging with correlation IDs and metadata

### Key Design Principles

- **φ-scaled Constants**: All timeouts and limits derived from golden ratio and Fibonacci sequences
- **Zero-Trust Security**: Per-frame token revalidation on WebSocket connections
- **CSL Gates**: All decisions require confidence threshold evaluation
- **Structured Logging**: No console.log; all logs are structured JSON with correlation IDs
- **Connection Health**: Continuous monitoring of connection state and token validity

## API Endpoints

### POST /api/notifications/send

Send a notification to a user across all available channels.

```bash
curl -X POST http://localhost:3350/api/notifications/send \
  -H "Content-Type: application/json" \
  -b "__heady_session=<token>" \
  -d '{
    "title": "New Message",
    "body": "You have a new message",
    "targetUserId": "user-123",
    "data": {
      "action": "open_chat",
      "chatId": "chat-456"
    },
    "icon": "https://example.com/icon.png",
    "tag": "message"
  }'
```

Response:
```json
{
  "id": "notification-uuid",
  "timestamp": 1234567890000,
  "channels": ["websocket", "sse", "push"]
}
```

### GET /api/notifications/stream

Establish Server-Sent Events connection for receiving notifications.

```bash
curl -H "Cookie: __heady_session=<token>" \
  http://localhost:3350/api/notifications/stream
```

Streams notifications as Server-Sent Events:
```
event: notification
data: {"id": "notif-123", "title": "New Message", ...}

event: heartbeat
data: {"timestamp": 1234567890000}
```

### WebSocket /ws

Establish WebSocket connection for real-time notifications.

```javascript
const ws = new WebSocket('ws://localhost:3350/ws?token=<session-token>');

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'notification') {
    console.log('Received:', message.payload);
  }
});

ws.send(JSON.stringify({ type: 'ping' }));
```

WebSocket messages:
```json
{
  "id": "msg-id",
  "type": "notification",
  "payload": {
    "id": "notif-123",
    "userId": "user-456",
    "title": "New Message",
    "body": "You have a new message"
  },
  "timestamp": 1234567890000
}
```

### POST /api/push/subscribe

Register a Web Push subscription.

```bash
curl -X POST http://localhost:3350/api/push/subscribe \
  -H "Content-Type: application/json" \
  -b "__heady_session=<token>" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "p256dh": "base64-encoded-key",
    "auth": "base64-encoded-auth"
  }'
```

Response:
```json
{
  "subscriptionId": "sub-uuid",
  "timestamp": 1234567890000
}
```

### DELETE /api/push/subscribe/:subscriptionId

Unregister a Web Push subscription.

```bash
curl -X DELETE http://localhost:3350/api/push/subscribe/sub-uuid \
  -b "__heady_session=<token>"
```

### GET /health

Health check endpoint with detailed status.

```bash
curl http://localhost:3350/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890000,
  "uptime": 3600000,
  "connections": 42,
  "memoryUsage": {
    "rss": 123456789,
    "heapUsed": 87654321,
    "heapTotal": 100000000
  },
  "checks": {
    "websocket": true,
    "sse": true,
    "push": true
  }
}
```

## Authentication

All endpoints require the `__heady_session` cookie containing a valid JWT token with the following claims:

```json
{
  "userId": "user-123",
  "sessionId": "session-456",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Token Revalidation

- **WebSocket**: Tokens are revalidated every 144 seconds
- **SSE**: Connection health checks include implicit token validation
- **Confidence Threshold**: Minimum 0.618 (PSI value) confidence required for all operations

## φ-Scaled Constants

All timing and size constants are derived from the golden ratio (PHI = 1.618) and Fibonacci sequence:

- `CONNECTION_TIMEOUT_MS`: 233 seconds (Fibonacci)
- `TOKEN_REVALIDATION_INTERVAL_MS`: 144 seconds (Fibonacci)
- `WS_HEARTBEAT_INTERVAL_MS`: 34 seconds (Fibonacci)
- `SSE_RECONNECT_DELAY_MS`: 21 seconds (Fibonacci)
- `MAX_MESSAGE_QUEUE_SIZE`: 89 messages (Fibonacci)
- `HEALTH_CHECK_INTERVAL_MS`: 55 seconds (Fibonacci)

## Logging

All logs are structured JSON with correlation IDs:

```json
{
  "timestamp": "2024-03-09T10:30:45.123Z",
  "level": "INFO",
  "service": "notification-service",
  "action": "notification_sent",
  "message": "Notification sent successfully",
  "correlationId": "req-uuid",
  "userId": "user-123",
  "metadata": {
    "notificationId": "notif-456",
    "channels": 3
  },
  "duration": 156
}
```

## Environment Variables

- `NODE_ENV`: Set to `production` for distroless container
- `LOG_LEVEL`: Log level (trace, debug, info, warn, error, fatal)
- `JWT_SECRET`: Secret for token validation (default: development value)
- `COOKIE_DOMAIN`: Domain for secure cookies

## Building and Running

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t heady-notification-service .
docker run -p 3350:3350 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  heady-notification-service
```

## Performance Characteristics

- **WebSocket Connections**: Per-frame token validation with 144-second revalidation
- **Message Queue**: 89-message buffer per connection with overflow protection
- **Heartbeat Interval**: 34 seconds to detect stale connections
- **SSE Reconnection**: Automatic 21-second backoff on disconnection
- **Health Checks**: 55-second interval for detailed service metrics

## Security Considerations

- **Zero-Trust**: Every WebSocket frame includes implicit authentication validation
- **Cookie Security**: httpOnly, Secure, SameSite=Strict flags enforced
- **CSL Gates**: Confidence-weighted decisions prevent false positives
- **Token Expiration**: Automatic cleanup of expired tokens
- **Connection Isolation**: User notifications never leak across sessions

## Development Notes

- No magic numbers: All constants derive from PHI/PSI/Fibonacci
- Structured logging only: No console.log statements
- CSL gates required: All decisions must pass confidence evaluation
- Full type safety: Strict TypeScript compilation
