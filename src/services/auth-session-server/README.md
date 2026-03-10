# @heady/auth-session-server

Central authentication server for the Heady platform at `auth.headysystems.com`. Validates Firebase ID tokens and creates secure httpOnly session cookies.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /session | No | Create session from Firebase ID token |
| POST | /session/refresh | Yes | Refresh expiring session |
| POST | /session/revoke | No | Revoke and clear session |
| GET | /session/me | Yes | Get current user |
| GET | /health | No | Health check |

## Session Cookie

- Name: `__Host-heady_session`
- httpOnly: true, Secure: true, SameSite: None
- Max-Age: 144 hours (FIB[12] × 1 hour)
- Bound to client IP + User-Agent fingerprint

## CORS

Configured for all 9 Heady domains. Never uses `Access-Control-Allow-Origin: *`.

## Usage

```bash
# Create session
curl -X POST https://auth.headysystems.com/session \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<firebase-id-token>"}'

# Get current user (with session cookie)
curl https://auth.headysystems.com/session/me \
  --cookie "__Host-heady_session=<cookie>"
```

## Environment

See `.env.example` for required configuration variables.

## Docker

```bash
docker build -t heady/auth-session-server .
docker run -p 3380:3380 --env-file .env heady/auth-session-server
```
