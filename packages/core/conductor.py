"""
HEADY CONDUCTOR PROTOCOL v1.0
Module: Dynamic Orchestration & Socratic Logic
Parent Protocol: HEADY_OPTIMIZATION_PROTOCOL.md

The HeadyConductor sits above the standard Orchestrator.
While the Orchestrator routes traffic, the Conductor makes high-level decisions
about resources and intelligence.
"""
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel

from core.compliance_verifier import ComplianceVerifier, ComplianceContext, ApprovalStatus

logger = logging.getLogger(__name__)


class TaskComplexity(Enum):
    LOW = "low"           # Local/fast models
    MEDIUM = "medium"     # Standard models
    HIGH = "high"         # Reasoning models
    CRITICAL = "critical" # Full reasoning with verification


class ModelTier(Enum):
    FAST = "fast"
    STANDARD = "standard"
    REASONING = "reasoning"
    SPECIALIST = "specialist"


class WisdomPattern(BaseModel):
    pattern_id: str
    trigger: str
    strategy: str
    success_count: int = 0
    last_used: Optional[str] = None
    created_at: str = ""


@dataclass
class TaskMetrics:
    task_id: str
    complexity: TaskComplexity
    model_used: str
    start_time: float
    end_time: Optional[float] = None
    success: bool = False
    tokens_used: int = 0
    wisdom_applied: bool = False


class Sentinel:
    """Real-time Risk Analysis - Security gatekeeper for the Conductor"""
    
    def __init__(self):
        self.blocked_patterns = [
            "destroy system", "delete all", "drop database", "rm -rf", 
            "format drive", "leak secret", "expose credential"
        ]
        self.governance_constraints = {
            "max_concurrent_workers": 5,
            "max_tokens_per_task": 100000,
            "require_audit_logging": True,
            "allow_external_requests": True
        }
        
    def check_safety(self, task_description: str, context: Optional[Dict] = None) -> Tuple[bool, str]:
        task_lower = task_description.lower()
        for pattern in self.blocked_patterns:
            if pattern in task_lower:
                return False, f"Blocked pattern detected: '{pattern}'"
        
        if context:
            if context.get("token_estimate", 0) > self.governance_constraints["max_tokens_per_task"]:
                return False, "Task exceeds maximum token limit"
                
        return True, "Safety check passed"

    def get_constraints(self) -> Dict[str, Any]:
        return self.governance_constraints.copy()


class ModelRouter:
    """Decides which AI Model to use for a task based on complexity analysis"""
    
    def __init__(self):
        self.high_complexity_keywords = [
            "analyze", "architect", "design", "reason", "complex", "evaluate",
            "compare", "synthesize", "strategize", "optimize", "debug", "refactor"
        ]
        self.coding_keywords = ["code", "script", "function", "class", "implement", "write"]
        self.research_keywords = ["search", "find", "lookup", "research", "latest"]
        
    def analyze_complexity(self, task_description: str) -> TaskComplexity:
        task_lower = task_description.lower()
        word_count = len(task_description.split())
        
        high_count = sum(1 for k in self.high_complexity_keywords if k in task_lower)
        
        if high_count >= 3:
            return TaskComplexity.CRITICAL
        elif high_count >= 2:
            return TaskComplexity.HIGH
        elif high_count >= 1 or word_count > 50:
            return TaskComplexity.MEDIUM
        else:
            return TaskComplexity.LOW
            
    def route_to_model(self, task_description: str, complexity: TaskComplexity) -> str:
        task_lower = task_description.lower()
        
        if any(k in task_lower for k in self.coding_keywords):
            return "jules"
        if any(k in task_lower for k in self.research_keywords):
            return "perplexity"
            
        if complexity in (TaskComplexity.CRITICAL, TaskComplexity.HIGH):
            return "gemini" # Could be 'gemini-pro' or 'claude-opus'
        elif complexity == TaskComplexity.MEDIUM:
            return "gemini"
        else:
            return "gemini" # Could be 'gemini-flash'


class LearnerNode:
    """Dynamic Learning Worker - Analyzes input/output pairs and extracts Wisdom Patterns."""
    
    def __init__(self, wisdom_path: Optional[Path] = None):
         self.wisdom_path = wisdom_path

    def analyze_and_learn(self, task_input: str, task_output: str, was_successful: bool, model_used: str) -> Optional[WisdomPattern]:
        if not was_successful:
            return None
            
        trigger = self._extract_trigger(task_input)
        if not trigger:
            return None
            
        # Construct the pattern logic
        strategy = f"Use {model_used} for tasks matching '{trigger}'."
        return WisdomPattern(
            pattern_id=f"wisdom_{int(time.time())}",
            trigger=trigger,
            strategy=strategy,
            success_count=1,
            created_at=str(time.time())
        )

    def _extract_trigger(self, task_input: str) -> Optional[str]:
        words = task_input.lower().split()
        if len(words) < 3:
            return None
        return " ".join(words[:5]) # Simple heuristic


class HeadyConductor:
    def __init__(self, wisdom_path: Optional[Path] = None):
        self.wisdom_path = wisdom_path or Path(__file__).resolve().parents[1] / "data" / "memory" / "wisdom.json"
        self.sentinel = Sentinel()
        self.model_router = ModelRouter()
        self.learner = LearnerNode(self.wisdom_path)
        self.compliance_verifier = ComplianceVerifier()  # FINAL GATEWAY
        self._wisdom_cache: List[WisdomPattern] = self._load_wisdom()
        self.active_workers: Dict[str, Dict] = {}
        self.task_metrics: List[TaskMetrics] = []
        self.max_workers = self.sentinel.get_constraints()["max_concurrent_workers"]

    def _load_wisdom(self) -> List[WisdomPattern]:
        if not self.wisdom_path.exists():
            return []
        try:
            data = json.loads(self.wisdom_path.read_text(encoding="utf-8"))
            return [WisdomPattern(**item) for item in data]
        except Exception:
            return []

    def _save_wisdom(self) -> None:
        self.wisdom_path.parent.mkdir(parents=True, exist_ok=True)
        data = [item.dict() for item in self._wisdom_cache]
        self.wisdom_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def socratic_check(self, task_description: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        The 3-Step Socratic Check:
        1. Necessity
        2. Safety
        3. Efficiency
        """
        context = context or {}
        result = {
            "approved": False,
            "reason": "",
            "checks": {"necessity": False, "safety": False, "efficiency": False},
            "recommended_model": "gemini",
            "complexity": None,
            "wisdom_applied": None,
            "estimated_tokens": 0
        }
        
        # 1. Necessity
        if not task_description or len(task_description.strip()) < 3:
            result["reason"] = "NECESSITY FAILED: Task is empty or trivial"
            return result
        result["checks"]["necessity"] = True
        
        # 2. Safety
        is_safe, safety_reason = self.sentinel.check_safety(task_description, context)
        if not is_safe:
            result["reason"] = f"SAFETY FAILED: {safety_reason}"
            return result
        result["checks"]["safety"] = True
        
        # 3. Efficiency
        wisdom = self.get_wisdom(task_description)
        if wisdom:
            result["wisdom_applied"] = wisdom.strategy
        
        complexity = self.model_router.analyze_complexity(task_description)
        result["complexity"] = complexity.value
        recommended_model = self.model_router.route_to_model(task_description, complexity)
        result["recommended_model"] = recommended_model
        
        # Estimate tokens (heuristic)
        word_count = len(task_description.split())
        result["estimated_tokens"] = word_count * 10

        result["checks"]["efficiency"] = True
        
        result["approved"] = True
        result["reason"] = "Socratic check passed"
        return result

    def get_wisdom(self, task_description: str) -> Optional[WisdomPattern]:
        task_lower = task_description.lower()
        for pattern in self._wisdom_cache:
            if pattern.trigger in task_lower:
                return pattern
        return None
        
    def learn_pattern(self, task_input: str, task_output: str, was_successful: bool = True, model_used: str = "gemini") -> None:
        pattern = self.learner.analyze_and_learn(task_input, task_output, was_successful, model_used)
        if pattern:
            # Check for duplicates
            for existing in self._wisdom_cache:
                if existing.trigger == pattern.trigger:
                    existing.success_count += 1
                    self._save_wisdom()
                    return
            
            self._wisdom_cache.append(pattern)
            self._save_wisdom()

    def spawn_worker(self, worker_id: str, worker_type: str) -> bool:
        """Dynamic Orchestration: Spawn a new worker node"""
        if len(self.active_workers) >= self.max_workers:
            logger.warning(f"Cannot spawn worker {worker_id}: max workers reached")
            return False
            
        self.active_workers[worker_id] = {
            "type": worker_type,
            "spawned_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        logger.info(f"Spawned worker: {worker_id} ({worker_type})")
        return True
        
    def kill_worker(self, worker_id: str) -> bool:
        """Dynamic Orchestration: Kill an existing worker node"""
        if worker_id not in self.active_workers:
            return False
            
        del self.active_workers[worker_id]
        logger.info(f"Killed worker: {worker_id}")
        return True
        
    def get_system_load(self) -> Dict[str, Any]:
        """Get current system load metrics"""
        return {
            "active_workers": len(self.active_workers),
            "max_workers": self.max_workers,
            "load_percentage": len(self.active_workers) / self.max_workers * 100,
            "wisdom_patterns": len(self._wisdom_cache),
            "tasks_processed": len(self.task_metrics)
        }
        
    def record_task_metrics(self, metrics: TaskMetrics) -> None:
        """Record task metrics for analysis"""
        self.task_metrics.append(metrics)
        
        # Keep only last 1000 metrics
        if len(self.task_metrics) > 1000:
            self.task_metrics = self.task_metrics[-1000:]
            
    async def conduct(self, task_description: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        MAIN CONDUCTOR FLOW (WITH COMPLIANCE GATEWAY)
        User -> Conductor -> (Socratic Check) -> ComplianceVerifier (FINAL GATEWAY) -> Execution
        
        The ComplianceVerifier is the LAST checkpoint before execution.
        HeadyConductor will NOT proceed without compliance approval.
        """
        context = context or {}
        task_id = f"task_{int(time.time() * 1000)}"
        
        logger.info(f"[CONDUCTOR] Processing task {task_id}")
        
        # STEP 1: Run Socratic check
        decision = self.socratic_check(task_description, context)
        
        if not decision["approved"]:
            logger.warning(f"[CONDUCTOR] Task {task_id} failed Socratic check")
            return {
                "task_id": task_id,
                "approved": False,
                "reason": decision["reason"],
                "action": "REJECT",
                "stage": "SOCRATIC_CHECK"
            }
        
        logger.info(f"[CONDUCTOR] Task {task_id} passed Socratic check")
        
        # STEP 2: COMPLIANCE VERIFICATION (FINAL GATEWAY)
        # Build compliance context
        compliance_context = ComplianceContext(
            task_id=task_id,
            task_description=task_description,
            task_type=context.get("task_type", "unknown"),
            affected_files=context.get("affected_files", []),
            affected_services=context.get("affected_services", []),
            dependencies=context.get("dependencies", []),
            security_level=context.get("security_level", "high"),
            requires_audit=context.get("requires_audit", True),
            metadata={
                "socratic_decision": decision,
                "recommended_model": decision["recommended_model"],
                "complexity": decision["complexity"]
            }
        )
        
        # Run compliance verification
        logger.info(f"[CONDUCTOR] Running compliance verification for task {task_id}")
        compliance_report = self.compliance_verifier.verify(compliance_context)
        
        # Check compliance approval status
        if not compliance_report.approved:
            logger.error(f"[CONDUCTOR] Task {task_id} BLOCKED by compliance verifier")
            return {
                "task_id": task_id,
                "approved": False,
                "reason": compliance_report.approval_reason,
                "action": "BLOCKED_BY_COMPLIANCE",
                "stage": "COMPLIANCE_VERIFICATION",
                "compliance_report": {
                    "report_id": compliance_report.report_id,
                    "approval_status": compliance_report.approval_status.value,
                    "violations": [
                        {
                            "rule_id": v.rule_id,
                            "level": v.level.value,
                            "message": v.message,
                            "fix_suggestion": v.fix_suggestion
                        } for v in compliance_report.violations
                    ],
                    "requires_human_review": compliance_report.requires_human_review,
                    "auto_fix_available": compliance_report.auto_fix_available
                }
            }
        
        # Check if requires human review
        if compliance_report.approval_status == ApprovalStatus.REQUIRES_HUMAN:
            logger.warning(f"[CONDUCTOR] Task {task_id} requires human review")
            return {
                "task_id": task_id,
                "approved": False,
                "reason": "Compliance verification requires human approval",
                "action": "PENDING_HUMAN_APPROVAL",
                "stage": "COMPLIANCE_VERIFICATION",
                "compliance_report": {
                    "report_id": compliance_report.report_id,
                    "approval_status": compliance_report.approval_status.value,
                    "violations": [
                        {
                            "rule_id": v.rule_id,
                            "level": v.level.value,
                            "message": v.message
                        } for v in compliance_report.violations
                    ]
                }
            }
        
        logger.info(f"[CONDUCTOR] Task {task_id} APPROVED by compliance verifier (Status: {compliance_report.approval_status.value})")
        
        # STEP 3: Prepare execution context (ONLY if compliance approved)
        execution_context = {
            "task_id": task_id,
            "approved": True,
            "task_description": task_description,
            "recommended_model": decision["recommended_model"],
            "complexity": decision["complexity"],
            "wisdom_applied": decision["wisdom_applied"],
            "estimated_tokens": decision["estimated_tokens"],
            "action": "EXECUTE",
            "stage": "EXECUTION",
            "compliance_approved": True,
            "compliance_report_id": compliance_report.report_id,
            "compliance_status": compliance_report.approval_status.value,
            "metrics": {
                "start_time": time.time(),
                "socratic_checks": decision["checks"],
                "compliance_checks": {
                    "violations_count": len(compliance_report.violations),
                    "warnings_count": len(compliance_report.warnings),
                    "auto_approved": compliance_report.approval_status == ApprovalStatus.AUTO_APPROVED
                }
            }
        }
        
        logger.info(f"[CONDUCTOR] Task {task_id} ready for execution")
        return execution_context


conductor = HeadyConductor()
