"""
Heady Corporate Domain Separation
HeadySystems Inc (The Engine): Deterministic execution of logic and data processing
HeadyConnection Inc (The Bridge): Human experience, transparency, and trust verification
"""
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional
import logging

class CorporateDomain(Enum):
    HEADY_SYSTEMS = "heady_systems"      # The Engine
    HEADY_CONNECTION = "heady_connection"  # The Bridge

class ServiceCategory(Enum):
    # HeadySystems Services (The Engine)
    GATEWAY = "gateway"           # HeadyGate: Reverse Proxy & SSL Termination
    ORCHESTRATOR = "orchestrator" # Orchestrator: API Gateway & Task Routing
    SENTINEL = "sentinel"         # Sentinel: Real-time Risk Analysis
    ARCHITECT = "architect"       # Architect: Generative AI Worker
    ARCHIVIST = "archivist"       # Archivist: Data Persistence & Backup
    
    # HeadyConnection Services (The Bridge)
    LENS = "lens"                 # HeadyLens: Real-time Telemetry Visualizer
    ADMIN_UI = "admin_ui"         # Admin UI: Control Plane for HITL decisions
    TRUST_INDICATORS = "trust_indicators"  # Trust Indicators: Visual badges for QA/Security

@dataclass
class CorporateService:
    name: str
    domain: CorporateDomain
    category: ServiceCategory
    container_name: str
    description: str
    responsibilities: List[str]
    dependencies: List[str]
    ports: Dict[str, int]
    health_check: Optional[str] = None
    critical_path: bool = False

class CorporateDomainRegistry:
    def __init__(self):
        self.services: Dict[str, CorporateService] = {}
        self.logger = logging.getLogger(__name__)
        self._initialize_services()
        
    def _initialize_services(self):
        """Initialize all corporate services with domain separation"""
        
        # === HEADY SYSTEMS INC (The Engine) ===
        
        self.services["headygate"] = CorporateService(
            name="headygate",
            domain=CorporateDomain.HEADY_SYSTEMS,
            category=ServiceCategory.GATEWAY,
            container_name="heady_gateway",
            description="Reverse Proxy & SSL Termination",
            responsibilities=[
                "SSL/TLS termination",
                "Request routing and load balancing",
                "Rate limiting and DDoS protection",
                "Request/response logging"
            ],
            dependencies=["governance"],
            ports={"https": 443, "http": 80},
            health_check="/health/gateway",
            critical_path=True
        )
        
        self.services["orchestrator"] = CorporateService(
            name="orchestrator",
            domain=CorporateDomain.HEADY_SYSTEMS,
            category=ServiceCategory.ORCHESTRATOR,
            container_name="heady_orchestrator",
            description="API Gateway & Task Routing",
            responsibilities=[
                "API request routing",
                "Task queue management",
                "Service discovery",
                "Circuit breaker patterns"
            ],
            dependencies=["headygate", "security", "storage"],
            ports={"api": 8080, "admin": 8081},
            health_check="/health/orchestrator",
            critical_path=True
        )
        
        self.services["sentinel"] = CorporateService(
            name="sentinel",
            domain=CorporateDomain.HEADY_SYSTEMS,
            category=ServiceCategory.SENTINEL,
            container_name="heady_sentinel",
            description="Real-time Risk Analysis",
            responsibilities=[
                "Real-time threat detection",
                "Anomaly analysis",
                "Risk scoring",
                "Security event correlation"
            ],
            dependencies=["storage", "security"],
            ports={"analysis": 9090},
            health_check="/health/sentinel",
            critical_path=False
        )
        
        self.services["architect"] = CorporateService(
            name="architect",
            domain=CorporateDomain.HEADY_SYSTEMS,
            category=ServiceCategory.ARCHITECT,
            container_name="heady_architect",
            description="Generative AI Worker",
            responsibilities=[
                "Code generation and analysis",
                "Architecture design",
                "Pattern recognition",
                "AI model orchestration"
            ],
            dependencies=["orchestrator", "storage"],
            ports={"ai": 7070},
            health_check="/health/architect",
            critical_path=False
        )
        
        self.services["archivist"] = CorporateService(
            name="archivist",
            domain=CorporateDomain.HEADY_SYSTEMS,
            category=ServiceCategory.ARCHIVIST,
            container_name="heady_archivist",
            description="Data Persistence & Backup",
            responsibilities=[
                "Data backup and recovery",
                "Long-term storage management",
                "Data retention policies",
                "Archive integrity verification"
            ],
            dependencies=["storage"],
            ports={"backup": 6060},
            health_check="/health/archivist",
            critical_path=False
        )
        
        # === HEADY CONNECTION INC (The Bridge) ===
        
        self.services["headylens"] = CorporateService(
            name="headylens",
            domain=CorporateDomain.HEADY_CONNECTION,
            category=ServiceCategory.LENS,
            container_name="heady_lens",
            description="Real-time Telemetry Visualizer",
            responsibilities=[
                "Real-time system telemetry",
                "Performance metrics visualization",
                "Stream processing and display",
                "Historical data analysis"
            ],
            dependencies=["orchestrator", "storage"],
            ports={"telemetry": 3000, "websocket": 3001},
            health_check="/health/lens",
            critical_path=True
        )
        
        self.services["admin_ui"] = CorporateService(
            name="admin_ui",
            domain=CorporateDomain.HEADY_CONNECTION,
            category=ServiceCategory.ADMIN_UI,
            container_name="heady_admin",
            description="Control Plane for HITL decisions",
            responsibilities=[
                "Human-in-the-loop decision interface",
                "System configuration management",
                "Manual override controls",
                "Audit trail review"
            ],
            dependencies=["headylens", "security", "orchestrator"],
            ports={"ui": 3002, "api": 3003},
            health_check="/health/admin",
            critical_path=True
        )
        
        self.services["trust_indicators"] = CorporateService(
            name="trust_indicators",
            domain=CorporateDomain.HEADY_CONNECTION,
            category=ServiceCategory.TRUST_INDICATORS,
            container_name="heady_trust",
            description="Visual badges verifying QA checks and Security scans",
            responsibilities=[
                "QA status visualization",
                "Security scan results display",
                "Compliance badge management",
                "Trust score calculation"
            ],
            dependencies=["sentinel", "admin_ui"],
            ports={"badges": 3004, "api": 3005},
            health_check="/health/trust",
            critical_path=False
        )
        
    def get_services_by_domain(self, domain: CorporateDomain) -> List[CorporateService]:
        """Get all services belonging to a specific corporate domain"""
        return [service for service in self.services.values() if service.domain == domain]
        
    def get_critical_services(self) -> List[CorporateService]:
        """Get all services on the critical path"""
        return [service for service in self.services.values() if service.critical_path]
        
    def get_service_startup_order(self) -> List[str]:
        """Get the optimal startup order for all services"""
        # Start with HeadySystems (The Engine), then HeadyConnection (The Bridge)
        systems_services = self.get_services_by_domain(CorporateDomain.HEADY_SYSTEMS)
        connection_services = self.get_services_by_domain(CorporateDomain.HEADY_CONNECTION)
        
        # Sort by dependencies and critical path
        startup_order = []
        
        # Critical path services first
        critical_systems = [s for s in systems_services if s.critical_path]
        critical_connections = [s for s in connection_services if s.critical_path]
        
        # Non-critical services second
        non_critical_systems = [s for s in systems_services if not s.critical_path]
        non_critical_connections = [s for s in connection_services if not s.critical_path]
        
        startup_order.extend([s.name for s in critical_systems])
        startup_order.extend([s.name for s in critical_connections])
        startup_order.extend([s.name for s in non_critical_systems])
        startup_order.extend([s.name for s in non_critical_connections])
        
        return startup_order
        
    def validate_domain_separation(self) -> List[str]:
        """Validate that domain separation rules are followed"""
        errors = []
        
        # Check that HeadyConnection services don't depend on each other in circular ways
        connection_services = self.get_services_by_domain(CorporateDomain.HEADY_CONNECTION)
        connection_names = {s.name for s in connection_services}
        
        for service in connection_services:
            # Connection services should primarily depend on Systems services
            internal_deps = [dep for dep in service.dependencies if dep in connection_names]
            if len(internal_deps) > 2:  # Allow some internal dependencies but limit them
                errors.append(f"Connection service '{service.name}' has too many internal dependencies: {internal_deps}")
                
        return errors
        
    def get_domain_ports(self, domain: CorporateDomain) -> Dict[str, int]:
        """Get all ports used by a domain"""
        ports = {}
        for service in self.get_services_by_domain(domain):
            ports.update(service.ports)
        return ports

# Global registry instance
registry = CorporateDomainRegistry()

if __name__ == "__main__":
    print("=== Heady Corporate Domain Separation ===")
    print(f"HeadySystems Services: {[s.name for s in registry.get_services_by_domain(CorporateDomain.HEADY_SYSTEMS)]}")
    print(f"HeadyConnection Services: {[s.name for s in registry.get_services_by_domain(CorporateDomain.HEADY_CONNECTION)]}")
    print(f"Critical Path: {[s.name for s in registry.get_critical_services()]}")
    print(f"Startup Order: {registry.get_service_startup_order()}")
    
    errors = registry.validate_domain_separation()
    if errors:
        print("Domain Separation Errors:", errors)
    else:
        print("✅ Domain separation is valid")
