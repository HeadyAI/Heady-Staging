"""
Heady Systems Dependency Graph Algorithm
Trust-First Architecture: Governance (Node 0) -> Storage -> Security -> Visibility -> Automation
"""
from enum import IntEnum
from typing import Dict, List, Set, Optional
from dataclasses import dataclass
import logging

class NodePriority(IntEnum):
    GOVERNANCE = 0      # Configuration is the root dependency
    STORAGE = 1         # Logs must exist before processes run
    SECURITY = 2        # Authentication must exist before Access
    VISIBILITY = 3      # User Interface must exist before Automation
    AUTOMATION = 4      # Workers are the final leaf nodes

@dataclass
class DependencyNode:
    name: str
    priority: NodePriority
    dependencies: Set[str]
    container_name: str
    health_check_endpoint: Optional[str] = None
    critical_path: bool = False
    
class DependencyGraph:
    def __init__(self):
        self.nodes: Dict[str, DependencyNode] = {}
        self.logger = logging.getLogger(__name__)
        
    def add_node(self, node: DependencyNode) -> None:
        """Add a node to the dependency graph"""
        self.nodes[node.name] = node
        
    def get_build_order(self) -> List[str]:
        """
        Calculate build order using topological sort with priority weighting.
        Governance nodes always start, followed by priority-based ordering.
        """
        # Group nodes by priority
        priority_groups = {p: [] for p in NodePriority}
        for node in self.nodes.values():
            priority_groups[node.priority].append(node)
            
        # Sort within each priority by dependency resolution
        build_order = []
        visited = set()
        
        for priority in sorted(NodePriority):
            nodes_in_priority = sorted(priority_groups[priority], key=lambda n: n.name)
            for node in nodes_in_priority:
                if node.name not in visited:
                    self._dfs_visit(node, visited, build_order)
                    
        return build_order
    
    def _dfs_visit(self, node: DependencyNode, visited: Set[str], build_order: List[str]) -> None:
        """Depth-first search for topological sorting"""
        if node.name in visited:
            return
            
        # Visit all dependencies first
        for dep_name in sorted(node.dependencies):
            if dep_name in self.nodes and dep_name not in visited:
                self._dfs_visit(self.nodes[dep_name], visited, build_order)
                
        visited.add(node.name)
        build_order.append(node.name)
        
    def validate_dependencies(self) -> List[str]:
        """Validate that all dependencies exist and detect circular dependencies"""
        errors = []
        
        for node_name, node in self.nodes.items():
            for dep in node.dependencies:
                if dep not in self.nodes:
                    errors.append(f"Node '{node_name}' depends on non-existent node '{dep}'")
                    
        # Check for circular dependencies
        visited = set()
        rec_stack = set()
        
        for node_name in self.nodes:
            if node_name not in visited:
                if self._has_cycle(node_name, visited, rec_stack):
                    errors.append(f"Circular dependency detected involving node '{node_name}'")
                    
        return errors
    
    def _has_cycle(self, node_name: str, visited: Set[str], rec_stack: Set[str]) -> bool:
        """Detect circular dependencies using DFS"""
        visited.add(node_name)
        rec_stack.add(node_name)
        
        node = self.nodes.get(node_name)
        if node:
            for dep in sorted(node.dependencies):
                if dep in self.nodes:
                    if dep not in visited:
                        if self._has_cycle(dep, visited, rec_stack):
                            return True
                    elif dep in rec_stack:
                        return True
                        
        rec_stack.remove(node_name)
        return False
        
    def get_critical_path(self) -> List[str]:
        """Get the critical path for system startup (Governance -> Storage -> Security -> Visibility -> Automation)"""
        critical_nodes = [node for node in self.nodes.values() if node.critical_path]
        critical_names = [node.name for node in critical_nodes]
        
        # Return in priority order
        return [name for name in self.get_build_order() if name in critical_names]

def create_heady_dependency_graph() -> DependencyGraph:
    """Create the standard Heady Systems dependency graph"""
    graph = DependencyGraph()
    
    # Node 0: Governance (Configuration)
    graph.add_node(DependencyNode(
        name="governance",
        priority=NodePriority.GOVERNANCE,
        dependencies=set(),
        container_name="heady_governance",
        health_check_endpoint="/health/config",
        critical_path=True
    ))
    
    # Node 1: Storage (Logs must exist before processes run)
    graph.add_node(DependencyNode(
        name="storage",
        priority=NodePriority.STORAGE,
        dependencies={"governance"},
        container_name="heady_storage",
        health_check_endpoint="/health/storage",
        critical_path=True
    ))
    
    # Node 2: Security (Authentication must exist before Access)
    graph.add_node(DependencyNode(
        name="security",
        priority=NodePriority.SECURITY,
        dependencies={"governance", "storage"},
        container_name="heady_security",
        health_check_endpoint="/health/auth",
        critical_path=True
    ))
    
    # Node 3: Visibility (User Interface must exist before Automation)
    graph.add_node(DependencyNode(
        name="visibility",
        priority=NodePriority.VISIBILITY,
        dependencies={"governance", "storage", "security"},
        container_name="heady_visibility",
        health_check_endpoint="/health/ui",
        critical_path=True
    ))
    
    # Node 4: Automation (Workers are the final leaf nodes)
    graph.add_node(DependencyNode(
        name="automation",
        priority=NodePriority.AUTOMATION,
        dependencies={"governance", "storage", "security", "visibility"},
        container_name="heady_automation",
        health_check_endpoint="/health/workers",
        critical_path=True
    ))
    
    # Infrastructure services
    graph.add_node(DependencyNode(
        name="database",
        priority=NodePriority.STORAGE,
        dependencies={"governance"},
        container_name="heady_db",
        health_check_endpoint=None,
        critical_path=False
    ))
    
    graph.add_node(DependencyNode(
        name="tunnel",
        priority=NodePriority.SECURITY,
        dependencies={"governance", "security"},
        container_name="heady_tunnel",
        health_check_endpoint=None,
        critical_path=False
    ))
    
    return graph

if __name__ == "__main__":
    # Test the dependency graph
    graph = create_heady_dependency_graph()
    
    print("=== Heady Systems Dependency Graph ===")
    print("Build Order:", graph.get_build_order())
    print("Critical Path:", graph.get_critical_path())
    
    errors = graph.validate_dependencies()
    if errors:
        print("Validation Errors:", errors)
    else:
        print("✅ Dependency graph is valid")
