"""
AI Router MCP Server
Exposes unified AI routing capabilities via MCP protocol
"""
import asyncio
from mcp.server.fastmcp import FastMCP
from .router import AIRouter, AIProvider

mcp = FastMCP("ai-router")
router = AIRouter()


@mcp.tool()
async def ai_ask(prompt: str, capability: str = None, provider: str = None) -> str:
    """
    Query any AI provider with automatic fallback.
    
    Args:
        prompt: The question or instruction
        capability: Optional hint for provider selection (research, reasoning, analysis, etc.)
        provider: Force specific provider (jules, perplexity, gemini)
    """
    provider_enum = AIProvider(provider) if provider else None
    response = await router.ask(prompt, capability=capability, provider=provider_enum)
    return response.content


@mcp.tool()
async def ai_research(topic: str, depth: str = "standard") -> str:
    """
    Research a topic with citations using Perplexity.
    
    Args:
        topic: Research topic or question
        depth: Research depth (quick, standard, deep, comprehensive)
    
    Returns:
        Research findings with citations
    """
    response = await router.research(topic, depth=depth)
    result = response.content
    if response.citations:
        result += "\n\nCitations:\n" + "\n".join(f"- {c}" for c in response.citations)
    return result


@mcp.tool()
async def ai_reason(problem: str) -> str:
    """
    Solve complex problems using reasoning models (Gemini thinking or Perplexity reasoning).
    
    Args:
        problem: Complex problem requiring multi-step reasoning
    """
    response = await router.reason(problem)
    return response.content


@mcp.tool()
async def ai_analyze_health(health_data: dict) -> str:
    """
    Analyze system health data and provide recommendations.
    
    Args:
        health_data: Dictionary containing system health metrics
    """
    response = await router.analyze_health(health_data)
    return response.content


@mcp.tool()
async def ai_incident_report(incident_data: dict) -> str:
    """
    Generate an incident report from raw incident data.
    
    Args:
        incident_data: Dictionary containing incident details
    """
    response = await router.generate_incident_report(incident_data)
    return response.content


@mcp.tool()
def ai_router_stats() -> dict:
    """Get statistics from all AI providers."""
    return router.get_stats()


@mcp.tool()
def ai_clear_caches() -> str:
    """Clear response caches for all AI providers."""
    router.clear_caches()
    return "All AI provider caches cleared"


@mcp.tool()
def ai_list_providers() -> dict:
    """List available AI providers and their capabilities."""
    return {
        "providers": [
            {
                "id": "jules",
                "name": "Jules AI",
                "capabilities": ["analysis", "incident-reports", "code-review"],
                "models": ["jules-v1"]
            },
            {
                "id": "perplexity", 
                "name": "Perplexity AI",
                "capabilities": ["research", "citations", "real-time-data", "reasoning"],
                "models": ["sonar", "sonar-pro", "sonar-reasoning-pro", "sonar-deep-research"]
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "capabilities": ["reasoning", "thinking", "multimodal", "fast-response"],
                "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-pro", "gemini-2.0-flash-thinking-exp"]
            }
        ],
        "primary": router.primary_provider.value,
        "fallback_chain": [p.value for p in router.fallback_chain]
    }


if __name__ == "__main__":
    mcp.run()
