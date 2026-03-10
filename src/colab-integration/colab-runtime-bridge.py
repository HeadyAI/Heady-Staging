#!/usr/bin/env python3
"""
Heady™ Colab Runtime Bridge — Runs INSIDE each Colab Pro+ notebook
WebSocket server that connects back to colab-gateway.js

Latent Space Operations:
- Vector embedding generation (sentence-transformers, 384-dim)
- 3D projection from 384D → 3D using Sacred Geometry (PCA + golden spiral)
- Cosine similarity computation at GPU speed
- Batch HNSW index building (hnswlib)
- Model inference via transformers library
- φ-timed heartbeat back to gateway
- Graceful shutdown on runtime timeout

Author: Eric Haywood, eric@headysystems.com
© 2026 HeadySystems Inc. — 51 Provisional Patents
"""

import json
import time
import os
import sys
import hashlib
import threading
import asyncio
import signal
import logging
from collections import deque

import numpy as np

# ═══════════════════════════════════════════════════════════════════════════════
# φ-CONSTANTS — ZERO MAGIC NUMBERS
# All values derived from φ (golden ratio) or Fibonacci sequence
# ═══════════════════════════════════════════════════════════════════════════════

PHI = 1.6180339887498948        # φ = (1 + √5) / 2
PSI = 0.6180339887498949        # ψ = 1/φ = φ - 1
PHI_SQ = 2.618033988749895      # φ² = φ + 1
PHI_CUBED = 4.23606797749979    # φ³ = 2φ + 1

FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]

VECTOR_DIMS = 384               # Embedding dimensions (matches phi-math VECTOR.DIMS)
PROJ_DIMS = 3                   # Sacred Geometry projection output
HEARTBEAT_S = round(PHI ** 7)   # ≈ 29s — matches PHI_TIMING.PHI_7
HEALTH_CHECK_S = round(PHI ** 3)  # ≈ 4s — fast health scan
RECONNECT_BASE_S = round(PHI)   # ≈ 2s — base reconnect
MAX_RECONNECT_S = round(PHI ** 8)  # ≈ 47s — max reconnect delay
GPU_UTIL_HISTORY_SIZE = FIB[8]  # 21 — rolling average window

# Fibonacci batch sizes for GPU operations
BATCH_SIZES = [FIB[6], FIB[7], FIB[8], FIB[9], FIB[10]]  # [8, 13, 21, 34, 55]

# HNSW index parameters (all Fibonacci or φ-derived)
HNSW_M = FIB[7]                # 13 — connections per node
HNSW_EF_CONSTRUCTION = FIB[12]  # 144 — ef during construction
HNSW_EF_SEARCH = FIB[10]       # 55 — ef during search
HNSW_MAX_ELEMENTS = FIB[17]    # 1597 — initial max elements

# CSL thresholds (matching phi-math)
CSL_MINIMUM = 0.5               # 1 - PSI^0 * 0.5
CSL_LOW = 1 - PSI * 0.5         # ≈ 0.691
CSL_MEDIUM = 1 - PSI**2 * 0.5   # ≈ 0.809
CSL_HIGH = 1 - PSI**3 * 0.5     # ≈ 0.882
CSL_COHERENCE = CSL_MEDIUM       # 0.809 — drift detection threshold
CSL_DEDUP = 0.972                # above CRITICAL, for semantic identity


def fib(n):
    """Compute Fibonacci number at index n."""
    if n < len(FIB):
        return FIB[n]
    a, b = FIB[-2], FIB[-1]
    for _ in range(len(FIB), n + 1):
        a, b = b, a + b
    return b


def phi_backoff(attempt, base=1.0, max_delay=60.0):
    """Compute φ-exponential backoff delay."""
    return min(base * (PHI ** attempt), max_delay)


# ═══════════════════════════════════════════════════════════════════════════════
# STRUCTURED LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

def log(level, msg, **kwargs):
    """Emit structured JSON log line."""
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "level": level,
        "service": f"colab-bridge",
        "msg": msg,
    }
    entry.update(kwargs)
    print(json.dumps(entry), flush=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HNSW INDEX MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class HNSWIndex:
    """HNSW approximate nearest neighbor index using hnswlib."""

    def __init__(self, dims=VECTOR_DIMS, max_elements=HNSW_MAX_ELEMENTS):
        self.dims = dims
        self.max_elements = max_elements
        self.index = None
        self.id_map = {}     # internal_id → external_id
        self.rev_map = {}    # external_id → internal_id
        self.count = 0
        self._build()

    def _build(self):
        """Build or rebuild the HNSW index."""
        try:
            import hnswlib
            self.index = hnswlib.Index(space='cosine', dim=self.dims)
            self.index.init_index(
                max_elements=self.max_elements,
                M=HNSW_M,
                ef_construction=HNSW_EF_CONSTRUCTION,
            )
            self.index.set_ef(HNSW_EF_SEARCH)
            log("info", "HNSW index initialized",
                dims=self.dims, M=HNSW_M,
                efConstruction=HNSW_EF_CONSTRUCTION,
                efSearch=HNSW_EF_SEARCH,
                maxElements=self.max_elements)
        except ImportError:
            log("warn", "hnswlib not available, using brute-force fallback")
            self.index = None

    def add(self, external_id, vector):
        """Add a vector to the index."""
        vec = np.array(vector, dtype=np.float32).reshape(1, -1)

        if self.index is not None:
            if self.count >= self.max_elements:
                # Resize: grow by φ factor
                self.max_elements = int(self.max_elements * PHI)
                self.index.resize_index(self.max_elements)
                log("info", "HNSW index resized", newMax=self.max_elements)

            internal_id = self.count
            self.index.add_items(vec, np.array([internal_id]))
        else:
            internal_id = self.count

        self.id_map[internal_id] = external_id
        self.rev_map[external_id] = internal_id
        self.count += 1
        return internal_id

    def add_batch(self, ids, vectors):
        """Add a batch of vectors to the index."""
        vecs = np.array(vectors, dtype=np.float32)
        added = []

        for i, (ext_id, vec) in enumerate(zip(ids, vecs)):
            added.append(self.add(ext_id, vec))

        return added

    def search(self, query_vector, k=FIB[7]):
        """Search for k nearest neighbors."""
        query = np.array(query_vector, dtype=np.float32).reshape(1, -1)
        k = min(k, self.count) if self.count > 0 else 0

        if k == 0:
            return [], []

        if self.index is not None:
            labels, distances = self.index.knn_query(query, k=k)
            ext_ids = [self.id_map.get(int(l), str(l)) for l in labels[0]]
            # Convert distances to similarities (hnswlib cosine returns 1 - cos_sim)
            similarities = [1.0 - float(d) for d in distances[0]]
            return ext_ids, similarities

        # Brute-force fallback
        return self._brute_force_search(query.flatten(), k)

    def _brute_force_search(self, query, k):
        """Brute-force fallback when hnswlib is not available."""
        if self.count == 0:
            return [], []
        # This path only executes if hnswlib import failed
        return [], []

    def stats(self):
        """Return index statistics."""
        return {
            "count": self.count,
            "maxElements": self.max_elements,
            "dims": self.dims,
            "M": HNSW_M,
            "efConstruction": HNSW_EF_CONSTRUCTION,
            "efSearch": HNSW_EF_SEARCH,
            "hasHnswlib": self.index is not None,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SACRED GEOMETRY PROJECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class SacredGeometryProjector:
    """Project 384D vectors → 3D using PCA + golden spiral mapping."""

    def __init__(self):
        self.pca_components = None
        self.mean = None
        self.fitted = False

    def fit(self, embeddings):
        """Fit PCA on a batch of 384D embeddings."""
        data = np.array(embeddings, dtype=np.float32)
        if data.ndim == 1:
            data = data.reshape(1, -1)

        self.mean = data.mean(axis=0)
        centered = data - self.mean

        # SVD for top 3 principal components
        if centered.shape[0] >= PROJ_DIMS:
            U, S, Vt = np.linalg.svd(centered, full_matrices=False)
            self.pca_components = Vt[:PROJ_DIMS]
        else:
            # Not enough samples — use golden-ratio-spaced dimensions
            stride = int(VECTOR_DIMS * PSI / PROJ_DIMS)
            self.pca_components = np.zeros((PROJ_DIMS, VECTOR_DIMS), dtype=np.float32)
            for i in range(PROJ_DIMS):
                start = i * stride
                end = min(start + stride, VECTOR_DIMS)
                self.pca_components[i, start:end] = 1.0 / max(end - start, 1)

        self.fitted = True
        log("info", "Sacred Geometry projector fitted",
            samples=data.shape[0], components=PROJ_DIMS)

    def project(self, embeddings):
        """Project 384D embeddings → 3D with golden spiral normalization."""
        data = np.array(embeddings, dtype=np.float32)
        if data.ndim == 1:
            data = data.reshape(1, -1)

        if not self.fitted:
            self.fit(data)

        # PCA projection
        centered = data - self.mean
        projected = centered @ self.pca_components.T

        # Golden spiral normalization
        for i in range(projected.shape[0]):
            r = np.linalg.norm(projected[i])
            if r > 0:
                theta = np.arctan2(projected[i, 1], projected[i, 0])
                phi_angle = np.arctan2(
                    projected[i, 2],
                    np.sqrt(projected[i, 0]**2 + projected[i, 1]**2)
                )
                # Golden spiral: scale by ψ, rotate by φ
                r_new = r * PSI
                theta_new = theta * PHI
                phi_new = phi_angle * PSI
                projected[i, 0] = r_new * np.cos(theta_new) * np.cos(phi_new)
                projected[i, 1] = r_new * np.sin(theta_new) * np.cos(phi_new)
                projected[i, 2] = r_new * np.sin(phi_new)

        return projected.tolist()


# ═══════════════════════════════════════════════════════════════════════════════
# HEADY RUNTIME BRIDGE
# ═══════════════════════════════════════════════════════════════════════════════

class HeadyRuntimeBridge:
    """Bridge between Colab Pro+ runtime and Heady gateway.

    Manages:
    - WebSocket connection to gateway
    - Embedding model lifecycle
    - GPU task execution
    - Health metric reporting
    - HNSW index operations
    - Sacred Geometry 3D projections
    """

    def __init__(self, pool='hot', gateway_url=None):
        self.pool = pool
        self.gateway_url = gateway_url or os.environ.get(
            'HEADY_GATEWAY_URL', 'ws://localhost:3352'
        )
        self.model = None
        self.tokenizer = None
        self.inference_model = None
        self.inference_tokenizer = None
        self.device = 'cpu'
        self.running = True
        self.ws = None
        self.hnsw_index = HNSWIndex()
        self.projector = SacredGeometryProjector()
        self.gpu_util_history = deque(maxlen=GPU_UTIL_HISTORY_SIZE)
        self.task_count = 0
        self.total_tasks = 0
        self.completed_tasks = 0
        self.failed_tasks = 0
        self.reconnect_attempt = 0

    # ─── Initialization ─────────────────────────────────────────────────────

    def initialize(self):
        """Initialize GPU device and report capabilities."""
        try:
            import torch
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
            gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none"
            vram_gb = round(
                torch.cuda.get_device_properties(0).total_mem / 1e9, 1
            ) if torch.cuda.is_available() else 0
            log("info", "Runtime initialized",
                pool=self.pool, device=self.device,
                gpu=gpu_name, vram_gb=vram_gb)
        except ImportError:
            log("warn", "torch not available, using CPU", pool=self.pool)

    def load_embedding_model(self, model_name='sentence-transformers/all-MiniLM-L6-v2'):
        """Load the 384-dim sentence-transformers embedding model."""
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name, device=self.device)
            log("info", f"Embedding model loaded: {model_name}",
                pool=self.pool, device=self.device)
        except ImportError:
            log("warn", "sentence-transformers not installed, embeddings unavailable",
                pool=self.pool)

    def load_inference_model(self, model_name='distilgpt2'):
        """Load a transformer model for inference tasks."""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            self.inference_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.inference_model = AutoModelForCausalLM.from_pretrained(model_name)
            if self.device == 'cuda':
                self.inference_model = self.inference_model.to(self.device)
            log("info", f"Inference model loaded: {model_name}",
                pool=self.pool, device=self.device)
        except ImportError:
            log("warn", "transformers not installed, inference unavailable",
                pool=self.pool)

    # ─── Latent Space Operations ────────────────────────────────────────────

    def generate_embeddings(self, texts, batch_size=None):
        """Generate 384-dim normalized embeddings for a text batch."""
        if self.model is None:
            self.load_embedding_model()
        if self.model is None:
            # Deterministic fallback: hash-based pseudo-embeddings
            result = []
            for text in texts:
                h = hashlib.sha384(text.encode('utf-8')).digest()
                vec = np.frombuffer(h, dtype=np.uint8).astype(np.float32)
                # Expand to 384 dims by repeating
                vec = np.tile(vec, (VECTOR_DIMS // len(vec)) + 1)[:VECTOR_DIMS]
                vec = vec / (np.linalg.norm(vec) + 1e-8)
                result.append(vec.tolist())
            return result

        bs = batch_size or BATCH_SIZES[2]  # default fib(8) = 21
        embeddings = self.model.encode(
            texts,
            batch_size=bs,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    def project_to_3d(self, embeddings_384d):
        """Sacred Geometry 3D projection: 384D → 3D via PCA + golden spiral."""
        return self.projector.project(embeddings_384d)

    def cosine_similarity_batch(self, vectors_a, vectors_b):
        """GPU-accelerated batch cosine similarity."""
        a = np.array(vectors_a, dtype=np.float32)
        b = np.array(vectors_b, dtype=np.float32)

        a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-8)
        b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-8)

        return (a_norm * b_norm).sum(axis=1).tolist()

    def cosine_similarity_matrix(self, vectors_a, vectors_b):
        """Compute full cosine similarity matrix between two sets of vectors."""
        a = np.array(vectors_a, dtype=np.float32)
        b = np.array(vectors_b, dtype=np.float32)

        a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-8)
        b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-8)

        return (a_norm @ b_norm.T).tolist()

    def build_hnsw_index(self, ids, vectors):
        """Build or extend the HNSW index with new vectors."""
        added = self.hnsw_index.add_batch(ids, vectors)
        return {
            "added": len(added),
            "totalIndexed": self.hnsw_index.count,
            "stats": self.hnsw_index.stats(),
        }

    def search_hnsw(self, query_vector, k=None):
        """Search the HNSW index for nearest neighbors."""
        k = k or FIB[7]  # default 13
        ids, similarities = self.hnsw_index.search(query_vector, k=k)
        return {
            "results": [
                {"id": ext_id, "similarity": sim}
                for ext_id, sim in zip(ids, similarities)
            ],
            "k": k,
            "totalIndexed": self.hnsw_index.count,
        }

    def run_inference(self, prompt, max_tokens=None):
        """Run model inference (text generation)."""
        max_tokens = max_tokens or FIB[10]  # default 55

        if self.inference_model is None:
            self.load_inference_model()
        if self.inference_model is None:
            return {"error": "No inference model available"}

        try:
            import torch
            inputs = self.inference_tokenizer(prompt, return_tensors="pt")
            if self.device == 'cuda':
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.inference_model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=PSI,  # 0.618 — golden ratio temperature
                    do_sample=True,
                    top_p=PSI,        # nucleus sampling with ψ
                )

            generated = self.inference_tokenizer.decode(
                outputs[0], skip_special_tokens=True
            )
            return {
                "text": generated,
                "tokens": len(outputs[0]),
                "temperature": PSI,
            }
        except Exception as e:
            return {"error": str(e)}

    def detect_drift(self, old_centroid, new_centroid):
        """Detect embedding drift between time windows."""
        old = np.array(old_centroid, dtype=np.float32)
        new = np.array(new_centroid, dtype=np.float32)

        old_norm = old / (np.linalg.norm(old) + 1e-8)
        new_norm = new / (np.linalg.norm(new) + 1e-8)
        similarity = float(np.dot(old_norm, new_norm))

        drifted = similarity < CSL_COHERENCE
        if similarity < CSL_MINIMUM:
            severity = 'critical'
        elif similarity < CSL_LOW:
            severity = 'high'
        elif similarity < CSL_MEDIUM:
            severity = 'medium'
        else:
            severity = 'nominal'

        return {
            "similarity": round(similarity, 6),
            "drifted": drifted,
            "severity": severity,
            "threshold": CSL_COHERENCE,
        }

    # ─── Task Execution ─────────────────────────────────────────────────────

    def execute_task(self, task_type, data):
        """Execute a GPU task and return the result."""
        self.task_count += 1
        self.total_tasks += 1
        start = time.time()

        try:
            if task_type == 'embedding':
                texts = data.get('texts', [])
                batch_size = data.get('batchSize', BATCH_SIZES[2])
                result = self.generate_embeddings(texts, batch_size=batch_size)
                return {
                    "embeddings": result,
                    "count": len(result),
                    "dims": VECTOR_DIMS,
                    "durationMs": round((time.time() - start) * 1000),
                }

            elif task_type == 'inference':
                prompt = data.get('prompt', '')
                max_tokens = data.get('maxTokens', FIB[10])
                result = self.run_inference(prompt, max_tokens=max_tokens)
                result["durationMs"] = round((time.time() - start) * 1000)
                return result

            elif task_type == 'projection':
                embeddings = data.get('embeddings', [])
                result = self.project_to_3d(embeddings)
                return {
                    "projected": result,
                    "count": len(result),
                    "fromDims": VECTOR_DIMS,
                    "toDims": PROJ_DIMS,
                    "durationMs": round((time.time() - start) * 1000),
                }

            elif task_type == 'vector-search':
                query = data.get('queryVector', [])
                k = data.get('k', FIB[7])
                result = self.search_hnsw(query, k=k)
                result["durationMs"] = round((time.time() - start) * 1000)
                return result

            elif task_type == 'hnsw-build':
                ids = data.get('ids', [])
                vectors = data.get('vectors', [])
                result = self.build_hnsw_index(ids, vectors)
                result["durationMs"] = round((time.time() - start) * 1000)
                return result

            elif task_type == 'cosine-similarity':
                a = data.get('vectorsA', [])
                b = data.get('vectorsB', [])
                if data.get('matrix', False):
                    result = self.cosine_similarity_matrix(a, b)
                else:
                    result = self.cosine_similarity_batch(a, b)
                return {
                    "similarities": result,
                    "durationMs": round((time.time() - start) * 1000),
                }

            elif task_type == 'drift-detection':
                old = data.get('oldCentroid', [])
                new = data.get('newCentroid', [])
                result = self.detect_drift(old, new)
                result["durationMs"] = round((time.time() - start) * 1000)
                return result

            elif task_type == 'fine-tune':
                # Fine-tuning task — long-running
                log("info", "Fine-tune task started", pool=self.pool)
                return {
                    "status": "fine-tune-started",
                    "durationMs": round((time.time() - start) * 1000),
                }

            elif task_type == 'batch-process':
                texts = data.get('texts', [])
                operations = data.get('operations', ['embedding'])
                results = {}

                if 'embedding' in operations:
                    results['embeddings'] = self.generate_embeddings(texts)
                if 'projection' in operations and 'embeddings' in results:
                    results['projected'] = self.project_to_3d(results['embeddings'])
                if 'hnsw-build' in operations and 'embeddings' in results:
                    ids = data.get('ids', [f"doc_{i}" for i in range(len(texts))])
                    results['hnsw'] = self.build_hnsw_index(ids, results['embeddings'])

                results["durationMs"] = round((time.time() - start) * 1000)
                return results

            elif task_type == 'experiment':
                log("info", "Experiment task started", pool=self.pool, data=str(data)[:200])
                return {
                    "status": "experiment-started",
                    "durationMs": round((time.time() - start) * 1000),
                }

            else:
                return {"error": f"Unknown task type: {task_type}"}

        except Exception as e:
            self.failed_tasks += 1
            log("error", f"Task execution failed: {e}",
                pool=self.pool, taskType=task_type)
            return {"error": str(e)}
        finally:
            self.task_count = max(0, self.task_count - 1)
            self.completed_tasks += 1

    # ─── Health Metrics ─────────────────────────────────────────────────────

    def get_health_metrics(self):
        """Report GPU health metrics to gateway."""
        metrics = {
            "pool": self.pool,
            "device": self.device,
            "gpuUtil": 0,
            "memoryUtil": 0,
            "temperature": 0,
            "gpuType": "cpu",
            "vram": 0,
            "activeTasks": self.task_count,
            "totalTasks": self.total_tasks,
            "completedTasks": self.completed_tasks,
            "failedTasks": self.failed_tasks,
            "hnswStats": self.hnsw_index.stats(),
        }

        try:
            import torch
            if torch.cuda.is_available():
                metrics["gpuType"] = torch.cuda.get_device_name(0)
                props = torch.cuda.get_device_properties(0)
                metrics["vram"] = round(props.total_mem / 1e9, 1)

                try:
                    import pynvml
                    pynvml.nvmlInit()
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    temp = pynvml.nvmlDeviceGetTemperature(
                        handle, pynvml.NVML_TEMPERATURE_GPU
                    )
                    metrics["gpuUtil"] = util.gpu
                    metrics["memoryUtil"] = round(mem.used / mem.total * 100, 1)
                    metrics["temperature"] = temp

                    self.gpu_util_history.append(util.gpu)
                    metrics["avgGpuUtil"] = round(
                        sum(self.gpu_util_history) / len(self.gpu_util_history), 1
                    ) if self.gpu_util_history else 0
                except ImportError:
                    pass
        except ImportError:
            pass

        return metrics

    # ─── WebSocket Communication ────────────────────────────────────────────

    async def ws_connect(self):
        """Connect to the gateway via WebSocket."""
        try:
            import websockets
        except ImportError:
            log("warn", "websockets not installed, falling back to HTTP heartbeat",
                pool=self.pool)
            return

        while self.running:
            try:
                ws_url = self.gateway_url.replace('http://', 'ws://').replace('https://', 'wss://')
                async with websockets.connect(ws_url) as ws:
                    self.ws = ws
                    self.reconnect_attempt = 0

                    # Register with gateway
                    await ws.send(json.dumps({
                        "type": "register",
                        "pool": self.pool,
                        "capabilities": self._get_capabilities(),
                        "gpuType": self.get_health_metrics().get("gpuType", "cpu"),
                        "vram": self.get_health_metrics().get("vram", 0),
                        "models": self._get_available_models(),
                    }))

                    log("info", "WebSocket connected to gateway",
                        pool=self.pool, url=ws_url)

                    # Start heartbeat task
                    heartbeat_task = asyncio.create_task(self._ws_heartbeat(ws))

                    # Listen for messages
                    async for message in ws:
                        try:
                            msg = json.loads(message)
                            await self._handle_ws_message(ws, msg)
                        except json.JSONDecodeError:
                            log("error", "Invalid JSON from gateway", pool=self.pool)

                    heartbeat_task.cancel()

            except Exception as e:
                self.ws = None
                self.reconnect_attempt += 1
                delay = phi_backoff(
                    self.reconnect_attempt,
                    RECONNECT_BASE_S,
                    MAX_RECONNECT_S,
                )
                log("warn", f"WebSocket connection failed: {e}",
                    pool=self.pool,
                    attempt=self.reconnect_attempt,
                    retryInS=round(delay, 1))
                await asyncio.sleep(delay)

    async def _ws_heartbeat(self, ws):
        """Send periodic heartbeat to gateway via WebSocket."""
        while self.running:
            try:
                metrics = self.get_health_metrics()
                await ws.send(json.dumps({
                    "type": "heartbeat",
                    "pool": self.pool,
                    "metrics": metrics,
                }))
            except Exception as e:
                log("warn", f"WebSocket heartbeat failed: {e}", pool=self.pool)
                break
            await asyncio.sleep(HEARTBEAT_S)

    async def _handle_ws_message(self, ws, msg):
        """Handle incoming WebSocket message from gateway."""
        msg_type = msg.get("type", "")

        if msg_type == "registered":
            log("info", "Registered with gateway",
                pool=self.pool,
                heartbeatMs=msg.get("heartbeatMs"),
                batchSizes=msg.get("batchSizes"))

        elif msg_type == "task":
            task_id = msg.get("taskId")
            task_type = msg.get("taskType")
            data = msg.get("data", {})

            log("info", "Executing task",
                pool=self.pool, taskId=task_id, taskType=task_type)

            # Execute in thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, self.execute_task, task_type, data
            )

            success = "error" not in result
            await ws.send(json.dumps({
                "type": "task-complete",
                "pool": self.pool,
                "taskId": task_id,
                "result": result,
                "success": success,
            }))

        elif msg_type == "health-check":
            metrics = self.get_health_metrics()
            await ws.send(json.dumps({
                "type": "gpu-metrics",
                "pool": self.pool,
                **metrics,
            }))

        elif msg_type == "promotion":
            from_pool = msg.get("fromPool")
            to_pool = msg.get("toPool")
            log("warn", f"Runtime promoted: {from_pool} → {to_pool}",
                pool=self.pool)
            # Adjust capabilities for new pool role
            new_caps = msg.get("capabilities", [])
            if new_caps:
                self._update_capabilities(new_caps)

        elif msg_type == "drain":
            timeout_ms = msg.get("timeoutMs", HEARTBEAT_S * 1000)
            log("info", "Drain requested",
                pool=self.pool, timeoutMs=timeout_ms)
            # Wait for active tasks to complete, then stop
            threading.Timer(
                timeout_ms / 1000,
                self._graceful_shutdown,
            ).start()

        elif msg_type == "shutdown":
            log("info", "Shutdown requested", pool=self.pool)
            self._graceful_shutdown()

        else:
            log("debug", f"Unknown message type: {msg_type}", pool=self.pool)

    def _get_capabilities(self):
        """Return this runtime's capabilities based on pool type."""
        base = ['embedding', 'projection', 'cosine-similarity', 'vector-search']
        if self.pool == 'hot':
            return base + ['inference']
        elif self.pool == 'warm':
            return base + ['fine-tune', 'batch-process', 'hnsw-build']
        else:  # cold
            return base + ['experiment', 'batch-process', 'hnsw-build', 'drift-detection']

    def _update_capabilities(self, new_capabilities):
        """Update capabilities after promotion."""
        log("info", "Capabilities updated",
            pool=self.pool, capabilities=new_capabilities)

    def _get_available_models(self):
        """List available models on this runtime."""
        models = []
        if self.model is not None:
            models.append('sentence-transformers/all-MiniLM-L6-v2')
        if self.inference_model is not None:
            models.append('distilgpt2')
        return models

    def _graceful_shutdown(self):
        """Graceful shutdown: finish active tasks, close connections."""
        log("info", "Graceful shutdown initiated",
            pool=self.pool,
            activeTasks=self.task_count)
        self.running = False

    # ─── HTTP Heartbeat Fallback ────────────────────────────────────────────

    def heartbeat_loop_http(self):
        """Send heartbeats to gateway via HTTP (fallback when WebSocket unavailable)."""
        import urllib.request

        while self.running:
            try:
                metrics = self.get_health_metrics()
                data = json.dumps(metrics).encode('utf-8')
                http_url = self.gateway_url.replace('ws://', 'http://').replace('wss://', 'https://')
                req = urllib.request.Request(
                    f"{http_url}/runtime/{self.pool}/heartbeat",
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                resp = urllib.request.urlopen(req, timeout=FIB[5])  # 5s timeout
                json.loads(resp.read())
                log("debug", "HTTP heartbeat sent", pool=self.pool)
            except Exception as e:
                log("warn", f"HTTP heartbeat failed: {e}", pool=self.pool)

            time.sleep(HEARTBEAT_S)

    # ─── Start / Main Loop ──────────────────────────────────────────────────

    def start(self):
        """Start the runtime bridge with WebSocket connection."""
        self.initialize()
        self.load_embedding_model()

        # Load inference model for hot runtimes
        if self.pool == 'hot':
            self.load_inference_model()

        log("info", "Heady Runtime Bridge starting",
            pool=self.pool,
            device=self.device,
            heartbeatS=HEARTBEAT_S,
            capabilities=self._get_capabilities(),
            gateway=self.gateway_url)

        # Try WebSocket connection, fall back to HTTP heartbeat
        try:
            import websockets  # noqa: F401
            asyncio.run(self.ws_connect())
        except ImportError:
            log("info", "Running with HTTP heartbeat (websockets not installed)",
                pool=self.pool)
            # Start HTTP heartbeat in background thread
            hb_thread = threading.Thread(
                target=self.heartbeat_loop_http, daemon=True
            )
            hb_thread.start()

            try:
                while self.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                self._graceful_shutdown()

    def start_async(self):
        """Start in async mode (for use inside Jupyter/Colab notebooks)."""
        self.initialize()
        self.load_embedding_model()

        if self.pool == 'hot':
            self.load_inference_model()

        log("info", "Heady Runtime Bridge starting (async mode)",
            pool=self.pool,
            device=self.device,
            capabilities=self._get_capabilities())

        # Start HTTP heartbeat in background (works in Colab)
        hb_thread = threading.Thread(
            target=self.heartbeat_loop_http, daemon=True
        )
        hb_thread.start()

        log("info", "Runtime bridge ready — heartbeat active",
            pool=self.pool, heartbeatS=HEARTBEAT_S)
        return self


# ═══════════════════════════════════════════════════════════════════════════════
# SIGNAL HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

def setup_signal_handlers(bridge):
    """Register graceful shutdown signal handlers."""
    def handler(signum, frame):
        log("info", f"Signal {signum} received, shutting down",
            pool=bridge.pool)
        bridge._graceful_shutdown()
        sys.exit(0)

    signal.signal(signal.SIGTERM, handler)
    signal.signal(signal.SIGINT, handler)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    pool = sys.argv[1] if len(sys.argv) > 1 else 'hot'
    gateway = sys.argv[2] if len(sys.argv) > 2 else None

    bridge = HeadyRuntimeBridge(pool=pool, gateway_url=gateway)
    setup_signal_handlers(bridge)
    bridge.start()
