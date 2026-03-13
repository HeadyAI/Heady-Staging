#!/usr/bin/env python3
import time
import random
import datetime
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from compute_throttle import UserRequest, TaskIntent
except ImportError:
    pass

def generate_stream(duration=5, interval=0.5):
    print(f"--- Starting Test Data Stream (Duration: {duration}s) ---", flush=True)
    start_time = time.time()
    users = ["admin", "dev_01", "sovereign_user", "guest_bot"]
    
    while (time.time() - start_time) < duration:
        # Mock request generation
        u_id = random.choice(users)
        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "source": "stream_generator",
            "event": "synthetic_request",
            "payload": {"user": u_id, "intent": "STANDARD_WEB"}
        }
        print(json.dumps(log_entry), flush=True)
        time.sleep(interval)

if __name__ == "__main__":
    generate_stream()
