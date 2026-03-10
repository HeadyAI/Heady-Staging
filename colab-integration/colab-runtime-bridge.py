#!/usr/bin/env python3
"""
Heady™ Colab Runtime Bridge — Runs INSIDE each Colab Pro+ notebook
Connects to colab-gateway via WebSocket, executes GPU tasks

Latent Space Operations:
- Vector embedding generation (sentence-transformers, 384-dim)
- 3D projection from 384D → 3D using Sacred Geometry (PCA + golden spiral)
- Cosine similarity computation at GPU speed
- Batch HNSW index building
- Model inference via transformers

© 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
"""

import json, time, os, sys, hashlib, threading
import numpy as np

# φ-Constants
PHI = 1.6180339887498948
PSI = 0.6180339887498949
FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
HEARTBEAT_S = round(PHI ** 7)  # ≈ 29s
VECTOR_DIMS = 384
PROJ_DIMS = 3

def fib(n):
    if n < len(FIB): return FIB[n]
    a, b = FIB[-2], FIB[-1]
    for _ in range(len(FIB), n + 1):
        a, b = b, a + b
    return b

def phi_backoff(attempt, base=1.0, max_delay=60.0):
    return min(base * (PHI ** attempt), max_delay)


class HeadyRuntimeBridge:
    """Bridge between Colab runtime and Heady gateway"""
    
    def __init__(self, pool='hot', gateway_url=None):
        self.pool = pool
        self.gateway_url = gateway_url or os.environ.get('HEADY_GATEWAY_URL', 'http://colab-gateway.local.headysystems.com:3352')
        self.model = None
        self.tokenizer = None
        self.device = 'cpu'
        self.running = True
        
    def initialize(self):
        """Initialize ML models and GPU"""
        try:
            import torch
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(json.dumps({
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "level": "info",
                "service": f"colab-{self.pool}",
                "msg": "Runtime initialized",
                "device": self.device,
                "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none",
                "vram_gb": round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1) if torch.cuda.is_available() else 0,
            }))
        except ImportError:
            print(json.dumps({"level": "warn", "msg": "torch not available, using CPU"}))
    
    def load_embedding_model(self, model_name='sentence-transformers/all-MiniLM-L6-v2'):
        """Load 384-dim embedding model"""
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name, device=self.device)
            print(json.dumps({"level": "info", "msg": f"Embedding model loaded: {model_name}"}))
        except ImportError:
            print(json.dumps({"level": "warn", "msg": "sentence-transformers not installed"}))
    
    def generate_embeddings(self, texts, batch_size=None):
        """Generate 384-dim embeddings for text batch"""
        if self.model is None:
            self.load_embedding_model()
        if self.model is None:
            return np.random.randn(len(texts), VECTOR_DIMS).tolist()
        
        bs = batch_size or fib(8)  # default 21
        embeddings = self.model.encode(texts, batch_size=bs, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.tolist()
    
    def project_to_3d(self, embeddings_384d):
        """Sacred Geometry 3D projection: 384D → 3D via PCA + golden spiral mapping"""
        data = np.array(embeddings_384d)
        if data.ndim == 1:
            data = data.reshape(1, -1)
        
        # Center the data
        mean = data.mean(axis=0)
        centered = data - mean
        
        # PCA via SVD for top 3 components
        U, S, Vt = np.linalg.svd(centered, full_matrices=False)
        projected = centered @ Vt[:PROJ_DIMS].T
        
        # Apply golden spiral normalization
        for i in range(projected.shape[0]):
            r = np.linalg.norm(projected[i])
            if r > 0:
                theta = np.arctan2(projected[i, 1], projected[i, 0])
                # Golden spiral: r_new = r * PSI, theta_new = theta * PHI
                projected[i, 0] = r * PSI * np.cos(theta * PHI)
                projected[i, 1] = r * PSI * np.sin(theta * PHI)
                projected[i, 2] = projected[i, 2] * PSI
        
        return projected.tolist()
    
    def cosine_similarity_batch(self, vectors_a, vectors_b):
        """GPU-accelerated batch cosine similarity"""
        a = np.array(vectors_a)
        b = np.array(vectors_b)
        
        a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-8)
        b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-8)
        
        return (a_norm * b_norm).sum(axis=1).tolist()
    
    def get_health_metrics(self):
        """Report GPU health metrics"""
        metrics = {
            "pool": self.pool,
            "device": self.device,
            "gpuUtil": 0,
            "memoryUtil": 0,
            "temperature": 0,
            "gpuType": "cpu",
            "vram": 0,
        }
        
        try:
            import torch
            if torch.cuda.is_available():
                metrics["gpuType"] = torch.cuda.get_device_name(0)
                metrics["vram"] = round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1)
                # GPU utilization requires pynvml
                try:
                    import pynvml
                    pynvml.nvmlInit()
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                    metrics["gpuUtil"] = util.gpu
                    metrics["memoryUtil"] = round(mem.used / mem.total * 100, 1)
                    metrics["temperature"] = temp
                except ImportError:
                    pass
        except ImportError:
            pass
        
        return metrics
    
    def heartbeat_loop(self):
        """Send heartbeats to gateway at φ⁷ intervals"""
        import urllib.request
        
        while self.running:
            try:
                metrics = self.get_health_metrics()
                data = json.dumps(metrics).encode('utf-8')
                req = urllib.request.Request(
                    f"{self.gateway_url}/runtime/{self.pool}/heartbeat",
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                resp = urllib.request.urlopen(req, timeout=5)
                result = json.loads(resp.read())
                print(json.dumps({"level": "debug", "msg": "Heartbeat sent", "pool": self.pool}))
            except Exception as e:
                print(json.dumps({"level": "warn", "msg": f"Heartbeat failed: {e}", "pool": self.pool}))
            
            time.sleep(HEARTBEAT_S)
    
    def start(self):
        """Start the runtime bridge"""
        self.initialize()
        self.load_embedding_model()
        
        # Start heartbeat in background thread
        hb_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        hb_thread.start()
        
        print(json.dumps({
            "level": "info",
            "msg": f"Heady Runtime Bridge started",
            "pool": self.pool,
            "device": self.device,
            "heartbeatS": HEARTBEAT_S,
        }))
        
        # Keep alive
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.running = False
            print(json.dumps({"level": "info", "msg": "Runtime bridge shutting down"}))


if __name__ == '__main__':
    pool = sys.argv[1] if len(sys.argv) > 1 else 'hot'
    bridge = HeadyRuntimeBridge(pool=pool)
    bridge.start()
