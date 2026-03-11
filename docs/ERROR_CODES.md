# HEADY Error Code Catalog

Comprehensive error code reference for all HEADY microservices. Format: `HEADY-{SERVICE}-{NUMBER} | HTTP Status | Description | Suggested Fix`

---

## HEADY-BRAIN (Inference Service)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-BRAIN-001 | 400 | Invalid inference request schema | Verify request matches OpenAPI spec; check required fields (prompt, domain_id) |
| HEADY-BRAIN-002 | 400 | Prompt exceeds maximum length (50K tokens) | Truncate or split prompt; use longer context windows for truncated content |
| HEADY-BRAIN-003 | 401 | Inference not permitted for user role | Check user permissions; request elevated access if required |
| HEADY-BRAIN-004 | 403 | Domain ID mismatch in session token | Session token contains different domain; re-authenticate or use correct domain |
| HEADY-BRAIN-005 | 408 | Inference timeout exceeded (default 120s) | Prompt too complex; reduce payload; increase timeout if extended inference needed |
| HEADY-BRAIN-006 | 429 | Rate limit exceeded for domain | Domain exceeded quota (34 inferences/sec); implement backoff; contact support for quota increase |
| HEADY-BRAIN-007 | 500 | LLM API unavailable (OpenAI/Anthropic down) | Retry with exponential backoff (1.618x); monitor upstream provider status |
| HEADY-BRAIN-008 | 500 | Model context window overflow | Reduce prompt or number of examples; use summarization for context |
| HEADY-BRAIN-009 | 503 | No available inference replicas | Service temporarily overloaded; retry after 30s; contact ops if persistent |
| HEADY-BRAIN-010 | 400 | Invalid model selection | Use valid model name (gpt-4-turbo, claude-3-opus); check documentation for available models |
| HEADY-BRAIN-011 | 500 | Embeddings generation failed | Check heady-embed service health; verify text input is valid UTF-8 |
| HEADY-BRAIN-012 | 503 | Inference service degraded | Metrics indicate elevated latency; switch to lower confidence path if configured |
| HEADY-BRAIN-013 | 400 | Safety filter triggered on input | Input contains prohibited content (violence, illegal activity); reformulate prompt |
| HEADY-BRAIN-014 | 400 | Safety filter triggered on output | Model output blocked; try different prompt or model; contact support if false positive |
| HEADY-BRAIN-015 | 500 | Internal cache corruption | Flush inference cache (heady-brain POST /admin/cache/clear); restart service if persistent |

---

## HEADY-AUTH (Authentication & Session Service)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-AUTH-001 | 400 | Invalid Firebase ID token format | Token malformed; user should re-authenticate with Firebase |
| HEADY-AUTH-002 | 401 | Firebase ID token expired | Token's exp claim in past; user must re-authenticate |
| HEADY-AUTH-003 | 401 | Firebase ID token signature invalid | Token tampered with or signed by wrong key; reject and re-authenticate |
| HEADY-AUTH-004 | 400 | User not found in domain | User authenticated globally but not enrolled in this specific domain; admin must add user |
| HEADY-AUTH-005 | 403 | User disabled in domain | Admin disabled user account; contact domain administrator |
| HEADY-AUTH-006 | 429 | Too many failed login attempts | Account temporarily locked (30 min); user must wait or reset password |
| HEADY-AUTH-007 | 400 | Session cookie invalid or tampered | Clear browser cookies; user must re-authenticate |
| HEADY-AUTH-008 | 401 | Session token expired | Token's exp claim in past; refresh token to get new access token |
| HEADY-AUTH-009 | 401 | Refresh token revoked | Session revoked by admin or due to security event; user must re-authenticate |
| HEADY-AUTH-010 | 500 | Secret Manager unreachable (Google Cloud) | Check GCP credentials and network connectivity; contact ops |
| HEADY-AUTH-011 | 400 | MFA required but not provided | User has MFA enabled; provide TOTP code or use SMS verification |
| HEADY-AUTH-012 | 400 | MFA code invalid or expired | TOTP codes valid for 30s; user must provide current code |
| HEADY-AUTH-013 | 401 | Cross-domain SSO relay failed | Relay service unavailable; user can only authenticate at original domain |
| HEADY-AUTH-014 | 500 | NATS event publish failed | Event bus unavailable; user authenticated but audit log may be missed; contact ops |
| HEADY-AUTH-015 | 400 | Domain ID in token doesn't match request domain | Session token for domain-a; request for domain-b; user needs separate session |

---

## HEADY-MEMORY (Vector Similarity Search)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-MEMORY-001 | 400 | Query vector dimension mismatch | Vector has N dimensions; index expects M dimensions; regenerate embeddings |
| HEADY-MEMORY-002 | 400 | Vector contains NaN or Inf | Embedding invalid (contains null values); check embedding generation process |
| HEADY-MEMORY-003 | 503 | pgvector connection pool exhausted | Too many concurrent queries; increase connection pool size (PgBouncer) |
| HEADY-MEMORY-004 | 408 | Vector similarity query timeout | Query taking >30s; too many vectors or inefficient index; rebuild HNSW index |
| HEADY-MEMORY-005 | 400 | Invalid similarity metric | Use 'l2', 'cosine', or 'inner_product'; check metric configuration |
| HEADY-MEMORY-006 | 429 | Rate limit exceeded for domain | Domain exceeded vector query quota; implement query batching |
| HEADY-MEMORY-007 | 500 | HNSW index corrupted | Index file damaged; rebuild via REINDEX heady_memory_idx; contact ops |
| HEADY-MEMORY-008 | 500 | Database connection lost | Network issue to PostgreSQL; retry with exponential backoff |
| HEADY-MEMORY-009 | 400 | Document ID not found | Document deleted or never inserted; check insertion logs |
| HEADY-MEMORY-010 | 500 | Backup restore in progress | Database in read-only mode during restore; retry after restore completes |
| HEADY-MEMORY-011 | 400 | Query limit exceeds maximum (1000) | Requesting top 2000 results; reduce limit to 1000 |
| HEADY-MEMORY-012 | 500 | Replication lag detected | Replica significantly behind primary; queries may be stale; use primary for consistency |
| HEADY-MEMORY-013 | 400 | Domain isolation violation in query | Query pattern suggests cross-domain data leak; security team investigation required |
| HEADY-MEMORY-014 | 500 | Memory usage critical (>95%) | PostgreSQL running low on memory; reduce concurrent queries or add RAM |
| HEADY-MEMORY-015 | 503 | Read replica unavailable | All replicas offline; routing to primary (slower); contact ops |

---

## HEADY-EMBED (Embedding Generation)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-EMBED-001 | 400 | Text exceeds maximum length (100K chars) | Split text into chunks; send multiple requests |
| HEADY-EMBED-002 | 400 | Text is empty or whitespace only | Provide non-empty text for embedding |
| HEADY-EMBED-003 | 400 | Invalid model selection | Use valid embedding model (text-embedding-3-small, text-embedding-3-large) |
| HEADY-EMBED-004 | 401 | OpenAI/Cohere API key invalid | Check API credentials in Secret Manager; verify key hasn't been rotated |
| HEADY-EMBED-005 | 429 | Embedding API rate limit exceeded | Wait before retrying; implement token bucket rate limiting |
| HEADY-EMBED-006 | 500 | Embedding service timeout (>30s) | Embedding provider slow or unavailable; retry with backoff |
| HEADY-EMBED-007 | 503 | Embedding model overloaded | Provider at capacity; queue request in NATS JetStream for async processing |
| HEADY-EMBED-008 | 400 | Language not supported | Embedding model supports most languages; verify text encoding is UTF-8 |
| HEADY-EMBED-009 | 500 | Cache write failed | Redis unavailable; embeddings still generated but not cached; restart Redis |
| HEADY-EMBED-010 | 500 | Dimension mismatch with stored model config | Model changed embeddings dimensions; regenerate all embeddings |
| HEADY-EMBED-011 | 429 | Domain quota exceeded | Domain hit monthly embedding quota; contact sales for higher quota |
| HEADY-EMBED-012 | 400 | Invalid encoding parameter | Use 'utf-8' or 'base64'; invalid encodings rejected |
| HEADY-EMBED-013 | 500 | NATS publish failed | Event bus down; embedding generated but not persisted to memory; retry |
| HEADY-EMBED-014 | 401 | Domain not authorized for this model | Domain restricted to certain embedding models; contact ops |
| HEADY-EMBED-015 | 503 | GPU memory exhausted | Inference cluster low on VRAM; reduce batch size or wait for resources |

---

## HEADY-GATEWAY (API Gateway)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-GATEWAY-001 | 400 | Missing required header (domain_id, authorization) | Include domain_id and Authorization headers in all requests |
| HEADY-GATEWAY-002 | 401 | Authorization header missing or malformed | Provide valid Bearer token in Authorization header |
| HEADY-GATEWAY-003 | 403 | Request origin not whitelisted | Client IP not in whitelist; contact ops if legitimate; use VPN if from office |
| HEADY-GATEWAY-004 | 429 | Rate limit exceeded | Domain hit rate limit (34 req/sec); implement exponential backoff (1.618x) |
| HEADY-GATEWAY-005 | 408 | Backend service timeout | Upstream service (heady-brain, etc.) not responding in time; retry or escalate |
| HEADY-GATEWAY-006 | 502 | Bad gateway; upstream returned invalid response | Upstream service bug or corruption; contact service owner; restart if persistent |
| HEADY-GATEWAY-007 | 503 | All upstream replicas unavailable | Service mesh shows no healthy instances; contact ops immediately |
| HEADY-GATEWAY-008 | 400 | Invalid request method for endpoint | Use correct HTTP verb (GET /items, POST /items, etc.) |
| HEADY-GATEWAY-009 | 413 | Request body exceeds max size (10MB) | Reduce payload; split large uploads into chunks |
| HEADY-GATEWAY-010 | 400 | Query parameter validation failed | Check parameter types and ranges per OpenAPI spec |
| HEADY-GATEWAY-011 | 401 | Invalid API key | API key expired, revoked, or wrong; generate new key in dashboard |
| HEADY-GATEWAY-012 | 403 | TLS certificate validation failed | Client certificate invalid or not registered; verify mTLS setup |
| HEADY-GATEWAY-013 | 430 | Circuit breaker open for upstream service | Service failing; circuit breaker temporarily blocking requests; wait 30s and retry |
| HEADY-GATEWAY-014 | 500 | Internal gateway error | Envoy proxy crash or configuration error; contact ops |
| HEADY-GATEWAY-015 | 503 | Dependency chain broken | One service down causing cascade; check service health dashboard |

---

## HEADY-GUARD (Permission & RBAC Service)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-GUARD-001 | 403 | User lacks required permission for action | User role doesn't include required permission; request from admin |
| HEADY-GUARD-002 | 403 | Domain admin permission required | Action requires domain admin role; contact domain administrator |
| HEADY-GUARD-003 | 403 | Resource ownership violation | User attempting to modify resource owned by another user; contact owner |
| HEADY-GUARD-004 | 403 | Feature not enabled for domain | Feature behind feature flag; contact sales to enable |
| HEADY-GUARD-005 | 400 | Invalid permission syntax in policy | Policy JSON malformed; check policy format in documentation |
| HEADY-GUARD-006 | 500 | Permission cache expired | Cached permissions stale; service re-fetching from database; retry |
| HEADY-GUARD-007 | 403 | Cross-domain access blocked | Request includes data from multiple domains; users restricted to single domain |
| HEADY-GUARD-008 | 500 | Role hierarchy circular reference | Admin misconfigured role inheritance (role inherits itself); contact ops |
| HEADY-GUARD-009 | 403 | IP-based access control violation | Request from non-whitelisted IP; add IP to access control list or use VPN |
| HEADY-GUARD-010 | 403 | Time-based access restriction | Access window closed (access only 9am-5pm EST); retry during access hours |
| HEADY-GUARD-011 | 400 | Invalid policy expression | Policy uses invalid fields or syntax; validate against schema |
| HEADY-GUARD-012 | 500 | Policy evaluation timeout | Complex policy taking >5s to evaluate; simplify policy or optimize database |
| HEADY-GUARD-013 | 403 | Sensitive operation requires re-authentication | Delete, share, or sensitive action; user must re-authenticate within 5 min |
| HEADY-GUARD-014 | 403 | Data classification level mismatch | Data classified as confidential; user doesn't have clearance |
| HEADY-GUARD-015 | 500 | Audit log write failed | Permission granted but audit failure; NATS event bus down; contact ops |

---

## HEADY-CONDUCTOR (Workflow Orchestration)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-CONDUCTOR-001 | 400 | Invalid workflow definition | Workflow YAML/JSON malformed; validate syntax |
| HEADY-CONDUCTOR-002 | 400 | Missing required workflow input | Workflow expects 'input_data' field; provide in request |
| HEADY-CONDUCTOR-003 | 400 | Task definition not found | Referenced task doesn't exist; check workflow steps |
| HEADY-CONDUCTOR-004 | 409 | Workflow already running | Cannot start duplicate workflow for same resource; wait or cancel previous |
| HEADY-CONDUCTOR-005 | 500 | Task execution failed | Specific task returned error; check task logs for details |
| HEADY-CONDUCTOR-006 | 408 | Workflow timeout exceeded | Workflow took >3600s; increase timeout or optimize steps |
| HEADY-CONDUCTOR-007 | 503 | Workflow engine at capacity | Queue full; create workflow after existing ones complete |
| HEADY-CONDUCTOR-008 | 400 | Invalid task output | Task output doesn't match expected schema; task developer must fix |
| HEADY-CONDUCTOR-009 | 500 | Workflow state corrupted | Internal state inconsistent; manual intervention required; contact ops |
| HEADY-CONDUCTOR-010 | 400 | Conditional branch failed to evaluate | Branch condition refers to undefined variable; check workflow variables |
| HEADY-CONDUCTOR-011 | 500 | Downstream task not yet ready | Workflow waiting for external task; may be stuck; check upstream services |
| HEADY-CONDUCTOR-012 | 409 | Workflow already completed | Cannot rerun completed workflow; create new workflow instance |
| HEADY-CONDUCTOR-013 | 400 | Invalid retry policy | Retry count must be 0-10; backoff must be valid duration string |
| HEADY-CONDUCTOR-014 | 500 | Event listener misconfigured | Workflow waiting for event that no service publishes; fix event subscription |
| HEADY-CONDUCTOR-015 | 503 | Dependency service unreachable | Task depends on unavailable service; wait for service recovery and retry |

---

## HEADY-HIVE (Multi-Domain Request Aggregation)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-HIVE-001 | 400 | Invalid domain list in aggregation request | Domains must be array of strings; check format |
| HEADY-HIVE-002 | 403 | User not authorized to aggregate across domains | User limited to single domain; admin permission required |
| HEADY-HIVE-003 | 429 | Aggregation quota exceeded | Multi-domain request counts as N requests; implement rate limiting |
| HEADY-HIVE-004 | 408 | Aggregation timeout (slowest domain exceeded 30s) | One domain slower than others; increase timeout or query fewer domains |
| HEADY-HIVE-005 | 206 | Partial response; some domains failed | Some domains returned errors; check partial results for details |
| HEADY-HIVE-006 | 400 | Inconsistent result schemas from domains | Domains returned different fields; may indicate schema drift; contact domain admins |
| HEADY-HIVE-007 | 500 | Aggregation merge failed | Merging results caused error (e.g., duplicate key collision); check data |
| HEADY-HIVE-008 | 400 | Too many domains in single request | Maximum 10 domains per request; split into multiple requests |
| HEADY-HIVE-009 | 500 | Domain coordination service unavailable | Service registering domain availability down; retry or contact ops |
| HEADY-HIVE-010 | 403 | Cross-domain data correlation blocked | Security policy prevents correlating data across domains; use single domain |
| HEADY-HIVE-011 | 400 | Aggregation strategy unsupported | Use 'merge', 'intersect', or 'union' strategies |
| HEADY-HIVE-012 | 500 | Result deduplication failed | Cannot deduplicate results (complex objects); check result format |
| HEADY-HIVE-013 | 400 | Domain response size exceeds limit | Individual domain response too large; filter results or use pagination |
| HEADY-HIVE-014 | 500 | Caching layer failed for aggregation | Redis unavailable; aggregation still performed but not cached |
| HEADY-HIVE-015 | 408 | Deadlock detected in domain coordination | Multiple aggregations trying to access same resources; retry with backoff |

---

## HEADY-BRAIN (Additional Inference Errors)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-BRAIN-016 | 400 | Unsupported content type in multimodal request | Use 'text/plain', 'image/jpeg', 'image/png', 'application/pdf' |
| HEADY-BRAIN-017 | 413 | Image payload exceeds size limit (100MB) | Compress image or split into chunks |
| HEADY-BRAIN-018 | 400 | Model doesn't support multimodal input | Selected model text-only; use gpt-4-vision for vision tasks |
| HEADY-BRAIN-019 | 500 | Vision preprocessing failed | Image corruption or unsupported format; use standard formats (JPEG, PNG, GIF) |
| HEADY-BRAIN-020 | 400 | Conflicting system and user instructions | System prompt conflicts with user instructions; resolve conflict in prompt |

---

## Common HTTP Status Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request format, required fields, parameter types |
| 401 | Unauthorized | Re-authenticate or provide valid API key |
| 403 | Forbidden | Check permissions; request access if needed |
| 408 | Request Timeout | Reduce payload or increase timeout |
| 429 | Too Many Requests | Implement exponential backoff; increase quota if needed |
| 500 | Internal Server Error | Check service logs; contact ops; retry after delay |
| 502 | Bad Gateway | Upstream service error; contact service owner |
| 503 | Service Unavailable | Service overloaded or down; wait and retry |

---

## Debugging Workflow

1. **Locate Error Code:** Find HEADY-SERVICE-### in error response
2. **Read Description:** Understand root cause
3. **Apply Suggested Fix:** Follow recommended action
4. **Retry:** Use exponential backoff (100ms, 162ms, 262ms, 424ms, ...)
5. **Escalate:** If fix doesn't work, contact ops with error code and request ID

---

## Error Code Best Practices

- **Include Request ID:** Always include X-Request-ID header in support tickets
- **Check Service Status:** Before contacting support, verify service health dashboard
- **Review Logs:** If ops access required, check logs: `kubectl logs -f pod-name`
- **Rate Limiting:** Use golden ratio scaling (φ-based backoff): multiply by 1.618x each retry

