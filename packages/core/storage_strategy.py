"""
Heady Systems Intelligent Storage Strategy
Hot Storage (Memory/Redis): Live telemetry and task queues
Warm Storage (JSON Files): Configuration and short-term logs (/shared/state)
Cold Storage (Postgres/Archives): Audit trails and legal compliance
"""
import json
import os
import redis
import sqlite3
import logging
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from datetime import datetime, timedelta
import threading
import gzip
import shutil

try:
    from core.data_schema import DataPaths
except Exception:
    try:
        from data_schema import DataPaths
    except Exception:
        DataPaths = None

class StorageTier(Enum):
    HOT = "hot"      # Memory/Redis: Live telemetry and task queues
    WARM = "warm"    # JSON Files: Configuration and short-term logs
    COLD = "cold"    # Postgres/Archives: Audit trails and legal compliance

class DataType(Enum):
    TELEMETRY = "telemetry"           # Live system metrics
    TASK_QUEUE = "task_queue"         # Task queue items
    CONFIGURATION = "configuration"   # System configuration
    SHORT_LOGS = "short_logs"         # Recent logs (7 days)
    AUDIT_TRAIL = "audit_trail"       # Long-term audit logs
    COMPLIANCE = "compliance"         # Legal/compliance data

@dataclass
class StoragePolicy:
    data_type: DataType
    primary_tier: StorageTier
    retention_period: timedelta
    compression: bool = False
    encryption: bool = True
    backup_frequency: timedelta = timedelta(days=1)

class HotStorageManager:
    """Manages hot storage in Redis/Memory for live data"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379", fallback_memory: bool = True):
        self.redis_url = redis_url
        self.fallback_memory = fallback_memory
        self.memory_store: Dict[str, Any] = {}
        self.logger = logging.getLogger(__name__)
        
        # Try to connect to Redis
        self.redis_client = None
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            self.logger.info("Connected to Redis hot storage")
        except Exception as e:
            self.logger.warning(f"Redis unavailable, using memory fallback: {e}")
            self.redis_client = None
            
    def store(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store data in hot storage"""
        try:
            serialized_value = json.dumps(value, default=str)
            
            if self.redis_client:
                if ttl:
                    return self.redis_client.setex(key, ttl, serialized_value)
                else:
                    return self.redis_client.set(key, serialized_value)
            else:
                # Memory fallback
                self.memory_store[key] = {
                    'value': serialized_value,
                    'expires': datetime.now() + timedelta(seconds=ttl) if ttl else None
                }
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to store in hot storage: {e}")
            return False
            
    def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve data from hot storage"""
        try:
            if self.redis_client:
                value = self.redis_client.get(key)
                return json.loads(value) if value else None
            else:
                # Memory fallback
                item = self.memory_store.get(key)
                if item:
                    if item['expires'] and datetime.now() > item['expires']:
                        del self.memory_store[key]
                        return None
                    return json.loads(item['value'])
                return None
                
        except Exception as e:
            self.logger.error(f"Failed to retrieve from hot storage: {e}")
            return None
            
    def delete(self, key: str) -> bool:
        """Delete data from hot storage"""
        try:
            if self.redis_client:
                return bool(self.redis_client.delete(key))
            else:
                return self.memory_store.pop(key, None) is not None
                
        except Exception as e:
            self.logger.error(f"Failed to delete from hot storage: {e}")
            return False
            
    def get_keys(self, pattern: str = "*") -> List[str]:
        """Get keys matching pattern"""
        try:
            if self.redis_client:
                return self.redis_client.keys(pattern)
            else:
                return [k for k in self.memory_store.keys() if pattern.replace("*", "") in k]
                
        except Exception as e:
            self.logger.error(f"Failed to get keys from hot storage: {e}")
            return []

class WarmStorageManager:
    """Manages warm storage in JSON files for configuration and short-term logs"""
    
    def __init__(self, base_path: str = "./shared/state"):
        self.base_path = Path(base_path)
        self.logger = logging.getLogger(__name__)
        
        # Create directories
        self.base_path.mkdir(parents=True, exist_ok=True)
        (self.base_path / "config").mkdir(exist_ok=True)
        (self.base_path / "logs").mkdir(exist_ok=True)
        (self.base_path / "cache").mkdir(exist_ok=True)
        
    def store_config(self, config_name: str, config_data: Dict[str, Any]) -> bool:
        """Store configuration data"""
        try:
            config_path = self.base_path / "config" / f"{config_name}.json"
            with open(config_path, 'w') as f:
                json.dump(config_data, f, indent=2, default=str)
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store config {config_name}: {e}")
            return False
            
    def load_config(self, config_name: str) -> Optional[Dict[str, Any]]:
        """Load configuration data"""
        try:
            config_path = self.base_path / "config" / f"{config_name}.json"
            if config_path.exists():
                with open(config_path, 'r') as f:
                    return json.load(f)
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to load config {config_name}: {e}")
            return None
            
    def store_log(self, log_category: str, log_entry: Dict[str, Any]) -> bool:
        """Store log entry in daily log files"""
        try:
            date_str = datetime.now().strftime("%Y-%m-%d")
            log_path = self.base_path / "logs" / f"{log_category}_{date_str}.json"
            
            # Load existing logs
            logs = []
            if log_path.exists():
                with open(log_path, 'r') as f:
                    logs = json.load(f)
                    
            # Add new entry
            log_entry['timestamp'] = datetime.now().isoformat()
            logs.append(log_entry)
            
            # Keep only last 10000 entries per day
            if len(logs) > 10000:
                logs = logs[-10000:]
                
            # Save back
            with open(log_path, 'w') as f:
                json.dump(logs, f, indent=2, default=str)
                
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store log in {log_category}: {e}")
            return False
            
    def get_logs(self, log_category: str, days: int = 1) -> List[Dict[str, Any]]:
        """Get logs for the last N days"""
        try:
            logs = []
            for i in range(days):
                date_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
                log_path = self.base_path / "logs" / f"{log_category}_{date_str}.json"
                
                if log_path.exists():
                    with open(log_path, 'r') as f:
                        day_logs = json.load(f)
                        logs.extend(day_logs)
                        
            return logs
            
        except Exception as e:
            self.logger.error(f"Failed to get logs for {log_category}: {e}")
            return []
            
    def cleanup_old_logs(self, retention_days: int = 7) -> int:
        """Clean up logs older than retention period"""
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            deleted_count = 0
            
            for log_file in (self.base_path / "logs").glob("*.json"):
                try:
                    file_date = datetime.fromtimestamp(log_file.stat().st_mtime)
                    if file_date < cutoff_date:
                        log_file.unlink()
                        deleted_count += 1
                except Exception:
                    continue
                    
            self.logger.info(f"Cleaned up {deleted_count} old log files")
            return deleted_count
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup old logs: {e}")
            return 0

class ColdStorageManager:
    """Manages cold storage in PostgreSQL/Archives for audit trails and compliance"""
    
    def __init__(self, db_path: str = "./infrastructure/system_audit_logs.db", 
                 archive_path: str = "./infrastructure/archives"):
        self.db_path = Path(db_path)
        self.archive_path = Path(archive_path)
        self.logger = logging.getLogger(__name__)
        
        # Create directories
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.archive_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
    def _init_database(self):
        """Initialize the cold storage database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS audit_trail (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        source_container TEXT NOT NULL,
                        operation_type TEXT NOT NULL,
                        operation_details TEXT,
                        security_level TEXT,
                        compliance_tags TEXT
                    )
                """)
                
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS compliance_records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        record_type TEXT NOT NULL,
                        content TEXT NOT NULL,
                        retention_until TEXT,
                        access_log TEXT
                    )
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
                    ON audit_trail(timestamp)
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_audit_container 
                    ON audit_trail(source_container)
                """)
                
                conn.commit()
                
        except Exception as e:
            self.logger.error(f"Failed to initialize cold storage database: {e}")
            
    def store_audit_record(self, source_container: str, operation_type: str,
                           operation_details: Dict[str, Any], security_level: str = "info",
                           compliance_tags: Optional[List[str]] = None) -> bool:
        """Store audit record in cold storage"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO audit_trail 
                    (timestamp, source_container, operation_type, operation_details, security_level, compliance_tags)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    datetime.now().isoformat(),
                    source_container,
                    operation_type,
                    json.dumps(operation_details, default=str),
                    security_level,
                    json.dumps(compliance_tags or [])
                ))
                conn.commit()
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to store audit record: {e}")
            return False
            
    def store_compliance_record(self, record_type: str, content: Dict[str, Any],
                               retention_years: int = 7) -> bool:
        """Store compliance record with long-term retention"""
        try:
            retention_until = (datetime.now() + timedelta(days=retention_years * 365)).isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO compliance_records 
                    (timestamp, record_type, content, retention_until)
                    VALUES (?, ?, ?, ?)
                """, (
                    datetime.now().isoformat(),
                    record_type,
                    json.dumps(content, default=str),
                    retention_until
                ))
                conn.commit()
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to store compliance record: {e}")
            return False
            
    def query_audit_trail(self, container: Optional[str] = None,
                         operation_type: Optional[str] = None,
                         start_time: Optional[datetime] = None,
                         end_time: Optional[datetime] = None,
                         limit: int = 1000) -> List[Dict[str, Any]]:
        """Query audit trail with filters"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                query = "SELECT * FROM audit_trail WHERE 1=1"
                params = []
                
                if container:
                    query += " AND source_container = ?"
                    params.append(container)
                    
                if operation_type:
                    query += " AND operation_type = ?"
                    params.append(operation_type)
                    
                if start_time:
                    query += " AND timestamp >= ?"
                    params.append(start_time.isoformat())
                    
                if end_time:
                    query += " AND timestamp <= ?"
                    params.append(end_time.isoformat())
                    
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
                
        except Exception as e:
            self.logger.error(f"Failed to query audit trail: {e}")
            return []
            
    def archive_old_data(self, days_old: int = 30) -> int:
        """Archive old data to compressed files"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            archived_count = 0
            
            with sqlite3.connect(self.db_path) as conn:
                # Get old audit records
                cursor = conn.execute("""
                    SELECT * FROM audit_trail 
                    WHERE timestamp < ?
                    ORDER BY timestamp
                """, (cutoff_date.isoformat(),))
                
                old_records = cursor.fetchall()
                
                if old_records:
                    # Create archive file
                    archive_date = datetime.now().strftime("%Y%m%d")
                    archive_file = self.archive_path / f"audit_archive_{archive_date}.json.gz"
                    
                    # Convert to list of dicts
                    records_data = [dict(row) for row in old_records]
                    
                    # Compress and save
                    with gzip.open(archive_file, 'wt') as f:
                        json.dump(records_data, f, default=str)
                        
                    # Delete from database
                    conn.execute("""
                        DELETE FROM audit_trail 
                        WHERE timestamp < ?
                    """, (cutoff_date.isoformat(),))
                    
                    conn.commit()
                    archived_count = len(old_records)
                    
            self.logger.info(f"Archived {archived_count} old audit records")
            return archived_count
            
        except Exception as e:
            self.logger.error(f"Failed to archive old data: {e}")
            return 0

class StorageStrategyManager:
    """Main manager for intelligent storage strategy"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379",
                 warm_path: str = "./shared/state",
                 cold_db: str = "./infrastructure/system_audit_logs.db",
                 archive_path: str = "./infrastructure/archives"):
        resolved_warm_path = warm_path
        resolved_cold_db = cold_db
        resolved_archive_path = archive_path

        if DataPaths is not None:
            try:
                paths = DataPaths.from_env()
                paths.ensure_directories()
                if warm_path == "./shared/state":
                    resolved_warm_path = str(paths.public_state_dir)
                if cold_db == "./infrastructure/system_audit_logs.db":
                    resolved_cold_db = str(paths.infrastructure_dir / "system_audit_logs.db")
                if archive_path == "./infrastructure/archives":
                    resolved_archive_path = str(paths.infrastructure_dir / "archives")
            except Exception:
                pass

        self.hot_storage = HotStorageManager(redis_url)
        self.warm_storage = WarmStorageManager(resolved_warm_path)
        self.cold_storage = ColdStorageManager(resolved_cold_db, resolved_archive_path)
        self.logger = logging.getLogger(__name__)
        
        # Define storage policies
        self.policies = {
            DataType.TELEMETRY: StoragePolicy(
                data_type=DataType.TELEMETRY,
                primary_tier=StorageTier.HOT,
                retention_period=timedelta(hours=24),
                compression=False,
                encryption=False
            ),
            DataType.TASK_QUEUE: StoragePolicy(
                data_type=DataType.TASK_QUEUE,
                primary_tier=StorageTier.HOT,
                retention_period=timedelta(days=7),
                compression=False,
                encryption=True
            ),
            DataType.CONFIGURATION: StoragePolicy(
                data_type=DataType.CONFIGURATION,
                primary_tier=StorageTier.WARM,
                retention_period=timedelta(days=365),
                compression=False,
                encryption=True
            ),
            DataType.SHORT_LOGS: StoragePolicy(
                data_type=DataType.SHORT_LOGS,
                primary_tier=StorageTier.WARM,
                retention_period=timedelta(days=7),
                compression=True,
                encryption=False
            ),
            DataType.AUDIT_TRAIL: StoragePolicy(
                data_type=DataType.AUDIT_TRAIL,
                primary_tier=StorageTier.COLD,
                retention_period=timedelta(days=365*7),  # 7 years
                compression=True,
                encryption=True
            ),
            DataType.COMPLIANCE: StoragePolicy(
                data_type=DataType.COMPLIANCE,
                primary_tier=StorageTier.COLD,
                retention_period=timedelta(days=365*10),  # 10 years
                compression=True,
                encryption=True
            )
        }
        
    def store(self, data_type: DataType, key: str, value: Any, 
              metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Store data according to its type policy"""
        policy = self.policies[data_type]
        
        try:
            if policy.primary_tier == StorageTier.HOT:
                ttl = int(policy.retention_period.total_seconds())
                return self.hot_storage.store(key, value, ttl)
                
            elif policy.primary_tier == StorageTier.WARM:
                if data_type == DataType.CONFIGURATION:
                    return self.warm_storage.store_config(key, value)
                elif data_type == DataType.SHORT_LOGS:
                    log_entry = value if isinstance(value, dict) else {"message": value}
                    if metadata:
                        log_entry.update(metadata)
                    return self.warm_storage.store_log(key, log_entry)
                    
            elif policy.primary_tier == StorageTier.COLD:
                if data_type == DataType.AUDIT_TRAIL:
                    return self.cold_storage.store_audit_record(
                        source_container=metadata.get('container', 'unknown'),
                        operation_type=metadata.get('operation', 'unknown'),
                        operation_details=value,
                        security_level=metadata.get('security_level', 'info')
                    )
                elif data_type == DataType.COMPLIANCE:
                    return self.cold_storage.store_compliance_record(
                        record_type=key,
                        content=value,
                        retention_years=int(policy.retention_period.days / 365)
                    )
                    
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to store {data_type.value} data: {e}")
            return False
            
    def retrieve(self, data_type: DataType, key: str, 
                metadata: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        """Retrieve data according to its type policy"""
        policy = self.policies[data_type]
        
        try:
            if policy.primary_tier == StorageTier.HOT:
                return self.hot_storage.retrieve(key)
                
            elif policy.primary_tier == StorageTier.WARM:
                if data_type == DataType.CONFIGURATION:
                    return self.warm_storage.load_config(key)
                elif data_type == DataType.SHORT_LOGS:
                    days = metadata.get('days', 1) if metadata else 1
                    return self.warm_storage.get_logs(key, days)
                    
            elif policy.primary_tier == StorageTier.COLD:
                if data_type == DataType.AUDIT_TRAIL:
                    return self.cold_storage.query_audit_trail(
                        container=metadata.get('container'),
                        operation_type=metadata.get('operation_type'),
                        limit=metadata.get('limit', 1000) if metadata else 1000
                    )
                    
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to retrieve {data_type.value} data: {e}")
            return None
            
    def start_maintenance_tasks(self):
        """Start background maintenance tasks"""
        def maintenance_loop():
            while True:
                try:
                    # Clean up old warm storage logs
                    self.warm_storage.cleanup_old_logs(7)
                    
                    # Archive old cold storage data
                    self.cold_storage.archive_old_data(30)
                    
                    # Sleep for 24 hours
                    import time
                    time.sleep(86400)
                    
                except Exception as e:
                    self.logger.error(f"Maintenance task error: {e}")
                    time.sleep(3600)  # Retry in 1 hour
                    
        maintenance_thread = threading.Thread(target=maintenance_loop, daemon=True)
        maintenance_thread.start()
        self.logger.info("Storage maintenance tasks started")

# Global storage manager
storage_manager = StorageStrategyManager()

if __name__ == "__main__":
    print("=== Heady Systems Intelligent Storage Strategy ===")
    
    # Test hot storage
    print("\nTesting Hot Storage:")
    storage_manager.store(DataType.TELEMETRY, "test_metric", {"value": 42, "unit": "ms"})
    retrieved = storage_manager.retrieve(DataType.TELEMETRY, "test_metric")
    print(f"Hot storage test: {retrieved}")
    
    # Test warm storage
    print("\nTesting Warm Storage:")
    storage_manager.store(DataType.CONFIGURATION, "test_config", {"setting": "value"})
    config = storage_manager.retrieve(DataType.CONFIGURATION, "test_config")
    print(f"Warm storage test: {config}")
    
    # Test cold storage
    print("\nTesting Cold Storage:")
    storage_manager.store(DataType.AUDIT_TRAIL, "test_audit", 
                         {"action": "test", "result": "success"},
                         {"container": "test", "operation": "test_operation"})
    
    print("✅ Intelligent storage strategy initialized")
