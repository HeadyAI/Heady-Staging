# Heady™ Error Code Catalog

All error responses: `{ code, message, correlationId, timestamp, details }`

---

## Auth Errors (HEADY-AUTH-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-AUTH-001 | 401 | Invalid or expired session cookie | Re-authenticate via /auth/session |
| HEADY-AUTH-002 | 401 | Firebase ID token validation failed | Token expired — refresh with Firebase SDK |
| HEADY-AUTH-003 | 403 | Session bound to different IP/User-Agent | Re-authenticate from current device |
| HEADY-AUTH-004 | 403 | Insufficient role for resource | Contact admin for role escalation |
| HEADY-AUTH-005 | 429 | Auth rate limit exceeded | Wait for Retry-After header, then retry |
| HEADY-AUTH-006 | 400 | Missing authentication header | Include __Host-heady_session cookie |
| HEADY-AUTH-007 | 503 | Firebase Auth unavailable | Check Firebase status, retry with φ-backoff |
| HEADY-AUTH-008 | 400 | Anonymous auth quota exceeded | FIB[9]=34 req/min for anonymous |
| HEADY-AUTH-009 | 403 | Cross-domain relay origin not whitelisted | Verify domain in CORS whitelist |
| HEADY-AUTH-010 | 500 | Session creation failed | Check auth-session-server logs |

## Brain/Inference Errors (HEADY-BRAIN-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-BRAIN-001 | 503 | All inference providers unavailable | Circuit breakers open — wait φ³×1000ms |
| HEADY-BRAIN-002 | 504 | Inference timeout (φ³×1000ms) | Reduce prompt or try different provider |
| HEADY-BRAIN-003 | 429 | Provider rate limit reached | Budget tracker routes to fallback |
| HEADY-BRAIN-004 | 400 | Invalid prompt format | Check schema-registry vector-query schema |
| HEADY-BRAIN-005 | 500 | Context enrichment failed | Check AutoContext health |
| HEADY-BRAIN-006 | 503 | Model unavailable in region | Check model-gateway availability |
| HEADY-BRAIN-007 | 413 | Prompt exceeds token budget | Reduce input, enable compression |
| HEADY-BRAIN-008 | 500 | Response parsing failed | Provider returned unexpected format |
| HEADY-BRAIN-009 | 503 | pgvector pool exhausted | Check PgBouncer, increase pool size |
| HEADY-BRAIN-010 | 500 | CSL gate evaluation error | Check CSL engine, verify 384-dim vectors |

## Memory/Vector Errors (HEADY-MEM-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-MEM-001 | 400 | Vector dimension mismatch (expected 384) | Use 384-dim embedding model |
| HEADY-MEM-002 | 404 | Namespace not found | Create namespace before querying |
| HEADY-MEM-003 | 503 | HNSW index rebuilding | Wait for rebuild, retry |
| HEADY-MEM-004 | 500 | Embedding generation failed | Check heady-embed health |
| HEADY-MEM-005 | 429 | Vector write rate limit (FIB[11]=89/min) | Batch writes |
| HEADY-MEM-006 | 500 | Vector persistence failed | Check disk space, pgvector WAL |
| HEADY-MEM-007 | 400 | Invalid search threshold (must be 0-1) | Use CSL thresholds: 0.382, 0.618, 0.718 |
| HEADY-MEM-008 | 504 | Vector search timeout (>210ms) | Optimize HNSW or reduce topK |

## Gateway Errors (HEADY-GW-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-GW-001 | 502 | Upstream service unreachable | Check service health, verify DNS |
| HEADY-GW-002 | 429 | API rate limit exceeded | Check Retry-After, upgrade tier |
| HEADY-GW-003 | 401 | API key invalid or missing | Verify X-API-Key header |
| HEADY-GW-004 | 403 | HMAC signature verification failed | Check signing config, clock sync |
| HEADY-GW-005 | 400 | Schema validation failed | Check schema-registry |
| HEADY-GW-006 | 503 | Circuit breaker open | Wait for half-open probe (φ×10s) |
| HEADY-GW-007 | 413 | Payload too large (max FIB[16]=987 KB) | Reduce request size |
| HEADY-GW-008 | 504 | Gateway timeout (φ³×1000ms) | Reduce complexity or increase timeout |

## Billing Errors (HEADY-BILL-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-BILL-001 | 402 | Payment required — free tier limit | Upgrade to Builder or Enterprise |
| HEADY-BILL-002 | 400 | Invalid Stripe webhook signature | Verify webhook secret |
| HEADY-BILL-003 | 500 | Subscription creation failed | Check Stripe API status |
| HEADY-BILL-004 | 403 | Feature not on current tier | Upgrade tier |
| HEADY-BILL-005 | 429 | Metering limit exceeded | 34/89/233 per tier |

## Notification Errors (HEADY-NOTIF-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-NOTIF-001 | 401 | WebSocket token invalid | Re-authenticate and reconnect |
| HEADY-NOTIF-002 | 429 | Notification rate limit (34/min) | Batch or reduce frequency |
| HEADY-NOTIF-003 | 400 | Invalid channel subscription | Use: system, alerts, deployments, agents |
| HEADY-NOTIF-004 | 503 | WebSocket server at capacity | φ-backoff retry, fall back to SSE |
| HEADY-NOTIF-005 | 500 | Push delivery failed | Check subscription, verify VAPID keys |
