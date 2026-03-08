from mcp.server.fastmcp import FastMCP
from service import MemoryService
import json

mcp = FastMCP("Heady Memory")
service = MemoryService()

@mcp.tool()
def read_memory() -> str:
    """Reads the persistent brain state."""
    return json.dumps(service.read_full(), indent=2)

@mcp.tool()
def remember_entity(entity: str, details: str) -> str:
    """Saves a fact to memory."""
    return service.add_entry(entity, details)


@mcp.tool()
def search_spatial_context(query: str, radius: float = 10.0, limit: int = 8) -> str:
    """Searches the 3D spatial context store for nearby nodes."""
    return json.dumps(service.search_spatial_context(query, radius=radius, limit=limit), indent=2)

if __name__ == "__main__":
    mcp.run()
