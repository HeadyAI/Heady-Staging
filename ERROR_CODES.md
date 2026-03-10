# Heady™ Error Code Catalog

> Every error response across all 50 services uses a unique, structured code.
> Format: `HEADY-{SERVICE}-{NUMBER}` — HTTP Status — Description — Suggested Fix

---

## Global Errors (HEADY-GLOBAL-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-GLOBAL-001 | 401 | Authentication required | Provide valid Firebase session cookie |
| HEADY-GLOBAL-002 | 403 | Insufficient permissions | Check user role and permissions |
| HEADY-GLOBAL-003 | 429 | Rate limit exceeded | Wait for Retry-After header duration |
| HEADY-GLOBAL-004 | 500 | Internal server error | Check service logs with correlation ID |
| HEADY-GLOBAL-005 | 503 | Service unavailable | Check health endpoint; service may be restarting |
| HEADY-GLOBAL-006 | 504 | Gateway timeout | Upstream service did not respond within φ³ (4.236s) |

## Brain / Inference Errors (HEADY-BRAIN-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-BRAIN-001 | 400 | Invalid prompt format | Ensure prompt is a non-empty string < 3948 chars |
| HEADY-BRAIN-002 | 400 | Prompt injection detected | Remove instruction override patterns from input |
| HEADY-BRAIN-003 | 422 | Model not available | Check model name; fallback to default model |
| HEADY-BRAIN-004 | 502 | AI provider unreachable | Provider outage; retry with φ-exponential backoff |
| HEADY-BRAIN-005 | 413 | Context too large | Reduce input size; max Fibonacci 987 × 4 tokens |

## Memory / Vector Errors (HEADY-MEMORY-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-MEMORY-001 | 400 | Invalid embedding dimensions | Provide exactly 384-dimensional vector |
| HEADY-MEMORY-002 | 404 | Content not found in vector store | Verify content hash; re-index if missing |
| HEADY-MEMORY-003 | 500 | pgvector connection pool exhausted | Check PgBouncer status; increase pool_size |
| HEADY-MEMORY-004 | 422 | Duplicate content hash | Content already indexed; use update endpoint |
| HEADY-MEMORY-005 | 504 | HNSW index query timeout | Tune ef_search parameter; check index health |

## Auth Errors (HEADY-AUTH-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-AUTH-001 | 401 | Firebase ID token expired | Re-authenticate via auth.headysystems.com relay |
| HEADY-AUTH-002 | 401 | Session cookie invalid | Clear cookies and re-login |
| HEADY-AUTH-003 | 403 | Anonymous account quota exceeded | Register with email/Google OAuth |
| HEADY-AUTH-004 | 403 | Account suspended | Contact support |
| HEADY-AUTH-005 | 409 | Email already registered | Use existing account or reset password |

## Search Errors (HEADY-SEARCH-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-SEARCH-001 | 400 | Query or embedding required | Provide search query text or 384-dim vector |
| HEADY-SEARCH-002 | 422 | Content type not indexed | Run indexer for the specified content type |
| HEADY-SEARCH-003 | 500 | Search index unavailable | Check pgvector HNSW index + tsvector GIN status |

## Notification Errors (HEADY-NOTIFY-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-NOTIFY-001 | 400 | userId and type required | Include userId and notification type in request |
| HEADY-NOTIFY-002 | 404 | User not connected | User has no active WebSocket or SSE connection |
| HEADY-NOTIFY-003 | 500 | Broadcast failed | Check WebSocket server health |

## Scheduler Errors (HEADY-SCHED-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-SCHED-001 | 400 | Name and interval required | Provide job name and Fibonacci interval key |
| HEADY-SCHED-002 | 404 | Job not found | Check job registry via GET /api/v1/jobs |
| HEADY-SCHED-003 | 503 | Job circuit breaker open | Job failed 5 times; auto-resets after φ³ × interval |

## Event Bus Errors (HEADY-NATS-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-NATS-001 | 503 | NATS connection failed | Check NATS_URL env var; verify NATS server is running |
| HEADY-NATS-002 | 500 | Message publish failed | Check JetStream stream status |
| HEADY-NATS-003 | 500 | Dead letter queue overflow | Process DLQ messages; investigate recurring failures |

## Saga Errors (HEADY-SAGA-xxx)

| Code | HTTP | Description | Fix |
| ---- | ---- | ----------- | --- |
| HEADY-SAGA-001 | 500 | Saga step failed — rolled back | Check saga execution log for failed step details |
| HEADY-SAGA-002 | 500 | Compensation failed | Manual intervention required; check saga log |
| HEADY-SAGA-003 | 504 | Saga step timeout | Step exceeded φ³ (4236ms); check downstream service |

---

*© 2026 HeadySystems Inc. — All error codes use Fibonacci/φ-derived thresholds*
