#!/usr/bin/env python3
import os
import sys
import json
import hashlib
import datetime

# Ensure we can import modules from the same directory
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

try:
    from compute_throttle import HeadyComputeThrottle, UserRequest, TaskIntent
    from heady_reflect import HeadyReflect
    from heady_archive import HeadyArchive
    from heady_verticals import VerticalTemplate
    from heady_foundation import DataVault, TrustDomain, LegacyBridge
    from heady_security import AISafetyGateway, RAAFabric
    from heady_hardware import HeadyHome, HeadyBare
    from heady_society import HeadySymphony
    from heady_finance import HeadyFinance
except ImportError as e:
    print(f"Import Warning: {e}")
    # Mock classes if imports fail to allow build to proceed in recovery mode
    class HeadyArchive: 
        def preserve(self, m, t=None): return m
    class VerticalTemplate:
        @staticmethod
        def get_config(v): return {}

CONFIG_FILE = 'projects.json'

def mint_heady_coin(manifest_data):
    payload = json.dumps(manifest_data, sort_keys=True).encode()
    token = hashlib.sha3_256(payload).hexdigest()
    return f"hc_v1_{token[:16]}"

def execute_build():
    print("Starting Consolidated Build...")
    
    # Load Config
    # Check in CWD or config dir
    config_paths = [CONFIG_FILE, os.path.join("heady_project", "config", CONFIG_FILE), "config/" + CONFIG_FILE]
    config_data = None
    for p in config_paths:
        if os.path.exists(p):
            with open(p, 'r') as f:
                config_data = json.load(f)
            break
    
    if not config_data:
        print("Error: projects.json not found.")
        return

    workspace = config_data.get('workspace', './heady-fleet')
    if not os.path.exists(workspace):
        os.makedirs(workspace)

    archivist = HeadyArchive()

    for proj in config_data.get('projects', []):
        slug = proj['slug']
        print(f"Provisioning {slug}...")
        
        project_path = os.path.join(workspace, slug)
        os.makedirs(project_path, exist_ok=True)

        manifest = {
            "project": slug,
            "domain": proj.get("apex_domain"),
            "built_at": datetime.datetime.now().isoformat(),
            "governance": "HeadySystems v12.0 (Restored)"
        }

        # Add Vertical Config if present
        if "vertical" in proj:
            manifest["vertical_config"] = VerticalTemplate.get_config(proj["vertical"])

        # Add Foundation/Trust Domain if present
        if "trust_domain" in proj:
            manifest["trust_domain"] = proj["trust_domain"]

        # Tokenization
        manifest["heady_coin_pow"] = mint_heady_coin(manifest)

        # Preservation
        manifest = archivist.preserve(manifest, context_tags=[slug, "v12", "Restored"])

        with open(os.path.join(project_path, 'heady-manifest.json'), 'w') as f:
            json.dump(manifest, f, indent=2)

    print(f"Build Complete. Artifacts in {workspace}")

if __name__ == "__main__":
    execute_build()
