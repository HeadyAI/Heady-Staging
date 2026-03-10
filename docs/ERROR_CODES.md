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
<!-- HEADY_BRAND:BEGIN -->
<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║ -->
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║ -->
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║ -->
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║ -->
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║ -->
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║ -->
<!-- ║                                                                  ║ -->
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║ -->
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║ -->
<!-- ║  FILE: ERROR_CODES.md                                             ║ -->
<!-- ║  LAYER: documentation                                             ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->
<!-- HEADY_BRAND:END -->

# Heady Error Code Catalog

## Error Code Format

All Heady error codes follow the pattern: `HEADY-{DOMAIN}-{NNN}`

- **DOMAIN:** Three-letter acronym (AUTH, PIPE, BRN, SWRM, NOTIF, ANLYT, VULT, LN)
- **NNN:** Three-digit error number (001–999)

Example: `HEADY-AUTH-005` (authentication rate limit exceeded)

---

## AUTH Domain (001–020)

Authentication, authorization, and user session management errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-AUTH-001 | 401 | login_failed | Invalid username or password | Verify credentials; reset password if needed |
| HEADY-AUTH-002 | 401 | invalid_token | JWT token is malformed or invalid | Re-authenticate and request new token |
| HEADY-AUTH-003 | 401 | token_expired | JWT token has exceeded TTL | Request new token via refresh endpoint |
| HEADY-AUTH-004 | 429 | rate_limited | Too many authentication attempts | Wait 15 minutes before retrying; consider password reset flow |
| HEADY-AUTH-005 | 403 | account_locked | Account locked due to failed login attempts | Contact support or unlock via email verification |
| HEADY-AUTH-006 | 400 | registration_failed | User registration failed | Verify email format, check unique constraints, review terms |
| HEADY-AUTH-007 | 400 | weak_password | Password does not meet complexity requirements | Use 12+ chars, uppercase, lowercase, number, symbol |
| HEADY-AUTH-008 | 409 | session_limit | Maximum concurrent sessions exceeded | Log out oldest session or wait for automatic cleanup |
| HEADY-AUTH-009 | 401 | session_expired | User session has expired | Re-authenticate; ensure 24-hour TTL not exceeded |
| HEADY-AUTH-010 | 403 | permission_denied | User lacks required permission for action | Request elevated role or contact administrator |
| HEADY-AUTH-011 | 400 | invalid_scope | Requested OAuth scope not permitted | Update scope list to match allowed domains |
| HEADY-AUTH-012 | 401 | csrf_token_mismatch | CSRF token validation failed | Refresh page and retry; check cookie settings |
| HEADY-AUTH-013 | 403 | mfa_required | Multi-factor authentication required | Complete MFA challenge via configured device |
| HEADY-AUTH-014 | 400 | invalid_mfa | MFA code is invalid or expired | Re-enter valid code within 30-second window |
| HEADY-AUTH-015 | 401 | api_key_revoked | API key has been revoked | Generate new API key in account settings |
| HEADY-AUTH-016 | 401 | api_key_expired | API key has expired | Regenerate API key; consider rotating every 90 days |
| HEADY-AUTH-017 | 400 | email_not_verified | Email address not yet verified | Check inbox for verification link; resend if needed |
| HEADY-AUTH-018 | 403 | ip_blocked | IP address blocked by security policy | Contact support to whitelist IP; use VPN if required |
| HEADY-AUTH-019 | 401 | oauth_provider_error | External OAuth provider returned error | Verify OAuth app credentials; check provider status |
| HEADY-AUTH-020 | 400 | invalid_credentials_format | Credentials format incorrect | Use format: 'Authorization: Bearer {token}' |

---

## PIPE Domain (001–010)

Pipeline execution, configuration, and checkpoint errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-PIPE-001 | 500 | stage_failed | Pipeline stage execution failed | Check stage logs; verify input data; review stage config |
| HEADY-PIPE-002 | 400 | config_invalid | Pipeline configuration is invalid | Validate YAML syntax; ensure all required fields present |
| HEADY-PIPE-003 | 500 | checkpoint_failed | Checkpoint save/restore operation failed | Check disk space; verify file permissions; review logs |
| HEADY-PIPE-004 | 504 | timeout | Pipeline stage exceeded timeout threshold | Increase timeout in config; optimize stage logic; add parallelism |
| HEADY-PIPE-005 | 400 | dependency_missing | Required input dependency not available | Verify prior stages ran successfully; check data availability |
| HEADY-PIPE-006 | 500 | resource_exhausted | Insufficient resources (CPU, memory, disk) | Scale up container; reduce parallelism; cleanup artifacts |
| HEADY-PIPE-007 | 400 | invalid_stage_definition | Stage definition contains errors | Review hcfullpipeline.yaml; check schema compliance |
| HEADY-PIPE-008 | 409 | pipeline_in_progress | Another pipeline run already in progress | Wait for prior run to complete; check for stuck processes |
| HEADY-PIPE-009 | 500 | rollback_failed | Pipeline rollback operation failed | Review checkpoint integrity; may require manual intervention |
| HEADY-PIPE-010 | 400 | invalid_dag | Dependency graph contains cycles or conflicts | Reorder stages; resolve circular dependencies |

---

## BRN Domain (001–010)

System Brain inference, model availability, and cognitive processing errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-BRN-001 | 500 | inference_failed | Model inference request failed | Retry operation; check input token count; review model logs |
| HEADY-BRN-002 | 503 | model_unavailable | Model endpoint is unavailable | Wait for model restart; check Anthropic API status; retry |
| HEADY-BRN-003 | 400 | context_overflow | Input context exceeds model maximum token window | Reduce input size; use summarization; split into chunks |
| HEADY-BRN-004 | 403 | csl_gate_rejected | CSL (Coherence Safety Layer) gate rejected operation | Operation violates safety policy; review constraints; retry with different input |
| HEADY-BRN-005 | 429 | rate_limited | Inference requests exceed rate limit | Wait 60 seconds; optimize batch size; upgrade API plan |
| HEADY-BRN-006 | 400 | invalid_prompt | Prompt format or content is invalid | Review prompt syntax; ensure valid JSON structure |
| HEADY-BRN-007 | 500 | memory_exhausted | Brain memory buffer at capacity | Clear cache; reduce batch size; restart service |
| HEADY-BRN-008 | 400 | unsupported_model | Requested model version not supported | Use latest supported model; check version compatibility |
| HEADY-BRN-009 | 503 | api_unavailable | Claude API temporarily unavailable | Retry with exponential backoff; check Anthropic status page |
| HEADY-BRN-010 | 400 | invalid_temperature | Temperature parameter outside valid range | Use value between 0.0 and 2.0; 0.7 is recommended |

---

## SWRM Domain (001–010)

HeadyBee swarm orchestration, task scheduling, and bee availability errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-SWRM-001 | 504 | task_timeout | Swarm task exceeded maximum execution time | Increase task timeout; optimize task logic; reduce scope |
| HEADY-SWRM-002 | 503 | bee_unavailable | Bee worker unavailable or crashed | Restart bee; check resource usage; review crash logs |
| HEADY-SWRM-003 | 503 | swarm_overloaded | Swarm at maximum capacity; cannot accept new tasks | Reduce task submission rate; scale up bee count; use queue |
| HEADY-SWRM-004 | 500 | task_failed | Task execution failed within bee | Review task logs; check input parameters; verify dependencies |
| HEADY-SWRM-005 | 400 | invalid_task_definition | Task definition malformed or incomplete | Verify task schema; ensure all required fields present |
| HEADY-SWRM-006 | 409 | task_already_running | Task with same ID already executing | Wait for completion; use unique task IDs; check queue status |
| HEADY-SWRM-007 | 503 | bee_heartbeat_missed | Bee missed multiple heartbeat signals | Restart bee; check network connectivity; review health checks |
| HEADY-SWRM-008 | 500 | swarm_coordination_failed | Swarm coordination protocol error | Restart swarm; verify network; check distributed lock service |
| HEADY-SWRM-009 | 400 | insufficient_concurrency | Requested concurrency exceeds swarm limits | Reduce concurrent task limit; add more bees; optimize task parallelism |
| HEADY-SWRM-010 | 500 | task_result_loss | Task completed but result could not be persisted | Check storage availability; retry task; review logs |

---

## NOTIF Domain (001–005)

Real-time notification and Server-Sent Events (SSE) delivery errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-NOTIF-001 | 500 | send_failed | Notification delivery failed | Retry; check delivery status; verify recipient channel |
| HEADY-NOTIF-002 | 400 | invalid_channel | Notification channel not recognized or invalid | Use valid channel: email, sms, slack, webhook, sse |
| HEADY-NOTIF-003 | 503 | sse_disconnected | Server-Sent Events connection lost | Reconnect SSE client; check network; verify server health |
| HEADY-NOTIF-004 | 400 | invalid_template | Notification template not found or invalid | Verify template name; ensure variables match template schema |
| HEADY-NOTIF-005 | 429 | notification_rate_limited | Too many notifications sent in short time | Implement backoff; batch notifications; upgrade plan |

---

## ANLYT Domain (001–005)

Analytics event collection, metrics processing, and data validation errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-ANLYT-001 | 400 | event_rejected | Analytics event failed validation | Check event schema; ensure required fields present; verify data types |
| HEADY-ANLYT-002 | 503 | buffer_full | Analytics buffer at capacity; events being dropped | Increase buffer size; flush buffer; upgrade storage |
| HEADY-ANLYT-003 | 400 | invalid_metric | Metric definition or value invalid | Use valid metric type; ensure value is numeric; check precision |
| HEADY-ANLYT-004 | 429 | analytics_rate_limited | Event submission rate exceeds limit | Reduce submission frequency; batch events; implement queue |
| HEADY-ANLYT-005 | 500 | processing_failed | Analytics event processing pipeline failed | Retry; check processor service; review error logs |

---

## VULT Domain (001–005)

Secret vault, credential management, and encryption key errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-VULT-001 | 404 | secret_missing | Requested secret not found in vault | Verify secret name; check namespace; create if needed |
| HEADY-VULT-002 | 500 | rotation_failed | Secret rotation operation failed | Retry rotation; check vault health; review rotation policy |
| HEADY-VULT-003 | 403 | access_denied | User lacks permission to access secret | Request elevated access; contact vault administrator |
| HEADY-VULT-004 | 503 | vault_unavailable | Vault service temporarily unavailable | Wait for vault recovery; check status page; retry operation |
| HEADY-VULT-005 | 500 | encryption_failed | Secret encryption/decryption failed | Check encryption key; verify payload format; review logs |

---

## LN Domain (001–005)

Liquid Nodes external service integration and connection errors.

| Code | HTTP | Name | Description | Suggested Fix |
|------|------|------|-------------|---------------|
| HEADY-LN-001 | 503 | node_unreachable | Liquid Node endpoint not reachable | Verify network connectivity; check endpoint status; retry with backoff |
| HEADY-LN-002 | 401 | auth_failed | Liquid Node authentication failed | Verify API key; check credentials; rotate if needed |
| HEADY-LN-003 | 429 | quota_exceeded | Liquid Node quota/rate limit exceeded | Wait before retrying; upgrade service plan; reduce request rate |
| HEADY-LN-004 | 502 | node_error | Liquid Node returned unexpected error | Review node logs; check input parameters; contact provider |
| HEADY-LN-005 | 504 | node_timeout | Liquid Node request exceeded timeout | Increase timeout; optimize request; retry operation |

---

## Error Response Format

All error responses follow this JSON structure:

```json
{
  "error": true,
  "code": "HEADY-{DOMAIN}-{NNN}",
  "message": "Human-readable error description",
  "timestamp": "2026-03-10T14:23:45Z",
  "requestId": "req_abc123def456",
  "details": {
    "stage": "pipeline_stage_name",
    "context": "Additional context about the error",
    "retryable": true,
    "retryAfter": 60
  },
  "suggestedActions": [
    "First action to try",
    "Second action to try"
  ]
}
```

---

## Retry Strategy

- **Retryable errors** (marked `retryable: true`): Implement exponential backoff with jitter
  - Base delay: 1 second
  - Max delay: 60 seconds
  - Max retries: 5
- **Non-retryable errors** (validation, auth): Do not retry; fix underlying issue
- **Rate-limited errors**: Respect `retryAfter` header; implement queue

---

## Error Logging

All errors are logged with context:

```json
{
  "timestamp": "2026-03-10T14:23:45.123Z",
  "level": "error",
  "code": "HEADY-AUTH-004",
  "message": "Rate limit exceeded",
  "userId": "user_123",
  "requestId": "req_abc123def456",
  "domain": "AUTH",
  "errorNumber": 4,
  "httpStatus": 429,
  "duration_ms": 245
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-10 | Initial catalog; 65 error codes across 8 domains |
