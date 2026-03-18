---
name: heady-colab-runtime
description: Manages the Heady distributed compute cluster across 3 Google Colab Pro+ runtimes with mixed GPU types. Use this skill whenever working with Colab notebooks, GPU memory allocation, inter-runtime communication, distributed inference, vector store operations, model parallelism, or runtime persistence for the Heady system. Triggers on mentions of "Colab", "runtime", "GPU", "T4", "A100", "L4", "VRAM", "distributed inference", "model parallelism", "vector store", "FAISS", "ngrok", "cloudflare tunnel", "Ray cluster", or any code that needs to run across multiple Colab runtimes. Also use when the user wants to optimize GPU utilization, set up inter-notebook communication, or deploy Heady agents on Colab.
---

# Heady Colab Runtime Management

This skill manages the Heady distributed compute cluster running across 3 Google Colab Pro+ runtimes with mixed GPU configurations. The 3 runtimes serve as the "latent space operations" layer of the Heady system, providing GPU compute for ML inference, vector operations, and agent execution.

## Runtime Architecture

The 3 Colab Pro+ runtimes are assigned specialized roles based on their GPU capabilities:

```
Runtime 1 ("Cortex")  — A100 80GB — Primary inference & heavy ML
Runtime 2 ("Synapse") — A100 40GB — Vector operations & embedding
Runtime 3 ("Reflex")  — T4/L4     — Lightweight agents & data preprocessing
```

### GPU Capability Matrix

| Runtime | GPU | VRAM | Best For |
|---------|-----|------|----------|
| Cortex (R1) | A100 80GB | 80 GB | Large model inference, fine-tuning, tensor parallelism |
| Synapse (R2) | A100 40GB | 40 GB | Vector search (FAISS/Milvus), embedding generation, medium models |
| Reflex (R3) | T4 or L4 | 16-24 GB | Data preprocessing, lightweight agents, monitoring, API gateways |

## Setting Up Inter-Runtime Communication

The 3 Colab runtimes need persistent communication channels. Use Cloudflare Tunnels (preferred) or ngrok for establishing bidirectional tunnels.

### Option A: Cloudflare Tunnel (Recommended — Free, Stable)

```python
# Install on each runtime
# !pip install cloudflared --break-system-packages

import subprocess
import threading
import time

def start_cloudflare_tunnel(port: int, metrics_port: int = 0):
    """Start a Cloudflare Tunnel exposing a local port."""
    cmd = [
        'cloudflared', 'tunnel', '--url', f'http://localhost:{port}',
        '--no-autoupdate'
    ]
    if metrics_port:
        cmd.extend(['--metrics', f'localhost:{metrics_port}'])

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Parse the tunnel URL from stderr
    tunnel_url = None
    for line in proc.stderr:
        line = line.decode()
        if 'trycloudflare.com' in line:
            # Extract the URL
            import re
            match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
            if match:
                tunnel_url = match.group()
                break

    return tunnel_url, proc


# Usage on each runtime:
# Cortex (R1): tunnel_url, proc = start_cloudflare_tunnel(8001)
# Synapse (R2): tunnel_url, proc = start_cloudflare_tunnel(8002)
# Reflex (R3): tunnel_url, proc = start_cloudflare_tunnel(8003)
```

### Option B: FastAPI + gRPC Bridge

```python
# On each runtime, run a FastAPI server for inter-runtime communication
from fastapi import FastAPI
import uvicorn
import asyncio

app = FastAPI(title="Heady Runtime Bridge")

@app.get("/healthz")
async def health():
    """Health check endpoint for runtime discovery."""
    import torch
    return {
        "status": "healthy",
        "runtime": RUNTIME_ID,  # "cortex", "synapse", or "reflex"
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "vram_total_mb": torch.cuda.get_device_properties(0).total_mem // (1024*1024) if torch.cuda.is_available() else 0,
        "vram_free_mb": torch.cuda.mem_get_info()[0] // (1024*1024) if torch.cuda.is_available() else 0,
    }

@app.post("/task")
async def receive_task(task: dict):
    """Receive a task from another runtime."""
    # Route to the appropriate local agent
    agent = get_agent_for_task(task['domain'])
    result = await agent.execute(task)
    return {"result": result, "runtime": RUNTIME_ID}
```

## Registering Runtimes with Each Other

After starting tunnels on all 3 runtimes, they need to discover each other. Use a shared coordination mechanism.

```python
# Shared runtime registry (store in Redis, or use a coordination notebook)
import json
import requests

class RuntimeRegistry:
    """Manages discovery of all 3 Colab runtimes."""

    def __init__(self, redis_url: str = None):
        self.runtimes = {}
        self.redis_url = redis_url

    def register(self, runtime_id: str, tunnel_url: str, gpu_info: dict):
        """Register this runtime's tunnel URL."""
        self.runtimes[runtime_id] = {
            'url': tunnel_url,
            'gpu': gpu_info,
            'registered_at': time.time(),
            'status': 'active'
        }
        # If Redis is available, publish for other runtimes
        if self.redis_url:
            import redis
            r = redis.from_url(self.redis_url)
            r.hset('heady:runtimes', runtime_id, json.dumps(self.runtimes[runtime_id]))
            r.publish('heady:runtime_events', json.dumps({
                'event': 'register', 'runtime': runtime_id
            }))

    async def dispatch(self, task: dict, preferred_runtime: str = None):
        """Dispatch a task to the best available runtime."""
        # If caller specifies a runtime, try it first
        if preferred_runtime and preferred_runtime in self.runtimes:
            target = self.runtimes[preferred_runtime]
            try:
                resp = requests.post(f"{target['url']}/task", json=task, timeout=30)
                return resp.json()
            except Exception:
                pass  # Fall through to auto-routing

        # Auto-route based on task requirements
        target = self._select_runtime(task)
        resp = requests.post(f"{target['url']}/task", json=task, timeout=30)
        return resp.json()

    def _select_runtime(self, task: dict):
        """Select the best runtime for a task based on GPU requirements."""
        vram_needed = task.get('vram_mb', 0)
        for runtime_id in ['cortex', 'synapse', 'reflex']:
            if runtime_id in self.runtimes:
                rt = self.runtimes[runtime_id]
                if rt['gpu'].get('vram_free_mb', 0) >= vram_needed:
                    return rt
        raise RuntimeError('No runtime has sufficient VRAM for this task')
```

## GPU Memory Management

With mixed GPU types, memory management is critical. Never assume a specific VRAM amount — always query at runtime.

```python
import torch

def get_gpu_state():
    """Get current GPU state for this runtime."""
    if not torch.cuda.is_available():
        return {'available': False}

    props = torch.cuda.get_device_properties(0)
    free, total = torch.cuda.mem_get_info()

    return {
        'available': True,
        'name': props.name,
        'total_mb': total // (1024 * 1024),
        'free_mb': free // (1024 * 1024),
        'used_mb': (total - free) // (1024 * 1024),
        'utilization_pct': round((total - free) / total * 100, 1),
        'compute_capability': f'{props.major}.{props.minor}',
    }

def reserve_vram(model_size_mb: int, safety_margin: float = 0.15):
    """Check if we can load a model of the given size with safety margin."""
    state = get_gpu_state()
    if not state['available']:
        raise RuntimeError('No GPU available')

    required = int(model_size_mb * (1 + safety_margin))
    if state['free_mb'] < required:
        raise RuntimeError(
            f"Insufficient VRAM: need {required}MB, have {state['free_mb']}MB free"
        )
    return True

def clear_gpu_cache():
    """Aggressively free GPU memory."""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        import gc
        gc.collect()
```

## Distributed Vector Operations

Split vector operations across runtimes based on index size and query patterns.

```python
# Distributed FAISS index across runtimes
import faiss
import numpy as np

class DistributedVectorStore:
    """
    Distributed vector store that shards across Colab runtimes.
    Cortex holds the primary index, Synapse holds the replica.
    """

    def __init__(self, dimension: int, registry: RuntimeRegistry):
        self.dimension = dimension
        self.registry = registry
        self.local_index = None  # FAISS index on this runtime
        self.shard_id = None

    def build_index(self, vectors: np.ndarray, use_gpu: bool = True):
        """Build a FAISS index on the local GPU."""
        n, d = vectors.shape
        assert d == self.dimension

        # Choose index type based on dataset size and GPU
        if n < 10_000:
            index = faiss.IndexFlatL2(d)  # Brute force for small datasets
        elif n < 1_000_000:
            index = faiss.IndexIVFFlat(
                faiss.IndexFlatL2(d), d, int(np.sqrt(n))
            )
            index.train(vectors)
        else:
            # For large datasets, use IVF with product quantization
            index = faiss.IndexIVFPQ(
                faiss.IndexFlatL2(d), d,
                int(np.sqrt(n)),  # nlist
                d // 8,           # M (sub-quantizers)
                8                 # nbits per code
            )
            index.train(vectors)

        index.add(vectors)

        # Move to GPU if available
        if use_gpu and faiss.get_num_gpus() > 0:
            gpu_res = faiss.StandardGpuResources()
            index = faiss.index_cpu_to_gpu(gpu_res, 0, index)

        self.local_index = index
        return index

    async def search(self, query_vectors: np.ndarray, k: int = 10):
        """Search across all shards and merge results."""
        # Search local index
        local_distances, local_indices = self.local_index.search(query_vectors, k)

        # If distributed, also query remote shards
        # (In practice, you'd query Synapse's shard too)
        return local_distances, local_indices
```

## Runtime Persistence & Anti-Idle

Colab Pro+ runtimes disconnect after idle periods. Implement keepalive and state checkpointing.

```python
import threading
import time

class RuntimeKeepAlive:
    """Prevent Colab runtime from disconnecting due to idle timeout."""

    def __init__(self, interval_seconds: int = 55):
        self.interval = interval_seconds
        self.running = False
        self._thread = None

    def start(self):
        self.running = True
        self._thread = threading.Thread(target=self._keepalive_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self.running = False

    def _keepalive_loop(self):
        """Periodically execute a trivial operation to prevent idle disconnect."""
        while self.running:
            try:
                # Execute a trivial cell to reset idle timer
                _ = 1 + 1
                # Also log runtime health
                gpu = get_gpu_state()
                import structlog
                logger = structlog.get_logger()
                logger.info("keepalive_tick", gpu_util=gpu.get('utilization_pct', 0))
            except Exception:
                pass
            time.sleep(self.interval)

# State checkpointing to Google Drive
def checkpoint_state(state: dict, path: str = '/content/drive/MyDrive/heady/checkpoints/'):
    """Save agent state to Google Drive for persistence across runtime restarts."""
    import os, json
    os.makedirs(path, exist_ok=True)
    filename = f"{state.get('agent_id', 'unknown')}_{int(time.time())}.json"
    filepath = os.path.join(path, filename)
    with open(filepath, 'w') as f:
        json.dump(state, f, indent=2, default=str)
    return filepath

def restore_latest_checkpoint(agent_id: str, path: str = '/content/drive/MyDrive/heady/checkpoints/'):
    """Restore the most recent checkpoint for an agent."""
    import os, json, glob
    pattern = os.path.join(path, f"{agent_id}_*.json")
    files = sorted(glob.glob(pattern), reverse=True)
    if not files:
        return None
    with open(files[0], 'r') as f:
        return json.load(f)
```

## Runtime Startup Template

Use this as the first cell in every Heady Colab notebook:

```python
# ========================================
# HEADY RUNTIME BOOTSTRAP
# ========================================
# Run this cell first on every Colab runtime

# 1. Install dependencies
# !pip install torch faiss-gpu uvloop structlog fastapi uvicorn redis cloudflared --break-system-packages -q

# 2. Mount Google Drive for persistence
from google.colab import drive
drive.mount('/content/drive')

# 3. Set runtime identity
import os
RUNTIME_ID = os.environ.get('HEADY_RUNTIME', 'cortex')  # cortex, synapse, or reflex
os.environ['HEADY_RUNTIME'] = RUNTIME_ID

# 4. Start keepalive
keepalive = RuntimeKeepAlive(interval_seconds=55)
keepalive.start()

# 5. Log GPU state
gpu = get_gpu_state()
print(f"Runtime: {RUNTIME_ID}")
print(f"GPU: {gpu.get('name', 'None')} — {gpu.get('free_mb', 0)}MB free / {gpu.get('total_mb', 0)}MB total")

# 6. Restore latest checkpoint if available
checkpoint = restore_latest_checkpoint(RUNTIME_ID)
if checkpoint:
    print(f"Restored checkpoint from {checkpoint.get('timestamp', 'unknown')}")
else:
    print("No checkpoint found — starting fresh")

# 7. Start communication tunnel
tunnel_url, tunnel_proc = start_cloudflare_tunnel(port=8000 + hash(RUNTIME_ID) % 100)
print(f"Tunnel URL: {tunnel_url}")
```

## Task Allocation Across Runtimes

| Task Type | Preferred Runtime | Fallback | VRAM Needed |
|-----------|------------------|----------|-------------|
| Large model inference (>13B params) | Cortex (A100 80GB) | None — must use Cortex | 40-70 GB |
| Medium model inference (7B-13B) | Cortex or Synapse | Either works | 14-28 GB |
| Small model inference (<7B) | Any runtime | Reflex for light loads | 4-14 GB |
| Embedding generation | Synapse (A100 40GB) | Cortex | 4-8 GB |
| FAISS vector search | Synapse | Cortex | 2-16 GB |
| Data preprocessing | Reflex (T4/L4) | Any | 1-4 GB |
| Agent orchestration | Reflex | Synapse | 1-2 GB |
| Dashboard/API serving | Reflex | Any | <1 GB |
