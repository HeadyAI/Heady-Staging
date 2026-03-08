"""
Core CLI Service - Command registry and execution engine
"""
import asyncio
import subprocess
import shlex
import os
import json
import logging
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Any, Optional, Union
from enum import Enum
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CommandType(Enum):
    SHELL = "shell"
    PYTHON = "python"
    COMPOSITE = "composite"
    ALIAS = "alias"


@dataclass
class CommandResult:
    success: bool
    output: str
    error: Optional[str] = None
    exit_code: int = 0
    duration_ms: float = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "output": self.output,
            "error": self.error,
            "exit_code": self.exit_code,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata
        }


@dataclass
class Command:
    name: str
    description: str
    command_type: CommandType = CommandType.SHELL
    handler: Optional[Callable] = None
    shell_template: Optional[str] = None
    aliases: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    requires_confirmation: bool = False
    timeout_seconds: int = 300
    tags: List[str] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "type": self.command_type.value,
            "aliases": self.aliases,
            "parameters": self.parameters,
            "requires_confirmation": self.requires_confirmation,
            "timeout_seconds": self.timeout_seconds,
            "tags": self.tags,
            "examples": self.examples
        }


class CommandRegistry:
    """Dynamic command registry with plugin support"""
    
    def __init__(self):
        self._commands: Dict[str, Command] = {}
        self._aliases: Dict[str, str] = {}
        self._plugins: List[str] = []
        self._hooks: Dict[str, List[Callable]] = {
            "pre_execute": [],
            "post_execute": [],
            "on_error": []
        }
    
    def register(self, command: Command) -> None:
        """Register a command"""
        self._commands[command.name] = command
        for alias in command.aliases:
            self._aliases[alias] = command.name
        logger.info(f"Registered command: {command.name}")
    
    def unregister(self, name: str) -> bool:
        """Unregister a command"""
        if name in self._commands:
            cmd = self._commands.pop(name)
            for alias in cmd.aliases:
                self._aliases.pop(alias, None)
            return True
        return False
    
    def get(self, name: str) -> Optional[Command]:
        """Get command by name or alias"""
        if name in self._commands:
            return self._commands[name]
        if name in self._aliases:
            return self._commands.get(self._aliases[name])
        return None
    
    def list_commands(self, tag: Optional[str] = None) -> List[Command]:
        """List all commands, optionally filtered by tag"""
        commands = list(self._commands.values())
        if tag:
            commands = [c for c in commands if tag in c.tags]
        return commands
    
    def search(self, query: str) -> List[Command]:
        """Search commands by name or description"""
        query_lower = query.lower()
        return [
            c for c in self._commands.values()
            if query_lower in c.name.lower() or query_lower in c.description.lower()
        ]
    
    def add_hook(self, event: str, callback: Callable) -> None:
        """Add execution hook"""
        if event in self._hooks:
            self._hooks[event].append(callback)
    
    def _run_hooks(self, event: str, **kwargs) -> None:
        """Run hooks for an event"""
        for hook in self._hooks.get(event, []):
            try:
                hook(**kwargs)
            except Exception as e:
                logger.warning(f"Hook error ({event}): {e}")


class CLIService:
    """Main CLI service with execution engine"""
    
    def __init__(self, working_dir: Optional[str] = None):
        self.registry = CommandRegistry()
        self.working_dir = working_dir or os.getcwd()
        self.history: List[Dict[str, Any]] = []
        self.max_history = 1000
        self._register_builtin_commands()
    
    def _register_builtin_commands(self) -> None:
        """Register built-in commands"""
        builtins = [
            Command(
                name="help",
                description="Show available commands or help for a specific command",
                command_type=CommandType.PYTHON,
                handler=self._cmd_help,
                parameters={"command": {"type": "string", "required": False}},
                tags=["system", "help"]
            ),
            Command(
                name="list",
                description="List all registered commands",
                command_type=CommandType.PYTHON,
                handler=self._cmd_list,
                parameters={"tag": {"type": "string", "required": False}},
                aliases=["ls", "commands"],
                tags=["system"]
            ),
            Command(
                name="history",
                description="Show command execution history",
                command_type=CommandType.PYTHON,
                handler=self._cmd_history,
                parameters={"limit": {"type": "integer", "default": 20}},
                tags=["system"]
            ),
            Command(
                name="exec",
                description="Execute arbitrary shell command",
                command_type=CommandType.SHELL,
                shell_template="{command}",
                parameters={"command": {"type": "string", "required": True}},
                requires_confirmation=True,
                tags=["shell", "dangerous"]
            ),
            Command(
                name="env",
                description="Show or set environment variables",
                command_type=CommandType.PYTHON,
                handler=self._cmd_env,
                parameters={
                    "name": {"type": "string", "required": False},
                    "value": {"type": "string", "required": False}
                },
                tags=["system", "config"]
            ),
            Command(
                name="status",
                description="Show CLI service status",
                command_type=CommandType.PYTHON,
                handler=self._cmd_status,
                tags=["system", "health"]
            ),
            Command(
                name="register",
                description="Dynamically register a new command",
                command_type=CommandType.PYTHON,
                handler=self._cmd_register,
                parameters={
                    "name": {"type": "string", "required": True},
                    "description": {"type": "string", "required": True},
                    "shell_template": {"type": "string", "required": True},
                    "aliases": {"type": "array", "required": False},
                    "tags": {"type": "array", "required": False}
                },
                tags=["system", "admin"]
            ),
            Command(
                name="docker",
                description="Execute docker commands",
                command_type=CommandType.SHELL,
                shell_template="docker {args}",
                parameters={"args": {"type": "string", "required": True}},
                aliases=["d"],
                tags=["docker", "containers"],
                examples=["docker ps", "docker logs heady_orchestrator"]
            ),
            Command(
                name="hb",
                description="Execute Heady Build commands",
                command_type=CommandType.SHELL,
                shell_template="powershell -File scripts/hb.ps1 {args}",
                parameters={"args": {"type": "string", "required": True}},
                tags=["heady", "build"],
                examples=["hb task 'test'", "hb status", "hb monitor"]
            ),
            Command(
                name="git",
                description="Execute git commands",
                command_type=CommandType.SHELL,
                shell_template="git {args}",
                parameters={"args": {"type": "string", "required": True}},
                aliases=["g"],
                tags=["git", "vcs"],
                examples=["git status", "git log -5"]
            ),
            Command(
                name="python",
                description="Execute Python scripts or commands",
                command_type=CommandType.SHELL,
                shell_template="python {args}",
                parameters={"args": {"type": "string", "required": True}},
                aliases=["py"],
                tags=["python", "scripts"]
            ),
            Command(
                name="node",
                description="Execute Node.js scripts or commands",
                command_type=CommandType.SHELL,
                shell_template="node {args}",
                parameters={"args": {"type": "string", "required": True}},
                tags=["node", "javascript"]
            ),
            Command(
                name="curl",
                description="Make HTTP requests",
                command_type=CommandType.SHELL,
                shell_template="curl {args}",
                parameters={"args": {"type": "string", "required": True}},
                tags=["http", "network"],
                examples=["curl -s http://localhost:3100/api/tasks"]
            ),
            Command(
                name="health",
                description="Check health of Heady services",
                command_type=CommandType.PYTHON,
                handler=self._cmd_health,
                tags=["system", "health", "heady"]
            ),
        ]
        
        for cmd in builtins:
            self.registry.register(cmd)
    
    async def execute(
        self,
        command_name: str,
        args: Optional[Dict[str, Any]] = None,
        raw_input: Optional[str] = None,
        confirm: bool = False
    ) -> CommandResult:
        """Execute a command"""
        start_time = datetime.now()
        args = args or {}
        
        cmd = self.registry.get(command_name)
        if not cmd:
            if raw_input:
                return await self._execute_raw(raw_input)
            return CommandResult(
                success=False,
                output="",
                error=f"Unknown command: {command_name}",
                exit_code=1
            )
        
        if cmd.requires_confirmation and not confirm:
            return CommandResult(
                success=False,
                output="",
                error=f"Command '{command_name}' requires confirmation. Pass confirm=True to execute.",
                exit_code=2,
                metadata={"requires_confirmation": True}
            )
        
        self.registry._run_hooks("pre_execute", command=cmd, args=args)
        
        try:
            if cmd.command_type == CommandType.PYTHON and cmd.handler:
                result = await self._execute_python(cmd, args)
            elif cmd.command_type == CommandType.SHELL:
                result = await self._execute_shell(cmd, args)
            elif cmd.command_type == CommandType.ALIAS:
                target = self.registry.get(cmd.shell_template)
                if target:
                    result = await self.execute(target.name, args)
                else:
                    result = CommandResult(False, "", f"Alias target not found: {cmd.shell_template}", 1)
            else:
                result = CommandResult(False, "", f"Unsupported command type: {cmd.command_type}", 1)
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            result.duration_ms = duration
            
            self._add_history(command_name, args, result)
            self.registry._run_hooks("post_execute", command=cmd, args=args, result=result)
            
            return result
            
        except Exception as e:
            self.registry._run_hooks("on_error", command=cmd, args=args, error=e)
            return CommandResult(
                success=False,
                output="",
                error=str(e),
                exit_code=1
            )
    
    async def _execute_python(self, cmd: Command, args: Dict[str, Any]) -> CommandResult:
        """Execute Python handler"""
        if asyncio.iscoroutinefunction(cmd.handler):
            return await cmd.handler(self, **args)
        else:
            return cmd.handler(self, **args)
    
    async def _execute_shell(self, cmd: Command, args: Dict[str, Any]) -> CommandResult:
        """Execute shell command"""
        template = cmd.shell_template or cmd.name
        
        for key, value in args.items():
            template = template.replace(f"{{{key}}}", str(value))
        
        template = template.replace("{args}", args.get("args", ""))
        
        try:
            process = await asyncio.create_subprocess_shell(
                template,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.working_dir
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=cmd.timeout_seconds
            )
            
            return CommandResult(
                success=process.returncode == 0,
                output=stdout.decode('utf-8', errors='replace'),
                error=stderr.decode('utf-8', errors='replace') if stderr else None,
                exit_code=process.returncode or 0
            )
            
        except asyncio.TimeoutError:
            return CommandResult(
                success=False,
                output="",
                error=f"Command timed out after {cmd.timeout_seconds}s",
                exit_code=124
            )
    
    async def _execute_raw(self, raw_input: str) -> CommandResult:
        """Execute raw shell command"""
        try:
            process = await asyncio.create_subprocess_shell(
                raw_input,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.working_dir
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=300
            )
            
            return CommandResult(
                success=process.returncode == 0,
                output=stdout.decode('utf-8', errors='replace'),
                error=stderr.decode('utf-8', errors='replace') if stderr else None,
                exit_code=process.returncode or 0
            )
        except Exception as e:
            return CommandResult(False, "", str(e), 1)
    
    def _add_history(self, command: str, args: Dict, result: CommandResult) -> None:
        """Add command to history"""
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "command": command,
            "args": args,
            "success": result.success,
            "exit_code": result.exit_code,
            "duration_ms": result.duration_ms
        })
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def _cmd_help(self, service: 'CLIService', command: Optional[str] = None) -> CommandResult:
        """Help command handler"""
        if command:
            cmd = self.registry.get(command)
            if cmd:
                help_text = f"""
Command: {cmd.name}
Description: {cmd.description}
Type: {cmd.command_type.value}
Aliases: {', '.join(cmd.aliases) if cmd.aliases else 'None'}
Tags: {', '.join(cmd.tags) if cmd.tags else 'None'}
Parameters: {json.dumps(cmd.parameters, indent=2)}
Requires Confirmation: {cmd.requires_confirmation}
Examples: {chr(10).join('  - ' + e for e in cmd.examples) if cmd.examples else 'None'}
"""
                return CommandResult(True, help_text.strip())
            return CommandResult(False, "", f"Command not found: {command}", 1)
        
        commands = self.registry.list_commands()
        help_text = "Available Commands:\n\n"
        for cmd in sorted(commands, key=lambda c: c.name):
            aliases = f" ({', '.join(cmd.aliases)})" if cmd.aliases else ""
            help_text += f"  {cmd.name}{aliases} - {cmd.description}\n"
        
        return CommandResult(True, help_text)
    
    def _cmd_list(self, service: 'CLIService', tag: Optional[str] = None) -> CommandResult:
        """List commands handler"""
        commands = self.registry.list_commands(tag)
        output = json.dumps([c.to_dict() for c in commands], indent=2)
        return CommandResult(True, output)
    
    def _cmd_history(self, service: 'CLIService', limit: int = 20) -> CommandResult:
        """History command handler"""
        recent = self.history[-limit:]
        output = json.dumps(recent, indent=2)
        return CommandResult(True, output)
    
    def _cmd_env(self, service: 'CLIService', name: Optional[str] = None, value: Optional[str] = None) -> CommandResult:
        """Environment command handler"""
        if name and value:
            os.environ[name] = value
            return CommandResult(True, f"Set {name}={value}")
        elif name:
            val = os.environ.get(name, "")
            return CommandResult(True, f"{name}={val}")
        else:
            env_vars = {k: v for k, v in os.environ.items() if k.startswith("HEADY")}
            return CommandResult(True, json.dumps(env_vars, indent=2))
    
    def _cmd_status(self, service: 'CLIService') -> CommandResult:
        """Status command handler"""
        status = {
            "service": "cli_service",
            "version": "1.0.0",
            "working_dir": self.working_dir,
            "registered_commands": len(self.registry._commands),
            "history_size": len(self.history),
            "uptime": "active"
        }
        return CommandResult(True, json.dumps(status, indent=2))
    
    def _cmd_register(
        self,
        service: 'CLIService',
        name: str,
        description: str,
        shell_template: str,
        aliases: Optional[List[str]] = None,
        tags: Optional[List[str]] = None
    ) -> CommandResult:
        """Register command handler"""
        cmd = Command(
            name=name,
            description=description,
            command_type=CommandType.SHELL,
            shell_template=shell_template,
            aliases=aliases or [],
            tags=tags or ["custom"]
        )
        self.registry.register(cmd)
        return CommandResult(True, f"Registered command: {name}")
    
    def _cmd_health(self, service: 'CLIService') -> CommandResult:
        """Health check handler"""
        import subprocess
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}}: {{.Status}}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            containers = [line for line in result.stdout.split('\n') if 'heady' in line.lower()]
            healthy = sum(1 for c in containers if 'healthy' in c.lower() or 'up' in c.lower())
            output = f"Heady Services: {healthy}/{len(containers)} healthy\n\n" + '\n'.join(containers)
            return CommandResult(True, output)
        except Exception as e:
            return CommandResult(False, "", str(e), 1)
