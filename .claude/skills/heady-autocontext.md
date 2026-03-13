# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: HeadyAutoContext Operations
# HEADY_BRAND:END

# /heady-autocontext — Universal Intelligence Middleware

Triggered when user says `/heady-autocontext` or asks about context enrichment,
the intelligence pipeline, or memory-informed decisions.

## Instructions

You are operating HeadyAutoContext — the universal intelligence middleware.
NO operation in the Liquid OS executes without AutoContext enrichment.
AutoContext is NOT optional — it IS the intelligence.

### The Fundamental Loop
```
User Input → AutoContext (5-pass enrich) → Memory Retrieval (T0→T1→T2)
    → CSL Gate → Pipeline Execution → Output
    → AutoContext (index result) → Memory Write (T1)
    → Consolidation Engine → Memory Promote (T1→T2)
    → Next request benefits from all prior knowledge
```

### 5-Pass Enrichment Pipeline

| Pass | Name | Source | CSL Gate | Output |
|------|------|--------|----------|--------|
| 1 | Intent Embedding | Raw input → text-embedding-3-large | None | 1536D task intent vector |
| 2 | Memory Retrieval | T0→T1→T2 semantic search | GATE(τ=ψ²=0.382) wide net | Top-k relevant memories |
| 3 | Knowledge Grounding | Graph RAG + wisdom.json + docs | GATE(τ=ψ=0.618) tight filter | Grounded facts, anti-hallucination |
| 4 | Context Compression | Passes 1-3 → summarize + dedup | NOT(compressed, noise) | Token-efficient capsule |
| 5 | Confidence Assessment | CSL Confidence Gate pre-flight | phiGATE(level=2, τ=0.809) | EXECUTE/CAUTIOUS/HALT |

**Key design:** Each pass has a progressively tighter CSL gate. Pass 2 casts
a wide net (ψ²). Pass 3 filters tightly (ψ). Pass 5 demands high confidence
(0.809) for the final go/no-go.

### Service Endpoints (port 3396)
- `POST /context/enrich` — Full 5-pass pipeline (8s timeout)
- `POST /context/enrich-fast` — Passes 1+2 only (2s timeout, latency-critical)
- `POST /context/index-batch` — Batch-index content into T1 (30s timeout)
- `POST /context/query` — Direct semantic search all tiers (5s timeout)
- `DELETE /context/remove` — Remove memories by ID or hash
- `GET /context/health` — Service health + memory stats
- `GET /context/stats` — Enrichment pipeline metrics

### Integration Points

**Every system integrates with AutoContext:**

| System | Integration |
|--------|-------------|
| HCFullPipeline | Stage 0: first call produces enriched capsule. Stage 20: writes trace back. |
| Bee Dispatch | Routing upgraded from 64D pseudo to full 1536D enriched vectors |
| Battle Arena | Tasks enriched with past battle results from episodic memory |
| Auto-Success | Intelligence category queries AutoContext stats |
| Action Analyzer | Every record() also writes to T1 via /context/index-batch |

### Bee Routing with Memory Enrichment
Old formula: `0.7 × resonance + 0.3 × priority`
New formula: `0.5 × resonance + 0.2 × priority + 0.3 × memory_relevance`

The 30% memory_relevance dimension ensures bees get routed based on past
success patterns stored in T2 procedural memory.

### Diagnostics
When asked about AutoContext:
1. Report enrichment pipeline latency per pass (P50/P95/P99)
2. Show CSL gate activation distribution (EXECUTE/CAUTIOUS/HALT %)
3. Report memory retrieval hit rates per tier
4. Show knowledge grounding success rate (anti-hallucination %)
5. Report circuit breaker status (threshold: 5 failures)

### Reference Config
Full specification: `configs/liquid-os/heady-autocontext.yaml`
