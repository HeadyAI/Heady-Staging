from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Optional


@dataclass
class ResourceTask:
    """Represents a unit of work to assign to the MCP fleet."""

    id: str
    kind: str  # "code", "reason", "research", "monitor"
    payload: str
    priority: str = "background"
    metadata: Dict[str, Any] = field(default_factory=dict)


class ResourceManager:
    """Dynamic allocator that saturates the MCP toolchain."""

    def __init__(
        self,
        *,
        gemini_service,
        jules_service,
        perplexity_service,
        monitor_callback: Optional[Callable[[], Awaitable[None] | None]] = None,
        concurrency_limit: int = 3,
    ) -> None:
        self.gemini = gemini_service
        self.jules = jules_service
        self.perplexity = perplexity_service
        self.monitor_callback = monitor_callback
        self._global_limit = max(1, concurrency_limit)
        self.semaphore = asyncio.Semaphore(self._global_limit)
        self._tool_concurrency_limits: Dict[str, int] = {}
        self._tool_semaphores: Dict[str, asyncio.Semaphore] = {}
        self._rebuild_tool_semaphores()

    async def execute_tasks(self, tasks: List[ResourceTask]) -> List[Dict[str, Any]]:
        """Runs tasks in parallel up to the configured limit."""

        if not tasks:
            return []

        indexed_tasks = list(enumerate(tasks))
        ordered = sorted(indexed_tasks, key=lambda pair: self._priority_rank(pair[1]))
        sorted_indices = [idx for idx, _ in ordered]
        sorted_tasks = [task for _, task in ordered]

        coroutines = [self._execute_task(task) for task in sorted_tasks]
        sorted_results = await asyncio.gather(*coroutines, return_exceptions=False)
        result_by_index = {
            sorted_indices[position]: sorted_results[position]
            for position in range(len(sorted_results))
        }
        return [result_by_index[index] for index in range(len(tasks))]

    async def compile_report(self, results: List[Dict[str, Any]]) -> str:
        sections = []
        for result in results:
            lines = [f"Task {result['id']} [{result['kind']}]: {result['status']}"]
            if result.get("output"):
                lines.append(result["output"])
            sections.append("\n".join(lines))
        return "\n\n".join(sections)

    async def _execute_task(self, task: ResourceTask) -> Dict[str, Any]:
        tool = self._tool_for_kind(task.kind)
        tool_semaphore = self._tool_semaphores.get(tool)

        await self.semaphore.acquire()
        if tool_semaphore:
            await tool_semaphore.acquire()

        try:
            await self._maybe_throttle()
            try:
                output = await self._dispatch(task)
                status = "completed"
            except Exception as exc:  # noqa: BLE001 - bubble error details to caller
                output = f"Error: {exc}"
                status = "failed"
        finally:
            if tool_semaphore:
                tool_semaphore.release()
            self.semaphore.release()

        return {
            "id": task.id,
            "kind": task.kind,
            "priority": task.priority,
            "tool": tool,
            "status": status,
            "output": output,
        }

    async def _dispatch(self, task: ResourceTask) -> str:
        kind = (task.kind or "").lower()

        if kind == "code":
            return await self.jules.ask(task.payload)
        if kind == "research":
            return await self.perplexity.ask(task.payload)
        if kind == "reason":
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, self.gemini.ask, task.payload)
        if kind == "monitor" and self.monitor_callback:
            result = self.monitor_callback()
            if asyncio.iscoroutine(result):
                await result
            return "Monitor check completed"
        # Default fallback to Gemini reasoning
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.gemini.ask, task.payload)

    async def _maybe_throttle(self) -> None:
        if not self.monitor_callback:
            return
        result = self.monitor_callback()
        if asyncio.iscoroutine(result):
            await result

    def update_concurrency_limit(self, new_limit: int) -> None:
        """Adjust semaphore capacity at runtime."""

        self._global_limit = max(1, int(new_limit))
        self.semaphore = asyncio.Semaphore(self._global_limit)
        self._rebuild_tool_semaphores()

    def update_tool_concurrency_limits(self, limits: Dict[str, Any]) -> None:
        normalized: Dict[str, int] = {}
        for tool, value in (limits or {}).items():
            try:
                normalized[str(tool).lower()] = max(1, int(value))
            except (TypeError, ValueError):
                continue

        self._tool_concurrency_limits = normalized
        self._rebuild_tool_semaphores()

    @staticmethod
    def _priority_rank(task: ResourceTask) -> int:
        return 0 if (task.priority or "").lower() == "critical" else 1

    @staticmethod
    def _tool_for_kind(kind: str) -> str:
        normalized = (kind or "").lower()
        if normalized == "code":
            return "jules"
        if normalized == "research":
            return "perplexity"
        if normalized == "monitor":
            return "monitor"
        return "gemini"

    def _rebuild_tool_semaphores(self) -> None:
        for tool in ("gemini", "jules", "perplexity", "monitor"):
            limit = self._tool_concurrency_limits.get(tool, self._global_limit)
            self._tool_semaphores[tool] = asyncio.Semaphore(max(1, limit))
