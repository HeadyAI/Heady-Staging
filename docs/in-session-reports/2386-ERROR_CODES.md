# ERROR_CODES.md

| Error Code | HTTP Status | Description | Remediation |
|------------|-------------|-------------|-------------|
| HEADY-AUTH-001 | 401 | Missing Token / Unauthenticated | Provide `idToken` in the payload of `/api/session` request. |
| HEADY-AUTH-002 | 401 | Invalid Session Creation | Ensure the provided Token is correctly generated from Firebase and has not expired. |
| HEADY-AUTH-003 | 401 | Missing Cookie | Make sure `__heady_session` or `__Host-heady_session` is supplied and valid on the domain. |
| HEADY-AUTH-004 | 401 | Invalid Cookie Signature | Wait until the session rotates, re-authenticate to retrieve a valid cookie token. |
| HEADY-BRAIN-001 | 503 | Brain Gateway Unreachable | Check pgvector connection pool, check NATS JetStream, restart with `min-instances=2`. |
| HEADY-NOTIFY-001 | 400 | Invalid Frame Payload | The WebSocket frame must contain an authenticated JWT to broadcast or receive. Reconnect socket. |
| HEADY-NOTIFY-002 | 429 | Exceeded Broadcast limit | Reached max broadcasting retry attempts based on the Fibonacci limits `FIB[4]`. Wait and re-attempt. |
