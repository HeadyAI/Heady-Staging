from mcp.server.fastmcp import FastMCP
from service import JulesService
import asyncio

mcp = FastMCP("Heady Jules")
service = JulesService()

@mcp.tool()
async def ask_jules(prompt: str) -> str:
    """Sends a prompt to Jules AI."""
    return await service.ask(prompt)

if __name__ == "__main__":
    mcp.run()
