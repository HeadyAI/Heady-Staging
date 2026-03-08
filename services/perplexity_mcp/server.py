from mcp.server.fastmcp import FastMCP
from service import PerplexityService, PerplexityModel
import json

mcp = FastMCP("Heady Perplexity")
service = PerplexityService()


@mcp.tool()
async def ask_perplexity(prompt: str, model: str = None) -> str:
    """Queries Perplexity's API for latest intel. Models: sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, sonar-deep-research"""
    return await service.ask(prompt, model=model)


@mcp.tool()
async def perplexity_research(topic: str, depth: str = "standard") -> str:
    """Research a topic with Perplexity. Depth: quick, standard, deep, comprehensive"""
    response = await service.research(topic, depth=depth)
    return json.dumps({
        "content": response.content,
        "model": response.model,
        "citations": response.citations,
        "cached": response.cached,
        "latency_ms": response.latency_ms
    }, indent=2)


@mcp.tool()
async def perplexity_reason(problem: str) -> str:
    """Use Perplexity's reasoning model for complex problem solving"""
    response = await service.reason(problem)
    return json.dumps({
        "content": response.content,
        "model": response.model,
        "citations": response.citations,
        "latency_ms": response.latency_ms
    }, indent=2)


@mcp.tool()
def perplexity_stats() -> str:
    """Get Perplexity service statistics"""
    return json.dumps(service.stats, indent=2)


@mcp.tool()
def perplexity_clear_cache() -> str:
    """Clear the Perplexity response cache"""
    service.clear_cache()
    return "Cache cleared"


if __name__ == "__main__":
    mcp.run()
