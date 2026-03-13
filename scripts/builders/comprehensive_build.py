
import os
import pathlib
import subprocess
import datetime

# --- Configuration ---
PROJECT_SLUG = "heady-project"
BASE_DIR = pathlib.Path("/content/drive/MyDrive/Heady_Projects")
TARGET_DIR = BASE_DIR / PROJECT_SLUG

# --- Assets ---
ASSETS = {
    "docs_source/DX_SOURCE.md": "# Developer Onboarding Checklist\n\nWelcome to Heady!\n",
    "docs/JWT_ROTATION.md": "# JWT Key Rotation Strategy\n\nRotate keys every 30 days.\n",
    "docs/LOGGING_SCHEMA.md": "# Structured Logging Schema\n\nJSON format required.\n",
    "docs/LOAD_TEST_HARNESS.md": "# Load-Testing Harness\n\nUse Locust for load testing.\n",
    "scripts/Heady_Optimiser_Tool.py": r"""
import pynvml
import torch
import psutil
import datetime

def optimize():
    try:
        print("--- Starting Heady GPU Optimizer ---")
        # Initialize NVML
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        gpu_name = pynvml.nvmlDeviceGetName(handle)
        print(f"Target Device: {gpu_name}")

        # Initial Memory State
        info_start = pynvml.nvmlDeviceGetMemoryInfo(handle)
        print(f"Initial VRAM: Used={info_start.used / 1024**2:.2f} MB, Total={info_start.total / 1024**2:.2f} MB")

        # Perform Cleanup
        print("Executing torch.cuda.empty_cache()...")
        torch.cuda.empty_cache()

        # Post-Cleanup Memory State
        info_end = pynvml.nvmlDeviceGetMemoryInfo(handle)
        print(f"Final VRAM:   Used={info_end.used / 1024**2:.2f} MB")

        # Calculate Freed Memory
        freed_bytes = info_start.used - info_end.used
        freed_mb = freed_bytes / 1024**2
        print(f"Reclaimed:    {freed_mb:.2f} MB")

        # Log Result
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] Device: {gpu_name} | Freed: {freed_mb:.2f} MB | Pre: {info_start.used} | Post: {info_end.used}\n"

        with open("optimization_log.txt", "a") as f:
            f.write(log_entry)
        print("✅ Optimization log updated.")

    except Exception as e:
        print(f"❌ Optimization Error: {e}")
    finally:
        try:
            pynvml.nvmlShutdown()
        except:
            pass

if __name__ == "__main__":
    optimize()
"""
}

def run_command(command, cwd=None):
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True, cwd=cwd)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return None

def main():
    print(f"Starting Build with Heady Optimiser for {PROJECT_SLUG}...")

    # 1. Establish Directory Structure
    if not TARGET_DIR.exists():
        TARGET_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Target Directory: {TARGET_DIR}")

    # 2. Materialize Assets
    print("Materializing Assets...")
    for rel_path, content in ASSETS.items():
        file_path = TARGET_DIR / rel_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content.strip() + "\n")
        print(f"  + Wrote {rel_path}")

    # 3. Update Improvements Log
    imp_file = TARGET_DIR / "IMPROVEMENTS.txt"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"\n[{timestamp}] Optimization Tooling\n- Added 'scripts/Heady_Optimiser_Tool.py'.\n- Implemented VRAM cleanup and logging logic.\n"
    with open(imp_file, "a") as f:
        f.write(log_entry)
    print("Updated IMPROVEMENTS.txt")

    # 4. Git Operations
    print("Configuring Version Control...")
    git_dir = TARGET_DIR / ".git"
    if not git_dir.exists():
        run_command(["git", "init"], cwd=TARGET_DIR)
    
    run_command(["git", "config", "user.email", "deploy-bot@heady.example.com"], cwd=TARGET_DIR)
    run_command(["git", "config", "user.name", "Heady Deploy Bot"], cwd=TARGET_DIR)

    print("Staging and Committing...")
    run_command(["git", "add", "."], cwd=TARGET_DIR)
    try:
        subprocess.run(
            ["git", "commit", "-m", "Auto-update: Added Heady Optimiser Tool"],
            cwd=TARGET_DIR,
            check=True,
            capture_output=True,
            text=True
        )
        print("✅ Changes committed.")
    except subprocess.CalledProcessError:
        print("ℹ️ No new changes to commit.")

    print("\nBuild Complete.")

if __name__ == "__main__":
    main()
