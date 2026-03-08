
from mcp.server.fastmcp import FastMCP
from service import HuggingFaceService
import threading
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

# Create the MCP server
mcp = FastMCP("Heady HuggingFace")
service = HuggingFaceService()

# Health check app
app = FastAPI()

class InferenceRequest(BaseModel):
    prompt: str
    model_id: str = "microsoft/DialoGPT-medium"
    max_new_tokens: int = 250

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/sse")
def sse_health():
    # Placeholder for SSE endpoint if we were running full SSE
    return {"status": "active", "mode": "stdio"}

@app.post("/inference")
def inference(request: InferenceRequest):
    """Text generation inference endpoint"""
    try:
        result = service.text_generation(
            prompt=request.prompt,
            model=request.model_id,
            max_new_tokens=request.max_new_tokens
        )
        return {"text": result, "model": request.model_id}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
def search_models(query: str, limit: int = 5, task: str = None) -> str:
    """
    Search for models on Hugging Face Hub.
    Args:
        query: Search term (e.g. 'text-generation', 'llama')
        limit: Number of results to return
        task: Filter by task (e.g. 'text-generation', 'image-classification')
    """
    results = service.list_models(search=query, limit=limit, task=task)
    return str(results)

@mcp.tool()
def get_model_details(repo_id: str) -> str:
    """
    Get metadata for a specific Hugging Face model.
    Args:
        repo_id: The model ID (e.g. 'meta-llama/Llama-2-7b')
    """
    result = service.get_model_info(repo_id)
    return str(result)

@mcp.tool()
def run_inference(prompt: str, model_id: str = "mistralai/Mistral-7B-Instruct-v0.2") -> str:
    """
    Run text generation inference on a model.
    Args:
        prompt: The input text prompt
        model_id: The model ID to use for inference
    """
    return service.text_generation(prompt, model=model_id)

def run_health_server():
    uvicorn.run(app, host="0.0.0.0", port=8083)

if __name__ == "__main__":
    # Start health server in background
    t = threading.Thread(target=run_health_server, daemon=True)
    t.start()
    
    # Run MCP in main thread (stdio)
    mcp.run()
