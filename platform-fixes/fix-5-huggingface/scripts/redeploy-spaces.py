#!/usr/bin/env python3
"""
HuggingFace Spaces — Full Redeploy

If wake-spaces.sh fails (Space is too stale or build is broken),
this script does a full factory reset + redeploy.

Usage:
    HF_TOKEN=hf_xxx python3 redeploy-spaces.py

Options:
    --space heady-ai     Redeploy specific space only
    --hardware cpu-basic  Change hardware tier
    --all                Redeploy all spaces
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error

HF_API = "https://huggingface.co/api/spaces"
OWNER = "HeadyMe"

SPACES = {
    "heady-ai": {
        "sdk": "docker",
        "description": "Heady AI — Multi-agent intelligence platform",
        "hardware": "cpu-basic",
    },
    "heady-demo": {
        "sdk": "docker",
        "description": "Heady Demo — Interactive platform demonstration",
        "hardware": "cpu-basic",
    },
}


def api_request(method: str, url: str, token: str, data: dict = None) -> dict:
    """Make authenticated HF API request."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"  HTTP {e.code}: {error_body[:500]}")
        return {"error": error_body, "status": e.code}
    except Exception as e:
        print(f"  Request error: {e}")
        return {"error": str(e)}


def check_status(space_name: str, token: str) -> dict:
    """Get current Space status."""
    url = f"{HF_API}/{OWNER}/{space_name}"
    return api_request("GET", url, token)


def factory_restart(space_name: str, token: str) -> dict:
    """Factory restart (rebuild from scratch)."""
    url = f"{HF_API}/{OWNER}/{space_name}/restart?factory=true"
    return api_request("POST", url, token)


def update_hardware(space_name: str, token: str, hardware: str) -> dict:
    """Change Space hardware tier."""
    url = f"{HF_API}/{OWNER}/{space_name}"
    return api_request("PUT", url, token, {"hardware": hardware})


def wait_for_running(space_name: str, token: str, timeout: int = 300) -> bool:
    """Wait for Space to reach RUNNING state."""
    start = time.time()
    while time.time() - start < timeout:
        info = check_status(space_name, token)
        stage = info.get("runtime", {}).get("stage", "UNKNOWN")
        print(f"  Stage: {stage} ({int(time.time() - start)}s elapsed)")

        if stage == "RUNNING":
            return True
        if stage in ("BUILD_ERROR", "RUNTIME_ERROR", "CONFIG_ERROR"):
            print(f"  Build/runtime error detected. Check logs at:")
            print(f"  https://huggingface.co/spaces/{OWNER}/{space_name}")
            return False

        time.sleep(15)

    print(f"  Timeout after {timeout}s")
    return False


def redeploy_space(space_name: str, token: str, hardware: str = None):
    """Full redeploy cycle for a Space."""
    config = SPACES.get(space_name, {})
    print(f"\n{'='*60}")
    print(f"Redeploying: {OWNER}/{space_name}")
    print(f"{'='*60}")

    # Check current status
    print("\n1. Current status:")
    info = check_status(space_name, token)
    stage = info.get("runtime", {}).get("stage", "UNKNOWN")
    current_hw = info.get("runtime", {}).get("hardware", {}).get("current", "unknown")
    print(f"  Stage: {stage}")
    print(f"  Hardware: {current_hw}")

    # Update hardware if requested
    target_hw = hardware or config.get("hardware", "cpu-basic")
    if target_hw != current_hw:
        print(f"\n2. Updating hardware: {current_hw} → {target_hw}")
        update_hardware(space_name, token, target_hw)
        time.sleep(5)
    else:
        print(f"\n2. Hardware OK: {current_hw}")

    # Factory restart
    print("\n3. Factory restart...")
    result = factory_restart(space_name, token)
    if "error" in result:
        print(f"  Restart failed: {result['error'][:200]}")
        print(f"  Manual restart: https://huggingface.co/spaces/{OWNER}/{space_name}/settings")
        return False

    print("  Restart initiated")

    # Wait for running
    print("\n4. Waiting for RUNNING state...")
    success = wait_for_running(space_name, token)

    if success:
        endpoint = f"https://{OWNER.lower()}-{space_name}.hf.space"
        print(f"\n  DEPLOYED: {endpoint}")
    else:
        print(f"\n  DEPLOY INCOMPLETE — check HuggingFace dashboard")

    return success


def main():
    parser = argparse.ArgumentParser(description="Redeploy HuggingFace Spaces")
    parser.add_argument("--space", type=str, help="Specific space to redeploy")
    parser.add_argument("--hardware", type=str, help="Hardware tier (cpu-basic, cpu-upgrade, t4-small, etc.)")
    parser.add_argument("--all", action="store_true", help="Redeploy all spaces")
    args = parser.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        print("ERROR: HF_TOKEN not set")
        print("Get one at: https://huggingface.co/settings/tokens")
        sys.exit(1)

    if args.space:
        if args.space not in SPACES:
            print(f"Unknown space: {args.space}")
            print(f"Available: {', '.join(SPACES.keys())}")
            sys.exit(1)
        redeploy_space(args.space, token, args.hardware)
    elif args.all:
        results = {}
        for name in SPACES:
            results[name] = redeploy_space(name, token, args.hardware)
        print(f"\n{'='*60}")
        print("Summary:")
        for name, success in results.items():
            status = "OK" if success else "FAILED"
            print(f"  {name}: {status}")
    else:
        print("Specify --space <name> or --all")
        print(f"Available spaces: {', '.join(SPACES.keys())}")
        sys.exit(1)


if __name__ == "__main__":
    main()
