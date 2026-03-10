# DEBUG Guide: Web Domain

## Services

- `heady-web (3380)`
- `heady-buddy (3381)`
- `heady-ui (3382)`
- `heady-onboarding (3383)`
- `heady-pilot-onboarding (3384)`
- `heady-task-browser (3385)`

## Health Check

```bash
curl -s http://localhost:3380/health | jq .
```

## Common Failure Modes

### CORS errors on cross-domain requests

**Diagnosis:** CORS origin whitelist missing the requesting domain.

**Fix:** Check cors-strict.js ALLOWED_ORIGINS. All 9 Heady domains must be whitelisted. Never use Access-Control-Allow-Origin: *.

### WebSocket connection drops after 21 seconds

**Diagnosis:** φ-scaled idle timeout reached (fib(8)=21s) without heartbeat.

**Fix:** Client must send heartbeat within fib(7)=13 second intervals. Check WebSocket auth middleware re-validation.

### SSR/hydration mismatch

**Diagnosis:** Server and client rendered different content.

**Fix:** Check HeadyAutoContext middleware is injecting same context on server and client. Verify no Date.now() in render path.

## Environment Variables

- `HEADY_DOMAIN`
- `AUTH_DOMAIN`
- `API_GATEWAY_URL`

## Debug Commands

```bash
curl -s http://localhost:3380/health | jq .
curl -s -I http://localhost:3380  # Check headers
curl -s http://localhost:3380/ | head -50  # Check HTML output
```

## Log Locations

- Cloud Run: gcloud run services logs read heady-web --region=us-east1

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
