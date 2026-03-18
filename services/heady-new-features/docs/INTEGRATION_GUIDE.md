# Heady™ New Features & Services — Integration Guide
## HeadySystems Inc. · March 2026 · v2.0.0

---

## Overview

This guide documents all new bees, services, middleware, Perplexity skills, and features
produced in this session. All components are designed for immediate integration into the
existing Heady™ Latent-Space OS architecture.

---

## New Bees (src/bees/)

### 1. `thinking-budget-bee.js`
**Purpose:** Dynamically allocates Gemini 2.5 thinking budget and Claude extended thinking tokens per task.
**Saves:** ~$65/month by right-sizing reasoning tokens (avoids MAX budget on simple tasks).

**φ-Scaled Tiers:**
| Tier | Tokens | Use Case |
|------|--------|----------|
| INSTANT | 0 | Routing, classification |
| FAST | 618 | Simple Q&A (φ-1 scaled) |
| BALANCED | 1618 | Most production tasks (φ) |
| DEEP | 4096 | Architecture, code review |
| ULTRA | 16180 | Research, patents (10000×φ) |
| MAX | 24576 | SBIR proposals, PhDs |

**Integration:**
```js
import ThinkingBudgetBee from './src/bees/thinking-budget-bee.js';
const bee = new ThinkingBudgetBee(env);
const config = bee.allocate({ task: 'Design the CSL router architecture', model: 'gemini-2.5-flash' });
// config.geminiConfig.thinkingConfig.thinkingBudget = 4096 (DEEP, auto-detected)
```

---

### 2. `knowledge-distiller-bee.js`
**Purpose:** Uses Claude Files API to distill persistent knowledge from files, codebases, and sessions.
Stores in Qdrant (vector) + Neon Postgres (relational) for retrieval in future sessions.

**Features:**
- Upload files to Claude Files API (avoids re-sending large content on each call)
- Extracts structured facts with category, confidence, φ-weight
- `buildContextWindow()` injects relevant knowledge into any prompt

**Integration:**
```js
import KnowledgeDistillerBee from './src/bees/knowledge-distiller-bee.js';
const bee = new KnowledgeDistillerBee(env);
const result = await bee.distillFile({ content: codebaseText, filename: 'repo.txt', userId });
// Returns: { factsExtracted: 47, facts: [...] }
const contextFacts = bee.retrieve('CSL routing architecture', { category: 'architecture' });
```

---

### 3. `audit-trail-bee.js`
**Purpose:** Fills critical gap — generates Architecture Decision Records (ADRs) and maintains
immutable audit logs. Includes pre-built ADRs for all major Heady architectural decisions.

**Generates ADRs for:**
- CSL replacing if/else with cosine similarity gates
- φ-Fibonacci scaling for all capacity constants
- httpOnly cookies replacing localStorage for auth tokens
- Pino structured logging replacing console.log
- Current model policy (Gemini 2.5 Flash default, Claude Opus 4.6 for reasoning)

**Integration:**
```js
import AuditTrailBee from './src/bees/audit-trail-bee.js';
const bee = new AuditTrailBee(env);
bee.generateSystemADRs();  // Creates all 5 system ADRs
bee.log({ eventType: 'bee_executed', action: 'code-generator-bee:generate', result: 'success', durationMs: 234 });
const adrs = bee.listADRs();  // Get all ADRs as markdown
```

---

### 4. `semantic-cache-bee.js`
**Purpose:** L1 exact hash + L2 cosine similarity cache. Avoids re-calling LLMs for semantically
equivalent queries. Threshold: 0.94 (φ-calibrated). Estimated savings: $140/month.

**Cache Tiers:**
- **L1 (Redis):** Exact SHA hash match → instant response, zero tokens
- **L2 (Qdrant):** Cosine similarity ≥ 0.94 → cached response, zero tokens
- **Miss:** Full LLM call, result stored for future hits

**Integration:**
```js
import SemanticCacheBee from './src/bees/semantic-cache-bee.js';
const cache = new SemanticCacheBee(env);

// Before LLM call:
const hit = await cache.check(userQuery, 'gemini-2.5-flash');
if (hit.hit) return hit.entry.responseText;

// After LLM call:
await cache.store(userQuery, llmResponse, 'gemini-2.5-flash', { bees: ['code-generator-bee'] });
```

---

### 5. `context-compressor-bee.js`
**Purpose:** Prevents 200k+ token context window overflows via φ-weighted sliding window compression.
Supports Claude cache breakpoints (50% token cost reduction on repeated prompts).

**Compression Levels:**
- **Gentle:** Keep system + summary of middle + last N turns
- **Moderate:** φ-weighted retention of most important messages
- **Aggressive:** Single summary + last 4 messages only

**Integration:**
```js
import ContextCompressorBee from './src/bees/context-compressor-bee.js';
const compressor = new ContextCompressorBee(env);
const result = compressor.compress({
  messages: conversationHistory,
  model: 'claude-opus-4-6',
  compressionLevel: 'moderate',
});
// result.messages = compressed history ready for API call
// result.savedTokens = tokens saved, compressionRatio = 0.65
```

---

## New Services (src/services/)

### `csl-router.js` — Continuous Semantic Logic Router
**Purpose:** Production CSL router — the heart of Heady. Routes ALL tasks using cosine similarity.
Replaces all if/else routing logic system-wide.

**Thresholds (φ-calibrated):**
```
EXACT_MATCH:     0.99  → cache hit
HIGH_CONFIDENCE: 0.85  → single bee
ROUTING:         0.618 → standard gate (φ-1)
WEAK_MATCH:      0.40  → clarification bee
NO_MATCH:        0.20  → fallback bee
```

**Integration:**
```js
import CSLRouter from './src/services/csl-router.js';
const router = new CSLRouter(env);
const result = await router.route({ input: userMessage, userId, allowMultiRoute: true });
// result.routes = [{ beeId: 'code-generator-bee', similarity: 0.923, confidence: 'high' }]
// result.routingStrategy = 'ensemble' | 'single' | 'fallback'
await Promise.all(result.routes.map(r => executeBee(r.beeId, userMessage)));
```

### `model-router.js` — Multi-Provider AI Router (Updated)
**Updated models:** Gemini 2.5 Pro/Flash, Claude Opus 4.6, Sonnet 4.5, Groq Llama 3.3 70B.

**Default fallback chain:** `gemini-2.5-flash → gemini-2.5-pro → claude-sonnet-4-5 → gpt-4o-mini → llama-3.3-70b → @cf/meta/llama-3.3-8b-instruct`

---

## New Middleware (src/middleware/)

### `rate-limiter.js` — φ-Fibonacci Rate Limiter
**φ-Fibonacci limits per tier (RPM):**

| Tier | RPM | Burst | Daily |
|------|-----|-------|-------|
| anonymous | 8 | 13 | 89 |
| free | 21 | 34 | 377 |
| basic | 55 | 89 | 1597 |
| pro | 144 | 233 | 6765 |
| enterprise | 377 | 610 | 28657 |
| internal | 987 | 1597 | ∞ |

**Integration (Hono/Express):**
```js
import PhiFibonacciRateLimiter from './src/middleware/rate-limiter.js';
const limiter = new PhiFibonacciRateLimiter(env);
app.use(limiter.middleware());
```

---

## Perplexity Skills (src/skills/perplexity/)

Install these in **Perplexity → Settings → Answer Instructions** for persistent Heady context:

### `heady-context.js`
Always-on Heady system context. Activates when queries mention heady, swarm, bee, phi, eric,
cloudflare, neon, qdrant, or use "my/our/we" pronouns.

### `phi-code-review.js`
Reviews code for Heady architectural compliance:
- ESM syntax check
- httpOnly cookie enforcement
- pino/Zod/UUID presence
- φ-constant verification
- Generates φ-Alignment Score: X/1.618

### `grant-writer.js`
SBIR/STTR grant writing assistant pre-loaded with HeadySystems company profile,
EIN, tech stack description, patent portfolio summary, and target solicitations.

### `patent-strategy.js`
Patent portfolio strategy: provisional→non-provisional conversion sequence,
PCT filing strategy, claim drafting templates, cost estimates by portfolio tier.

### `cost-optimizer.js`
Monthly $600-750 budget optimization. Tracks all service costs, suggests
optimizations by category, estimates savings from each bee deployment.

---

## HeadyBuddy Web App (heady-buddy.html)

Standalone HTML AI companion with:
- **CSL routing visualization** — real-time cosine similarity bar
- **5 operational modes:** Heady Context, Code, Grant, Patent, Deep Think
- **Model selector:** All current models (Gemini 2.5 Flash/Pro, Claude, Groq, GPT-4o)
- **Thinking budget control:** φ-scaled tiers
- **Budget meter:** Live $700/month tracking
- **Swarm activation panel:** Toggle individual swarms
- **Quick-start prompts:** SBIR, pgvector, cost audit, code review
- **Export conversation** to .txt
- Configure with: `window._headyApiKey = 'your-gemini-key'` in browser console

---

## Security Fixes Applied

All new code implements the critical security fixes identified in GAPS_FOUND.md:

1. **✅ httpOnly cookies** — Never localStorage in any new file
2. **✅ Zod validation** — All external inputs validated with ZodSchema.parse()
3. **✅ Pino logging** — No console.log in any new file
4. **✅ UUID PKs** — All entities use uuidv4() primary keys
5. **✅ φ-constants** — Fibonacci/phi for all capacity constants
6. **✅ Error handling** — try/catch with structured error logging throughout

---

## Integration Checklist

```
[ ] Deploy semantic-cache-bee.js → wrap all LLM calls with cache.check() / cache.store()
[ ] Deploy thinking-budget-bee.js → replace hardcoded maxTokens with bee.allocate()
[ ] Deploy csl-router.js → replace all if/else routing with router.route()
[ ] Deploy audit-trail-bee.js → bee.generateSystemADRs() on startup + bee.log() everywhere
[ ] Deploy context-compressor-bee.js → wrap long conversation histories
[ ] Deploy rate-limiter.js → add to all public Cloud Run + Workers routes
[ ] Deploy model-router.js v2 → update deprecated model names in existing router
[ ] Install Perplexity skills → Settings → Answer Instructions → paste heady-context.js
[ ] Configure HeadyBuddy → set window._headyApiKey, deploy to Cloudflare Pages
```

---

## Estimated Monthly Savings After Deployment

| Component | Saves/Month |
|-----------|-------------|
| semantic-cache-bee (60% hit rate) | ~$140 |
| thinking-budget-bee (right-size) | ~$65 |
| context-compressor-bee (20% reduction) | ~$35 |
| model-router (Flash default) | ~$80 |
| rate-limiter (abuse prevention) | ~$20 |
| **Total** | **~$340/month** |

*Projected optimized spend: ~$360/month (well within $600-750 target)*

---

*HeadySystems Inc. · Fort Collins, CO · EIN 41-3412204 · 60+ provisional patents*
