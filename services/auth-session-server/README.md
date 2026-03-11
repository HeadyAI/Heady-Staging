# HEADY Auth Session Server

Central authentication session service for the HEADY platform operating at **auth.headysystems.com**.

This service handles cross-domain authentication, session management, and SSO across ~60 HEADY ecosystem domains using Firebase Auth as the backend.

## Features

- **Firebase Authentication** - Google OAuth, Email/Password, Anonymous auth
- **Session Management** - httpOnly, Secure, SameSite=None cookies with client fingerprinting
- **Cross-Domain SSO** - Relay iframe + postMessage for seamless SSO across ~60 HEADY domains
- **φ-Scaled Rate Limiting** - Fibonacci-based rate limits (34 anonymous, 89 authenticated, 233 enterprise req/min)
- **Structured JSON Logging** - Production-grade JSON logging for all operations
- **Security** - Origin validation, fingerprint binding, CSRF protection, XSS prevention

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Client Application (Domain A)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         postMessage
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            Relay iframe (auth.headysystems.com)             │
│  - Handles __Host-__heady_session cookie reads/writes       │
│  - Broadcasts auth state changes via postMessage            │
│  - Origin validation against ~60 HEADY domains              │
└─────────────────────────────────────────────────────────────┘
                              ↓
                            HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         Auth Session Server (auth.headysystems.com)         │
│  - POST /api/auth/session - Create session from Firebase    │
│  - POST /api/auth/verify - Verify session                   │
│  - POST /api/auth/revoke - Revoke session                   │
│  - GET /api/auth/relay - Serve relay iframe                 │
│  - GET /api/auth/health - Health check                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                            HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            Firebase Auth (Google Cloud)                     │
│  - ID Token verification                                    │
│  - User management                                          │
│  - OAuth provider integration                               │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Session Binding
Sessions are bound to client fingerprint (IP + User-Agent hash) to prevent session hijacking. Requests from different IPs/User-Agents are rejected.

### Cookie Security
- **Name**: `__Host-__heady_session` (forces HTTPS, path-locked, domain-locked)
- **httpOnly**: True (prevents JavaScript access)
- **Secure**: True (HTTPS only)
- **SameSite**: None (required for cross-domain relay, mitigated by Origin validation)

### Origin Validation
All ~60 HEADY ecosystem domains are whitelisted. Cross-domain requests from unauthorized origins are rejected.

### No localStorage
Tokens are NEVER stored in localStorage. All session data is in httpOnly cookies only.

## API Reference

### POST /api/auth/session
Create a new session from Firebase ID token.

**Request:**
```json
{
  "idToken": "firebase_id_token_from_sdk"
}
```

**Response:**
```json
{
  "sessionId": "uuid-v4",
  "userId": "uid",
  "email": "user@example.com",
  "expiresAt": "2024-03-09T15:00:00Z",
  "expiresIn": 43200
}
```

**Status Codes:**
- 201: Session created successfully
- 400: Invalid request (missing idToken)
- 401: Authentication failed (invalid Firebase token)
- 500: Server error

### POST /api/auth/verify
Verify current session.

**Request:**
```json
{}
```

**Response:**
```json
{
  "valid": true,
  "userId": "uid",
  "email": "user@example.com",
  "expiresAt": "2024-03-09T15:00:00Z",
  "expiresIn": 43200
}
```

**Status Codes:**
- 200: Session valid
- 401: Session invalid/expired
- 500: Server error

### POST /api/auth/revoke
Revoke current session.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Session revoked"
}
```

**Status Codes:**
- 200: Session revoked
- 400: No session to revoke
- 500: Server error

### GET /api/auth/relay
Serve cross-domain relay iframe.

**Response:** HTML page containing relay iframe code

**Status Codes:**
- 200: Relay iframe served
- 403: Invalid origin
- 500: Server error

### GET /api/auth/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-09T10:00:00Z",
  "environment": "production",
  "uptime": 3600,
  "memory": {
    "heapUsed": 128,
    "heapTotal": 256,
    "external": 2
  },
  "stats": {
    "sessions": {
      "totalSessions": 1000,
      "activeSessions": 950,
      "expiredSessions": 50,
      "totalUsers": 500,
      "averageSessionsPerUser": 2
    },
    "rateLimit": {
      "totalActive": 100,
      "totalStored": 150,
      "byTier": {
        "anonymous": 50,
        "authenticated": 40,
        "enterprise": 10
      }
    }
  }
}
```

## Installation

### Prerequisites
- Node.js 20+
- Firebase Admin SDK credentials

### Setup

1. Clone repository and install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

3. Set Firebase credentials:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
```

4. Build TypeScript:
```bash
npm run build
```

5. Run development server:
```bash
npm run dev
```

6. Run production server:
```bash
npm start
```

## Running Tests

```bash
npm run test              # Run tests once
npm run test:coverage     # Run with coverage report
```

## Docker Deployment

Build Docker image:
```bash
npm run docker:build
```

Run container:
```bash
docker run -p 3310:3310 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-key.json \
  -v /path/to/firebase-key.json:/secrets/firebase-key.json \
  heady/auth-session-server:latest
```

## Rate Limiting

Rate limits use Fibonacci numbers for φ-scaled distribution:

| Tier | Requests/Min | Requests/Hour |
|------|--------------|---------------|
| Anonymous | 34 | 2,040 |
| Authenticated | 89 | 5,340 |
| Enterprise | 233 | 13,980 |

Rate limit headers in response:
- `X-RateLimit-Limit`: Requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `X-Retry-After`: Seconds to retry (on 429)

## Monitoring

### Health Checks
```bash
curl -s http://localhost:3310/api/auth/health | jq .
```

### Metrics Available
- Session count (total, active, expired)
- User count
- Rate limit stats by tier
- Memory usage
- Server uptime

## Supported HEADY Domains

The service supports authentication for ~60 HEADY ecosystem domains:

**Primary domains:**
- headysystems.com
- headyme.com
- heady-ai.com
- headyos.com
- headyex.com
- headyfinance.com

**Product domains:**
- headyanalytics.com
- headycloud.com
- headypay.com
- headyapi.com
- headycms.com
- headycrm.com
- And 50+ more...

**Regional variants:**
- heady.io, heady.co, heady.uk, heady.de, heady.fr, heady.jp, heady.cn, heady.in, heady.br, heady.au

All domains support wildcard subdomains (e.g., api.headysystems.com, staging.headycms.com, etc.)

## Production Deployment

### Environment Variables
All required environment variables are documented in `.env.example`.

### SSL/TLS
Service requires HTTPS in production. Configure your load balancer or reverse proxy accordingly.

### Database
This version uses in-memory session storage. For production with multiple instances, use Redis:

```typescript
// Future Redis support
const redis = new Redis({
  url: process.env.REDIS_URL
});
```

### Scaling Considerations
- Each instance maintains ~1000 active sessions in memory
- For 10K+ concurrent sessions, deploy with Redis backend
- Rate limiter uses in-memory store (scales to ~100K unique clients per instance)
- Recommend 2-3 instances behind load balancer with sticky sessions disabled

## Troubleshooting

### Session Not Persisting Across Domains
- Verify relay iframe is being served from auth.headysystems.com
- Check browser console for CORS errors
- Ensure SameSite=None cookie is supported in client browser
- Verify origin in relay iframe whitelist

### Rate Limit Errors (429)
- Check X-RateLimit-Remaining header
- Wait X-Retry-After seconds before retrying
- Consider upgrading to authenticated tier
- Enterprise customers can request higher limits

### Firebase Token Verification Fails
- Verify GOOGLE_APPLICATION_CREDENTIALS environment variable is set
- Check Firebase credentials file is valid
- Confirm Firebase project ID matches configuration
- Verify ID token is not expired

## Contributing

This service is part of the HEADY platform. For issues and pull requests, follow the HEADY contribution guidelines.

## License

MIT License - See LICENSE file for details

## Support

For issues, contact HEADY support or create an issue in the repository.
