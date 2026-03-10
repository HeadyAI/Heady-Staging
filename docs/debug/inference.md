# DEBUG Guide: Inference Domain

## Services

- `heady-brain (3310)`
- `heady-brains (3311)`
- `heady-infer (3312)`
- `ai-router (3313)`
- `model-gateway (3314)`

## Health Check

```bash
curl -s http://localhost:3310/health | jq .
```

## Common Failure Modes

### LLM provider returns 429 Too Many Requests

**Diagnosis:** Rate limit hit on provider API. Check ai-router circuit breaker state.

**Fix:** ai-router automatically fails over to next provider via φ-weighted selection. If all providers are down, circuit breaker opens for fib(7)=13 seconds.

### High latency (>4.236s) on inference requests

**Diagnosis:** Model gateway routing to slow provider or context window too large.

**Fix:** Check model-gateway logs for provider latency. Reduce context via memory cache pruning (LRU with fib(16)=987 limit).

### CSL confidence below phiThreshold(1)≈0.691

**Diagnosis:** Model response quality degraded. Drift detector should have flagged this.

**Fix:** Check heady-eval drift metrics. If persistent, switch primary model in ai-router config.

### heady-brain OOM killed

**Diagnosis:** Context window exceeded memory limit. Cloud Run instance memory exhausted.

**Fix:** Scale Cloud Run memory to next Fibonacci step. Check for context accumulation leak in session state.

## Environment Variables

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_AI_API_KEY`
- `GROQ_API_KEY`
- `PERPLEXITY_API_KEY`

## Debug Commands

```bash
curl -s http://localhost:3310/health | jq .
curl -s http://localhost:3313/api/providers | jq .  # ai-router provider status
curl -X POST http://localhost:3310/api/infer -H "Content-Type: application/json" -d '{"prompt":"test","model":"claude-sonnet"}'
```

## Log Locations

- Cloud Run logs: gcloud run services logs read heady-brain --region=us-east1
- Local: docker-compose logs heady-brain

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
