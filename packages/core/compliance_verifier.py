"""
HEADY COMPLIANCE VERIFIER v1.0
Module: Final Gateway for All System Changes
Parent Protocol: HEADY_TRUST_FIRST_ARCHITECTURE

The ComplianceVerifier is the LAST GATEWAY before HeadyConductor executes any changes.
It enforces Trust-First Architecture principles and validates all changes against
governance policies, security requirements, and architectural constraints.

Flow: Task -> Conductor (Socratic Check) -> ComplianceVerifier (Final Gateway) -> Execution
"""
import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ComplianceLevel(Enum):
    """Compliance severity levels"""
    CRITICAL = "critical"      # Blocks execution immediately
    HIGH = "high"              # Requires manual approval
    MEDIUM = "medium"          # Auto-approve with logging
    LOW = "low"                # Auto-approve
    INFO = "info"              # Informational only


class ViolationType(Enum):
    """Types of compliance violations"""
    SECURITY = "security"
    ARCHITECTURE = "architecture"
    GOVERNANCE = "governance"
    DATA_HANDLING = "data_handling"
    AUDIT = "audit"
    DEPENDENCY = "dependency"
    PERFORMANCE = "performance"
    DOCUMENTATION = "documentation"


class ApprovalStatus(Enum):
    """Approval workflow statuses"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_APPROVED = "auto_approved"
    REQUIRES_HUMAN = "requires_human"
    EXPIRED = "expired"


class ComplianceRule(BaseModel):
    """Individual compliance rule definition"""
    rule_id: str
    name: str
    description: str
    level: ComplianceLevel
    violation_type: ViolationType
    pattern: Optional[str] = None
    validator_function: Optional[str] = None
    auto_approve_allowed: bool = False
    enabled: bool = True
    metadata: Dict[str, Any] = {}


class ComplianceViolation(BaseModel):
    """Detected compliance violation"""
    violation_id: str
    rule_id: str
    level: ComplianceLevel
    violation_type: ViolationType
    message: str
    context: Dict[str, Any] = {}
    detected_at: str = ""
    can_auto_fix: bool = False
    fix_suggestion: Optional[str] = None


class ComplianceReport(BaseModel):
    """Compliance verification report"""
    report_id: str
    task_id: str
    timestamp: str
    approved: bool
    approval_status: ApprovalStatus
    violations: List[ComplianceViolation] = []
    warnings: List[str] = []
    passed_checks: List[str] = []
    metadata: Dict[str, Any] = {}
    approval_reason: str = ""
    requires_human_review: bool = False
    auto_fix_available: bool = False


@dataclass
class ComplianceContext:
    """Context for compliance verification"""
    task_id: str
    task_description: str
    task_type: str = "unknown"
    affected_files: List[str] = field(default_factory=list)
    affected_services: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    security_level: str = "high"
    requires_audit: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


class RuleEngine:
    """Compliance rule engine for validation"""
    
    def __init__(self):
        self.rules: List[ComplianceRule] = []
        self._load_default_rules()
        
    def _load_default_rules(self):
        """Load default compliance rules"""
        self.rules = [
            # CRITICAL SECURITY RULES
            ComplianceRule(
                rule_id="SEC-001",
                name="No Hardcoded Secrets",
                description="Prevent hardcoded API keys, passwords, or tokens",
                level=ComplianceLevel.CRITICAL,
                violation_type=ViolationType.SECURITY,
                pattern=r"(api[_-]?key|password|secret|token)\s*=\s*['\"][^'\"]+['\"]",
                auto_approve_allowed=False
            ),
            ComplianceRule(
                rule_id="SEC-002",
                name="Require Encryption",
                description="All data handling must use encryption",
                level=ComplianceLevel.CRITICAL,
                violation_type=ViolationType.SECURITY,
                auto_approve_allowed=False
            ),
            ComplianceRule(
                rule_id="SEC-003",
                name="No SQL Injection Patterns",
                description="Prevent SQL injection vulnerabilities",
                level=ComplianceLevel.CRITICAL,
                violation_type=ViolationType.SECURITY,
                pattern=r"(execute|query)\s*\(\s*['\"].*\+.*['\"]",
                auto_approve_allowed=False
            ),
            
            # ARCHITECTURE RULES
            ComplianceRule(
                rule_id="ARCH-001",
                name="Trust-First Architecture",
                description="All changes must comply with Trust-First principles",
                level=ComplianceLevel.HIGH,
                violation_type=ViolationType.ARCHITECTURE,
                auto_approve_allowed=False
            ),
            ComplianceRule(
                rule_id="ARCH-002",
                name="Glass Box Mandate",
                description="All operations must emit governance logs",
                level=ComplianceLevel.HIGH,
                violation_type=ViolationType.ARCHITECTURE,
                auto_approve_allowed=True
            ),
            ComplianceRule(
                rule_id="ARCH-003",
                name="Zero-Start Rule",
                description="Services must start in provisioning state",
                level=ComplianceLevel.HIGH,
                violation_type=ViolationType.ARCHITECTURE,
                auto_approve_allowed=True
            ),
            
            # GOVERNANCE RULES
            ComplianceRule(
                rule_id="GOV-001",
                name="Audit Logging Required",
                description="All state changes must be audited",
                level=ComplianceLevel.HIGH,
                violation_type=ViolationType.GOVERNANCE,
                auto_approve_allowed=True
            ),
            ComplianceRule(
                rule_id="GOV-002",
                name="Corporate Domain Separation",
                description="HeadySystems and HeadyConnection must remain separated",
                level=ComplianceLevel.HIGH,
                violation_type=ViolationType.GOVERNANCE,
                auto_approve_allowed=False
            ),
            
            # DATA HANDLING RULES
            ComplianceRule(
                rule_id="DATA-001",
                name="Data Scope Validation",
                description="Data must be classified as PUBLIC/PRIVATE/SECRET",
                level=ComplianceLevel.MEDIUM,
                violation_type=ViolationType.DATA_HANDLING,
                auto_approve_allowed=True
            ),
            ComplianceRule(
                rule_id="DATA-002",
                name="PII Protection",
                description="Personal Identifiable Information must be protected",
                level=ComplianceLevel.CRITICAL,
                violation_type=ViolationType.DATA_HANDLING,
                auto_approve_allowed=False
            ),
            
            # DEPENDENCY RULES
            ComplianceRule(
                rule_id="DEP-001",
                name="Dependency Security Scan",
                description="All dependencies must pass security scan",
                level=ComplianceLevel.HIGH,
                violation_type=ViolationType.DEPENDENCY,
                auto_approve_allowed=False
            ),
            ComplianceRule(
                rule_id="DEP-002",
                name="Version Pinning",
                description="Dependencies must use pinned versions",
                level=ComplianceLevel.MEDIUM,
                violation_type=ViolationType.DEPENDENCY,
                auto_approve_allowed=True
            ),
            
            # PERFORMANCE RULES
            ComplianceRule(
                rule_id="PERF-001",
                name="Resource Limits",
                description="Tasks must define resource limits",
                level=ComplianceLevel.MEDIUM,
                violation_type=ViolationType.PERFORMANCE,
                auto_approve_allowed=True
            ),
            
            # DOCUMENTATION RULES
            ComplianceRule(
                rule_id="DOC-001",
                name="Change Documentation",
                description="Significant changes must be documented",
                level=ComplianceLevel.LOW,
                violation_type=ViolationType.DOCUMENTATION,
                auto_approve_allowed=True
            )
        ]
        
    def get_rule(self, rule_id: str) -> Optional[ComplianceRule]:
        """Get rule by ID"""
        for rule in self.rules:
            if rule.rule_id == rule_id:
                return rule
        return None
        
    def get_rules_by_level(self, level: ComplianceLevel) -> List[ComplianceRule]:
        """Get all rules of a specific level"""
        return [r for r in self.rules if r.level == level and r.enabled]
        
    def get_rules_by_type(self, violation_type: ViolationType) -> List[ComplianceRule]:
        """Get all rules of a specific type"""
        return [r for r in self.rules if r.violation_type == violation_type and r.enabled]


class ComplianceVerifier:
    """
    Final Gateway for All System Changes
    
    This is the LAST checkpoint before HeadyConductor executes any task.
    It enforces all governance policies, security requirements, and architectural constraints.
    """
    
    def __init__(self, config_path: Optional[Path] = None, audit_path: Optional[Path] = None):
        self.config_path = config_path or Path(__file__).resolve().parents[1] / "config" / "compliance_config.json"
        self.audit_path = audit_path or Path(__file__).resolve().parents[1] / "infrastructure" / "compliance_audit.jsonl"
        self.rule_engine = RuleEngine()
        self.config = self._load_config()
        self.pending_approvals: Dict[str, ComplianceReport] = {}
        
    def _load_config(self) -> Dict[str, Any]:
        """Load compliance configuration"""
        if not self.config_path.exists():
            return self._get_default_config()
        try:
            return json.loads(self.config_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to load compliance config: {e}")
            return self._get_default_config()
            
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default compliance configuration"""
        return {
            "version": "1.0",
            "enabled": True,
            "strict_mode": True,
            "auto_approve_low_risk": True,
            "require_human_for_critical": True,
            "approval_timeout_seconds": 3600,
            "blocked_patterns": [
                "rm -rf /",
                "drop database",
                "delete all",
                "format drive",
                "expose secret"
            ],
            "trusted_sources": [
                "orchestrator",
                "conductor",
                "governance"
            ],
            "audit_retention_days": 90
        }
        
    def verify(self, context: ComplianceContext) -> ComplianceReport:
        """
        MAIN VERIFICATION ENTRY POINT
        
        This is called by HeadyConductor before executing any task.
        Returns a ComplianceReport with approval status.
        """
        report_id = f"compliance_{int(time.time() * 1000)}"
        timestamp = datetime.now().isoformat()
        
        violations: List[ComplianceViolation] = []
        warnings: List[str] = []
        passed_checks: List[str] = []
        
        # Run all compliance checks
        violations.extend(self._check_security(context))
        violations.extend(self._check_architecture(context))
        violations.extend(self._check_governance(context))
        violations.extend(self._check_data_handling(context))
        violations.extend(self._check_dependencies(context))
        
        # Determine approval status
        approval_status, approval_reason = self._determine_approval(violations, context)
        
        # Check if auto-fix is available
        auto_fix_available = any(v.can_auto_fix for v in violations)
        
        # Create report
        report = ComplianceReport(
            report_id=report_id,
            task_id=context.task_id,
            timestamp=timestamp,
            approved=(approval_status in [ApprovalStatus.APPROVED, ApprovalStatus.AUTO_APPROVED]),
            approval_status=approval_status,
            violations=violations,
            warnings=warnings,
            passed_checks=passed_checks,
            approval_reason=approval_reason,
            requires_human_review=(approval_status == ApprovalStatus.REQUIRES_HUMAN),
            auto_fix_available=auto_fix_available,
            metadata={
                "context": context.__dict__,
                "config": self.config
            }
        )
        
        # Audit the verification
        self._audit_verification(report)
        
        # Store pending if requires human review
        if approval_status == ApprovalStatus.REQUIRES_HUMAN:
            self.pending_approvals[report_id] = report
            
        return report
        
    def _check_security(self, context: ComplianceContext) -> List[ComplianceViolation]:
        """Check security compliance"""
        violations = []
        
        # Check for hardcoded secrets
        rule = self.rule_engine.get_rule("SEC-001")
        if rule and rule.pattern:
            pattern = re.compile(rule.pattern, re.IGNORECASE)
            if pattern.search(context.task_description):
                violations.append(ComplianceViolation(
                    violation_id=f"viol_{int(time.time() * 1000)}",
                    rule_id=rule.rule_id,
                    level=rule.level,
                    violation_type=rule.violation_type,
                    message="Potential hardcoded secret detected in task description",
                    detected_at=datetime.now().isoformat(),
                    can_auto_fix=False,
                    fix_suggestion="Use environment variables or secret management system"
                ))
                
        # Check encryption requirement
        if context.security_level == "high":
            if "encrypt" not in context.task_description.lower():
                rule = self.rule_engine.get_rule("SEC-002")
                if rule:
                    violations.append(ComplianceViolation(
                        violation_id=f"viol_{int(time.time() * 1000)}",
                        rule_id=rule.rule_id,
                        level=ComplianceLevel.MEDIUM,
                        violation_type=rule.violation_type,
                        message="High security task should explicitly mention encryption",
                        detected_at=datetime.now().isoformat(),
                        can_auto_fix=False,
                        fix_suggestion="Add encryption requirements to task description"
                    ))
                    
        return violations
        
    def _check_architecture(self, context: ComplianceContext) -> List[ComplianceViolation]:
        """Check architectural compliance"""
        violations = []
        
        # Check Glass Box Mandate
        keywords = ["log", "audit", "governance", "emit"]
        if not any(kw in context.task_description.lower() for kw in keywords):
            rule = self.rule_engine.get_rule("ARCH-002")
            if rule and context.task_type in ["build", "deploy", "modify"]:
                violations.append(ComplianceViolation(
                    violation_id=f"viol_{int(time.time() * 1000)}",
                    rule_id=rule.rule_id,
                    level=ComplianceLevel.MEDIUM,
                    violation_type=rule.violation_type,
                    message="Task should emit governance logs (Glass Box Mandate)",
                    detected_at=datetime.now().isoformat(),
                    can_auto_fix=True,
                    fix_suggestion="Add governance logging to task implementation"
                ))
                
        return violations
        
    def _check_governance(self, context: ComplianceContext) -> List[ComplianceViolation]:
        """Check governance compliance"""
        violations = []
        
        # Check corporate domain separation
        if "headysystems" in context.task_description.lower() and "headyconnection" in context.task_description.lower():
            rule = self.rule_engine.get_rule("GOV-002")
            if rule:
                violations.append(ComplianceViolation(
                    violation_id=f"viol_{int(time.time() * 1000)}",
                    rule_id=rule.rule_id,
                    level=rule.level,
                    violation_type=rule.violation_type,
                    message="Task affects both HeadySystems and HeadyConnection domains",
                    detected_at=datetime.now().isoformat(),
                    can_auto_fix=False,
                    fix_suggestion="Split task into separate domain-specific tasks"
                ))
                
        return violations
        
    def _check_data_handling(self, context: ComplianceContext) -> List[ComplianceViolation]:
        """Check data handling compliance"""
        violations = []
        
        # Check for PII patterns
        pii_patterns = [r"\b\d{3}-\d{2}-\d{4}\b", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"]
        for pattern_str in pii_patterns:
            pattern = re.compile(pattern_str)
            if pattern.search(context.task_description):
                rule = self.rule_engine.get_rule("DATA-002")
                if rule:
                    violations.append(ComplianceViolation(
                        violation_id=f"viol_{int(time.time() * 1000)}",
                        rule_id=rule.rule_id,
                        level=rule.level,
                        violation_type=rule.violation_type,
                        message="Potential PII detected in task description",
                        detected_at=datetime.now().isoformat(),
                        can_auto_fix=False,
                        fix_suggestion="Remove PII or use data masking"
                    ))
                    break
                    
        return violations
        
    def _check_dependencies(self, context: ComplianceContext) -> List[ComplianceViolation]:
        """Check dependency compliance"""
        violations = []
        
        if context.dependencies:
            # Check for unpinned versions
            for dep in context.dependencies:
                if "*" in dep or "latest" in dep.lower():
                    rule = self.rule_engine.get_rule("DEP-002")
                    if rule:
                        violations.append(ComplianceViolation(
                            violation_id=f"viol_{int(time.time() * 1000)}",
                            rule_id=rule.rule_id,
                            level=rule.level,
                            violation_type=rule.violation_type,
                            message=f"Dependency '{dep}' uses unpinned version",
                            detected_at=datetime.now().isoformat(),
                            can_auto_fix=True,
                            fix_suggestion="Pin dependency to specific version"
                        ))
                        
        return violations
        
    def _determine_approval(self, violations: List[ComplianceViolation], context: ComplianceContext) -> Tuple[ApprovalStatus, str]:
        """Determine approval status based on violations"""
        
        # Check for critical violations
        critical_violations = [v for v in violations if v.level == ComplianceLevel.CRITICAL]
        if critical_violations:
            return ApprovalStatus.REJECTED, f"CRITICAL violations detected: {len(critical_violations)} issues must be resolved"
            
        # Check for high violations
        high_violations = [v for v in violations if v.level == ComplianceLevel.HIGH]
        if high_violations and self.config.get("require_human_for_critical", True):
            return ApprovalStatus.REQUIRES_HUMAN, f"HIGH severity violations require human review: {len(high_violations)} issues"
            
        # Check for medium violations
        medium_violations = [v for v in violations if v.level == ComplianceLevel.MEDIUM]
        if medium_violations:
            if self.config.get("auto_approve_low_risk", True):
                return ApprovalStatus.AUTO_APPROVED, f"AUTO-APPROVED with {len(medium_violations)} medium severity warnings"
            else:
                return ApprovalStatus.REQUIRES_HUMAN, f"Medium violations require review in strict mode"
                
        # No violations
        return ApprovalStatus.APPROVED, "All compliance checks passed"
        
    def _audit_verification(self, report: ComplianceReport):
        """Audit the compliance verification"""
        try:
            self.audit_path.parent.mkdir(parents=True, exist_ok=True)
            
            audit_entry = {
                "timestamp": datetime.now().isoformat(),
                "report_id": report.report_id,
                "task_id": report.task_id,
                "approved": report.approved,
                "approval_status": report.approval_status.value,
                "violation_count": len(report.violations),
                "critical_count": len([v for v in report.violations if v.level == ComplianceLevel.CRITICAL]),
                "high_count": len([v for v in report.violations if v.level == ComplianceLevel.HIGH])
            }
            
            with open(self.audit_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(audit_entry) + "\n")
                
        except Exception as e:
            logger.error(f"Failed to audit verification: {e}")
            
    def approve_pending(self, report_id: str, approver: str, reason: str) -> bool:
        """Manually approve a pending compliance report"""
        if report_id not in self.pending_approvals:
            return False
            
        report = self.pending_approvals[report_id]
        report.approved = True
        report.approval_status = ApprovalStatus.APPROVED
        report.approval_reason = f"Manually approved by {approver}: {reason}"
        report.metadata["approver"] = approver
        report.metadata["approval_timestamp"] = datetime.now().isoformat()
        
        # Re-audit with approval
        self._audit_verification(report)
        
        # Remove from pending
        del self.pending_approvals[report_id]
        
        logger.info(f"Compliance report {report_id} approved by {approver}")
        return True
        
    def reject_pending(self, report_id: str, rejector: str, reason: str) -> bool:
        """Manually reject a pending compliance report"""
        if report_id not in self.pending_approvals:
            return False
            
        report = self.pending_approvals[report_id]
        report.approved = False
        report.approval_status = ApprovalStatus.REJECTED
        report.approval_reason = f"Rejected by {rejector}: {reason}"
        report.metadata["rejector"] = rejector
        report.metadata["rejection_timestamp"] = datetime.now().isoformat()
        
        # Re-audit with rejection
        self._audit_verification(report)
        
        # Remove from pending
        del self.pending_approvals[report_id]
        
        logger.info(f"Compliance report {report_id} rejected by {rejector}")
        return True
        
    def get_pending_approvals(self) -> List[ComplianceReport]:
        """Get all pending approval requests"""
        return list(self.pending_approvals.values())
        
    def get_statistics(self) -> Dict[str, Any]:
        """Get compliance statistics"""
        try:
            if not self.audit_path.exists():
                return {"total_verifications": 0}
                
            total = 0
            approved = 0
            rejected = 0
            auto_approved = 0
            
            with open(self.audit_path, "r", encoding="utf-8") as f:
                for line in f:
                    entry = json.loads(line.strip())
                    total += 1
                    if entry["approval_status"] == "approved":
                        approved += 1
                    elif entry["approval_status"] == "rejected":
                        rejected += 1
                    elif entry["approval_status"] == "auto_approved":
                        auto_approved += 1
                        
            return {
                "total_verifications": total,
                "approved": approved,
                "rejected": rejected,
                "auto_approved": auto_approved,
                "pending": len(self.pending_approvals),
                "approval_rate": (approved + auto_approved) / total * 100 if total > 0 else 0
            }
        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {"error": str(e)}


# Global instance
verifier = ComplianceVerifier()
