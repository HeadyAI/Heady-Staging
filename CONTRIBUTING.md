# Contributing to Heady™ Latent OS

Thank you for your interest in contributing to the Heady ecosystem. This document outlines the standards and workflow for contributions.

## Architecture

Heady is a sovereign AI platform built on:
- **Node.js / Express** — Dynamic site server
- **HTML/CSS/JS** — No React/Vue/Angular
- **Cloud Run (GCP)** — Production deployment
- **Cloudflare** — DNS, CDN, edge security
- **Sacred Geometry Topology** — phi-scaled orchestration

## Development Standards

### Code Quality
- Zero `TODO`, `FIXME`, or placeholder comments
- Zero `localhost` references — use environment variables
- All inputs validated, all secrets externalized
- Structured JSON logging with correlation IDs
- ESLint compliance with max 50 warnings

### Design & Branding
- **Dark mode** with sacred geometry backgrounds
- **Phi-scaled typography** — golden ratio proportions
- **Glassmorphism** — backdrop-blur, subtle borders
- **Color palette** — purple/blue/cyan (#6C3CE1, #00D4FF, #7C3AED)
- **Brand voice** — Premium, cutting-edge, technically sophisticated but approachable

### Security
- No hardcoded secrets (API keys, tokens, passwords)
- DOMPurify for all user-generated content
- Security headers on all responses
- WCAG AA accessibility compliance

## Workflow

1. **Fork** the repository
2. **Create a branch** from `main` — `feature/your-feature` or `fix/your-fix`
3. **Write code** following the standards above
4. **Test locally** — `node src/core/dynamic-site-server.js`
5. **Open a PR** against `main` with a clear description
6. **CI checks** must pass (lint, security scan, module loading)
7. **Code review** by @erichaywood

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add headyfinance.com content sections
fix: resolve protobufjs vulnerability override
docs: update README with Wave 4 changes
chore: clean up archived dependencies
```

## Reporting Issues

Use the issue templates provided:
- **Bug Report** — for broken functionality
- **Feature Request** — for new capabilities
- **Security Vulnerability** — email security@headysystems.com directly

## Questions?

Open a discussion or reach out to eric@headyconnection.org.

---

© 2026 HeadySystems Inc. — All rights reserved.
