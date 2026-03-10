---
name: heady-coding-standards
description: Enforces HeadySystems production coding standards across all Heady codebases. Use this skill whenever writing, reviewing, or modifying ANY code for the Heady ecosystem — including agent services, MCP servers, trading logic, MIDI transport, Colab notebooks, or infrastructure scripts. Triggers on any mention of "heady", "sacred geometry", "liquid nodes", "headybee", "headyswarm", agent names (Alpha, Risk, Execution, Sentinel, Compliance, Data, View, Bridge Builder), Apex trading code, or any HeadySystems repository work. Also use when the user asks to enforce coding standards, review code quality, or ensure production-readiness for Heady.
---

# Heady Coding Standards

This skill enforces production-grade coding standards across the entire Heady ecosystem. Every line of code in the Heady system is a commitment — a contract that it works, scales, and is secure.

## Core Philosophy

The Heady system uses **Sacred Geometry v4.0** as its architectural backbone. All constants are mathematically derived (golden ratio φ ≈ 1.618, Fibonacci sequences), never arbitrary magic numbers. All agents are equal-status workers routed by capability, not priority ranking.

## Mandatory Constants — No Magic Numbers

Every Heady file that uses numeric constants MUST derive them mathematically:

```javascript
// heady-constants.js — ALWAYS import this, never hardcode numbers
const PHI = 1.618033988749895;        // Golden Ratio
const PSI = 1 / PHI;                  // ≈ 0.618 (Conjugate)
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// Relevance gates for semantic routing
const RELEVANCE_GATES = {
  include: PSI * PSI,                 // ≈ 0.382
  boost: PSI,                         // ≈ 0.618
  inject: PSI + 0.1,                  // ≈ 0.718
};

// Retry backoff (Fibonacci-based, milliseconds)
const RETRY_BACKOFF = FIB.slice(4, 9).map(n => n * 100);

// Connection pool sizing (Fibonacci)
const POOL_SIZES = { min: FIB[2], max: FIB[6] }; // { min: 2, max: 13 }
```

## File Structure Convention

Every Heady service follows this layout:

```
service-name/
├── src/
│   ├── index.js          # Entry point with health endpoint + graceful shutdown
│   ├── config.js          # Validated env-based config with Object.freeze()
│   ├── errors.js          # Typed AppError classes
│   ├── logger.js          # Structured JSON logger (Pino/structlog)
│   └── routes/            # Route handlers
├── tests/
├── Dockerfile
├── package.json
└── .env.example
```

## Absolute Rules (Never Violate)

1. **ZERO LOCALHOST CONTAMINATION** — Production code must never reference `localhost`, `127.0.0.1`, or hardcoded dev URLs. Always use `process.env.*` or config files.

2. **STRUCTURED LOGGING ONLY** — No `console.log` anywhere in production code. Use Pino (Node.js) or structlog (Python) with JSON output, correlation IDs, and consistent fields: `{ timestamp, service_name, agent_id, trace_id, span_id, level, message, context }`.

3. **TYPED ERRORS** — Never throw raw strings or generic Error. Use the AppError pattern:
```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}
```

4. **SECRETS EXTERNALIZED** — All secrets come from environment variables or secret managers. Never hardcode API keys, JWT secrets, or credentials. Every config file validates required secrets at startup.

5. **CORS WHITELIST** — No `Access-Control-Allow-Origin: '*'` in production. Use explicit origin whitelists from `process.env.ALLOWED_ORIGINS`.

6. **HEALTH ENDPOINTS** — Every service exposes `/healthz` (liveness), `/readiness` (dependency check), and `/startup` (initialization).

7. **GRACEFUL SHUTDOWN** — Every service handles SIGTERM and SIGINT, closing connections and flushing buffers before exit.

8. **NO PLACEHOLDERS** — No `TODO`, `FIXME`, `HACK`, or stub comments. No `// implement later`. If it's not done, don't commit it.

9. **INPUT VALIDATION** — All user input is hostile until validated. Use Zod (TypeScript), Joi (Node.js), or Pydantic (Python) for schema validation on every API boundary.

10. **PINNED DEPENDENCIES** — All package versions are pinned to exact versions (no `^` or `~`). Run `npm audit` / `pip audit` on every build.

## Service Template

Every new Heady service starts from this template:

```javascript
import { createLogger } from '../shared/logger.js';
import { config } from './config.js';

const logger = createLogger(config.serviceName);

// Health endpoint
app.get('/healthz', (req, res) => {
  res.json({ status: 'healthy', service: config.serviceName, uptime: process.uptime() });
});

app.get('/readiness', async (req, res) => {
  try {
    // Check all dependencies (Redis, DB, external APIs)
    await checkDependencies();
    res.json({ status: 'ready' });
  } catch (err) {
    logger.error({ err }, 'Readiness check failed');
    res.status(503).json({ status: 'not_ready', error: err.message });
  }
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down gracefully');
  await closeConnections();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
app.listen(config.port, () => {
  logger.info({ port: config.port }, `${config.serviceName} started`);
});
```

## Config Pattern

```javascript
// config.js — validated, frozen, with sensible defaults
const config = {
  serviceName: process.env.SERVICE_NAME || 'heady-service',
  port: parseInt(process.env.PORT || '3000', 10),
  redis: {
    url: process.env.REDIS_URL,
    pool: { min: 2, max: 13 }, // Fibonacci-derived
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET, // Required — no default
    tokenExpiry: process.env.TOKEN_EXPIRY || '15m',
  },
};

// Validate required fields at startup
const required = ['redis.url', 'auth.jwtSecret'];
for (const key of required) {
  const value = key.split('.').reduce((o, k) => o?.[k], config);
  if (!value) throw new Error(`Missing required config: ${key}`);
}

export default Object.freeze(config);
```

## Agent-Specific Conventions

The 8 Sacred Geometry agents each follow naming conventions:

| Agent | Service Name | Port Range | Responsibility |
|-------|-------------|------------|----------------|
| Alpha | `heady-alpha` | 3100-3109 | Market data ingestion, signal generation |
| Risk | `heady-risk` | 3200-3209 | Veto power, drawdown monitoring, position flattening |
| Execution | `heady-exec` | 3300-3309 | Order routing, slippage minimization |
| Sentinel | `heady-sentinel` | 3400-3409 | System monitoring, anomaly detection |
| Compliance | `heady-compliance` | 3500-3509 | Regulatory rules, Apex constraints |
| Data | `heady-data` | 3600-3609 | Data enrichment, RAG, vector store |
| View | `heady-view` | 3700-3709 | Dashboard rendering, UI state |
| Bridge Builder | `heady-bridge` | 3800-3809 | Cross-agent coordination, topology management |

## Inter-Agent Message Envelope

All agent-to-agent messages use this envelope:

```javascript
{
  source_agent_id: 'heady-alpha',
  target_agent_id: 'heady-risk',
  message_type: 'TRADE_SIGNAL',
  correlation_id: 'uuid-v4',
  timestamp: Date.now(),
  ternary_state: 1,  // -1 = reject, 0 = neutral, 1 = approve
  payload: { /* typed data */ },
  signature: 'hmac-sha256-signature'
}
```

## Python-Specific Standards

For Python services (ML models, Colab notebooks, data pipelines):

```python
# Use uvloop for async performance (2-4x faster than default asyncio)
import uvloop
uvloop.install()

# Use structlog for structured logging
import structlog
logger = structlog.get_logger(service_name="heady-alpha-ml")

# Use Pydantic for all data models
from pydantic import BaseModel, Field

class TradeSignal(BaseModel):
    instrument: str = Field(..., description="Trading instrument symbol")
    direction: Literal["LONG", "SHORT"] = Field(..., description="Trade direction")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Signal confidence 0-1")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

## Frontend Stack Philosophy

Heady does NOT use React, Vue, Angular, or any heavyweight frontend framework. The added complexity, build tooling, and dependency surface area are antithetical to the system's design principles. Instead:

**Vanilla HTML/CSS/JS** — All dashboards, monitoring UIs, agent control panels, and lightweight tools are built as self-contained single-file HTML documents. No build step. No bundler. No transpiler. Open in any browser and it works.

**Drupal** — Where a CMS, structured content management, user roles/permissions, or web publishing is beneficial, Heady uses Drupal. Drupal modules handle admin interfaces, content workflows, and user-facing web properties. Custom Drupal modules can integrate with the agent system via REST APIs to the MCP Gateway.

**Python UIs (Streamlit/Gradio)** — For data-heavy dashboards that run in Colab or need tight Python integration (ML model monitoring, vector store inspection, backtesting visualizations), use Streamlit or Gradio. These render server-side and require no frontend toolchain.

**Anti-patterns to avoid:**
- Never add React, Next.js, Vue, Angular, or Svelte to any Heady project
- Never require `npm run build` or `webpack` for a UI to function
- Never create a `node_modules` directory for frontend code
- Never require a JS framework runtime to render a dashboard

## CSS/UI Standards

All Heady UIs use the Sacred Geometry design system:

```css
:root {
  --space-xs: 5px;   --space-sm: 8px;   --space-md: 13px;
  --space-lg: 21px;  --space-xl: 34px;  --space-2xl: 55px;  --space-3xl: 89px;
  --text-xs: 0.75rem;  --text-sm: 0.875rem;  --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.618rem;  --text-2xl: 2.618rem;
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --text-primary: #e8e8f0;
  --text-secondary: #9898a8;
  --accent: #00d4aa;
  --border-subtle: rgba(255, 255, 255, 0.08);
}
```

## Code Review Checklist

Before declaring any Heady code complete, verify:

- [ ] Zero `console.log`, `print()` debug statements
- [ ] Zero hardcoded URLs, ports, or credentials
- [ ] Zero `TODO`, `FIXME`, or placeholder comments
- [ ] All errors are typed AppError instances
- [ ] All config values come from env vars with validation
- [ ] Health endpoints exist and respond correctly
- [ ] Graceful shutdown handles SIGTERM/SIGINT
- [ ] Structured JSON logging with correlation IDs
- [ ] Input validation on all API boundaries
- [ ] Dependencies pinned to exact versions
- [ ] Tests exist for critical paths
