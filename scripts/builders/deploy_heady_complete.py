#!/usr/bin/env python3
"""
deploy_heady_complete.py

The Unified Heady Deployment Orchestrator (v6.5.0-Complete).

This script combines the logic of:
1. The Release Wrapper (v6.5.0)
2. The Improvements Applier (Docs, Scripts, Optimization tools)
3. The DX Pack Materializer (Onboarding, Governance, Templates)

It is designed to be run alongside the Core Builder (v6.4.0) and a Drupal Zip file.

Usage:
  python3 deploy_heady_complete.py \
    --slug my-project \
    --apex-domain example.com \
    --drupal-zip ./drupal-11.3.2.zip \
    --core-builder ./build_heady_drupal_project_v6_4_0_*.pycccccccccccaa
"""

import argparse
import base64
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
from typing import Dict, List, Optional, Any

# =============================================================================
# EMBEDDED ASSETS (Documentation & Scripts)
# =============================================================================

ASSETS = {
    # --- DX PACK SOURCE (Canonical) ---
    "docs_source/DX_SOURCE.md": r"""
# Developer Onboarding Checklist

Welcome to Heady! This checklist helps new developers ramp up quickly and ensures a smooth onboarding experience.

## Pre‑onboarding
- [ ] Complete paperwork – sign your employment agreement, non‑disclosure agreement (NDA) and any other required documents.
- [ ] Prepare your hardware – make sure you have a laptop or desktop and request any peripherals you need. Ensure you can access the VPN, email, issue tracker and messaging tools.
- [ ] Review the itinerary – you will receive an onboarding itinerary outlining meetings and training sessions for your first week.

## First Day
- [ ] Meet your manager and team – join the daily stand‑up to introduce yourself.
- [ ] Meet your onboarding buddy – you will be paired with a buddy who can answer questions.
- [ ] Get access to tools – request accounts for GitHub, the CI/CD pipeline, internal dashboards.

## Week 1
- [ ] Set up your development environment – follow the README.md and any environment setup scripts.
- [ ] Review the architecture – read the system overview documentation.
- [ ] Time to first commit – with help from your buddy, make a small change and open your first pull request.
- [ ] Regular check‑ins – meet with your manager and buddy several times.

## First Month
- [ ] Incremental contributions – take on progressively larger tasks.
- [ ] Training sessions – attend onboarding sessions on security practices.
- [ ] Documentation review – read the Contributing Guide, Docs Style Guide and API Style Guide.
- [ ] Regular 1:1s – schedule weekly meetings with your manager.

## Ongoing
- [ ] Participate in reviews – review other developers’ pull requests.
- [ ] Contribute to documentation – update or add to the documentation whenever you notice missing info.
- [ ] Seek help early – if you’re stuck, ask questions.

# Contributing Guide

Thank you for considering contributing to Heady!

## Table of Contents
- Code of Conduct
- Reporting Bugs
- Suggesting Enhancements
- Development Environment
- Testing
- Coding Standards
- Commit Messages
- Pull Requests

## Code of Conduct
Our community abides by a Code of Conduct to ensure a welcoming and inclusive environment.

## Reporting Bugs
1. Search existing issues.
2. Use the Bug report issue template.
3. If you have a patch, open a pull request.

## Development Environment
1. Fork and clone the repository.
2. Install required tools (Docker, Node, PHP).
3. Install dependencies (`npm install`, `composer install`).
4. Install pre-commit hooks: `pip install pre-commit && pre-commit install`.

## Testing
- All new functionality must include unit tests.
- Run the test suite locally before submitting a PR.

## Coding Standards
- Follow the API Style Guide.
- Adhere to .editorconfig and .pre-commit-config.yaml.

# Release Notes – Version x.y.z (yyyy‑mm‑dd)

## Summary
Provide a high‑level overview of the release.

## Highlights
- **New features**
- **Enhancements**
- **Bug fixes**

## Detailed Changes
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

# API Style Guide

## General Principles
- **Consistency**
- **Versioning** (e.g., /v1/users)
- **Resource‑oriented design**
- **Statelessness**

## HTTP Methods
- GET, POST, PUT, PATCH, DELETE

## Error Handling
Return standard HTTP codes (200, 201, 400, 401, 403, 404, 500) and consistent JSON error bodies.

# Documentation Style Guide

## General Guidelines
- Write in plain Markdown.
- Start with H1.
- Use friendly, professional tone.

# Issue Template: bug_report.md
---
name: Bug report
about: Create a report to help us improve
title: "[BUG] "
labels: bug
assignees: ''
---

**Description**
A clear and concise description of what the bug is.

**Steps To Reproduce**
Steps to reproduce the behaviour:
1. Go to '...'
2. Run '...'
3. See error

**Expected Behaviour**
A clear description of expected results.

**Actual Behaviour**
What actually happened.

**Environment**
- Version:
- Browser/Client:
- OS:

# Issue Template: feature_request.md
---
name: Feature request
about: Suggest an idea for this project
title: "[FEATURE] "
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem?**
Describe the problem.

**Describe The Solution You Would Like**
Describe the solution.

**Describe Alternatives You've Considered**
Describe alternatives.

# Issue Template: docs_improvement.md
---
name: Documentation improvement
about: Suggest updates or fixes to our documentation
title: "[DOCS] "
labels: documentation
assignees: ''
---

**Existing Document**
Link to document.

**Describe The Improvement**
What needs to change?

# Pull Request Template

## Description
Describe the goal of this change. Fixes #123.

## Type Of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Read Contributing Guide
- [ ] Added tests
- [ ] Ran pre-commit
- [ ] Updated docs

# .editorconfig
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
[Makefile]
indent_style = tab
[*.md]
trim_trailing_whitespace = false

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
""",

    # --- OPERATIONAL DOCS ---
    "docs/JWT_ROTATION.md": r"""
# JWT Key Rotation Strategy

## Goals
* **Confidentiality:** Prevent unauthorized tokens.
* **Continuity:** Zero downtime rotation.
* **Observability:** Audit logs.
* **Automation:** Minimize human error.

## Rotation Schedule
| Frequency | Action |
|---|---|
| **Every 30 days** | Generate new RSA key. Add to JWKS. Mark old as deprecated (7 day grace). |
| **Emergency** | Immediate rotation. Revoke old key. |

## Implementation
1. **Key Gen:** `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096`
2. **Storage:** Vault or K8s Secret.
3. **Issuance:** Sign with newest key (`kid` in header).
4. **Grace Period:** Gateway accepts previous key for X days.
""",

    "docs/LOGGING_SCHEMA.md": r"""
# Structured Logging Schema

Logs should be JSON objects.

| Field | Type | Description |
|---|---|---|
| `timestamp` | RFC 3339 | Time of event |
| `level` | string | debug, info, warn, error |
| `event_type` | string | HTTP_REQUEST, DB_QUERY |
| `request_id` | string | Trace ID |
| `source` | string | Service name (mcp-gateway) |
| `metadata` | object | Context specific data |

## Example
```json
{
  "timestamp": "2026-01-23T18:22:10Z",
  "level": "info",
  "message": "Handled request",
  "event_type": "HTTP_REQUEST",
  "request_id": "71c4a6e7...",
  "source": "mcp-gateway",
  "metadata": { "status": 200, "latency_ms": 42 }
}
