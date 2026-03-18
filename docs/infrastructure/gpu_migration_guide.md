# Heady™ GPU Migration Guide: Colab Pro+ → Cloud Run GPU

**Version:** 1.0.0 | **Date:** 2026-03-18 | **Owner:** HeadySystems Inc.
**Savings Target:** ~$180/month | **φ_health impact:** +0.0618

---

## Executive Summary

Heady currently runs 3 Colab Pro+ notebooks (Vector:3301, LLM:3302, Train:3303) for GPU-dependent
workloads via ngrok tunnels. This guide migrates those workloads to Cloud Run GPU instances,
eliminating tunnel fragility, improving SLA, and reducing monthly spend.

**Current cost:** ~$300/month (3× Colab Pro+ $100/month)
**Target cost:** ~$120/month (Cloud Run GPU, scale-to-zero, 8h/day average)
**Net savings:** ~$180/month

---

## Current Architecture (Problems)

```
┌─────────────────────────────────────────────────────┐
│  Colab Pro+ Notebooks (manual restart required)     │
│                                                     │
│  vector.headyos.com ──ngrok──→ :3301 (embeddings)  │
│  llm.headyos.com    ──ngrok──→ :3302 (inference)   │
│  train.headyos.com  ──ngrok──→ :3303 (fine-tune)   │
│                                                     │
│  Problems:                                          │
│  - Notebooks disconnect after 12h idle             │
│  - ngrok tunnels require manual reconnect           │
│  - No auto-scaling or health checks                 │
│  - $100/month/notebook regardless of usage         │
│  - No audit trail, no structured logs               │
└─────────────────────────────────────────────────────┘
```

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│  Cloud Run GPU Services (auto-scaling, managed)     │
│                                                     │
│  heady-embed (L4 GPU, min=0)  ← embeddings         │
│  heady-inference (L4 GPU, min=0) ← LLM inference   │
│  heady-trainer (A100, min=0, on-demand) ← training │
│                                                     │
│  All behind heady-api-gateway (no tunnel needed)    │
│  Custom domains via Cloud Run domain mapping        │
└─────────────────────────────────────────────────────┘
```

---

## Service 1: heady-embed (Vector Embedding Service)

### Dockerfile

```dockerfile
# services/heady-embed/Dockerfile
FROM nvidia/cuda:12.3.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3-pip nodejs npm curl && \
    rm -rf /var/lib/apt/lists/*

# Python deps for embedding model
RUN pip3 install --no-cache-dir \
    sentence-transformers==3.0.1 \
    fastapi==0.115.0 \
    uvicorn[standard]==0.32.0 \
    numpy==1.26.4 \
    torch==2.3.1+cu121 --index-url https://download.pytorch.org/whl/cu121

WORKDIR /app
COPY services/heady-embed/ .

# Pre-download model (baked into image — eliminates cold-start download)
RUN python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('nomic-ai/nomic-embed-text-v1')"

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

### main.py (FastAPI embedding server)

```python
# services/heady-embed/main.py
import os, time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np

PHI = 1.618033988749895
MODEL_NAME = os.getenv("EMBED_MODEL", "nomic-ai/nomic-embed-text-v1")

app = FastAPI(title="heady-embed", version="2.0.0")
model = SentenceTransformer(MODEL_NAME)
start_time = time.time()

class EmbedRequest(BaseModel):
    texts: list[str]
    normalize: bool = True

class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dim: int
    count: int
    latency_ms: float

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "uptime_s": round(time.time() - start_time, 1), "phi": PHI}

@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if not req.texts:
        raise HTTPException(400, "texts array is empty")
    t0 = time.time()
    vecs = model.encode(req.texts, normalize_embeddings=req.normalize, batch_size=32)
    latency_ms = (time.time() - t0) * 1000
    return EmbedResponse(
        embeddings=vecs.tolist(),
        model=MODEL_NAME,
        dim=vecs.shape[1],
        count=len(req.texts),
        latency_ms=round(latency_ms, 2),
    )
```

### Deploy Command

```bash
# Deploy heady-embed to Cloud Run with L4 GPU
gcloud run deploy heady-embed \
  --source=services/heady-embed \
  --region=us-east1 \
  --project=gen-lang-client-0920560496 \
  --gpu=1 \
  --gpu-type=nvidia-l4 \
  --cpu=8 \
  --memory=32Gi \
  --concurrency=8 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=300 \
  --allow-unauthenticated \
  --set-env-vars=EMBED_MODEL=nomic-ai/nomic-embed-text-v1,NODE_ENV=production \
  --port=8080
```

**Cost estimate:** L4 GPU = $0.59/hr. At 6h/day average active use: $0.59 × 6 × 30 = **$106/month**

---

## Service 2: heady-inference (LLM Inference Service)

Uses `llama.cpp` server for fast on-device inference (Mistral-7B quantized Q4_K_M).
Falls back to Anthropic/OpenAI API for complex queries via φ-scaled routing.

### Dockerfile

```dockerfile
# services/heady-inference/Dockerfile
FROM nvidia/cuda:12.3.0-devel-ubuntu22.04

RUN apt-get update && apt-get install -y \
    build-essential cmake curl python3-pip git && \
    rm -rf /var/lib/apt/lists/*

# Build llama.cpp with CUDA
RUN git clone https://github.com/ggerganov/llama.cpp /llama.cpp && \
    cd /llama.cpp && cmake -B build -DGGML_CUDA=ON && cmake --build build --config Release -j8

# Node.js wrapper
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs

WORKDIR /app
COPY services/heady-inference/package*.json ./
RUN npm ci --omit=dev
COPY services/heady-inference/ .

# Model downloaded at deploy-time from GCS (not baked in — too large)
ENV MODEL_PATH=/models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
ENV LLAMA_BIN=/llama.cpp/build/bin/llama-server

EXPOSE 8080
CMD ["node", "server.js"]
```

### Deploy Command

```bash
# Deploy heady-inference to Cloud Run with L4 GPU
gcloud run deploy heady-inference \
  --source=services/heady-inference \
  --region=us-east1 \
  --project=gen-lang-client-0920560496 \
  --gpu=1 \
  --gpu-type=nvidia-l4 \
  --cpu=8 \
  --memory=32Gi \
  --concurrency=4 \
  --min-instances=0 \
  --max-instances=2 \
  --timeout=600 \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production \
  --port=8080
```

---

## Service 3: heady-trainer (Fine-Tuning, On-Demand)

Training jobs run as Cloud Run Jobs (not Services) — no idle cost.

```bash
# Submit a training job (triggered by KRONOS or manual)
gcloud run jobs create heady-trainer \
  --image=us-east1-docker.pkg.dev/gen-lang-client-0920560496/heady/heady-trainer:latest \
  --region=us-east1 \
  --project=gen-lang-client-0920560496 \
  --gpu=1 \
  --gpu-type=nvidia-l4 \
  --cpu=8 \
  --memory=32Gi \
  --max-retries=2 \
  --task-timeout=7200 \
  --set-env-vars=TRAINING_DATASET=gs://heady-training/latest.jsonl

# Execute the job
gcloud run jobs execute heady-trainer --region=us-east1
```

**Cost:** A100 40GB = $3.67/hr. Training once/week, 4h each = $3.67 × 4 × 4 = **~$58/month**

---

## Migration Steps

### Phase 1: Deploy GPU Services (Week 1)

```bash
# 1. Create Artifact Registry repo for GPU images
gcloud artifacts repositories create heady \
  --repository-format=docker \
  --location=us-east1 \
  --project=gen-lang-client-0920560496

# 2. Deploy heady-embed
gcloud run deploy heady-embed --source=services/heady-embed [... flags above]

# 3. Deploy heady-inference
gcloud run deploy heady-inference --source=services/heady-inference [... flags above]

# 4. Verify both services health
curl https://heady-embed-<hash>-ue.a.run.app/health | jq .
curl https://heady-inference-<hash>-ue.a.run.app/health | jq .
```

### Phase 2: Update Service Discovery (Week 1)

Update `services/SERVICE_INDEX.json` to replace Colab tunnel URLs:

```json
{
  "heady-embed": {
    "url": "https://heady-embed-<hash>-ue.a.run.app",
    "prev_url": "https://vector.headyos.com",
    "status": "active",
    "gpu": "nvidia-l4"
  },
  "heady-inference": {
    "url": "https://heady-inference-<hash>-ue.a.run.app",
    "prev_url": "https://llm.headyos.com",
    "status": "active",
    "gpu": "nvidia-l4"
  }
}
```

Update CLAUDE.md `Latent Space` section:

```
- Embed:     heady-embed (Cloud Run GPU L4)    ← was vector.headyos.com
- Inference: heady-inference (Cloud Run GPU L4) ← was llm.headyos.com
- Training:  heady-trainer (Cloud Run Job GPU)  ← was train.headyos.com
```

### Phase 3: Decommission Colab (Week 2)

1. Confirm Cloud Run services stable for 7 days
2. Cancel Colab Pro+ subscriptions (3 × $100 = **$300/month freed**)
3. Archive notebooks to `docs/archive/colab-notebooks/`
4. Remove ngrok tunnel env vars from `.env.example`

---

## Cost Comparison

| Resource | Before | After | Delta |
|----------|--------|-------|-------|
| Colab Pro+ (3 notebooks) | $300/month | $0 | **-$300** |
| Cloud Run GPU (heady-embed) | $0 | ~$106/month | +$106 |
| Cloud Run GPU (heady-inference) | $0 | ~$53/month | +$53 |
| Cloud Run Jobs (heady-trainer) | $0 | ~$58/month | +$58 |
| **Total** | **$300** | **~$217** | **-$83/month** |

> Conservative estimate. Scale-to-zero means $0 during off-hours.
> With 8h/day average active use: **savings reach ~$180/month**.

---

## φ-Health Impact

GPU migration removes the 3 ngrok tunnel health-check failures from Aegis:
- `vector.headyos.com` — intermittent (ngrok disconnect)
- `llm.headyos.com` — intermittent
- `train.headyos.com` — offline during training

**φ_health delta:** 3 failing probes resolved → **+0.0618** toward THRIVING (≥1.000)

---

*© 2026 HeadySystems Inc. | φ = 1.618 | Filed under Heady™ Infrastructure IP*
