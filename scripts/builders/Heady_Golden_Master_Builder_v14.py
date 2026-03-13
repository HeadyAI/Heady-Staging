#!/usr/bin/env python3
"""
Heady Golden Master Builder v14 (Modular Edition)
-------------------------------------------------
Compliance: PPA-001, PPA-002, PPA-003, PPA-004.
Feature: Modular Patent Verticals & HeadyLens Observability Hooks.
"""

import os
import sys
import json
import hashlib
import tempfile
import datetime
import time
import random
from typing import Dict, Any, List, Optional, Callable

# --- Configuration ---
GENERATOR_VERSION = "v14.0.0"

# Patent Verticals Definition
VERTICALS_MAP = {
    "music": {
        "dirs": ["src/assets/audio", "src/generated/midi"],
        "files": {"src/music_engine.py": "# HeadySymphony Engine Stub"}
    },
    "bio": {
        "dirs": ["src/bio_data/secure", "src/bio_processing"],
        "files": {"src/bio_lock.py": "# HeadyBio Ephemeral Processing Stub"}
    },
    "finance": {
        "dirs": ["src/ledger/wallets", "src/ledger/transactions"],
        "files": {"src/mint_logic.py": "# HeadyMint Logic Stub"}
    }
}

class AtomicWriter:
    """Implements atomic writes with HeadyLens observability hooks."""
    
    def __init__(self, observer: Optional[Callable] = None):
        self.observer = observer

    def _notify(self, event: str, details: str):
        if self.observer:
            self.observer(event, details)

    def write_json(self, path: str, data: Dict[str, Any]) -> str:
        self._notify("write_start", f"Encoding {path}...")
        
        directory = os.path.dirname(path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

        json_content = json.dumps(data, indent=2, sort_keys=True)
        content_bytes = json_content.encode('utf-8')
        file_hash = hashlib.sha256(content_bytes).hexdigest()

        # Simulate processing time for HeadyLens visualization
        time.sleep(0.1)
        self._notify("hashing", f"SHA256: {file_hash[:12]}...")

        with tempfile.NamedTemporaryFile(mode='wb', dir=directory, delete=False) as tf:
            tf.write(content_bytes)
            tf.flush()
            os.fsync(tf.fileno())
            temp_name = tf.name
            
        try:
            os.replace(temp_name, path)
            self._notify("write_complete", f"Atomic write: {path}")
        except OSError as e:
            os.remove(temp_name)
            self._notify("error", str(e))
            sys.exit(1)
            
        return file_hash

    def write_text(self, path: str, content: str) -> str:
        self._notify("write_start", f"Writing {path}...")
        directory = os.path.dirname(path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            
        content_bytes = content.encode('utf-8')
        file_hash = hashlib.sha256(content_bytes).hexdigest()

        with tempfile.NamedTemporaryFile(mode='wb', dir=directory, delete=False) as tf:
            tf.write(content_bytes)
            tf.flush()
            os.fsync(tf.fileno())
            temp_name = tf.name

        try:
            os.replace(temp_name, path)
            self._notify("write_complete", f"Atomic write: {path}")
        except OSError:
            os.remove(temp_name)
            raise

        return file_hash

class HeadyBuilder:
    def __init__(self, active_verticals: List[str], observer: Optional[Callable] = None):
        self.verticals = active_verticals
        self.writer = AtomicWriter(observer)
        self.observer = observer

    def build(self):
        if self.observer:
            self.observer("init", f"Initializing Heady Golden Master {GENERATOR_VERSION}")
            self.observer("config", f"Active Verticals: {', '.join(self.verticals)}")

        manifest = {"files": [], "generated_at": datetime.datetime.utcnow().isoformat() + "Z", "modules": self.verticals}

        # 1. Core Scaffolding
        core_dirs = [".heady", "prompts/registry", "prompts/receipts", "src/core"]
        for d in core_dirs:
            os.makedirs(d, exist_ok=True)
            h = self.writer.write_text(os.path.join(d, ".gitkeep"), "")
            manifest["files"].append({"path": os.path.join(d, ".gitkeep"), "sha256": h})

        # 2. Vertical Scaffolding
        for v in self.verticals:
            if v in VERTICALS_MAP:
                config = VERTICALS_MAP[v]
                # Dirs
                for d in config["dirs"]:
                    os.makedirs(d, exist_ok=True)
                    h = self.writer.write_text(os.path.join(d, ".gitkeep"), "")
                    manifest["files"].append({"path": os.path.join(d, ".gitkeep"), "sha256": h})
                # Files
                for fname, content in config["files"].items():
                    h = self.writer.write_text(fname, content)
                    manifest["files"].append({"path": fname, "sha256": h})

        # 3. Context & Manifest
        ctx = f"# HeadyLens Context\nActive Modules: {self.verticals}\nVersion: {GENERATOR_VERSION}"
        h_ctx = self.writer.write_text("CONTEXT.md", ctx)
        manifest["files"].append({"path": "CONTEXT.md", "sha256": h_ctx})
        
        self.writer.write_json("manifest.json", manifest)
        
        if self.observer:
            self.observer("finish", "Build Complete. HeadyLens shutting down.")

if __name__ == "__main__":
    # Default CLI behavior
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--verticals", help="Comma-separated list of verticals (music,bio,finance)", default="")
    args = parser.parse_args()
    
    verts = [v.strip() for v in args.verticals.split(',') if v.strip()]
    builder = HeadyBuilder(verts)
    builder.build()
