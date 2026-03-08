import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from mcp.server.fastmcp import FastMCP
from vault_secrets import OnePasswordHandler

# Initialize Server & Vault
mcp = FastMCP("Heady Secret Gateway")
vault = OnePasswordHandler()
app = FastAPI()

# --- CONFIGURATION ---
# In Docker, config is mounted at /app/config
# Locally, it might be ../../config
if Path("/app/config").exists():
    REGISTRY_PATH = Path("/app/config/secrets_registry.json")
else:
    REGISTRY_PATH = Path(__file__).resolve().parents[2] / "config" / "secrets_registry.json"

TEST_SECRET_KEY = "test_secret"


def get_reference_from_registry(key: str) -> str:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(f"Registry file missing at {REGISTRY_PATH}")

    registry = json.loads(REGISTRY_PATH.read_text())
    reference = registry.get(key)

    if not reference:
        raise KeyError(f"Registry entry '{key}' not found. Update secrets_registry.json.")

    return reference


@mcp.tool()
def test_secret_ingestion(reference_key: str = TEST_SECRET_KEY) -> str:
    """
    Verifies that the system can read a secret from 1Password.
    Returns a success message (masking the actual secret).
    """
    try:
        reference = get_reference_from_registry(reference_key)
        secret_value = vault.get_secret(reference)
        
        # Security Check: Never return the raw secret in logs or tools unless strictly required
        masked = secret_value[:2] + "*" * (len(secret_value) - 4) + secret_value[-2:] if len(secret_value) > 4 else "****"
        
        return f"SUCCESS: Secret ingested. Length: {len(secret_value)}. Masked verification: {masked}"
        
    except Exception as e:
        return f"FAILURE: {str(e)}"

# Health check endpoint
@app.get("/health/auth")
def health_check():
    return {"status": "active", "service": "secret_gateway"}

if __name__ == "__main__":
    import uvicorn
    # Run FastAPI app
    uvicorn.run(app, host="0.0.0.0", port=8081)
