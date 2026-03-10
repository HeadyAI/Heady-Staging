# Getting Started with Heady™ Latent OS

> Quick setup guide — from zero to running in under 5 minutes

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Docker** and **Docker Compose** (for infrastructure)
- **Git** for repository access

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/HeadyMe/heady-max-potential.git
cd heady-max-potential
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp infrastructure/docker/.env.example .env
```

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | HMAC signing key for tokens | `heady-sacred-geometry-phi-...` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase service account path | `/path/to/service-account.json` |
| `GCP_PROJECT_ID` | Google Cloud project | `gen-lang-client-0920560496` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account | `8b1fa38f282c691423c6399247d53323` |
| `NODE_ENV` | Runtime environment | `development` |

### 3. Start Infrastructure

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

This starts PostgreSQL (with pgvector), Redis, Prometheus, and Grafana.

### 4. Start Services

```bash
# Start all services
npm start

# Or start individually:
node services/auth-session/index.js     # Port 3360
node services/notification/index.js     # Port 3361
node services/analytics/index.js        # Port 3362
node services/scheduler/index.js        # Port 3363
node services/search/index.js           # Port 3364
node services/onboarding/index.js       # Port 3365
node services/domain-router/index.js    # Port 3366
node services/api-gateway/index.js      # Port 3370
```

### 5. Verify Health

```bash
curl http://localhost:3370/health
# Expected: {"status":"healthy","service":"api-gateway","version":"5.3.0",...}
```

### 6. Run Tests

```bash
npm test
# Runs all unit + integration tests (84+ tests)
```

---

## Core Concepts

### φ-Math Foundation

Every constant in the system derives from the golden ratio (φ ≈ 1.618) or Fibonacci numbers:

```javascript
const { PHI, PSI, fib, PHI_TIMING, CSL_THRESHOLDS } = require('./shared/phi-math');

PHI          // 1.6180339887 — golden ratio
PSI          // 0.6180339887 — conjugate (1/φ)
fib(7)       // 13
fib(12)      // 144
PHI_TIMING.PHI_7  // 29034ms (φ⁷ × 1000)
CSL_THRESHOLDS.HIGH  // 0.882
```

### CSL Gates

Instead of boolean `if/else`, Heady uses Continuous Semantic Logic:

```javascript
const { cslGate, sigmoid, CSL_THRESHOLDS } = require('./shared/phi-math');

// Soft sigmoid gating — continuous instead of binary
const confidence = 0.85;
const gated = sigmoid((confidence - CSL_THRESHOLDS.MEDIUM) / 0.236);
// Returns smooth 0–1 value instead of true/false
```

### Sacred Geometry Topology

Nodes are arranged in concentric rings:
- **Center**: HeadySoul (values, awareness)
- **Inner Ring**: HeadyBrains, HeadyConductor, HeadyVinci
- **Middle Ring**: JULES, BUILDER, OBSERVER, MURPHY, ATLAS, PYTHIA
- **Outer Ring**: BRIDGE, MUSE, SENTINEL, NOVA, JANITOR, SOPHIA, CIPHER, LENS
- **Governance Shell**: HeadyCheck, HeadyAssure, HeadyAware, HeadyPatterns

### Resource Pools (Fibonacci-weighted)

| Pool | Weight | Use |
|------|--------|-----|
| Hot | 34% (fib(9)) | User-facing, latency-critical |
| Warm | 21% (fib(8)) | Background processing |
| Cold | 13% (fib(7)) | Batch, analytics |
| Reserve | 8% (fib(6)) | Burst capacity |
| Governance | 5% (fib(5)) | Always-on oversight |

---

## Next Steps

- Read the [Architecture Guide](../architecture/README.md) for system design
- Explore the [API Reference](../api-reference/README.md) for endpoints
- Review [Phi Compliance](../phi-compliance/README.md) before contributing
- Check [Security Guide](../security/README.md) for auth flows
