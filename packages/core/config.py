import json
import os
import sys
from pathlib import Path

import yaml

# Add Gateway to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../services/secret_gateway")))
try:
    from vault_secrets import OnePasswordHandler
except ImportError:
    OnePasswordHandler = None


CONFIG_ROOT = Path(__file__).resolve().parents[1] / "config"
REGISTRY_PATH = Path(os.environ.get("HEADY_REGISTRY_PATH", CONFIG_ROOT / "secrets_registry.json"))
MANIFEST_PATH = Path(os.environ.get("HEADY_MANIFEST_PATH", CONFIG_ROOT / "node_manifest.yaml"))
HEADY_AUTH_KEY = "heady_auth"


def get_reference_from_registry(key: str) -> str | None:
    if not REGISTRY_PATH.exists():
        return None

    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError:
        return None

    return registry.get(key)


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}

    try:
        data = yaml.safe_load(MANIFEST_PATH.read_text())
    except yaml.YAMLError:
        return {}

    return data or {}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(manifest or {}, handle, sort_keys=False)


class HeadyConfig:
    def __init__(self):
        self.manifest: dict = load_manifest()
        self.auth_token: str | None = None
        self.vault = self._init_vault()
        reference = get_reference_from_registry(HEADY_AUTH_KEY)

        if self.vault and reference:
            try:
                self.auth_token = self.vault.get_secret(reference)
            except Exception:
                self.auth_token = None

    @staticmethod
    def _init_vault():
        if os.environ.get("HEADY_SKIP_VAULT") == "1":
            return None

        if OnePasswordHandler is None:
            return None

        try:
            return OnePasswordHandler()
        except Exception:
            return None

    def reload_manifest(self) -> None:
        self.manifest = load_manifest()


settings = HeadyConfig()

# Trigger reload for manifest update
