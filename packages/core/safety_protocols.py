"""
Heady Systems Safety Protocols
Zero-Start Rule: No container starts in ACTIVE mode by default
Glass Box Mandate: Every write operation emits events to lens_stream.json
"""
import json
import time
import os
import logging
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from pathlib import Path
import threading
from datetime import datetime

try:
    from core.data_schema import DataPaths
except Exception:
    try:
        from data_schema import DataPaths
    except Exception:
        DataPaths = None

class ContainerState(Enum):
    PROVISIONING = "provisioning"  # Initial state,等待orchestrator握手
    READY = "ready"               # Ready for activation
    ACTIVE = "active"             # Fully operational
    TERMINATING = "terminating"   # Shutting down
    FAILED = "failed"            # Error state
    SAFE_SHUTDOWN = "safe_shutdown"  # Fail-safe termination

@dataclass
class ContainerStatus:
    name: str
    state: ContainerState
    last_heartbeat: datetime
    orchestrator_handshake: bool = False
    health_check_url: Optional[str] = None
    startup_time: Optional[datetime] = None
    error_message: Optional[str] = None

@dataclass
class LensEvent:
    timestamp: datetime
    source_container: str
    operation_type: str
    operation_details: Dict[str, Any]
    user_visible: bool = True
    security_level: str = "info"  # info, warning, critical

class ZeroStartManager:
    """Implements the Zero-Start Rule: No container starts in ACTIVE mode by default"""
    
    def __init__(self, glass_box_manager):
        self.containers: Dict[str, ContainerStatus] = {}
        self.glass_box = glass_box_manager
        self.logger = logging.getLogger(__name__)
        self.orchestrator_url = "http://orchestrator:8080"
        self.handshake_timeout = 300  # 5 minutes
        self._lock = threading.Lock()
        
    def emit_lens_event(self, source_container: str, operation_type: str, 
                       operation_details: Dict[str, Any], user_visible: bool = True,
                       security_level: str = "info") -> bool:
        """Delegate event emission to GlassBoxManager"""
        return self.glass_box.emit_lens_event(
            source_container, operation_type, operation_details, user_visible, security_level
        )
        
    def register_container(self, container_name: str, health_check_url: Optional[str] = None) -> ContainerStatus:
        """Register a new container in PROVISIONING state"""
        with self._lock:
            if container_name in self.containers:
                self.logger.warning(f"Container {container_name} already registered")
                return self.containers[container_name]
                
            status = ContainerStatus(
                name=container_name,
                state=ContainerState.PROVISIONING,
                last_heartbeat=datetime.now(),
                health_check_url=health_check_url,
                startup_time=datetime.now()
            )
            
            self.containers[container_name] = status
            self.logger.info(f"Container {container_name} registered in PROVISIONING state")
            
            # Emit registration event
            self.emit_lens_event(
                source_container=container_name,
                operation_type="container_registered",
                operation_details={"state": status.state.value, "health_check": health_check_url}
            )
            
            return status
            
    def request_activation(self, container_name: str, orchestrator_signature: str) -> bool:
        """Request container activation from orchestrator"""
        with self._lock:
            if container_name not in self.containers:
                self.logger.error(f"Container {container_name} not registered")
                return False
                
            status = self.containers[container_name]
            
            # Verify container is in READY state
            if status.state != ContainerState.READY:
                self.logger.error(f"Container {container_name} not in READY state: {status.state.value}")
                return False
                
            # Verify orchestrator handshake
            if not self._verify_orchestrator_signature(orchestrator_signature):
                self.logger.error(f"Invalid orchestrator signature for {container_name}")
                return False
                
            # Activate container
            status.state = ContainerState.ACTIVE
            status.last_heartbeat = datetime.now()
            
            self.logger.info(f"Container {container_name} activated by orchestrator")
            
            # Emit activation event
            self.emit_lens_event(
                source_container=container_name,
                operation_type="container_activated",
                operation_details={"orchestrator_signature": orchestrator_signature[:8] + "..."},
                security_level="info"
            )
            
            return True
            
    def complete_handshake(self, container_name: str) -> bool:
        """Complete orchestrator handshake and move to READY state"""
        with self._lock:
            if container_name not in self.containers:
                return False
                
            status = self.containers[container_name]
            
            if status.state != ContainerState.PROVISIONING:
                return False
                
            status.orchestrator_handshake = True
            status.state = ContainerState.READY
            status.last_heartbeat = datetime.now()
            
            self.logger.info(f"Container {container_name} completed handshake, now READY")
            
            # Emit handshake event
            self.emit_lens_event(
                source_container=container_name,
                operation_type="handshake_completed",
                operation_details={"next_state": "ready"}
            )
            
            return True
            
    def _verify_orchestrator_signature(self, signature: str) -> bool:
        """Verify orchestrator signature (simplified implementation)"""
        # In production, this would verify cryptographic signature
        return len(signature) > 16 and signature.startswith("heady_")
        
    def check_timeouts(self) -> List[str]:
        """Check for containers that have exceeded handshake timeout"""
        with self._lock:
            now = datetime.now()
            timeout_containers = []
            
            for container_name, status in self.containers.items():
                if status.state == ContainerState.PROVISIONING:
                    elapsed = (now - status.startup_time).total_seconds()
                    if elapsed > self.handshake_timeout:
                        status.state = ContainerState.FAILED
                        status.error_message = "Handshake timeout"
                        timeout_containers.append(container_name)
                        
                        # Emit timeout event
                        self.emit_lens_event(
                            source_container=container_name,
                            operation_type="handshake_timeout",
                            operation_details={"elapsed_seconds": elapsed},
                            security_level="critical"
                        )
                        
            return timeout_containers

class GlassBoxManager:
    """Implements the Glass Box Mandate: Every write operation emits events to lens_stream.json"""
    
    def __init__(self, lens_stream_path: str = "./shared/state/lens_stream.json"):
        self.lens_stream_path = Path(lens_stream_path).resolve()
        self.logger = logging.getLogger(__name__)
        self._lock = threading.Lock()
        
        # Ensure lens stream directory exists
        self.lens_stream_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize stream if it doesn't exist
        if not self.lens_stream_path.exists():
            self._initialize_stream()
            
    def _acquire_file_lock(self):
        """Simple file-based lock to prevent inter-process race conditions"""
        lock_path = str(self.lens_stream_path) + ".lock"
        start_time = time.time()
        while time.time() - start_time < 5.0:  # 5 second timeout
            try:
                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                os.close(fd)
                return lock_path
            except OSError:
                time.sleep(0.1)
        return None

    def _release_file_lock(self, lock_path):
        """Release the file lock"""
        if lock_path:
            try:
                os.remove(lock_path)
            except OSError:
                pass

    def _initialize_stream(self):
        """Initialize the lens stream file"""
        initial_data = {
            "stream_metadata": {
                "created_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": "Heady Systems Glass Box Event Stream"
            },
            "events": []
        }
        
        lock = self._acquire_file_lock()
        try:
            with self._lock:
                with open(self.lens_stream_path, 'w') as f:
                    json.dump(initial_data, f, indent=2)
        finally:
            self._release_file_lock(lock)
                
    def emit_lens_event(self, source_container: str, operation_type: str, 
                       operation_details: Dict[str, Any], user_visible: bool = True,
                       security_level: str = "info") -> bool:
        """Emit an event to the lens stream"""
        try:
            event = LensEvent(
                timestamp=datetime.now(),
                source_container=source_container,
                operation_type=operation_type,
                operation_details=operation_details,
                user_visible=user_visible,
                security_level=security_level
            )
            
            # Convert to dict for JSON serialization
            event_dict = asdict(event)
            event_dict['timestamp'] = event.timestamp.isoformat()
            
            lock = self._acquire_file_lock()
            if not lock:
                self.logger.error("Failed to acquire file lock for lens stream")
                return False

            try:
                with self._lock:
                    # Read existing stream
                    try:
                        with open(self.lens_stream_path, 'r') as f:
                            stream_data = json.load(f)
                            
                        # Validate data structure
                        if not isinstance(stream_data, dict) or 'events' not in stream_data:
                            self.logger.warning("Lens stream corruption detected (invalid structure), resetting")
                            raise json.JSONDecodeError("Invalid structure", "", 0)
                            
                    except (FileNotFoundError, json.JSONDecodeError):
                        self._initialize_stream()
                        with open(self.lens_stream_path, 'r') as f:
                            stream_data = json.load(f)
                    
                    # Add new event
                    stream_data['events'].append(event_dict)
                    
                    # Keep only last 1000 events to prevent file growth
                    if len(stream_data['events']) > 1000:
                        stream_data['events'] = stream_data['events'][-1000:]
                    
                    # Write back to file
                    with open(self.lens_stream_path, 'w') as f:
                        json.dump(stream_data, f, indent=2)
            finally:
                self._release_file_lock(lock)
                    
            self.logger.debug(f"Emitted lens event: {operation_type} from {source_container}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to emit lens event: {e}")
            return False
            
    def verify_stream_reachable(self) -> bool:
        """Verify that the lens stream is reachable (Glass Box Mandate)"""
        try:
            if not self.lens_stream_path.exists():
                return False
                
            lock = self._acquire_file_lock()
            try:
                # Try to read the stream
                with open(self.lens_stream_path, 'r') as f:
                    stream_data = json.load(f)
                    
                if not isinstance(stream_data, dict):
                    return False
                    
                return 'events' in stream_data and 'stream_metadata' in stream_data
            finally:
                self._release_file_lock(lock)
            
        except Exception:
            return False
            
    def get_recent_events(self, count: int = 50, container_filter: Optional[str] = None) -> List[Dict]:
        """Get recent events from the lens stream"""
        try:
            with open(self.lens_stream_path, 'r') as f:
                stream_data = json.load(f)
                
            events = stream_data.get('events', [])
            
            # Filter by container if specified
            if container_filter:
                events = [e for e in events if e.get('source_container') == container_filter]
                
            # Return most recent events
            return events[-count:] if events else []
            
        except Exception as e:
            self.logger.error(f"Failed to read lens stream: {e}")
            return []

class SafetyProtocolManager:
    """Main manager for all safety protocols"""
    
    def __init__(self, lens_stream_path: str = "./shared/state/lens_stream.json"):
        resolved_lens_stream_path = lens_stream_path
        if DataPaths is not None and lens_stream_path == "./shared/state/lens_stream.json":
            try:
                paths = DataPaths.from_env()
                paths.ensure_directories()
                resolved_lens_stream_path = str(paths.public_state_dir / "lens_stream.json")
            except Exception:
                pass

        self.glass_box = GlassBoxManager(resolved_lens_stream_path)
        self.zero_start = ZeroStartManager(self.glass_box)
        self.logger = logging.getLogger(__name__)
        self._running = False
        
    def start_monitoring(self):
        """Start background monitoring for safety protocols"""
        self._running = True
        
        def monitor_loop():
            while self._running:
                try:
                    # Check for handshake timeouts
                    timeouts = self.zero_start.check_timeouts()
                    if timeouts:
                        self.logger.warning(f"Containers timed out: {timeouts}")
                        
                    # Verify lens stream is reachable (Glass Box Mandate)
                    if not self.glass_box.verify_stream_reachable():
                        self.logger.critical("Lens stream unreachable - initiating fail-safe")
                        self.initiate_fail_safe("lens_stream_unreachable")
                        
                    time.sleep(10)  # Check every 10 seconds
                    
                except Exception as e:
                    self.logger.error(f"Monitoring error: {e}")
                    time.sleep(10)
                    
        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()
        
    def initiate_fail_safe(self, reason: str):
        """Initiate fail-safe shutdown (Glass Box Mandate)"""
        self.logger.critical(f"Initiating fail-safe shutdown: {reason}")
        
        # Emit critical event
        self.glass_box.emit_lens_event(
            source_container="safety_manager",
            operation_type="fail_safe_initiated",
            operation_details={"reason": reason},
            security_level="critical"
        )
        
        # In production, this would trigger container shutdown
        # For now, we just log the event
        self.logger.critical("FAIL-SAFE ACTIVATED - System terminating for safety")
        
    def stop_monitoring(self):
        """Stop background monitoring"""
        self._running = False

# Global safety manager
safety_manager = SafetyProtocolManager()

if __name__ == "__main__":
    print("=== Heady Systems Safety Protocols ===")
    
    # Test Zero-Start Rule
    print("\nTesting Zero-Start Rule:")
    status = safety_manager.zero_start.register_container("test_container", "/health")
    print(f"Container registered in state: {status.state.value}")
    
    # Complete handshake
    safety_manager.zero_start.complete_handshake("test_container")
    print(f"Container state after handshake: {safety_manager.zero_start.containers['test_container'].state.value}")
    
    # Test Glass Box Mandate
    print("\nTesting Glass Box Mandate:")
    success = safety_manager.glass_box.emit_lens_event(
        source_container="test_container",
        operation_type="test_operation",
        operation_details={"test": True}
    )
    print(f"Event emitted successfully: {success}")
    
    # Verify stream reachable
    reachable = safety_manager.glass_box.verify_stream_reachable()
    print(f"Lens stream reachable: {reachable}")
    
    print("✅ Safety protocols initialized")
