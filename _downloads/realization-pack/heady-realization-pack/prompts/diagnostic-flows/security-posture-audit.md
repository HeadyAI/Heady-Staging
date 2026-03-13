# Security Posture Audit Prompt

> Run this to verify the system's security posture matches PQC-hardened standards.

---

"Heady, perform a comprehensive security audit:

## Network Security
1. Scan ALL configuration files for localhost/127.0.0.1 references
2. Verify ALL external connections use Cloudflare Tunnel (no direct IP exposure)
3. Verify ALL API endpoints require authentication
4. Check CORS configuration — no wildcards in production
5. Verify TLS 1.3 minimum on all connections

## Secret Management
6. Scan ALL code files for hardcoded secrets (API keys, passwords, tokens)
7. Verify ALL secrets come from environment variables or CF Secrets
8. Check that .env files are in .gitignore
9. Verify no secrets appear in logs (structured or otherwise)

## Access Control
10. Verify RBAC is implemented for all administrative operations
11. Check that rate limiting is active (FIB=34/89/233 per minute by tier)
12. Verify session tokens expire (FIB=144 hour maximum)
13. Check that IP+UA binding is enforced for sessions

## Post-Quantum Readiness
14. Are all cryptographic operations using PQC-safe algorithms?
15. Is key rotation automated?
16. Are certificates pinned where appropriate?

## Vulnerability Assessment
17. Run npm audit on all Node.js packages
18. Check for known CVEs in all Docker base images
19. Verify no debug endpoints are exposed in production
20. Check that error messages don't leak implementation details

## Report
For each finding:
- Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO
- Current status: PASS / FAIL / UNKNOWN
- Remediation: exact steps to fix
- Verification: how to prove it's fixed"
