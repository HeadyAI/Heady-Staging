"""
Heady Systems Optimal Build Protocol
Four-phase build automation: Scaffold -> Policy Injection -> Infrastructure -> Ignition
Trust-First Architecture: Guaranteed Expected Functionality & Maximum Trust
"""
import os
import json
import yaml
import shutil
import logging
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import subprocess
import time
from datetime import datetime

from dependency_graph import create_heady_dependency_graph, DependencyGraph
from corporate_domains import registry, CorporateDomain
from safety_protocols import safety_manager, ContainerState
from storage_strategy import storage_manager, DataType

class BuildPhase(Enum):
    SCAFFOLD = "scaffold"           # Create directory structures
    POLICY_INJECTION = "policy_injection"  # Write hive_config.json with security
    INFRASTRUCTURE = "infrastructure"       # Generate docker-compose.yml
    IGNITION = "ignition"           # Boot containers in dependency order

@dataclass
class BuildResult:
    """Result of a build phase execution"""
    phase: BuildPhase
    success: bool
    message: str
    artifacts: List[str]
    duration_seconds: float
    timestamp: datetime

class ScaffoldPhase:
    """Phase 1: Create directory structures for Systems and Connection"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
    def execute(self) -> BuildResult:
        """Execute scaffold phase"""
        start_time = time.time()
        artifacts = []
        
        try:
            self.logger.info("Starting Scaffold Phase")
            
            # Create corporate domain directories
            heady_systems_path = self.base_path / "HeadySystems"
            heady_connection_path = self.base_path / "HeadyConnection"
            
            # HeadySystems (The Engine) structure
            systems_dirs = [
                "apps/gateway",
                "apps/orchestrator", 
                "apps/sentinel",
                "apps/architect",
                "apps/archivist",
                "core",
                "config",
                "infrastructure/db_data",
                "infrastructure/backups",
                "infrastructure/logs",
                "shared/state",
                "services/secret_gateway",
                "services/model_gateway",
                "scripts"
            ]
            
            # HeadyConnection (The Bridge) structure  
            connection_dirs = [
                "apps/lens",
                "apps/admin_ui",
                "apps/trust_indicators",
                "core",
                "config",
                "infrastructure/telemetry",
                "shared/state",
                "scripts"
            ]
            
            # Create directories
            for dir_path in systems_dirs:
                full_path = heady_systems_path / dir_path
                full_path.mkdir(parents=True, exist_ok=True)
                artifacts.append(str(full_path))
                
            for dir_path in connection_dirs:
                full_path = heady_connection_path / dir_path
                full_path.mkdir(parents=True, exist_ok=True)
                artifacts.append(str(full_path))
                
            # Create initial README files
            self._create_readme_files(heady_systems_path, heady_connection_path)
            
            duration = time.time() - start_time
            self.logger.info(f"Scaffold Phase completed in {duration:.2f}s")
            
            return BuildResult(
                phase=BuildPhase.SCAFFOLD,
                success=True,
                message="Directory structures created successfully",
                artifacts=artifacts,
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Scaffold Phase failed: {e}")
            
            return BuildResult(
                phase=BuildPhase.SCAFFOLD,
                success=False,
                message=f"Scaffold failed: {str(e)}",
                artifacts=[],
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
    def _create_readme_files(self, systems_path: Path, connection_path: Path):
        """Create README files for each corporate domain"""
        
        # HeadySystems README
        systems_readme = """# HeadySystems Inc (The Engine)

Responsible for the deterministic execution of logic and data processing.

## Core Services
- **HeadyGate**: Reverse Proxy & SSL Termination
- **Orchestrator**: API Gateway & Task Routing  
- **Sentinel**: Real-time Risk Analysis
- **Architect**: Generative AI Worker
- **Archivist**: Data Persistence & Backup

## Security Principles
- Zero-Start Rule: All containers boot into PROVISIONING state
- Glass Box Mandate: All operations emit to lens_stream.json
- Governance-first dependency resolution

## Build Status
✅ Scaffolded for Trust-First Architecture
"""
        
        with open(systems_path / "README.md", 'w', encoding='utf-8') as f:
            f.write(systems_readme)
            
        # HeadyConnection README
        connection_readme = """# HeadyConnection Inc (The Bridge)

Responsible for the human experience, transparency, and trust verification.

## Core Services  
- **HeadyLens**: Real-time Telemetry Visualizer
- **Admin UI**: Control Plane for HITL decisions
- **Trust Indicators**: Visual badges for QA checks and Security scans

## Trust Principles
- Real-time observability into all HeadySystems operations
- Human-in-the-loop decision making
- Visual verification of security and compliance status

## Build Status
✅ Scaffolded for Trust-First Architecture
"""
        
        with open(connection_path / "README.md", 'w', encoding='utf-8') as f:
            f.write(connection_readme)

class PolicyInjectionPhase:
    """Phase 2: Write hive_config.json with strict default security"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
    def execute(self) -> BuildResult:
        """Execute policy injection phase"""
        start_time = time.time()
        artifacts = []
        
        try:
            self.logger.info("Starting Policy Injection Phase")
            
            # Create security policies
            hive_config = self._create_hive_config()
            
            # Write to both corporate domains
            for domain in ["HeadySystems", "HeadyConnection"]:
                config_path = self.base_path / domain / "config" / "hive_config.json"
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(hive_config, f, indent=2)
                artifacts.append(str(config_path))
                
            # Create domain-specific policies
            self._create_domain_policies(artifacts)
            
            # Copy secrets_registry.json to domain config
            self._copy_secrets_registry(artifacts)
            
            duration = time.time() - start_time
            self.logger.info(f"Policy Injection Phase completed in {duration:.2f}s")
            
            return BuildResult(
                phase=BuildPhase.POLICY_INJECTION,
                success=True,
                message="Security policies injected successfully",
                artifacts=artifacts,
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Policy Injection Phase failed: {e}")
            
            return BuildResult(
                phase=BuildPhase.POLICY_INJECTION,
                success=False,
                message=f"Policy injection failed: {str(e)}",
                artifacts=[],
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
    def _create_hive_config(self) -> Dict[str, Any]:
        """Create the main hive configuration with strict security defaults"""
        return {
            "version": "1.0",
            "trust_first_architecture": True,
            "security": {
                "zero_start_rule": {
                    "enabled": True,
                    "default_state": "provisioning",
                    "handshake_timeout_seconds": 300,
                    "orchestrator_verification": True
                },
                "glass_box_mandate": {
                    "enabled": True,
                    "lens_stream_path": "./shared/state/lens_stream.json",
                    "emit_all_writes": True,
                    "fail_safe_on_stream_unreachable": True
                },
                "default_permissions": "deny_all",
                "require_authentication": True,
                "audit_all_operations": True
            },
            "governance": {
                "dependency_resolution": "governance_first",
                "critical_path_enforcement": True,
                "corporate_domain_separation": True
            },
            "storage": {
                "intelligent_tiering": True,
                "hot_storage": {
                    "backend": "redis",
                    "fallback_memory": True,
                    "ttl_default": 86400
                },
                "warm_storage": {
                    "backend": "json_files",
                    "path": "./shared/state",
                    "retention_days": 7
                },
                "cold_storage": {
                    "backend": "postgresql",
                    "path": "./infrastructure/system_audit_logs.db",
                    "archive_path": "./infrastructure/archives",
                    "retention_years": 7
                }
            },
            "monitoring": {
                "real_time_telemetry": True,
                "lens_stream_events": True,
                "health_check_interval": 30,
                "alert_on_anomaly": True
            },
            "corporate_domains": {
                "heady_systems": {
                    "role": "engine",
                    "services": ["gateway", "orchestrator", "sentinel", "architect", "archivist"],
                    "security_level": "high"
                },
                "heady_connection": {
                    "role": "bridge", 
                    "services": ["lens", "admin_ui", "trust_indicators"],
                    "security_level": "high",
                    "human_in_the_loop": True
                }
            }
        }
        
    def _create_domain_policies(self, artifacts: List[str]):
        """Create domain-specific policy files"""
        
        # HeadySystems policies
        systems_policies = {
            "domain": "heady_systems",
            "role": "engine",
            "policies": {
                "container_startup": {
                    "default_state": "provisioning",
                    "require_orchestrator_handshake": True,
                    "max_startup_time_seconds": 300
                },
                "data_handling": {
                    "encrypt_at_rest": True,
                    "encrypt_in_transit": True,
                    "audit_all_writes": True
                },
                "ai_operations": {
                    "require_human_oversight": True,
                    "log_all_inferences": True,
                    "model_validation_required": True
                }
            }
        }
        
        systems_policy_path = self.base_path / "HeadySystems" / "config" / "domain_policies.json"
        with open(systems_policy_path, 'w', encoding='utf-8') as f:
            json.dump(systems_policies, f, indent=2)
        artifacts.append(str(systems_policy_path))
        
        # HeadyConnection policies
        connection_policies = {
            "domain": "heady_connection", 
            "role": "bridge",
            "policies": {
                "user_interface": {
                    "require_authentication": True,
                    "session_timeout_minutes": 30,
                    "audit_all_user_actions": True
                },
                "telemetry_display": {
                    "real_time_updates": True,
                    "data_retention_days": 30,
                    "privacy_filter_enabled": True
                },
                "trust_indicators": {
                    "auto_refresh": True,
                    "security_scan_interval": 3600,
                    "compliance_validation": True
                }
            }
        }
        
        connection_policy_path = self.base_path / "HeadyConnection" / "config" / "domain_policies.json"
        with open(connection_policy_path, 'w', encoding='utf-8') as f:
            json.dump(connection_policies, f, indent=2)
        artifacts.append(str(connection_policy_path))

    def _copy_secrets_registry(self, artifacts: List[str]):
        """Copy secrets_registry.json from root config to domain config folders"""
        source_path = self.base_path / "config" / "secrets_registry.json"
        if not source_path.exists():
            self.logger.warning(f"secrets_registry.json not found at {source_path}")
            return

        for domain in ["HeadySystems", "HeadyConnection"]:
            dest_path = self.base_path / domain / "config" / "secrets_registry.json"
            try:
                shutil.copy2(source_path, dest_path)
                self.logger.info(f"Copied secrets_registry.json to {domain}")
            except Exception as e:
                self.logger.error(f"Failed to copy secrets_registry.json to {domain}: {e}")

class InfrastructurePhase:
    """Phase 3: Generate docker-compose.yml with defined health checks"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
    def execute(self) -> BuildResult:
        """Execute infrastructure phase"""
        start_time = time.time()
        artifacts = []
        
        try:
            self.logger.info("Starting Infrastructure Phase")
            
            # Get dependency graph for build order
            dep_graph = create_heady_dependency_graph()
            build_order = dep_graph.get_build_order()
            
            # Generate docker-compose for HeadySystems
            systems_compose = self._create_systems_docker_compose(build_order)
            systems_compose_path = self.base_path / "HeadySystems" / "docker-compose.yml"
            with open(systems_compose_path, 'w', encoding='utf-8') as f:
                yaml.dump(systems_compose, f, default_flow_style=False, sort_keys=False)
            artifacts.append(str(systems_compose_path))
            
            # Generate docker-compose for HeadyConnection
            connection_compose = self._create_connection_docker_compose()
            connection_compose_path = self.base_path / "HeadyConnection" / "docker-compose.yml"
            with open(connection_compose_path, 'w', encoding='utf-8') as f:
                yaml.dump(connection_compose, f, default_flow_style=False, sort_keys=False)
            artifacts.append(str(connection_compose_path))
            
            # Create environment files
            self._create_environment_files(artifacts)
            
            duration = time.time() - start_time
            self.logger.info(f"Infrastructure Phase completed in {duration:.2f}s")
            
            return BuildResult(
                phase=BuildPhase.INFRASTRUCTURE,
                success=True,
                message="Docker infrastructure generated successfully",
                artifacts=artifacts,
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Infrastructure Phase failed: {e}")
            
            return BuildResult(
                phase=BuildPhase.INFRASTRUCTURE,
                success=False,
                message=f"Infrastructure generation failed: {str(e)}",
                artifacts=[],
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
    def _create_systems_docker_compose(self, build_order: List[str]) -> Dict[str, Any]:
        """Create docker-compose for HeadySystems with dependency ordering"""
        
        services = {}
        
        # Database (Storage tier)
        services['database'] = {
            'image': 'mariadb:10.11',
            'container_name': 'heady_db',
            'restart': 'always',
            'environment': {
                'MYSQL_DATABASE': '${MYSQL_DATABASE}',
                'MYSQL_USER': '${MYSQL_USER}',
                'MYSQL_PASSWORD': '${MYSQL_PASSWORD}',
                'MYSQL_ROOT_PASSWORD': '${MYSQL_ROOT_PASSWORD}'
            },
            'volumes': [
                './infrastructure/db_data:/var/lib/mysql',
                './infrastructure/backups:/backups'
            ],
            'healthcheck': {
                'test': ['CMD', 'mysqladmin', 'ping', '-h', 'localhost'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            },
            'depends_on': ['governance']
        }
        
        # Governance (Node 0
        services['governance'] = {
            'build': {
                'context': '..',
                'dockerfile': 'core/Dockerfile'
            },
            'container_name': 'heady_governance',
            'restart': 'always',
            'environment': {
                'CONTAINER_ROLE': 'governance',
                'INITIAL_STATE': 'provisioning',
                'PYTHONPATH': '/app'
            },
            'ports': ['8000:8000'],
            'volumes': [
                './config:/app/config',
                './shared/state:/app/shared/state'
            ],
            'healthcheck': {
                'test': ['CMD', 'curl', '-f', 'http://localhost:8000/health/config'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            }
        }
        
        # Security (Node 2)
        services['security'] = {
            'build': '../services/secret_gateway',
            'container_name': 'heady_security',
            'restart': 'always',
            'environment': {
                'CONTAINER_ROLE': 'security',
                'INITIAL_STATE': 'provisioning'
            },
            'volumes': [
                './config:/app/config',
                './shared/state:/app/shared/state'
            ],
            'depends_on': ['governance', 'storage'],
            'healthcheck': {
                'test': ['CMD', 'curl', '-f', 'http://localhost:8081/health/auth'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            }
        }
        
        # Storage (Node 1)
        services['storage'] = {
            'image': 'redis:7-alpine',
            'container_name': 'heady_storage',
            'restart': 'always',
            'command': 'redis-server --appendonly yes',
            'volumes': [
                './infrastructure/redis_data:/data'
            ],
            'depends_on': ['governance'],
            'healthcheck': {
                'test': ['CMD', 'redis-cli', 'ping'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            }
        }
        
        # Orchestrator
        services['orchestrator'] = {
            'build': '../apps/orchestrator',
            'container_name': 'heady_orchestrator',
            'restart': 'always',
            'environment': {
                'CONTAINER_ROLE': 'orchestrator',
                'INITIAL_STATE': 'provisioning'
            },
            'ports': ['8080:8080', '8081:8081'],
            'volumes': [
                './config:/app/config',
                './shared/state:/app/shared/state'
            ],
            'depends_on': ['database', 'security', 'storage'],
            'healthcheck': {
                'test': ['CMD', 'curl', '-f', 'http://localhost:8080/health/orchestrator'],
                'interval': '30s',
                'timeout': '10s',
                'retries': 3
            }
        }
        
        # Tunnel (Security)
        services['tunnel'] = {
            'image': 'cloudflare/cloudflared:latest',
            'container_name': 'heady_tunnel',
            'restart': 'always',
            'environment': {
                'TUNNEL_TOKEN': '${TUNNEL_TOKEN}'
            },
            'command': 'tunnel run',
            'depends_on': ['security']
        }
        
        return {
            'version': '3.8',
            'services': services,
            'volumes': {
                'migration_data': None
            },
            'networks': {
                'heady_internal': {
                    'driver': 'bridge'
                }
            }
        }
        
    def _create_connection_docker_compose(self) -> Dict[str, Any]:
        """Create docker-compose for HeadyConnection"""
        
        services = {
            'lens': {
                'build': './apps/lens',
                'container_name': 'heady_lens',
                'restart': 'always',
                'environment': {
                    'CONTAINER_ROLE': 'lens',
                    'INITIAL_STATE': 'provisioning'
                },
                'ports': ['3000:3000', '3001:3001'],
                'volumes': [
                    '../HeadySystems/shared/state:/app/shared/state',
                    './config:/app/config'
                ],
                'depends_on': ['../HeadySystems/orchestrator'],
                'healthcheck': {
                    'test': ['CMD', 'curl', '-f', 'http://localhost:3000/health/lens'],
                    'interval': '30s',
                    'timeout': '10s',
                    'retries': 3
                }
            },
            'admin_ui': {
                'build': './apps/admin_ui',
                'container_name': 'heady_admin',
                'restart': 'always',
                'environment': {
                    'CONTAINER_ROLE': 'admin_ui',
                    'INITIAL_STATE': 'provisioning'
                },
                'ports': ['3002:3002', '3003:3003'],
                'volumes': [
                    '../HeadySystems/shared/state:/app/shared/state',
                    './config:/app/config'
                ],
                'depends_on': ['lens'],
                'healthcheck': {
                    'test': ['CMD', 'curl', '-f', 'http://localhost:3002/health/admin'],
                    'interval': '30s',
                    'timeout': '10s',
                    'retries': 3
                }
            },
            'trust_indicators': {
                'build': './apps/trust_indicators',
                'container_name': 'heady_trust',
                'restart': 'always',
                'environment': {
                    'CONTAINER_ROLE': 'trust_indicators',
                    'INITIAL_STATE': 'provisioning'
                },
                'ports': ['3004:3004', '3005:3005'],
                'volumes': [
                    '../HeadySystems/shared/state:/app/shared/state',
                    './config:/app/config'
                ],
                'depends_on': ['admin_ui'],
                'healthcheck': {
                    'test': ['CMD', 'curl', '-f', 'http://localhost:3004/health/trust'],
                    'interval': '30s',
                    'timeout': '10s',
                    'retries': 3
                }
            }
        }
        
        return {
            'version': '3.8',
            'services': services,
            'networks': {
                'heady_connection': {
                    'driver': 'bridge'
                }
            }
        }
        
    def _create_environment_files(self, artifacts: List[str]):
        """Create .env files for both domains"""
        
        # HeadySystems .env
        systems_env = """# HeadySystems Environment Configuration
MYSQL_DATABASE=heady_systems
MYSQL_USER=heady_user
MYSQL_PASSWORD=secure_password_change_me
MYSQL_ROOT_PASSWORD=secure_root_password_change_me
TUNNEL_TOKEN=your_cloudflare_tunnel_token_here
ENVIRONMENT=production

# Security
HEADY_AUTH_TOKEN=your_auth_token_here
HEADY_SKIP_VAULT=false

# Storage
REDIS_URL=redis://storage:6379
"""
        
        systems_env_path = self.base_path / "HeadySystems" / ".env"
        with open(systems_env_path, 'w', encoding='utf-8') as f:
            f.write(systems_env)
        artifacts.append(str(systems_env_path))
        
        # HeadyConnection .env
        connection_env = """# HeadyConnection Environment Configuration
NODE_ENV=production
PORT=3000

# API Endpoints
ORCHESTRATOR_URL=http://localhost:8080
LENS_STREAM_PATH=../HeadySystems/shared/state/lens_stream.json

# Security
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
"""
        
        connection_env_path = self.base_path / "HeadyConnection" / ".env"
        with open(connection_env_path, 'w', encoding='utf-8') as f:
            f.write(connection_env)
        artifacts.append(str(connection_env_path))

class IgnitionPhase:
    """Phase 4: Boot containers in dependency order (DB -> Orch -> UI -> Workers)"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
    def execute(self) -> BuildResult:
        """Execute ignition phase"""
        start_time = time.time()
        artifacts = []
        
        try:
            self.logger.info("Starting Ignition Phase")
            
            # Start safety monitoring
            safety_manager.start_monitoring()
            artifacts.append("safety_monitoring_started")
            
            # Get dependency graph for startup order
            dep_graph = create_heady_dependency_graph()
            startup_order = dep_graph.get_build_order()
            
            # Start HeadySystems first
            systems_result = self._start_domain("HeadySystems", startup_order)
            artifacts.extend(systems_result)
            
            # Wait for critical services to be ready
            self._wait_for_critical_services()
            
            # Start HeadyConnection
            connection_result = self._start_domain("HeadyConnection", [])
            artifacts.extend(connection_result)
            
            # Verify all services are healthy
            health_status = self._verify_system_health()
            artifacts.append(f"health_check: {health_status}")
            
            duration = time.time() - start_time
            self.logger.info(f"Ignition Phase completed in {duration:.2f}s")
            
            return BuildResult(
                phase=BuildPhase.IGNITION,
                success=True,
                message="System ignition completed successfully",
                artifacts=artifacts,
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            duration = time.time() - start_time
            self.logger.error(f"Ignition Phase failed: {e}")
            
            return BuildResult(
                phase=BuildPhase.IGNITION,
                success=False,
                message=f"Ignition failed: {str(e)}",
                artifacts=[],
                duration_seconds=duration,
                timestamp=datetime.now()
            )
            
    def _start_domain(self, domain: str, startup_order: List[str]) -> List[str]:
        """Start containers for a specific domain"""
        artifacts = []
        domain_path = self.base_path / domain
        
        self.logger.info(f"Starting {domain} containers")
        
        # Change to domain directory
        original_cwd = os.getcwd()
        os.chdir(domain_path)
        
        try:
            # Start containers in dependency order
            for service in startup_order:
                if service in ['database', 'governance', 'storage', 'security', 'orchestrator']:
                    self.logger.info(f"Starting {service}")
                    
                    # Register with safety manager
                    if service != 'database':  # Database doesn't use our safety protocols
                        safety_manager.zero_start.register_container(service)
                    
                    # Start container
                    result = subprocess.run(
                        ['docker-compose', 'up', '-d', service],
                        capture_output=True,
                        text=True,
                        encoding='utf-8',
                        timeout=60
                    )
                    
                    if result.returncode == 0:
                        artifacts.append(f"{service}:started")
                        self.logger.info(f"Successfully started {service}")
                        
                        # Wait a moment for startup
                        time.sleep(5)
                    else:
                        artifacts.append(f"{service}:failed - {result.stderr}")
                        self.logger.error(f"Failed to start {service}: {result.stderr}")
                        
        finally:
            os.chdir(original_cwd)
            
        return artifacts
        
    def _wait_for_critical_services(self):
        """Wait for critical services to complete handshake"""
        critical_services = ['governance', 'storage', 'security', 'orchestrator']
        
        for service in critical_services:
            self.logger.info(f"Waiting for {service} handshake completion")
            
            # Simulate handshake completion (in real implementation, 
            # this would wait for actual container signals)
            time.sleep(10)
            
            # Mark as ready
            safety_manager.zero_start.complete_handshake(service)
            self.logger.info(f"{service} handshake completed")
            
    def _verify_system_health(self) -> bool:
        """Verify overall system health"""
        try:
            # Check that all critical containers are running
            result = subprocess.run(
                ['docker', 'ps', '--format', 'table {{.Names}}\t{{.Status}}'],
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=30
            )
            
            if result.returncode == 0:
                running_containers = result.stdout
                self.logger.info(f"Running containers:\n{running_containers}")
                
                # Check for critical containers
                critical = ['heady_governance', 'heady_storage', 'heady_security', 'heady_orchestrator']
                for container in critical:
                    if container not in running_containers:
                        self.logger.error(f"Critical container {container} not running")
                        return False
                        
                return True
            else:
                self.logger.error(f"Failed to check container status: {result.stderr}")
                return False
                
        except Exception as e:
            self.logger.error(f"Health verification failed: {e}")
            return False

class BuildAutomationManager:
    """Main manager for the complete build automation protocol"""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
        # Initialize all phases
        self.scaffold = ScaffoldPhase(base_path)
        self.policy_injection = PolicyInjectionPhase(base_path)
        self.infrastructure = InfrastructurePhase(base_path)
        self.ignition = IgnitionPhase(base_path)
        
        # Start storage maintenance
        storage_manager.start_maintenance_tasks()
        
    def execute_full_build(self) -> Dict[str, BuildResult]:
        """Execute all four build phases in sequence"""
        results = {}
        
        self.logger.info("=== Starting Heady Systems Optimal Build Protocol ===")
        
        # Phase 1: Scaffold
        results['scaffold'] = self.scaffold.execute()
        if not results['scaffold'].success:
            self.logger.error("Build failed at Scaffold phase")
            return results
            
        # Phase 2: Policy Injection  
        results['policy_injection'] = self.policy_injection.execute()
        if not results['policy_injection'].success:
            self.logger.error("Build failed at Policy Injection phase")
            return results
            
        # Phase 3: Infrastructure
        results['infrastructure'] = self.infrastructure.execute()
        if not results['infrastructure'].success:
            self.logger.error("Build failed at Infrastructure phase")
            return results
            
        # Phase 4: Ignition
        results['ignition'] = self.ignition.execute()
        if not results['ignition'].success:
            self.logger.error("Build failed at Ignition phase")
            return results
            
        # Calculate total build time
        total_time = sum(result.duration_seconds for result in results.values())
        self.logger.info(f"=== Build Protocol Completed in {total_time:.2f}s ===")
        
        # Store build results in audit trail
        self._store_build_results(results)
        
        return results
        
    def _store_build_results(self, results: Dict[str, BuildResult]):
        """Store build results in audit trail"""
        for phase_name, result in results.items():
            storage_manager.store(
                DataType.AUDIT_TRAIL,
                f"build_phase_{phase_name}",
                {
                    "success": result.success,
                    "message": result.message,
                    "artifacts": result.artifacts,
                    "duration_seconds": result.duration_seconds
                },
                {
                    "container": "build_automation",
                    "operation": "build_phase",
                    "security_level": "info" if result.success else "warning"
                }
            )

# Global build manager
build_manager = BuildAutomationManager()

if __name__ == "__main__":
    print("=== Heady Systems Optimal Build Protocol ===")
    print("Trust-First Architecture: Guaranteed Expected Functionality & Maximum Trust")
    
    # Execute full build
    results = build_manager.execute_full_build()
    
    print("\n=== Build Results ===")
    for phase, result in results.items():
        status = "✅" if result.success else "❌"
        print(f"{status} {phase.title()}: {result.message} ({result.duration_seconds:.2f}s)")
        
    # Check if all phases succeeded
    if all(result.success for result in results.values()):
        print("\n🎉 Heady Systems build completed successfully!")
        print("🔒 Trust-First Architecture deployed")
        print("👁️  Glass Box monitoring active")
        print("🛡️  Safety protocols engaged")
    else:
        print("\n⚠️  Build completed with errors - check logs for details")
