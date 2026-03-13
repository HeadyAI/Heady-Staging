#!/usr/bin/env python3
import math
import json
import random
from dataclasses import dataclass
from enum import Enum
try:
    import psutil
except ImportError:
    psutil = None

PHI = 1.61803398875

class TaskIntent(Enum):
    CRITICAL_SAFETY = "safety_override"
    REALTIME_AUDIO = "audio_symphony"
    RENDER_BATCH = "video_render"
    STANDARD_WEB = "web_request"
    BACKGROUND_MINING = "pops_mining"

@dataclass
class UserRequest:
    user_id: str
    intent: TaskIntent
    is_sovereign_tier: bool = False
    urgency_score: float = 1.0

class HeadyComputeThrottle:
    def __init__(self):
        pass
        
    def calculate_allocation(self, request: UserRequest):
        cpu = 4
        ram = 16
        if psutil:
            cpu = psutil.cpu_count() or 4
            ram = int(psutil.virtual_memory().total / (1024**3))
        
        return {
            "intent": request.intent.value,
            "throttle_level": 0 if request.is_sovereign_tier else 2,
            "cpu_cores": cpu,
            "ram_gb": ram,
            "governance_note": "Allocated via HeadyConductor v5.0 (Restored)"
        }
