"""
Adaptive Optimizer
==================

This module implements a background optimiser that dynamically adjusts its workload
based on system pressure. It monitors CPU usage via psutil and, if available,
GPU VRAM utilisation via NVIDIA's NVML interface. When the system is busy,
heavy learning tasks are disabled; when idle, they are prioritised. The
optimiser can be run as a long‑lived process to perform maintenance,
retraining, cache warm‑ups, and other tasks without impacting user experience.

Run this script as a standalone process:

```
pip install psutil pynvml
python adaptive_optimizer.py
```

Adjust thresholds and tasks as needed. To integrate with your application,
import `AdaptiveOptimizer` and add custom task implementations in
`perform_task`.
"""

import time
import random
import threading
from typing import Dict

import psutil

try:
    import pynvml
    _nvml_available = True
    pynvml.nvmlInit()
except Exception:
    _nvml_available = False


class AdaptiveOptimizer:
    def __init__(self) -> None:
        # CPU thresholds (% usage)
        self.idle_cpu_threshold = 20.0
        self.busy_cpu_threshold = 50.0

        # GPU thresholds (% VRAM usage)
        self.idle_gpu_threshold = 20.0
        self.busy_gpu_threshold = 50.0

        self.running = True

        # Task definitions: name -> {'base_prio': int, 'cost': int}
        # Cost: approximate relative compute cost (1 = instant, 10 = heavy)
        self.tasks: Dict[str, Dict[str, int]] = {
            "Quick Cache Cleanup": {"base_prio": 5, "cost": 1},
            "Log Rotation": {"base_prio": 3, "cost": 1},
            "Deep Model Training": {"base_prio": 10, "cost": 10},
            "Database Indexing": {"base_prio": 8, "cost": 8},
        }

    def get_system_load(self) -> Dict[str, float]:
        """Return current CPU and GPU usage as percentages."""
        cpu = psutil.cpu_percent(interval=1)
        gpu = 0.0
        if _nvml_available:
            try:
                # We sum usage across GPUs and compute percentage of total VRAM used
                device_count = pynvml.nvmlDeviceGetCount()
                total_used = 0
                total_vram = 0
                for idx in range(device_count):
                    handle = pynvml.nvmlDeviceGetHandleByIndex(idx)
                    mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    total_used += mem_info.used
                    total_vram += mem_info.total
                if total_vram > 0:
                    gpu = (total_used / total_vram) * 100.0
            except Exception:
                # Fallback: consider GPU idle if NVML fails at runtime
                gpu = 0.0
        return {"cpu": cpu, "gpu": gpu}

    def calculate_weights(self, current_load: Dict[str, float]) -> Dict[str, int]:
        """
        Calculate dynamic task priorities based on current system load.

        If either CPU or GPU is busy, heavy tasks are disabled. If both are idle,
        heavy tasks are boosted. Intermediate state yields base priorities.
        """
        cpu_load = current_load["cpu"]
        gpu_load = current_load["gpu"]

        is_idle = (cpu_load < self.idle_cpu_threshold) and (gpu_load < self.idle_gpu_threshold)
        is_busy = (cpu_load > self.busy_cpu_threshold) or (gpu_load > self.busy_gpu_threshold)

        status = "NORMAL"
        if is_idle:
            status = "IDLE (Power Up)"
        elif is_busy:
            status = "BUSY (Throttle Down)"

        print(f"\n[CPU: {cpu_load:.1f}% | GPU: {gpu_load:.1f}%] - Mode: {status}")

        dynamic_pool: Dict[str, int] = {}

        for task, info in self.tasks.items():
            priority = info["base_prio"]
            cost = info["cost"]

            if is_busy:
                # Throttle heavy tasks: disable if cost > 3, halve priority otherwise
                if cost > 3:
                    priority = 0
                else:
                    priority = max(1, priority // 2)
            elif is_idle:
                # Boost heavy tasks: triple priority if cost > 5
                if cost > 5:
                    priority *= 3

            if priority > 0:
                dynamic_pool[task] = priority

        return dynamic_pool

    def perform_task(self, task_name: str) -> None:
        """Simulate performing the task. Replace with real implementations."""
        print(f"   >>> EXECUTING: {task_name}")
        # Here you would call the real function based on task_name
        # e.g., if task_name == "Deep Model Training": self.train_model()
        time.sleep(0.5)  # Simulate work duration

    def run_loop(self) -> None:
        """Main loop. Continuously monitors load and executes tasks."""
        print("Starting Adaptive Optimizer Node...")
        while self.running:
            load = self.get_system_load()
            weighted_pool = self.calculate_weights(load)

            if not weighted_pool:
                print("   [!] Load too high. All optimisations paused.")
                time.sleep(5)  # Wait longer if overwhelmed
                continue

            # Select a task based on weighted probabilities
            tasks = list(weighted_pool.keys())
            weights = list(weighted_pool.values())
            selected_task = random.choices(tasks, weights=weights, k=1)[0]

            # Execute the task
            self.perform_task(selected_task)

            # Determine sleep duration: shorter when idle to work harder
            if (load["cpu"] < self.idle_cpu_threshold) and (load["gpu"] < self.idle_gpu_threshold):
                sleep_time = 1.0
            else:
                sleep_time = 5.0
            time.sleep(sleep_time)


if __name__ == "__main__":
    optimizer = AdaptiveOptimizer()
    try:
        optimizer.run_loop()
    except KeyboardInterrupt:
        print("Shutting down optimizer...")
        optimizer.running = False