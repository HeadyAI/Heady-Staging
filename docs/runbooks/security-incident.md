# Runbook: Security Incident

## Symptom
Prompt injection detected (AGENT_5002), autonomy guardrail triggered (AGENT_5003), or CSP violation spike.

## Diagnosis
1. Check prompt injection analytics: `GET /guard/analytics`
2. Check guardrail escalations: `GET /guardrails/escalations`
3. Check CSP violations: `GET /csp/analytics`
4. Review audit log: `GET /guardrails/audit`

## Immediate Actions
### Prompt Injection Detected
1. Review detected patterns and severity
2. If CRITICAL: block the user session immediately
3. Sanitize and log the malicious input
4. Review if any output was compromised (canary token check)

### Autonomy Guardrail Triggered
1. Review the escalation details
2. Agent action requires human approval — review and approve/deny
3. If agent exceeded 21 autonomous actions: perform human check-in
4. Review agent trust score

### CSP Violation Spike
1. Check most-violated directives
2. If script-src violations: potential XSS attempt
3. Update CSP if legitimate sources are being blocked
4. If attack: block source IPs at Cloudflare WAF

## Post-Incident
1. Log incident in error codes system
2. Update guardrail rules if needed
3. Review SBOM for any compromised dependencies
