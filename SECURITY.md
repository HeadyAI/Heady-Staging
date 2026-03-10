# Security Policy

## Reporting Vulnerabilities

**Do NOT open a public issue.** Email: **security@headysystems.com**

We acknowledge within 48 hours and respond within 7 business days.

## Security Measures
- JWT authentication with configurable expiry
- Bearer token auth for MCP gateway
- Cloudflare Access for zero-trust perimeter
- Rate limiting on all public endpoints
- Input validation + Helmet.js headers
- Dependency auditing via npm audit + Dependabot
- Container images scanned for vulnerabilities
- Memory store isolated per user context
- No PII sent to external providers without consent
