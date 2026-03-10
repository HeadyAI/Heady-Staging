# Heady Error Catalog — Sacred Genesis v4.0.0

All error codes: `HEADY-{DOMAIN}-{NUMBER}`
Domains: AUTH, API, CSL, VEC, MCP, NET, DB, CFG, SEC, SYS, BEE, CON, GOV

## Authentication (HEADY-AUTH-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| AUTH-001 | 401 | Session expired | Re-authenticate |
| AUTH-002 | 401 | Invalid session | Clear cookies, re-auth |
| AUTH-003 | 403 | CSRF mismatch | Ensure CSRF header matches cookie |
| AUTH-004 | 403 | Insufficient permissions | Request elevated role |
| AUTH-005 | 429 | Auth rate limit | Wait for window reset |
| AUTH-006 | 401 | Invalid credentials | Verify and retry |
| AUTH-007 | 403 | Account locked | Contact admin |
| AUTH-008 | 401 | Token revoked | Generate new API key |

## API (HEADY-API-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| API-001 | 400 | Invalid request body | Check request schema |
| API-002 | 404 | Endpoint not found | Check API reference |
| API-003 | 405 | Method not allowed | Use correct HTTP method |
| API-004 | 413 | Payload too large | Reduce payload |
| API-005 | 415 | Unsupported media type | Use application/json |
| API-006 | 429 | Rate limit exceeded | Reduce frequency |
| API-007 | 503 | Service unavailable | Retry with phi-backoff |

## CSL Engine (HEADY-CSL-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| CSL-001 | 400 | Invalid vector dimensions | Ensure 384D vectors |
| CSL-002 | 400 | Zero-magnitude vector | Provide non-zero vectors |
| CSL-003 | 422 | Gate threshold not met | Increase alignment |
| CSL-004 | 500 | Routing failure | Check route registration |
| CSL-005 | 422 | Consensus failure | Increase vote count |

## Vector Memory (HEADY-VEC-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| VEC-001 | 400 | Invalid embedding format | Provide 384 float array |
| VEC-002 | 404 | Vector not found | Verify vector ID |
| VEC-003 | 409 | Duplicate vector ID | Use unique ID |
| VEC-004 | 507 | Storage capacity exceeded | Archive old vectors |
| VEC-005 | 500 | Index search failure | Rebuild vector index |
| VEC-006 | 503 | Embedding provider unavailable | Wait for recovery |

## MCP Gateway (HEADY-MCP-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| MCP-001 | 400 | Invalid tool request | Check tool schema |
| MCP-002 | 403 | Tool execution denied | Verify alignment |
| MCP-003 | 404 | Tool not found | Check discovery endpoint |
| MCP-004 | 408 | Tool execution timeout | Retry or extend timeout |
| MCP-005 | 503 | Sandbox allocation failed | Wait for pool |
| MCP-006 | 507 | Sandbox memory exceeded | Optimize tool |

## Network (HEADY-NET-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| NET-001 | 502 | Bad gateway | Check upstream health |
| NET-002 | 504 | Gateway timeout | Increase timeout |
| NET-003 | 503 | Circuit breaker open | Wait for phi-backoff |
| NET-004 | 503 | Bulkhead full | Retry after backoff |
| NET-005 | 503 | Connection pool exhausted | Wait for pool |

## Database (HEADY-DB-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| DB-001 | 503 | Connection failed | Check DB/PgBouncer |
| DB-002 | 503 | Pool exhausted | Kill idle connections |
| DB-003 | 500 | Query execution error | Check query syntax |
| DB-004 | 409 | Constraint violation | Check constraints |
| DB-005 | 500 | Migration failed | Restore backup |

## System (HEADY-SYS-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| SYS-001 | 500 | Internal server error | Check logs |
| SYS-002 | 503 | Service starting | Wait for startup |
| SYS-003 | 503 | Graceful shutdown | Wait for new instance |
| SYS-004 | 500 | Memory exhaustion | Restart, investigate |

## Bee/Agent (HEADY-BEE-*), Conductor (HEADY-CON-*), Governance (HEADY-GOV-*)
| Code | HTTP | Message | Resolution |
|------|------|---------|------------|
| BEE-001 | 500 | Bee spawn failed | Check factory/resources |
| BEE-002 | 404 | Bee not found | Register bee type |
| BEE-003 | 503 | Swarm capacity exceeded | Scale pool |
| CON-001 | 500 | Routing failure | Update routing table |
| CON-002 | 500 | Pipeline stage failed | Check stage/node health |
| GOV-001 | 403 | Policy violation | Review policy |
| GOV-002 | 403 | Approval required | Submit approval request |
| GOV-003 | 409 | Audit chain broken | Investigate, restore |
