#!/usr/bin/env python3
"""
CLI Service Entry Point - Supports both API and MCP modes
"""
import sys
import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_api():
    """Run as REST API server"""
    import uvicorn
    from .server import app
    
    logger.info("Starting CLI Service in API mode on port 8084")
    uvicorn.run(app, host="0.0.0.0", port=8084)


def run_mcp():
    """Run as MCP server"""
    from .server import create_mcp_server
    
    mcp = create_mcp_server()
    if mcp:
        logger.info("Starting CLI Service in MCP mode")
        mcp.run()
    else:
        logger.error("MCP not available")
        sys.exit(1)


def run_hybrid():
    """Run both API and MCP (API on main thread, MCP as background)"""
    import threading
    import uvicorn
    from .server import app, create_mcp_server
    
    mcp = create_mcp_server()
    if mcp:
        mcp_thread = threading.Thread(target=mcp.run, daemon=True)
        mcp_thread.start()
        logger.info("MCP server started in background")
    
    logger.info("Starting CLI Service in hybrid mode (API + MCP)")
    uvicorn.run(app, host="0.0.0.0", port=8084)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Heady CLI Service")
    parser.add_argument(
        "--mode",
        choices=["api", "mcp", "hybrid"],
        default="api",
        help="Server mode: api (REST), mcp (MCP protocol), hybrid (both)"
    )
    parser.add_argument("--port", type=int, default=8084, help="API port")
    
    args = parser.parse_args()
    
    if args.mode == "api":
        run_api()
    elif args.mode == "mcp":
        run_mcp()
    elif args.mode == "hybrid":
        run_hybrid()


if __name__ == "__main__":
    main()
