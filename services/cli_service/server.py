"""
CLI Service Server - REST API and MCP dual interface
"""
import asyncio
import json
import logging
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

from .core import CLIService, Command, CommandType, CommandResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

cli_service: Optional[CLIService] = None


class ExecuteRequest(BaseModel):
    command: str = Field(..., description="Command name or raw shell command")
    args: Optional[Dict[str, Any]] = Field(default=None, description="Command arguments")
    raw: Optional[bool] = Field(default=False, description="Execute as raw shell command")
    confirm: Optional[bool] = Field(default=False, description="Confirm dangerous commands")


class RegisterRequest(BaseModel):
    name: str = Field(..., description="Command name")
    description: str = Field(..., description="Command description")
    shell_template: str = Field(..., description="Shell command template with {placeholders}")
    aliases: Optional[List[str]] = Field(default=None, description="Command aliases")
    tags: Optional[List[str]] = Field(default=None, description="Command tags")
    requires_confirmation: Optional[bool] = Field(default=False)
    timeout_seconds: Optional[int] = Field(default=300)


class BatchRequest(BaseModel):
    commands: List[ExecuteRequest] = Field(..., description="List of commands to execute")
    stop_on_error: Optional[bool] = Field(default=True, description="Stop batch on first error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cli_service
    cli_service = CLIService(working_dir="/app" if __name__ != "__main__" else ".")
    logger.info("CLI Service initialized")
    yield
    logger.info("CLI Service shutting down")


def create_app() -> FastAPI:
    """Create FastAPI application with all routes"""
    
    app = FastAPI(
        title="Heady CLI Service",
        description="Flexible CLI execution via REST API or MCP",
        version="1.0.0",
        lifespan=lifespan
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "service": "cli_service"}
    
    @app.get("/")
    async def root():
        return {
            "service": "Heady CLI Service",
            "version": "1.0.0",
            "endpoints": {
                "execute": "POST /execute",
                "commands": "GET /commands",
                "command": "GET /commands/{name}",
                "register": "POST /commands/register",
                "batch": "POST /batch",
                "history": "GET /history",
                "mcp": "GET /mcp/tools"
            }
        }
    
    @app.post("/execute")
    async def execute_command(request: ExecuteRequest):
        """Execute a CLI command"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        if request.raw:
            result = await cli_service._execute_raw(request.command)
        else:
            result = await cli_service.execute(
                request.command,
                args=request.args,
                confirm=request.confirm
            )
        
        return {
            "success": result.success,
            "output": result.output,
            "error": result.error,
            "exit_code": result.exit_code,
            "duration_ms": result.duration_ms,
            "metadata": result.metadata
        }
    
    @app.get("/commands")
    async def list_commands(tag: Optional[str] = Query(None)):
        """List all registered commands"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        commands = cli_service.registry.list_commands(tag)
        return {
            "count": len(commands),
            "commands": [c.to_dict() for c in commands]
        }
    
    @app.get("/commands/search")
    async def search_commands(q: str = Query(...)):
        """Search commands by name or description"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        commands = cli_service.registry.search(q)
        return {
            "query": q,
            "count": len(commands),
            "commands": [c.to_dict() for c in commands]
        }
    
    @app.get("/commands/{name}")
    async def get_command(name: str):
        """Get details of a specific command"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        cmd = cli_service.registry.get(name)
        if not cmd:
            raise HTTPException(404, f"Command not found: {name}")
        
        return cmd.to_dict()
    
    @app.post("/commands/register")
    async def register_command(request: RegisterRequest):
        """Dynamically register a new command"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        cmd = Command(
            name=request.name,
            description=request.description,
            command_type=CommandType.SHELL,
            shell_template=request.shell_template,
            aliases=request.aliases or [],
            tags=request.tags or ["custom"],
            requires_confirmation=request.requires_confirmation,
            timeout_seconds=request.timeout_seconds
        )
        
        cli_service.registry.register(cmd)
        
        return {
            "success": True,
            "message": f"Registered command: {request.name}",
            "command": cmd.to_dict()
        }
    
    @app.delete("/commands/{name}")
    async def unregister_command(name: str):
        """Unregister a command"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        success = cli_service.registry.unregister(name)
        if not success:
            raise HTTPException(404, f"Command not found: {name}")
        
        return {"success": True, "message": f"Unregistered command: {name}"}
    
    @app.post("/batch")
    async def execute_batch(request: BatchRequest):
        """Execute multiple commands in sequence"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        results = []
        for cmd_req in request.commands:
            if cmd_req.raw:
                result = await cli_service._execute_raw(cmd_req.command)
            else:
                result = await cli_service.execute(
                    cmd_req.command,
                    args=cmd_req.args,
                    confirm=cmd_req.confirm
                )
            
            results.append({
                "command": cmd_req.command,
                "success": result.success,
                "output": result.output,
                "error": result.error,
                "exit_code": result.exit_code
            })
            
            if not result.success and request.stop_on_error:
                break
        
        return {
            "total": len(request.commands),
            "executed": len(results),
            "all_success": all(r["success"] for r in results),
            "results": results
        }
    
    @app.get("/history")
    async def get_history(limit: int = Query(default=50, le=500)):
        """Get command execution history"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        return {
            "count": len(cli_service.history),
            "history": cli_service.history[-limit:]
        }
    
    @app.get("/mcp/tools")
    async def mcp_tools():
        """Get MCP-compatible tool definitions"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        tools = []
        for cmd in cli_service.registry.list_commands():
            tool = {
                "name": f"cli_{cmd.name}",
                "description": cmd.description,
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
            
            for param_name, param_def in cmd.parameters.items():
                tool["inputSchema"]["properties"][param_name] = {
                    "type": param_def.get("type", "string"),
                    "description": param_def.get("description", "")
                }
                if param_def.get("required", False):
                    tool["inputSchema"]["required"].append(param_name)
            
            tools.append(tool)
        
        return {"tools": tools}
    
    @app.post("/mcp/call")
    async def mcp_call(tool_name: str = Body(...), arguments: Dict[str, Any] = Body(default={})):
        """MCP-compatible tool call endpoint"""
        if not cli_service:
            raise HTTPException(500, "Service not initialized")
        
        if tool_name.startswith("cli_"):
            cmd_name = tool_name[4:]
        else:
            cmd_name = tool_name
        
        result = await cli_service.execute(cmd_name, args=arguments)
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result.output if result.success else f"Error: {result.error}"
                }
            ],
            "isError": not result.success
        }
    
    return app


def create_mcp_server():
    """Create MCP server for CLI service"""
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        logger.warning("MCP not available, using FastAPI only")
        return None
    
    mcp = FastMCP("heady-cli")
    _cli = CLIService()
    
    @mcp.tool()
    async def execute_command(command: str, args: str = "") -> str:
        """Execute a CLI command with optional arguments.
        
        Args:
            command: The command name (e.g., 'docker', 'git', 'hb')
            args: Arguments to pass to the command
        
        Returns:
            Command output or error message
        """
        result = await _cli.execute(command, args={"args": args})
        if result.success:
            return result.output
        return f"Error ({result.exit_code}): {result.error or 'Unknown error'}"
    
    @mcp.tool()
    async def execute_raw(command: str) -> str:
        """Execute a raw shell command.
        
        Args:
            command: The full shell command to execute
        
        Returns:
            Command output or error message
        """
        result = await _cli._execute_raw(command)
        if result.success:
            return result.output
        return f"Error ({result.exit_code}): {result.error or 'Unknown error'}"
    
    @mcp.tool()
    async def list_commands(tag: str = "") -> str:
        """List available CLI commands.
        
        Args:
            tag: Optional tag to filter commands
        
        Returns:
            JSON list of available commands
        """
        commands = _cli.registry.list_commands(tag if tag else None)
        return json.dumps([c.to_dict() for c in commands], indent=2)
    
    @mcp.tool()
    async def command_help(command: str) -> str:
        """Get help for a specific command.
        
        Args:
            command: The command name to get help for
        
        Returns:
            Command help information
        """
        result = await _cli.execute("help", args={"command": command})
        return result.output
    
    @mcp.tool()
    async def register_command(name: str, description: str, shell_template: str) -> str:
        """Register a new CLI command dynamically.
        
        Args:
            name: Command name
            description: What the command does
            shell_template: Shell command template (use {args} for arguments)
        
        Returns:
            Confirmation message
        """
        result = await _cli.execute("register", args={
            "name": name,
            "description": description,
            "shell_template": shell_template
        })
        return result.output
    
    @mcp.tool()
    async def service_health() -> str:
        """Check health of Heady services.
        
        Returns:
            Health status of services
        """
        result = await _cli.execute("health")
        return result.output
    
    @mcp.tool()
    async def docker_command(args: str) -> str:
        """Execute a docker command.
        
        Args:
            args: Docker command arguments (e.g., 'ps', 'logs container_name')
        
        Returns:
            Docker command output
        """
        result = await _cli.execute("docker", args={"args": args})
        if result.success:
            return result.output
        return f"Error: {result.error}"
    
    @mcp.tool()
    async def git_command(args: str) -> str:
        """Execute a git command.
        
        Args:
            args: Git command arguments (e.g., 'status', 'log -5')
        
        Returns:
            Git command output
        """
        result = await _cli.execute("git", args={"args": args})
        if result.success:
            return result.output
        return f"Error: {result.error}"
    
    @mcp.tool()
    async def heady_build(args: str) -> str:
        """Execute a Heady Build (hb) command.
        
        Args:
            args: HB command arguments (e.g., 'task test', 'status', 'monitor')
        
        Returns:
            HB command output
        """
        result = await _cli.execute("hb", args={"args": args})
        if result.success:
            return result.output
        return f"Error: {result.error}"
    
    return mcp


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8084)
