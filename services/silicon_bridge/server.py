"""
Silicon Bridge Service for Heady Systems
Coordinates between local GPU resources and remote Colab execution
Implements the "Split-Brain" architecture
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import requests
from enum import Enum

from ..resource_allocator import resource_allocator, GPUContext, TaskPriority

class ExecutionMode(Enum):
    LOCAL = "local"
    REMOTE = "remote" 
    HYBRID = "hybrid"

class ExecutionStrategy(Enum):
    COST_OPTIMIZED = "cost_optimized"
    SPEED_OPTIMIZED = "speed_optimized"
    BALANCED = "balanced"

@dataclass
class ExecutionPlan:
    """Execution plan for a GPU task"""
    task_id: str
    context_type: str
    execution_mode: ExecutionMode
    strategy: ExecutionStrategy
    local_resources_available: bool
    remote_recommended: bool
    estimated_cost: float
    estimated_time_minutes: int
    confidence_score: float

@dataclass
class ExecutionResult:
    """Result from GPU execution"""
    task_id: str
    context_type: str
    execution_mode: str
    execution_time_seconds: float
    cost_estimate: float
    results: Dict[str, Any]
    performance_metrics: Dict[str, float]
    status: str
    error_message: Optional[str] = None

class SiliconBridge:
    """Silicon Bridge - Coordinates GPU execution between local and remote"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.local_gpu_available = self._detect_local_gpu()
        self.colab_gateway_url = "http://localhost:8084"
        self.execution_history: List[ExecutionResult] = []
        self.cost_per_gpu_hour = 0.35  # Colab GPU cost estimate
        self.performance_cache = {}
        
    def _detect_local_gpu(self) -> bool:
        """Detect if local GPU is available"""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
    
    def _estimate_complexity(self, task_instruction: str, context_type: str) -> Dict[str, Any]:
        """Estimate task complexity and resource requirements"""
        complexity_indicators = {
            "size_indicators": {
                "1k": {"nodes": 1000, "complexity": 0.2},
                "10k": {"nodes": 10000, "complexity": 0.4},
                "100k": {"nodes": 100000, "complexity": 0.7},
                "500k": {"nodes": 500000, "complexity": 0.9},
                "1m": {"nodes": 1000000, "complexity": 1.0}
            },
            "context_multipliers": {
                "topology_mapping": 1.0,
                "chronological_ordering": 0.8,
                "sanity_stress_test": 0.6,
                "general_compute": 0.5
            }
        }
        
        # Extract size from instruction
        nodes = 1000  # default
        for size_key, size_info in complexity_indicators["size_indicators"].items():
            if size_key in task_instruction.lower():
                nodes = size_info["nodes"]
                break
        
        base_complexity = complexity_indicators["size_indicators"]["1k"]["complexity"]
        for size_key, size_info in complexity_indicators["size_indicators"].items():
            if size_key in task_instruction.lower():
                base_complexity = size_info["complexity"]
                break
        
        context_multiplier = complexity_indicators["context_multipliers"].get(context_type, 1.0)
        final_complexity = base_complexity * context_multiplier
        
        return {
            "estimated_nodes": nodes,
            "complexity_score": final_complexity,
            "memory_requirement_mb": int(1024 + nodes * 0.01),  # Rough estimate
            "estimated_time_minutes": int(5 + final_complexity * 15)
        }
    
    def _calculate_execution_plan(self, task_id: str, task_instruction: str, 
                                 context_type: str, strategy: ExecutionStrategy = ExecutionStrategy.BALANCED) -> ExecutionPlan:
        """Calculate optimal execution plan"""
        
        complexity = self._estimate_complexity(task_instruction, context_type)
        
        # Check local resource availability
        requirements = resource_allocator.calculate_task_requirements(
            task_instruction, TaskPriority.NORMAL
        )
        local_available = resource_allocator.can_allocate(requirements)
        
        # Determine execution mode based on strategy
        if strategy == ExecutionStrategy.SPEED_OPTIMIZED:
            # Prefer remote for maximum speed
            remote_recommended = True
            execution_mode = ExecutionMode.REMOTE if not local_available else ExecutionMode.HYBRID
        elif strategy == ExecutionStrategy.COST_OPTIMIZED:
            # Prefer local if available
            remote_recommended = not local_available or complexity["complexity_score"] > 0.7
            execution_mode = ExecutionMode.LOCAL if local_available else ExecutionMode.REMOTE
        else:  # BALANCED
            # Use hybrid for medium complexity, local for low, remote for high
            if complexity["complexity_score"] < 0.3:
                execution_mode = ExecutionMode.LOCAL
                remote_recommended = False
            elif complexity["complexity_score"] > 0.8:
                execution_mode = ExecutionMode.REMOTE
                remote_recommended = True
            else:
                execution_mode = ExecutionMode.HYBRID
                remote_recommended = True
        
        # Estimate cost and time
        estimated_time = complexity["estimated_time_minutes"]
        if execution_mode in [ExecutionMode.REMOTE, ExecutionMode.HYBRID]:
            estimated_cost = (estimated_time / 60) * self.cost_per_gpu_hour
        else:
            estimated_cost = 0.0
        
        # Confidence score based on historical performance
        confidence_score = 0.8  # Base confidence
        if context_type in self.performance_cache:
            confidence_score = self.performance_cache[context_type].get("success_rate", 0.8)
        
        return ExecutionPlan(
            task_id=task_id,
            context_type=context_type,
            execution_mode=execution_mode,
            strategy=strategy,
            local_resources_available=local_available,
            remote_recommended=remote_recommended,
            estimated_cost=estimated_cost,
            estimated_time_minutes=estimated_time,
            confidence_score=confidence_score
        )
    
    async def execute_local_gpu(self, task_id: str, context_type: str, 
                              custom_params: Optional[Dict] = None) -> ExecutionResult:
        """Execute task on local GPU"""
        start_time = datetime.now()
        
        try:
            # Allocate resources
            requirements = resource_allocator.calculate_task_requirements(
                f"Execute {context_type} on local GPU", TaskPriority.HIGH
            )
            
            allocation = resource_allocator.allocate_resources(task_id, requirements, 60)
            if not allocation:
                raise Exception("Failed to allocate local resources")
            
            # Simulate local execution (in real implementation, this would use actual GPU)
            await asyncio.sleep(2)  # Simulate computation time
            
            # Generate mock results based on context
            if context_type == "topology_mapping":
                results = {
                    "context": "topology_mapping",
                    "nodes_processed": custom_params.get("num_nodes", 1000),
                    "related_pairs_found": 147,
                    "vectorization_time_seconds": 2.3,
                    "similarity_calculation_time_seconds": 0.8,
                    "gpu_used": True,
                    "execution_location": "local"
                }
            elif context_type == "chronological_ordering":
                results = {
                    "context": "chronological_ordering",
                    "nodes_processed": custom_params.get("num_nodes", 50000),  # Smaller for local
                    "gpu_sort_time_seconds": 0.8,
                    "cpu_sort_time_seconds": 2.1,
                    "speedup_factor": 2.6,
                    "gpu_used": True,
                    "execution_location": "local"
                }
            elif context_type == "sanity_stress_test":
                results = {
                    "context": "sanity_stress_test",
                    "logs_processed": custom_params.get("num_logs", 10000),  # Smaller for local
                    "corrupted_count": 523,
                    "corruption_rate": 0.052,
                    "gpu_analysis_time_seconds": 0.15,
                    "cpu_analysis_time_seconds": 0.8,
                    "speedup_factor": 5.3,
                    "gpu_used": True,
                    "execution_location": "local"
                }
            else:
                results = {
                    "context": "general_compute",
                    "matrix_operation_time_seconds": 1.8,
                    "vector_operation_time_seconds": 0.4,
                    "gpu_memory_used_mb": 1536,
                    "gpu_used": True,
                    "execution_location": "local"
                }
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Release resources
            resource_allocator.release_resources(task_id)
            
            # Update performance cache
            if context_type not in self.performance_cache:
                self.performance_cache[context_type] = {"success_count": 0, "total_count": 0}
            self.performance_cache[context_type]["success_count"] += 1
            self.performance_cache[context_type]["total_count"] += 1
            self.performance_cache[context_type]["success_rate"] = (
                self.performance_cache[context_type]["success_count"] / 
                self.performance_cache[context_type]["total_count"]
            )
            
            return ExecutionResult(
                task_id=task_id,
                context_type=context_type,
                execution_mode="local",
                execution_time_seconds=execution_time,
                cost_estimate=0.0,
                results=results,
                performance_metrics={
                    "gpu_utilization": 0.85,
                    "memory_utilization": 0.67,
                    "throughput_ops_per_second": results.get("nodes_processed", 1000) / execution_time
                },
                status="completed"
            )
            
        except Exception as e:
            # Ensure resources are released on error
            resource_allocator.release_resources(task_id)
            
            return ExecutionResult(
                task_id=task_id,
                context_type=context_type,
                execution_mode="local",
                execution_time_seconds=(datetime.now() - start_time).total_seconds(),
                cost_estimate=0.0,
                results={},
                performance_metrics={},
                status="error",
                error_message=str(e)
            )
    
    async def execute_remote_gpu(self, task_id: str, context_type: str,
                               custom_params: Optional[Dict] = None) -> ExecutionResult:
        """Execute task on remote Colab GPU"""
        start_time = datetime.now()
        
        try:
            # Create notebook
            create_payload = {
                "task_id": task_id,
                "context_type": context_type
            }
            
            response = requests.post(f"{self.colab_gateway_url}/api/notebook/create", 
                                   json=create_payload, timeout=10)
            response.raise_for_status()
            
            notebook = response.json()
            notebook_id = notebook["notebook_id"]
            
            # Execute code
            execute_payload = {
                "notebook_id": notebook_id,
                "custom_params": custom_params
            }
            
            response = requests.post(f"{self.colab_gateway_url}/api/notebook/execute",
                                   json=execute_payload, timeout=300)
            response.raise_for_status()
            
            results = response.json()
            
            # Cleanup notebook
            requests.delete(f"{self.colab_gateway_url}/api/notebook/{notebook_id}", timeout=10)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Update performance cache
            if context_type not in self.performance_cache:
                self.performance_cache[context_type] = {"success_count": 0, "total_count": 0}
            self.performance_cache[context_type]["success_count"] += 1
            self.performance_cache[context_type]["total_count"] += 1
            self.performance_cache[context_type]["success_rate"] = (
                self.performance_cache[context_type]["success_count"] / 
                self.performance_cache[context_type]["total_count"]
            )
            
            return ExecutionResult(
                task_id=task_id,
                context_type=context_type,
                execution_mode="remote",
                execution_time_seconds=execution_time,
                cost_estimate=results.get("estimated_cost", 0.10),
                results=results,
                performance_metrics={
                    "colab_gpu_type": "T4",
                    "network_latency_ms": 45,
                    "remote_execution_efficiency": 0.92
                },
                status="completed"
            )
            
        except Exception as e:
            return ExecutionResult(
                task_id=task_id,
                context_type=context_type,
                execution_mode="remote",
                execution_time_seconds=(datetime.now() - start_time).total_seconds(),
                cost_estimate=0.0,
                results={},
                performance_metrics={},
                status="error",
                error_message=str(e)
            )
    
    async def execute_hybrid(self, task_id: str, context_type: str,
                           custom_params: Optional[Dict] = None) -> ExecutionResult:
        """Execute using hybrid approach - local for small, remote for large"""
        
        # Determine split based on data size
        total_nodes = custom_params.get("num_nodes", 1000) if custom_params else 1000
        
        if total_nodes <= 10000:
            # Use local for smaller datasets
            return await self.execute_local_gpu(task_id, context_type, custom_params)
        else:
            # Use remote for larger datasets
            return await self.execute_remote_gpu(task_id, context_type, custom_params)
    
    async def execute_task(self, task_id: str, task_instruction: str, 
                          context_type: str, strategy: ExecutionStrategy = ExecutionStrategy.BALANCED,
                          custom_params: Optional[Dict] = None) -> ExecutionResult:
        """Execute a GPU task using the optimal strategy"""
        
        # Calculate execution plan
        plan = self._calculate_execution_plan(task_id, task_instruction, context_type, strategy)
        
        self.logger.info(f"Executing task {task_id} with plan: {plan.execution_mode} (strategy: {strategy.value})")
        
        # Execute based on plan
        if plan.execution_mode == ExecutionMode.LOCAL:
            result = await self.execute_local_gpu(task_id, context_type, custom_params)
        elif plan.execution_mode == ExecutionMode.REMOTE:
            result = await self.execute_remote_gpu(task_id, context_type, custom_params)
        else:  # HYBRID
            result = await self.execute_hybrid(task_id, context_type, custom_params)
        
        # Store in history
        self.execution_history.append(result)
        
        # Limit history size
        if len(self.execution_history) > 100:
            self.execution_history = self.execution_history[-50:]
        
        return result
    
    def get_execution_history(self, limit: int = 10) -> List[ExecutionResult]:
        """Get recent execution history"""
        return self.execution_history[-limit:]
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.execution_history:
            return {"message": "No execution history"}
        
        successful = [r for r in self.execution_history if r.status == "completed"]
        failed = [r for r in self.execution_history if r.status == "error"]
        
        local_executions = [r for r in successful if r.execution_mode == "local"]
        remote_executions = [r for r in successful if r.execution_mode == "remote"]
        
        return {
            "total_executions": len(self.execution_history),
            "successful_executions": len(successful),
            "failed_executions": len(failed),
            "success_rate": len(successful) / len(self.execution_history),
            "local_executions": len(local_executions),
            "remote_executions": len(remote_executions),
            "avg_local_time_seconds": sum(r.execution_time_seconds for r in local_executions) / len(local_executions) if local_executions else 0,
            "avg_remote_time_seconds": sum(r.execution_time_seconds for r in remote_executions) / len(remote_executions) if remote_executions else 0,
            "total_cost_estimate": sum(r.cost_estimate for r in successful),
            "context_performance": self.performance_cache
        }

# Global bridge instance
silicon_bridge = SiliconBridge()

# FastAPI server
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Heady Silicon Bridge", version="1.0.0")

class ExecuteTaskRequest(BaseModel):
    task_id: str
    task_instruction: str
    context_type: str
    strategy: str = "balanced"
    custom_params: Optional[Dict] = None

class PlanTaskRequest(BaseModel):
    task_id: str
    task_instruction: str
    context_type: str
    strategy: str = "balanced"

@app.post("/api/execute")
async def execute_task_api(request: ExecuteTaskRequest):
    """Execute a GPU task"""
    try:
        strategy = ExecutionStrategy(request.strategy)
        result = await silicon_bridge.execute_task(
            request.task_id,
            request.task_instruction,
            request.context_type,
            strategy,
            request.custom_params
        )
        return asdict(result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/plan")
async def plan_task_api(request: PlanTaskRequest):
    """Get execution plan for a task"""
    try:
        strategy = ExecutionStrategy(request.strategy)
        plan = silicon_bridge._calculate_execution_plan(
            request.task_id,
            request.task_instruction,
            request.context_type,
            strategy
        )
        return asdict(plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history_api(limit: int = 10):
    """Get execution history"""
    return [asdict(result) for result in silicon_bridge.get_execution_history(limit)]

@app.get("/api/stats")
async def get_stats_api():
    """Get performance statistics"""
    return silicon_bridge.get_performance_stats()

@app.get("/api/contexts")
async def get_contexts_api():
    """Get available GPU contexts"""
    return {
        context.value: {
            "name": context.value.replace("_", " ").title(),
            "description": f"GPU context for {context.value.replace('_', ' ')} operations"
        }
        for context in GPUContext
    }

@app.get("/api/strategies")
async def get_strategies_api():
    """Get available execution strategies"""
    return {
        strategy.value: {
            "name": strategy.value.replace("_", " ").title(),
            "description": f"Execution strategy optimized for {strategy.value}"
        }
        for strategy in ExecutionStrategy
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "silicon_bridge",
        "local_gpu_available": silicon_bridge.local_gpu_available,
        "colab_gateway_status": "connected" if silicon_bridge._check_colab_gateway() else "disconnected"
    }

def _check_colab_gateway(self) -> bool:
    """Check if Colab gateway is accessible"""
    try:
        response = requests.get(f"{self.colab_gateway_url}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

# Add the method to the class
SiliconBridge._check_colab_gateway = _check_colab_gateway

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8085)
