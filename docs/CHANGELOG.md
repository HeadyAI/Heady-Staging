# Changelog — Heady Platform

## [4.0.0] — Sacred Genesis — 2026-03-10

### Added
- Complete platform rebuild from first principles
- 60 microservices with health probes, structured logging, phi-scaled middleware
- 9 website frontends with Sacred Geometry CSS, JSON-LD, WCAG 2.1 AA
- Shared phi-math foundation — all constants derive from phi/Fibonacci
- CSL engine with AND, OR, NOT, IMPLY, XOR, CONSENSUS, GATE operations
- Sacred Geometry orchestration topology with 5-ring node placement
- Circuit breaker with phi-exponential backoff and bulkhead isolation
- Multi-provider embedding router (Nomic, Jina, Cohere, Voyage, Ollama)
- MCP gateway with CSL-gated routing and WASM sandboxing
- Session server with httpOnly cookies and CSRF protection
- RBAC with phi-derived role hierarchy (5 roles, 30+ permissions)
- Security middleware (CSP, rate limiter, CORS)
- Vault client with AES-256-GCM envelope encryption
- WebSocket authentication with rate limiting
- Audit logger with Merkle tree chain verification
- 8 ADRs, 4 runbooks, 50+ error codes, 3 C4 diagrams

### Architecture
- Edge: Cloudflare Workers + Durable Objects + Pages
- Origin: Google Cloud Run (us-east1)
- Database: PostgreSQL 16 + pgvector with HNSW indexes
- Messaging: NATS JetStream
- Monitoring: Prometheus + Grafana + Alertmanager

### Security
- httpOnly cookie sessions (ZERO localStorage tokens)
- CSRF double-submit cookie protection
- Content Security Policy with strict-dynamic
- AES-256-GCM secret encryption
- Append-only Merkle tree audit trail
- WASM sandbox for MCP tool execution
