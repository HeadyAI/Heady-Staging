# Error Code Catalog

HEADY-BRAIN-001 - "pgvector connection pool exhausted" - Increase pool size or check database load.
HEADY-AUTH-001 - "Invalid session token" - Token expired or invalid signature. Require re-authentication.
HEADY-MEM-001 - "Vector memory index out of bounds" - Re-index embeddings.
HEADY-NET-001 - "NATS JetStream timeout" - Message broker unavailable. Switch to fallback polling.
