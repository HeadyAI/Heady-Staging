import json
from pathlib import Path

from mcp.server.fastmcp import FastMCP
from huggingface_hub import InferenceClient
from vault_secrets import OnePasswordHandler

# Initialize MCP Server
mcp = FastMCP("Heady Secure Gateway")
vault = OnePasswordHandler()

# --- CONFIGURATION (POINTERS, NOT KEYS) ---
REGISTRY_PATH = Path(__file__).resolve().parents[2] / "config" / "secrets_registry.json"
HF_TOKEN_KEY = "huggingface_token"


def get_reference_from_registry(key: str) -> str:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(f"Registry file missing at {REGISTRY_PATH}")

    registry = json.loads(REGISTRY_PATH.read_text())
    reference = registry.get(key)

    if not reference:
        raise KeyError(f"Registry entry '{key}' not found. Update secrets_registry.json.")

    return reference

# --- TOOLS ---

@mcp.tool()
def hf_inference(task: str, input_text: str, model_id: str = "meta-llama/Meta-Llama-3-8B-Instruct") -> str:
    """
    Routes a request to Hugging Face using a just-in-time fetched token.
    """
    try:
        # Fetch token ONLY when needed (never stored in variable for long)
        reference = get_reference_from_registry(HF_TOKEN_KEY)
        token = vault.get_secret(reference)
        
        client = InferenceClient(token=token)
        
        # Execute Inference
        response = client.text_generation(
            input_text, 
            model=model_id, 
            max_new_tokens=500
        )
        return response
            
    except Exception as e:
        return f"Secure Gateway Error: {str(e)}"

if __name__ == "__main__":
    mcp.run()
