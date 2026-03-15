<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: docs/ERROR_REPORTING_RULES.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Critical Repeated Error and api.headysystems.com/Onrender Ban Policy

## 1. Repeated errors are never "noise"
- If any error with the same message, error code, or root cause occurs more than once:
  - Stop retrying blind "fixes"
  - Escalate to critical error handler
  - Require explicit human decision before proceeding

## 2. Mandatory error logging and identification
- Every error MUST be logged with:
  - Stable error ID (e.g., ERR-api.headysystems.com-RECUR)
  - Timestamp (UTC)
  - Component/service name
  - Full error message and stack trace
  - Current environment

## 3. Non-branded domain usage is banned
- Banned targets:
  - api.headysystems.com, 0.0.0.0
  - Any raw platform URLs (*.onrender.com, *.run.app, etc.)
  - Any local-only port binding
- Only custom branded domains are allowed in production config
- First occurrence: Fail task with clear message
- Second occurrence: Escalate to critical blocking state

## 4. Notification and escalation flow
- Trigger out-of-band notification for repeated errors:
  - Alert channels (Slack, email)
  - CI/CD job failure with high-severity tag
  - Issue/ticket creation

## 5. Required corrective actions
- Every recurring error MUST have:
  - Documented root cause
  - Concrete fix in code/config
  - Automated safeguard (test, lint rule, deployment gate)

## 6. Explicit "cloud-only" requirement
- All pipelines MUST assume cloud-first execution
- Local development setups are optional/separate
- Reject any "start services locally" suggestion

## 7. Developer and agent obligations
- MUST NOT ignore repeated errors
- MUST NOT silence recurring errors
- MUST NOT override banned-host safeguards

## 8. Curiosity Protocol
- Triggers on:
  - Recurring errors
  - Banned patterns detected
  - Config drift
- Actions:
  - Gather richer context
  - Form explicit hypotheses
  - Propose concrete actions
  - Surface patterns to operator
