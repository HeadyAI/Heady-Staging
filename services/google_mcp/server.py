from mcp.server.fastmcp import FastMCP
from service import GeminiService, GeminiModel
import json

mcp = FastMCP("Heady Google")
service = GeminiService()


@mcp.tool()
def ask_gemini(prompt: str, model: str = None) -> str:
    """Queries Google Gemini. Models: gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.0-pro, gemini-2.0-flash-thinking-exp"""
    return service.ask(prompt, model_name=model)


@mcp.tool()
def gemini_think(problem: str) -> str:
    """Use Gemini's thinking model for complex reasoning tasks"""
    response = service.think(problem)
    return json.dumps({
        "content": response.content,
        "model": response.model,
        "cached": response.cached,
        "latency_ms": response.latency_ms
    }, indent=2)


@mcp.tool()
def gemini_fast(prompt: str) -> str:
    """Use fastest Gemini model for quick responses"""
    response = service.fast(prompt)
    return response.content


@mcp.tool()
def gemini_quality(prompt: str) -> str:
    """Use best quality Gemini model"""
    response = service.quality(prompt)
    return json.dumps({
        "content": response.content,
        "model": response.model,
        "tokens": response.prompt_tokens + response.completion_tokens,
        "latency_ms": response.latency_ms
    }, indent=2)


@mcp.tool()
def gemini_stats() -> str:
    """Get Gemini service statistics"""
    return json.dumps(service.stats, indent=2)


@mcp.tool()
def gemini_clear_cache() -> str:
    """Clear the Gemini response cache"""
    service.clear_cache()
    return "Cache cleared"


if __name__ == "__main__":
    mcp.run()
