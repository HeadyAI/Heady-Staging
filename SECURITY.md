# Security Policy — HeadySystems Inc.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 4.x     | ✅ Active |
| 3.x     | ⚠️ Critical fixes only |
| < 3.0   | ❌ End of life |

## Reporting a Vulnerability

**Do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities via one of these channels:

- **Email**: security@headysystems.com
- **GitHub Security Advisories**: [Report a vulnerability](https://github.com/HeadyMe/heady-production/security/advisories/new)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | 24 hours |
| Initial assessment | 72 hours |
| Fix development | 7 days (critical) / 30 days (moderate) |
| Public disclosure | After fix is deployed |

## Security Architecture

HeadySystems employs defense-in-depth:

- **Transport**: TLS 1.3, HSTS preload, mTLS between internal services
- **Auth**: Device-based + OAuth 2.0, short-lived tokens, WARP-aware sessions
- **Data**: AES-256-GCM at rest, pgvector row-level security
- **Network**: Cloudflare DDoS protection, WAF, rate limiting
- **Supply chain**: Dependabot, npm audit, signed commits
- **Monitoring**: Sentry error tracking, structured logging, anomaly detection

## Intellectual Property Notice

This codebase contains technology protected by 60+ provisional patents filed by HeadySystems Inc. Unauthorized reproduction of patented methods is prohibited.

© 2026 HeadySystems Inc. All rights reserved.
