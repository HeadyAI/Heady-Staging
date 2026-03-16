---
name: heady-dependency-guard
description: Use when monitoring dependency trees for CVEs, generating automated version bump PRs, and ensuring dependency health across all 78 repositories. Keywords include dependency, CVE, security vulnerability, version bump, npm audit, supply chain, Snyk, Dependabot.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: DependencyGuardSwarm
  absorption_source: "§33.4 — Autonomous Maintenance Swarms"
  super_prompt_section: "§33.4"
---

# Heady™ Dependency Guard (DependencyGuardSwarm)

## When to Use This Skill

Use this skill when:
- Scanning dependencies for known CVEs across all repos
- Generating automated version bump PRs with test verification
- Auditing supply chain security (lockfile integrity, typosquatting)
- Enforcing dependency policies (allowed/blocked packages)

## Architecture

### Detection Pipeline

```
1. npm audit / yarn audit across all repos
2. Cross-reference with NVD, GitHub Advisory DB, Snyk DB
3. Classify: Critical / High / Medium / Low
4. For Critical/High: auto-generate bump PR within 1 hour
5. PR includes: version bump + lock file update + test run results
6. Auto-merge if all tests pass; else assign to Eric
```

### Coverage

| Ecosystem | Tool | Repos |
|---|---|---|
| npm | npm audit + Snyk | 60+ |
| Python | pip-audit + Safety | 8 |
| Go | govulncheck | 2 |
| Docker | trivy | All images |

## Instructions

### Running Dependency Audit

1. Enumerate all repos with package manifests
2. Run ecosystem-specific audit tools
3. Deduplicate findings across repos
4. Generate remediation PRs for Critical/High
5. Run CI on each PR to verify no regressions
6. Auto-merge clean PRs, flag others for review
7. Report summary to governance log

## Output Format

- Vulnerability Report (per repo)
- Generated PR URLs
- Test Results Summary
- Supply Chain Risk Score
