# Contributing to Heady™

> Welcome. This guide covers everything you need to contribute to the Heady platform.

## Quick Start

```bash
# Clone and setup (< 5 minutes)
git clone https://github.com/HeadyMe/Heady.git
cd Heady
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Start infrastructure
docker compose up -d

# Start development
npm run dev
```

## Monorepo Structure

```
Heady/
├── services/           # 50+ microservices (ports 3310-3396+)
├── shared/             # Shared libraries (js, auth, css)
├── infrastructure/     # Envoy, Consul, OTel, NATS, PgBouncer, middleware
├── drupal-config/      # Drupal 11 modules and content types
├── sites/              # 9 website source directories
├── docs/               # ADRs, runbooks, diagrams
├── scripts/            # Dev tools and automation
├── turbo.json          # Turborepo build config
└── docker-compose.yml  # Full stack orchestration
```

## Commit Convention

We use Conventional Commits. Every commit message must follow:

```
<type>(<scope>): <description>

Types: feat, fix, chore, docs, perf, security, refactor, test
Scope: service name, shared, infra, docs, etc.
```

Examples:

- `feat(heady-brain): add streaming response for chat endpoint`
- `fix(auth): correct relay iframe origin validation`  
- `security(middleware): add prompt injection defense`
- `perf(pgvector): tune HNSW ef_construction to 200`

## Sacred Geometry Rules

**All constants must derive from φ, ψ, or Fibonacci. No magic numbers.**

```javascript
// ✓ CORRECT
const TIMEOUT_MS = Math.round(PHI * PHI * PHI * 1000); // φ³ ≈ 4236ms
const POOL_SIZE = 34; // Fibonacci
const CSL_GATE = PSI; // ≈ 0.618

// ✗ WRONG
const TIMEOUT_MS = 5000; // Magic number!
const POOL_SIZE = 25;    // Not Fibonacci!
const THRESHOLD = 0.7;   // Not φ-derived!
```

## Adding a New Service

1. Create `services/{service-name}/index.js`
2. Add health check: `GET /health` → `{ status: 'healthy', service: '{name}' }`
3. Add to `docker-compose.yml` with unique port
4. Use `shared/js/structured-logger.js` for logging
5. Add error codes to `ERROR_CODES.md`
6. Add Dockerfile using multi-stage template
7. Register with Consul via `infrastructure/consul/consul-registration.js`

## Testing

```bash
npm test              # Run all tests
npm run test:service  # Run tests for a specific service
npm run lint          # ESLint + Prettier check
npm run type-check    # TypeScript type validation
```

## Code Review Checklist

- [ ] No `console.log` — use `structured-logger.js`
- [ ] No `localStorage` for tokens — use httpOnly cookies
- [ ] No magic numbers — use φ/ψ/Fibonacci
- [ ] No priority/ranking language — use concurrent-equals
- [ ] No `Access-Control-Allow-Origin: *` — use domain whitelist
- [ ] Health check endpoint exists
- [ ] Error codes added to ERROR_CODES.md

---

*© 2026 HeadySystems Inc. — Eric Haywood, Founder — 51 Provisional Patents*
