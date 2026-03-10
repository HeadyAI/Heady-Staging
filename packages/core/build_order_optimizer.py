"""
Heady Systems Build Order Optimizer
Implements topological sort for dependency-based build ordering across multiple scenarios:
- Scenario A: Blockchain/DLT Network
- Scenario B: Microservices Mesh  
- Scenario C: Edge/IoT System

Based on Universal System Configuration Strategy for HeadySystems.
"""
from collections import defaultdict, deque
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)


class BuildScenario(Enum):
    BLOCKCHAIN_DLT = "blockchain_dlt"
    MICROSERVICES_MESH = "microservices_mesh"
    EDGE_IOT = "edge_iot"
    HEADY_DEFAULT = "heady_default"


@dataclass
class BuildNode:
    """Represents a buildable component in the dependency graph"""
    name: str
    tier: int
    dependencies: Set[str] = field(default_factory=set)
    container: Optional[str] = None
    health_endpoint: Optional[str] = None
    critical_path: bool = False
    domain: str = "HeadySystems"
    config_required: List[str] = field(default_factory=list)
    maps_to: List[str] = field(default_factory=list)


class BuildOrderOptimizer:
    """
    Calculates optimal build order using Kahn's algorithm (topological sort).
    Supports multiple build scenarios and parallel build detection.
    """
    
    def __init__(self, config_path: Optional[Path] = None):
        self.nodes: Dict[str, BuildNode] = {}
        self.config_path = config_path or Path(__file__).parent.parent / "config" / "build_dependencies.json"
        self._load_config()
        
    def _load_config(self) -> None:
        """Load build dependencies configuration"""
        if self.config_path.exists():
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            self._build_default_graph()
        else:
            logger.warning(f"Config not found at {self.config_path}, using defaults")
            self.config = {}
            self._build_fallback_graph()
            
    def _build_default_graph(self) -> None:
        """Build graph from heady_project_graph in config"""
        if "heady_project_graph" not in self.config:
            self._build_fallback_graph()
            return
            
        graph = self.config["heady_project_graph"]["nodes"]
        for name, node_config in graph.items():
            self.nodes[name] = BuildNode(
                name=name,
                tier=node_config.get("tier", 0),
                dependencies=set(node_config.get("dependencies", [])),
                container=node_config.get("container"),
                health_endpoint=node_config.get("health_endpoint"),
                critical_path=node_config.get("critical_path", False),
                domain=node_config.get("domain", "HeadySystems")
            )
            
    def _build_fallback_graph(self) -> None:
        """Build minimal fallback dependency graph"""
        fallback = {
            "heady-governance": BuildNode("heady-governance", 0, set(), "heady_governance", "/health/config", True),
            "heady-storage": BuildNode("heady-storage", 1, {"heady-governance"}, "heady_storage", "/health/storage", True),
            "heady-security": BuildNode("heady-security", 2, {"heady-governance", "heady-storage"}, "heady_security", "/health/auth", True),
            "heady-orchestrator": BuildNode("heady-orchestrator", 3, {"heady-security", "heady-storage"}, "heady_orchestrator", "/health/orchestrator", True),
        }
        self.nodes = fallback
        
    def get_build_order(self, scenario: BuildScenario = BuildScenario.HEADY_DEFAULT) -> List[str]:
        """
        Calculate optimal build order using Kahn's algorithm (topological sort).
        Returns list of node names in build order.
        
        Algorithm:
        1. Calculate in-degrees (number of dependencies)
        2. Start with nodes that have 0 dependencies
        3. Process nodes, decrementing in-degrees of dependents
        4. Repeat until all nodes are processed
        """
        if scenario != BuildScenario.HEADY_DEFAULT and "scenarios" in self.config:
            return self._get_scenario_build_order(scenario)
            
        return self._topological_sort(self.nodes)
        
    def _topological_sort(self, nodes: Dict[str, BuildNode]) -> List[str]:
        """
        Kahn's algorithm for topological sorting.
        Based on the user-provided algorithm optimized for HeadySystems.
        """
        in_degree = {name: 0 for name in nodes}
        adj = defaultdict(list)
        
        for name, node in nodes.items():
            for dep in node.dependencies:
                if dep in nodes:
                    adj[dep].append(name)
                    in_degree[name] += 1
                elif dep not in in_degree:
                    in_degree[dep] = 0
                    
        queue = deque([name for name in in_degree if in_degree[name] == 0])
        sorted_order = []
        
        while queue:
            current = queue.popleft()
            if current in nodes:
                sorted_order.append(current)
            for dependent in adj[current]:
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)
                    
        if len(sorted_order) != len(nodes):
            cycle_nodes = [n for n in nodes if n not in sorted_order]
            logger.error(f"Circular dependency detected: {cycle_nodes}")
            raise ValueError(f"Circular dependency detected involving: {cycle_nodes}")
            
        return sorted_order
        
    def _get_scenario_build_order(self, scenario: BuildScenario) -> List[str]:
        """Get build order for a specific scenario from config"""
        scenario_config = self.config["scenarios"].get(scenario.value, {})
        if not scenario_config:
            logger.warning(f"Scenario {scenario.value} not found, using default")
            return self._topological_sort(self.nodes)
            
        build_order = scenario_config.get("build_order", [])
        return [step["name"] for step in sorted(build_order, key=lambda x: x["tier"])]
        
    def get_parallel_build_groups(self) -> List[List[str]]:
        """
        Identify groups of nodes that can be built in parallel.
        Nodes in the same tier with satisfied dependencies can build together.
        """
        tiers: Dict[int, List[str]] = defaultdict(list)
        for name, node in self.nodes.items():
            tiers[node.tier].append(name)
            
        parallel_groups = []
        built = set()
        
        for tier in sorted(tiers.keys()):
            tier_nodes = tiers[tier]
            buildable = []
            for name in tier_nodes:
                node = self.nodes[name]
                if node.dependencies.issubset(built):
                    buildable.append(name)
            if buildable:
                parallel_groups.append(buildable)
                built.update(buildable)
                
        return parallel_groups
        
    def get_critical_path(self) -> List[str]:
        """Get nodes marked as critical path in build order"""
        build_order = self.get_build_order()
        return [name for name in build_order if self.nodes.get(name, BuildNode(name, 0)).critical_path]
        
    def validate_config_requirements(self, scenario: BuildScenario) -> Dict[str, List[str]]:
        """
        Check which config files are required before build can start.
        Returns dict of {node_name: [required_configs]}
        """
        requirements = {}
        
        if scenario == BuildScenario.HEADY_DEFAULT:
            requirements["heady-orchestrator"] = ["hive_config.json"]
            requirements["heady-security"] = ["secrets_registry.json"]
        elif "scenarios" in self.config:
            scenario_config = self.config["scenarios"].get(scenario.value, {})
            for step in scenario_config.get("build_order", []):
                if "config_required" in step:
                    requirements[step["name"]] = step["config_required"]
                    
        return requirements
        
    def get_health_check_order(self) -> List[Tuple[str, str]]:
        """
        Get ordered list of (container, health_endpoint) for startup verification.
        Uses wait-for-it pattern from universal config strategy.
        """
        build_order = self.get_build_order()
        health_checks = []
        
        for name in build_order:
            node = self.nodes.get(name)
            if node and node.health_endpoint:
                health_checks.append((node.container or name, node.health_endpoint))
                
        return health_checks
        
    def get_multi_stage_docker_optimization(self) -> Dict[str, Any]:
        """
        Generate multi-stage Docker build recommendations.
        Based on universal config strategy for 60%+ build time reduction.
        """
        build_order = self.get_build_order()
        
        base_stages = []
        app_stages = []
        
        for name in build_order:
            node = self.nodes.get(name)
            if not node:
                continue
                
            if node.tier <= 1:
                base_stages.append({
                    "name": name,
                    "stage": "base",
                    "recommendation": "Build and cache as base layer"
                })
            else:
                app_stages.append({
                    "name": name,
                    "stage": "app",
                    "copy_from": base_stages[0]["name"] if base_stages else None,
                    "recommendation": "Copy artifacts from base stage"
                })
                
        return {
            "base_stages": base_stages,
            "app_stages": app_stages,
            "optimization_note": "Copy built artifacts from heady-common build stage rather than re-installing dependencies",
            "expected_improvement": "60%+ build time reduction"
        }
        
    def generate_build_script(self, scenario: BuildScenario = BuildScenario.HEADY_DEFAULT) -> str:
        """Generate a shell script for the optimal build order"""
        build_order = self.get_build_order(scenario)
        health_checks = self.get_health_check_order()
        
        build_order_str = " -> ".join(build_order)
        script_lines = [
            "#!/bin/bash",
            "# Auto-generated Heady Systems Build Script",
            f"# Scenario: {scenario.value}",
            "# Uses topological sort for optimal dependency ordering",
            "",
            "set -e",
            "",
            "echo '=== Heady Systems Build Order ==='",
            f"echo 'Build Order: {build_order_str}'",
            "",
        ]
        
        for name in build_order:
            node = self.nodes.get(name)
            if node and node.container:
                script_lines.extend([
                    f"echo 'Building {name}...'",
                    f"docker-compose build {node.container.replace('heady_', '')}",
                    ""
                ])
                
        script_lines.extend([
            "echo '=== Starting Services ==='",
            ""
        ])
        
        for container, endpoint in health_checks:
            script_lines.extend([
                f"echo 'Starting {container}...'",
                f"docker-compose up -d {container.replace('heady_', '')}",
                f"# Wait for health check: {endpoint}",
                f"./scripts/wait-for-it.sh localhost:8000 --timeout=60 -- echo '{container} is ready'",
                ""
            ])
            
        return "\n".join(script_lines)


def get_build_order(project_graph: Dict[str, List[str]]) -> List[str]:
    """
    Standalone function matching the user's provided algorithm.
    Calculates build order from a simple dependency dictionary.
    
    Args:
        project_graph: Dict of {'repo-name': ['dependency-1', 'dependency-2']}
        
    Returns:
        List of repo names in optimal build order
    """
    in_degree = {u: 0 for u in project_graph}
    adj = defaultdict(list)
    
    for u, deps in project_graph.items():
        for v in deps:
            adj[v].append(u)
            in_degree[u] += 1
            if v not in in_degree:
                in_degree[v] = 0

    queue = deque([u for u in in_degree if in_degree[u] == 0])
    sorted_order = []

    while queue:
        u = queue.popleft()
        sorted_order.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    return sorted_order


if __name__ == "__main__":
    print("=== Heady Systems Build Order Optimizer ===\n")
    
    optimizer = BuildOrderOptimizer()
    
    print("Default Build Order:")
    print(" -> ".join(optimizer.get_build_order()))
    print()
    
    print("Critical Path:")
    print(" -> ".join(optimizer.get_critical_path()))
    print()
    
    print("Parallel Build Groups:")
    for i, group in enumerate(optimizer.get_parallel_build_groups()):
        print(f"  Stage {i + 1}: {', '.join(group)}")
    print()
    
    print("Health Check Order:")
    for container, endpoint in optimizer.get_health_check_order():
        print(f"  {container}: {endpoint}")
    print()
    
    print("Multi-Stage Docker Optimization:")
    opt = optimizer.get_multi_stage_docker_optimization()
    print(f"  Expected improvement: {opt['expected_improvement']}")
    print()
    
    print("=== Standalone Algorithm Test ===")
    test_graph = {
        'heady-gateway': ['heady-core', 'heady-auth'],
        'heady-auth': ['heady-core', 'heady-contracts'],
        'heady-node': ['heady-core', 'heady-contracts'],
        'heady-core': ['heady-contracts'],
        'heady-contracts': [],
    }
    print("Test Graph Build Order:")
    print(" -> ".join(get_build_order(test_graph)))
