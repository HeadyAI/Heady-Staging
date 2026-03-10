"""
Dynamic Resource Allocator for Heady Systems
Intelligently allocates resources based on task complexity and system load
"""

import os
import json
import psutil
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime, timedelta
import requests
import tempfile

class ResourceType(Enum):
    CPU = "cpu"
    MEMORY = "memory"
    GPU = "gpu"
    STORAGE = "storage"
    NETWORK = "network"

class TaskPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class GPUContext(Enum):
    TOPOLOGY_MAPPING = "topology_mapping"
    CHRONOLOGICAL_ORDERING = "chronological_ordering"
    SANITY_STRESS_TEST = "sanity_stress_test"
    GENERAL_COMPUTE = "general_compute"

@dataclass
class ResourceRequirement:
    """Resource requirements for a task"""
    cpu_cores: float
    memory_mb: int
    gpu_memory_mb: int = 0
    storage_mb: int = 1000
    network_bandwidth_mbps: int = 100
    gpu_context: Optional[GPUContext] = None
    remote_execution: bool = False

@dataclass
class ResourceAllocation:
    """Actual allocated resources"""
    task_id: str
    cpu_cores: float
    memory_mb: int
    gpu_memory_mb: int = 0
    allocated_at: datetime = None
    expires_at: datetime = None
    gpu_context: Optional[GPUContext] = None
    remote_execution: bool = False
    colab_notebook_id: Optional[str] = None

class DynamicResourceAllocator:
    """Intelligent resource allocation system"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.allocations: Dict[str, ResourceAllocation] = {}
        self.system_resources = self._get_system_resources()
        self.reserved_resources = {
            ResourceType.CPU: 2.0,  # Reserve 2 cores for system
            ResourceType.MEMORY: 2048,  # Reserve 2GB for system
        }
        
    def _get_system_resources(self) -> Dict[ResourceType, float]:
        """Get available system resources"""
        return {
            ResourceType.CPU: psutil.cpu_count(),
            ResourceType.MEMORY: psutil.virtual_memory().total // (1024 * 1024),  # MB
            ResourceType.STORAGE: psutil.disk_usage('/').free // (1024 * 1024),  # MB
            ResourceType.GPU: self._get_gpu_memory(),
        }
    
    def _get_gpu_memory(self) -> int:
        """Get GPU memory if available"""
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                return gpus[0].memoryTotal  # MB
        except ImportError:
            pass
        return 0
    
    def calculate_task_requirements(self, task_instruction: str, priority: TaskPriority) -> ResourceRequirement:
        """Calculate resource requirements based on task analysis"""
        
        # Base requirements
        base_cpu = 1.0
        base_memory = 1024  # 1GB
        
        # Analyze task complexity with GPU contexts
        complexity_factors = {
            'ai': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.GENERAL_COMPUTE},
            'machine learning': {'cpu': 4.0, 'memory': 8192, 'gpu': 4096, 'context': GPUContext.GENERAL_COMPUTE},
            'model training': {'cpu': 6.0, 'memory': 16384, 'gpu': 8192, 'context': GPUContext.GENERAL_COMPUTE},
            'inference': {'cpu': 2.0, 'memory': 2048, 'gpu': 1024, 'context': GPUContext.GENERAL_COMPUTE},
            'topology': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.TOPOLOGY_MAPPING},
            'context vector': {'cpu': 3.0, 'memory': 6144, 'gpu': 3072, 'context': GPUContext.TOPOLOGY_MAPPING},
            'sentence transformer': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.TOPOLOGY_MAPPING},
            'cosine similarity': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.TOPOLOGY_MAPPING},
            'chronological': {'cpu': 4.0, 'memory': 8192, 'gpu': 4096, 'context': GPUContext.CHRONOLOGICAL_ORDERING},
            'sorting': {'cpu': 3.0, 'memory': 6144, 'gpu': 3072, 'context': GPUContext.CHRONOLOGICAL_ORDERING},
            'torch.sort': {'cpu': 3.0, 'memory': 6144, 'gpu': 3072, 'context': GPUContext.CHRONOLOGICAL_ORDERING},
            'cudf': {'cpu': 4.0, 'memory': 8192, 'gpu': 4096, 'context': GPUContext.CHRONOLOGICAL_ORDERING},
            'sanity': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.SANITY_STRESS_TEST},
            'stress test': {'cpu': 3.0, 'memory': 6144, 'gpu': 3072, 'context': GPUContext.SANITY_STRESS_TEST},
            'drift': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.SANITY_STRESS_TEST},
            'boolean mask': {'cpu': 2.0, 'memory': 4096, 'gpu': 2048, 'context': GPUContext.SANITY_STRESS_TEST},
            'data processing': {'cpu': 3.0, 'memory': 4096, 'gpu': 0},
            'image generation': {'cpu': 2.0, 'memory': 3072, 'gpu': 2048, 'context': GPUContext.GENERAL_COMPUTE},
            'text generation': {'cpu': 1.5, 'memory': 2048, 'gpu': 1024, 'context': GPUContext.GENERAL_COMPUTE},
            'search': {'cpu': 1.0, 'memory': 512, 'gpu': 0},
            'build': {'cpu': 2.0, 'memory': 2048, 'gpu': 0},
            'compile': {'cpu': 4.0, 'memory': 4096, 'gpu': 0},
            'test': {'cpu': 1.5, 'memory': 1024, 'gpu': 0},
            'deploy': {'cpu': 1.0, 'memory': 512, 'gpu': 0},
        }
        
        instruction_lower = task_instruction.lower()
        cpu_multiplier = 1.0
        memory_multiplier = 1.0
        gpu_required = 0
        gpu_context = None
        remote_execution = False
        
        # Check for complexity keywords and GPU contexts
        for keyword, factors in complexity_factors.items():
            if keyword in instruction_lower:
                cpu_multiplier = max(cpu_multiplier, factors['cpu'] / base_cpu)
                memory_multiplier = max(memory_multiplier, factors['memory'] / base_memory)
                gpu_required = max(gpu_required, factors.get('gpu', 0))
                if 'context' in factors:
                    gpu_context = factors['context']
        
        # Check for remote execution keywords
        remote_keywords = ['colab', 'remote', 'cloud', 'distributed', 'cluster']
        if any(keyword in instruction_lower for keyword in remote_keywords):
            remote_execution = True
            # Increase resources for remote execution overhead
            cpu_multiplier *= 1.2
            memory_multiplier *= 1.2
        
        # Priority-based scaling
        priority_multiplier = {
            TaskPriority.LOW: 0.5,
            TaskPriority.NORMAL: 1.0,
            TaskPriority.HIGH: 1.5,
            TaskPriority.CRITICAL: 2.0,
        }
        
        multiplier = priority_multiplier.get(priority, 1.0)
        
        return ResourceRequirement(
            cpu_cores=min(base_cpu * cpu_multiplier * multiplier, self.system_resources[ResourceType.CPU] - self.reserved_resources[ResourceType.CPU]),
            memory_mb=min(int(base_memory * memory_multiplier * multiplier), int(self.system_resources[ResourceType.MEMORY] - self.reserved_resources[ResourceType.MEMORY])),
            gpu_memory_mb=min(gpu_required * multiplier, self.system_resources[ResourceType.GPU]),
            storage_mb=1000,
            network_bandwidth_mbps=100,
            gpu_context=gpu_context,
            remote_execution=remote_execution
        )
    
    def can_allocate(self, requirements: ResourceRequirement) -> bool:
        """Check if resources can be allocated"""
        available_cpu = self.system_resources[ResourceType.CPU] - self.reserved_resources[ResourceType.CPU]
        allocated_cpu = sum(alloc.cpu_cores for alloc in self.allocations.values())
        
        available_memory = self.system_resources[ResourceType.MEMORY] - self.reserved_resources[ResourceType.MEMORY]
        allocated_memory = sum(alloc.memory_mb for alloc in self.allocations.values())
        
        available_gpu = self.system_resources[ResourceType.GPU]
        allocated_gpu = sum(alloc.gpu_memory_mb for alloc in self.allocations.values())
        
        return (
            allocated_cpu + requirements.cpu_cores <= available_cpu and
            allocated_memory + requirements.memory_mb <= available_memory and
            allocated_gpu + requirements.gpu_memory_mb <= available_gpu
        )
    
    def allocate_resources(self, task_id: str, requirements: ResourceRequirement, duration_minutes: int = 60) -> Optional[ResourceAllocation]:
        """Allocate resources for a task"""
        if not self.can_allocate(requirements):
            self.logger.warning(f"Insufficient resources for task {task_id}")
            return None
        
        allocation = ResourceAllocation(
            task_id=task_id,
            cpu_cores=requirements.cpu_cores,
            memory_mb=requirements.memory_mb,
            gpu_memory_mb=requirements.gpu_memory_mb,
            allocated_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=duration_minutes),
            gpu_context=requirements.gpu_context,
            remote_execution=requirements.remote_execution
        )
        
        self.allocations[task_id] = allocation
        self.logger.info(f"Allocated resources for task {task_id}: CPU={allocation.cpu_cores} cores, Memory={allocation.memory_mb}MB, GPU={allocation.gpu_memory_mb}MB")
        
        return allocation
    
    def release_resources(self, task_id: str) -> bool:
        """Release allocated resources"""
        if task_id in self.allocations:
            allocation = self.allocations.pop(task_id)
            self.logger.info(f"Released resources for task {task_id}")
            return True
        return False
    
    def get_allocation_status(self, task_id: str) -> Optional[ResourceAllocation]:
        """Get allocation status for a task"""
        return self.allocations.get(task_id)
    
    def cleanup_expired_allocations(self) -> List[str]:
        """Clean up expired allocations"""
        now = datetime.now()
        expired_tasks = []
        
        for task_id, allocation in list(self.allocations.items()):
            if allocation.expires_at and allocation.expires_at < now:
                self.release_resources(task_id)
                expired_tasks.append(task_id)
        
        return expired_tasks
    
    def get_system_load(self) -> Dict[str, float]:
        """Get current system load"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        allocated_cpu = sum(alloc.cpu_cores for alloc in self.allocations.values())
        allocated_memory = sum(alloc.memory_mb for alloc in self.allocations.values())
        
        return {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'allocated_cpu_cores': allocated_cpu,
            'allocated_memory_mb': allocated_memory,
            'total_allocations': len(self.allocations),
            'available_cpu_cores': self.system_resources[ResourceType.CPU] - self.reserved_resources[ResourceType.CPU] - allocated_cpu,
            'available_memory_mb': self.system_resources[ResourceType.MEMORY] - self.reserved_resources[ResourceType.MEMORY] - allocated_memory,
        }

# Global allocator instance
resource_allocator = DynamicResourceAllocator()

# Background cleanup task
async def cleanup_expired_resources():
    """Background task to clean up expired allocations"""
    while True:
        await asyncio.sleep(60)  # Check every minute
        expired = resource_allocator.cleanup_expired_allocations()
        if expired:
            logging.info(f"Cleaned up {len(expired)} expired resource allocations")

# Start cleanup task
def start_resource_monitor():
    """Start the resource monitoring background task"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(cleanup_expired_resources())
    loop.run_forever()

if __name__ == "__main__":
    # Test the allocator
    test_requirements = resource_allocator.calculate_task_requirements(
        "Train a machine learning model for text classification",
        TaskPriority.HIGH
    )
    
    print(f"Calculated requirements: CPU={test_requirements.cpu_cores} cores, Memory={test_requirements.memory_mb}MB, GPU={test_requirements.gpu_memory_mb}MB")
    print(f"Can allocate: {resource_allocator.can_allocate(test_requirements)}")
    
    if resource_allocator.can_allocate(test_requirements):
        allocation = resource_allocator.allocate_resources("test-task", test_requirements)
        print(f"Allocation: {allocation}")
        
        print(f"System load: {resource_allocator.get_system_load()}")
        
        resource_allocator.release_resources("test-task")
        print(f"System load after release: {resource_allocator.get_system_load()}")
