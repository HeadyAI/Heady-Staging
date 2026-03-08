
import json
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

from huggingface_hub import HfApi, InferenceClient
from huggingface_hub.utils import RepositoryNotFoundError

# Import Vault
# Assuming we are in services/huggingface_gateway, we need to go up to services then down to secret_gateway
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../secret_gateway")))
try:
    from vault_secrets import OnePasswordHandler
except ImportError:
    OnePasswordHandler = None

# Config paths - logic.py is in services/huggingface_gateway/
# In container, this maps to /app, and config is mounted at /app/config
REGISTRY_PATH = Path("/app/config/secrets_registry.json")
HF_SECRET_KEY = "huggingface_token"

def get_reference_from_registry(key: str) -> str:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(f"Registry file missing at {REGISTRY_PATH}")

    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8-sig"))
    except Exception as e:
        raise RuntimeError(f"Failed to read registry: {e}")

    reference = registry.get(key)

    if not reference:
        raise KeyError(f"Registry entry '{key}' not found. Update secrets_registry.json.")

    return reference

class HuggingFaceService:
    def __init__(self):
        self.api_key: Optional[str] = None
        self.api: Optional[HfApi] = None
        self.client: Optional[InferenceClient] = None
        
        self._initialize_auth()

    def _initialize_auth(self):
        """Initialize authentication using 1Password if available."""
        if not OnePasswordHandler:
            print("Warning: OnePasswordHandler not available. Auth will fail if token is needed from vault.")
            return

        try:
            vault = OnePasswordHandler()
            reference = get_reference_from_registry(HF_SECRET_KEY)
            self.api_key = vault.get_secret(reference)
            
            if self.api_key:
                self.api = HfApi(token=self.api_key)
                # Initialize inference client - defaults to serverless inference API
                self.client = InferenceClient(token=self.api_key)
        except Exception as e:
            print(f"Hugging Face Auth Initialization Warning: {e}")
            # We might still proceed if the user only wants public data access, 
            # but usually we want the token.

    def list_models(self, search: str = None, limit: int = 10, task: str = None) -> List[Dict[str, Any]]:
        """List models matching criteria."""
        if not self.api:
            return [{"error": "Hugging Face API not initialized (missing token?)"}]
        
        try:
            models = self.api.list_models(search=search, limit=limit, task=task, sort="downloads", direction=-1)
            return [{"id": m.modelId, "likes": m.likes, "downloads": m.downloads} for m in models]
        except Exception as e:
            return [{"error": f"Failed to list models: {str(e)}"}]

    def get_model_info(self, repo_id: str) -> Dict[str, Any]:
        """Get detailed info about a specific model."""
        if not self.api:
             return {"error": "Hugging Face API not initialized"}
        
        try:
            info = self.api.model_info(repo_id=repo_id)
            return {
                "id": info.modelId,
                "sha": info.sha,
                "lastModified": str(info.lastModified),
                "tags": info.tags,
                "downloads": info.downloads,
                "likes": info.likes
            }
        except RepositoryNotFoundError:
            return {"error": "Model not found."}
        except Exception as e:
            return {"error": str(e)}

    def text_generation(self, prompt: str, model: str = "mistralai/Mistral-7B-Instruct-v0.2", max_new_tokens: int = 250) -> str:
        """Generate text using the Inference API."""
        if not self.client:
            return "Error: Inference Client not initialized."

        try:
            response = self.client.text_generation(prompt, model=model, max_new_tokens=max_new_tokens)
            return response
        except Exception as e:
            return f"Inference Error: {str(e)}"
