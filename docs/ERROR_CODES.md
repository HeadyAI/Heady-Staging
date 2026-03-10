# Heady Error Codes Reference

## Error Domains

| Domain | Prefix | Range | Description |
|--------|--------|-------|-------------|
| AUTH | AUTH_ | 1000-1999 | Authentication and session errors |
| API | API_ | 2000-2999 | API request and response errors |
| DATA | DATA_ | 3000-3999 | Database and data errors |
| INFRA | INFRA_ | 4000-4999 | Infrastructure and container errors |
| AGENT | AGENT_ | 5000-5999 | AI agent errors |
| MEMORY | MEM_ | 6000-6999 | Vector memory errors |
| BILLING | BILL_ | 7000-7999 | Billing and payment errors |
| SEARCH | SRCH_ | 8000-8999 | Search and indexing errors |
| DEPLOY | DEPL_ | 9000-9999 | Deployment errors |

## Severity Levels (φ-derived)

| Level | Threshold | Retryable | Description |
|-------|-----------|-----------|-------------|
| CRITICAL | ≈0.927 (phiThreshold(4)) | No | System-breaking, immediate action |
| HIGH | ≈0.882 (phiThreshold(3)) | No | Significant impact, urgent |
| MEDIUM | ≈0.809 (phiThreshold(2)) | Yes | Degraded but functional |
| LOW | ≈0.691 (phiThreshold(1)) | Yes | Minor impact |
| INFO | ≈0.500 (phiThreshold(0)) | Yes | Informational |

## Complete Error Catalog

### AUTH (Authentication)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| AUTH_1001 | CRITICAL | 401 | Session expired | Re-authenticate via Firebase relay |
| AUTH_1002 | HIGH | 403 | CSRF token invalid | Generate new CSRF token |
| AUTH_1003 | CRITICAL | 403 | Device fingerprint mismatch | Revoke session and re-authenticate |
| AUTH_1004 | MEDIUM | 429 | Rate limit exceeded | Wait for φ-backoff delay |

### API (Request/Response)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| API_2001 | MEDIUM | 400 | Invalid request payload | Validate against API contract schema |
| API_2002 | LOW | 404 | Resource not found | Verify resource ID |
| API_2003 | HIGH | 503 | Service unavailable | Check service health, failover to backup |
| API_2004 | MEDIUM | 422 | Contract validation failed | Check schema compatibility |

### DATA (Database)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| DATA_3001 | CRITICAL | 500 | Database connection failed | Check PgBouncer pool, failover to replica |
| DATA_3002 | HIGH | 500 | Migration drift detected | Run drift detection and reconcile |
| DATA_3003 | MEDIUM | 200 | Vector index degraded | Rebuild HNSW index (m=21, efConstruction=144) |

### INFRA (Infrastructure)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| INFRA_4001 | CRITICAL | 503 | Container health check failed | Restart container, check resource limits |
| INFRA_4002 | HIGH | 503 | Circuit breaker open | Wait for half-open probe |
| INFRA_4003 | MEDIUM | 200 | Resource pressure elevated | Scale up or shed low-priority load |

### AGENT (AI Agent)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| AGENT_5001 | HIGH | 500 | Agent coherence drift | Re-embed and check against HeadySoul |
| AGENT_5002 | MEDIUM | 400 | Prompt injection detected | Sanitize input, log for security review |
| AGENT_5003 | CRITICAL | 403 | Autonomy guardrail triggered | Escalate to human review |

### MEMORY (Vector Memory)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| MEM_6001 | HIGH | 507 | Vector memory full | Evict using φ-weighted scoring |
| MEM_6002 | MEDIUM | 400 | Embedding dimension mismatch | Check embedding model configuration |

### BILLING (Payments)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| BILL_7001 | HIGH | 402 | Credit limit reached | Upgrade plan or wait for reset |
| BILL_7002 | CRITICAL | 402 | Payment failed | Update payment method in Stripe |

### SEARCH (Search)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| SRCH_8001 | MEDIUM | 200 | Search index stale | Trigger re-index |

### DEPLOY (Deployment)
| Code | Severity | HTTP | Message | Action |
|------|----------|------|---------|--------|
| DEPL_9001 | CRITICAL | 500 | Deployment rollback triggered | Check deployment logs, restore previous version |
| DEPL_9002 | HIGH | 500 | Canary failure detected | Halt rollout, revert canary |
