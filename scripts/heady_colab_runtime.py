"""
Heady Colab Runtime Utilities
==============================
Bootstrap code for the 3 Colab Pro+ runtimes (Cortex, Synapse, Reflex).
Handles inter-runtime communication, GPU management, keepalive,
state checkpointing, and distributed task dispatch.

Usage in a Colab notebook:
    from heady_colab_runtime import RuntimeBootstrap
    
    runtime = RuntimeBootstrap(runtime_id="cortex")
    runtime.start()
    # ... your agent code here ...

© 2026 HeadySystems Inc. — Sacred Geometry v4.0
"""

import asyncio
import hashlib
import json
import logging
import os
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Sacred Geometry constants — no magic numbers
# ---------------------------------------------------------------------------
PHI = 1.618033988749895
PSI = 1 / PHI  # ≈ 0.618
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]

# Relevance gates for task routing
RELEVANCE_GATES = {
    "include": PSI * PSI,   # ≈ 0.382
    "boost": PSI,           # ≈ 0.618
    "inject": PSI + 0.1,    # ≈ 0.718
}

# Retry backoff derived from Fibonacci (milliseconds)
RETRY_BACKOFF_MS = [f * 100 for f in FIB[4:9]]  # [500, 800, 1300, 2100, 3400]


# ---------------------------------------------------------------------------
# Structured logging setup (structlog-compatible, falls back to stdlib)
# ---------------------------------------------------------------------------
def setup_logger(service_name: str) -> logging.Logger:
    """Create a structured JSON logger for the given service.
    
    Every log entry includes the service name and a timestamp, making it
    easy to aggregate logs from all 3 runtimes into a single stream and
    filter by which runtime produced each message.
    """
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            json.dumps({
                "timestamp": "%(asctime)s",
                "service": service_name,
                "level": "%(levelname)s",
                "message": "%(message)s",
            })
        ))
        logger.addHandler(handler)
    return logger


# ---------------------------------------------------------------------------
# GPU state management
# ---------------------------------------------------------------------------
@dataclass
class GPUState:
    """Snapshot of GPU state for this runtime.
    
    This gets queried on startup and periodically to know how much VRAM
    is available for accepting new tasks. The RuntimeRegistry uses these
    snapshots to decide where to dispatch work.
    """
    available: bool = False
    name: str = "none"
    total_mb: int = 0
    free_mb: int = 0
    used_mb: int = 0
    utilization_pct: float = 0.0
    compute_capability: str = "0.0"


def get_gpu_state() -> GPUState:
    """Query the current GPU state using PyTorch.
    
    Returns a GPUState dataclass with VRAM info. If no GPU is available
    (e.g., running on CPU), returns a GPUState with available=False.
    """
    try:
        import torch
        if not torch.cuda.is_available():
            return GPUState()
        
        props = torch.cuda.get_device_properties(0)
        free, total = torch.cuda.mem_get_info()
        used = total - free
        
        return GPUState(
            available=True,
            name=props.name,
            total_mb=total // (1024 * 1024),
            free_mb=free // (1024 * 1024),
            used_mb=used // (1024 * 1024),
            utilization_pct=round(used / total * 100, 1) if total > 0 else 0,
            compute_capability=f"{props.major}.{props.minor}",
        )
    except ImportError:
        return GPUState()


def clear_gpu_cache():
    """Aggressively free GPU memory.
    
    Useful before loading a new model or after finishing a batch of
    inference tasks. Calls both PyTorch's cache clearing and Python's
    garbage collector for maximum reclamation.
    """
    try:
        import gc
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            gc.collect()
    except ImportError:
        pass


# ---------------------------------------------------------------------------
# Keepalive — prevents Colab runtime idle disconnect
# ---------------------------------------------------------------------------
class RuntimeKeepAlive:
    """Prevent Colab from disconnecting due to idle timeout.
    
    Colab Pro+ runtimes disconnect after a period of inactivity. This
    background thread periodically performs a trivial operation and logs
    the current GPU state, resetting the idle timer. The interval defaults
    to 55 seconds (just under the typical 60-second idle check).
    """
    
    def __init__(self, interval_seconds: int = 55, logger=None):
        self.interval = interval_seconds
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self.logger = logger or setup_logger("keepalive")
    
    def start(self):
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        self.logger.info("Keepalive started (interval=%ds)" % self.interval)
    
    def stop(self):
        self.running = False
        self.logger.info("Keepalive stopped")
    
    def _loop(self):
        while self.running:
            try:
                gpu = get_gpu_state()
                self.logger.info(
                    "keepalive tick | gpu_util=%.1f%% | vram_free=%dMB"
                    % (gpu.utilization_pct, gpu.free_mb)
                )
            except Exception as e:
                self.logger.warning("keepalive error: %s" % str(e))
            time.sleep(self.interval)


# ---------------------------------------------------------------------------
# State checkpointing — persist agent state across runtime restarts
# ---------------------------------------------------------------------------
CHECKPOINT_DIR = "/content/drive/MyDrive/heady/checkpoints"


def checkpoint_state(state: dict, agent_id: str, checkpoint_dir: str = CHECKPOINT_DIR) -> str:
    """Save agent state to Google Drive for persistence.
    
    Colab runtimes are ephemeral — they can disconnect at any time. By
    checkpointing state to Google Drive every few minutes, we can restore
    the agent's memory when the runtime reconnects. Each checkpoint is
    timestamped so we always know which is the most recent.
    """
    os.makedirs(checkpoint_dir, exist_ok=True)
    filename = f"{agent_id}_{int(time.time())}.json"
    filepath = os.path.join(checkpoint_dir, filename)
    
    # Add metadata to the checkpoint
    state["_checkpoint_meta"] = {
        "agent_id": agent_id,
        "timestamp": time.time(),
        "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "gpu": get_gpu_state().__dict__,
    }
    
    with open(filepath, "w") as f:
        json.dump(state, f, indent=2, default=str)
    
    # Clean up old checkpoints (keep last 10 per agent)
    _prune_old_checkpoints(agent_id, checkpoint_dir, keep=10)
    
    return filepath


def restore_latest_checkpoint(agent_id: str, checkpoint_dir: str = CHECKPOINT_DIR) -> Optional[dict]:
    """Restore the most recent checkpoint for an agent.
    
    Scans the checkpoint directory for files matching this agent's ID,
    sorts by timestamp (newest first), and returns the contents of the
    most recent one. Returns None if no checkpoint exists.
    """
    import glob
    pattern = os.path.join(checkpoint_dir, f"{agent_id}_*.json")
    files = sorted(glob.glob(pattern), reverse=True)
    if not files:
        return None
    with open(files[0], "r") as f:
        return json.load(f)


def _prune_old_checkpoints(agent_id: str, checkpoint_dir: str, keep: int = 10):
    """Remove old checkpoints, keeping only the most recent `keep` files."""
    import glob
    pattern = os.path.join(checkpoint_dir, f"{agent_id}_*.json")
    files = sorted(glob.glob(pattern), reverse=True)
    for old_file in files[keep:]:
        try:
            os.remove(old_file)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Cloudflare Tunnel — exposes local ports for inter-runtime communication
# ---------------------------------------------------------------------------
def start_cloudflare_tunnel(port: int, logger=None) -> tuple[Optional[str], Optional[subprocess.Popen]]:
    """Start a Cloudflare Tunnel to expose a local port to the internet.
    
    This is how the 3 Colab runtimes discover and talk to each other.
    Each runtime starts a tunnel on its service port, then registers the
    resulting URL with the RuntimeRegistry so other runtimes can find it.
    
    Returns (tunnel_url, process) or (None, None) on failure.
    """
    import re
    logger = logger or setup_logger("tunnel")
    
    try:
        proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", f"http://localhost:{port}", "--no-autoupdate"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        
        # Parse the tunnel URL from stderr output
        tunnel_url = None
        deadline = time.time() + 30  # 30 second timeout
        
        for line in proc.stderr:
            if time.time() > deadline:
                logger.error("Tunnel startup timed out after 30s")
                break
            
            decoded = line.decode("utf-8", errors="replace")
            match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", decoded)
            if match:
                tunnel_url = match.group()
                logger.info("Tunnel active: %s -> localhost:%d" % (tunnel_url, port))
                break
        
        return tunnel_url, proc
    
    except FileNotFoundError:
        logger.error("cloudflared not found. Install with: pip install cloudflared")
        return None, None


# ---------------------------------------------------------------------------
# Runtime Registry — tracks all 3 runtimes and their capabilities
# ---------------------------------------------------------------------------
class RuntimeRole(Enum):
    """The 3 Colab Pro+ runtimes, each with a specialized role.
    
    Cortex handles heavy inference (A100 80GB), Synapse handles vector
    operations and embeddings (A100 40GB), and Reflex handles lightweight
    agents, data preprocessing, and API serving (T4/L4).
    """
    CORTEX = "cortex"    # A100 80GB — primary inference
    SYNAPSE = "synapse"  # A100 40GB — vector ops, embeddings
    REFLEX = "reflex"    # T4/L4 — lightweight agents, data preprocessing


@dataclass
class RuntimeInfo:
    """All the info needed to communicate with a remote runtime."""
    runtime_id: str
    tunnel_url: Optional[str] = None
    gpu: GPUState = field(default_factory=GPUState)
    registered_at: float = 0.0
    status: str = "unknown"  # active, degraded, disconnected


class RuntimeRegistry:
    """Manages discovery of all 3 Colab runtimes.
    
    Each runtime registers itself with its tunnel URL and GPU info. Other
    runtimes can then dispatch tasks to the best available target based
    on VRAM requirements and current utilization.
    """
    
    def __init__(self, logger=None):
        self.runtimes: dict[str, RuntimeInfo] = {}
        self.logger = logger or setup_logger("registry")
    
    def register(self, runtime_id: str, tunnel_url: str, gpu: GPUState):
        """Register this runtime's endpoint and capabilities."""
        self.runtimes[runtime_id] = RuntimeInfo(
            runtime_id=runtime_id,
            tunnel_url=tunnel_url,
            gpu=gpu,
            registered_at=time.time(),
            status="active",
        )
        self.logger.info("Registered runtime: %s at %s (GPU: %s, %dMB free)"
                         % (runtime_id, tunnel_url, gpu.name, gpu.free_mb))
    
    def select_runtime(self, vram_needed_mb: int = 0) -> Optional[RuntimeInfo]:
        """Select the best runtime for a task based on available VRAM.
        
        Prefers runtimes with the most free VRAM that meets the requirement.
        This is capability-based routing, not priority-based — all runtimes
        are equal-status workers, and the one with the best fit wins.
        """
        candidates = [
            rt for rt in self.runtimes.values()
            if rt.status == "active" and rt.gpu.free_mb >= vram_needed_mb
        ]
        if not candidates:
            return None
        # Sort by free VRAM descending — best resource match first
        candidates.sort(key=lambda r: r.gpu.free_mb, reverse=True)
        return candidates[0]
    
    def dispatch(self, task: dict, preferred_runtime: Optional[str] = None) -> Optional[dict]:
        """Dispatch a task to the best available runtime via HTTP.
        
        If a preferred runtime is specified and available, tries it first.
        Otherwise falls back to automatic selection based on task requirements.
        """
        import requests
        
        target = None
        if preferred_runtime and preferred_runtime in self.runtimes:
            target = self.runtimes[preferred_runtime]
        
        if target is None:
            vram_needed = task.get("vram_mb", 0)
            target = self.select_runtime(vram_needed)
        
        if target is None or target.tunnel_url is None:
            self.logger.error("No available runtime for task: %s" % task.get("type", "unknown"))
            return None
        
        try:
            resp = requests.post(
                f"{target.tunnel_url}/task",
                json=task,
                timeout=30,
            )
            return resp.json()
        except Exception as e:
            self.logger.error("Dispatch failed to %s: %s" % (target.runtime_id, str(e)))
            target.status = "degraded"
            return None


# ---------------------------------------------------------------------------
# Task allocation table — which tasks go where
# ---------------------------------------------------------------------------
TASK_ALLOCATION = {
    # task_type: (preferred_runtime, fallback_runtime, min_vram_mb)
    "large_inference":    ("cortex",  None,      40000),
    "medium_inference":   ("cortex",  "synapse", 14000),
    "small_inference":    ("reflex",  "synapse", 4000),
    "embedding":          ("synapse", "cortex",  4000),
    "vector_search":      ("synapse", "cortex",  2000),
    "data_preprocessing": ("reflex",  "synapse", 1000),
    "agent_orchestration":("reflex",  "synapse", 1000),
    "api_serving":        ("reflex",  "synapse", 500),
}


# ---------------------------------------------------------------------------
# RuntimeBootstrap — the main entry point for each Colab runtime
# ---------------------------------------------------------------------------
class RuntimeBootstrap:
    """Main bootstrap class for a Heady Colab runtime.
    
    Call this at the top of your Colab notebook to set up the runtime
    with all the infrastructure it needs: logging, keepalive, GPU
    monitoring, tunnel, registry, and checkpoint restoration.
    
    Example:
        runtime = RuntimeBootstrap("cortex")
        runtime.start()
        # runtime.tunnel_url is now available
        # runtime.gpu is the current GPU state
        # runtime.registry can dispatch tasks to other runtimes
    """
    
    def __init__(self, runtime_id: str, port: int = 8000, auto_tunnel: bool = True):
        self.runtime_id = runtime_id
        self.port = port
        self.auto_tunnel = auto_tunnel
        self.logger = setup_logger(f"heady-{runtime_id}")
        self.gpu = GPUState()
        self.tunnel_url: Optional[str] = None
        self.tunnel_proc = None
        self.keepalive: Optional[RuntimeKeepAlive] = None
        self.registry = RuntimeRegistry(logger=self.logger)
        self.checkpoint: Optional[dict] = None
    
    def start(self):
        """Full bootstrap sequence for this runtime.
        
        Steps:
        1. Set environment identity
        2. Query GPU state
        3. Start keepalive thread
        4. Restore latest checkpoint (if any)
        5. Start Cloudflare Tunnel (if auto_tunnel=True)
        6. Register with the RuntimeRegistry
        7. Print status summary
        """
        # 1. Environment identity
        os.environ["HEADY_RUNTIME"] = self.runtime_id
        self.logger.info("=" * 60)
        self.logger.info("HEADY RUNTIME BOOTSTRAP: %s" % self.runtime_id.upper())
        self.logger.info("=" * 60)
        
        # 2. GPU state
        self.gpu = get_gpu_state()
        if self.gpu.available:
            self.logger.info("GPU: %s | %dMB free / %dMB total (%.1f%% used)"
                             % (self.gpu.name, self.gpu.free_mb, self.gpu.total_mb,
                                self.gpu.utilization_pct))
        else:
            self.logger.warning("No GPU detected — running on CPU")
        
        # 3. Keepalive
        self.keepalive = RuntimeKeepAlive(interval_seconds=55, logger=self.logger)
        self.keepalive.start()
        
        # 4. Checkpoint restoration
        self.checkpoint = restore_latest_checkpoint(self.runtime_id)
        if self.checkpoint:
            meta = self.checkpoint.get("_checkpoint_meta", {})
            self.logger.info("Restored checkpoint from %s" % meta.get("timestamp_iso", "unknown"))
        else:
            self.logger.info("No checkpoint found — starting fresh")
        
        # 5. Tunnel
        if self.auto_tunnel:
            self.tunnel_url, self.tunnel_proc = start_cloudflare_tunnel(
                self.port, logger=self.logger
            )
        
        # 6. Registry
        if self.tunnel_url:
            self.registry.register(self.runtime_id, self.tunnel_url, self.gpu)
        
        # 7. Status summary
        self.logger.info("-" * 40)
        self.logger.info("Runtime:   %s" % self.runtime_id)
        self.logger.info("GPU:       %s" % (self.gpu.name if self.gpu.available else "CPU"))
        self.logger.info("VRAM Free: %dMB" % self.gpu.free_mb)
        self.logger.info("Tunnel:    %s" % (self.tunnel_url or "disabled"))
        self.logger.info("Keepalive: active (55s interval)")
        self.logger.info("Checkpoint:%s" % (" restored" if self.checkpoint else " none"))
        self.logger.info("-" * 40)
        self.logger.info("READY")
    
    def save_checkpoint(self, state: dict) -> str:
        """Save the current agent state as a checkpoint."""
        return checkpoint_state(state, self.runtime_id)
    
    def dispatch_task(self, task: dict, preferred_runtime: Optional[str] = None):
        """Dispatch a task to another runtime."""
        return self.registry.dispatch(task, preferred_runtime)
    
    def shutdown(self):
        """Graceful shutdown — stop keepalive, close tunnel."""
        self.logger.info("Shutting down %s..." % self.runtime_id)
        if self.keepalive:
            self.keepalive.stop()
        if self.tunnel_proc:
            self.tunnel_proc.terminate()
        self.logger.info("Shutdown complete")


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Heady Colab Runtime Utilities")
    print("=" * 50)
    print(f"PHI = {PHI}")
    print(f"PSI = {PSI}")
    print(f"Retry backoff (ms): {RETRY_BACKOFF_MS}")
    print(f"Relevance gates: {RELEVANCE_GATES}")
    print(f"\nGPU State: {get_gpu_state().__dict__}")
    print(f"\nTask allocation table:")
    for task_type, (pref, fallback, vram) in TASK_ALLOCATION.items():
        print(f"  {task_type:25s} -> {pref:8s} (fallback: {str(fallback):8s}, min VRAM: {vram}MB)")
