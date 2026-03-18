# New Heady Skills Summary

Created: 2026-03-17

10 Perplexity-compatible skill packages for the Heady ecosystem. All validated with `agentskills validate`.

## Skills

| # | Skill | Purpose |
|---|-------|---------|
| 1 | **heady-feature-forge** | Design and spec new Heady platform features end-to-end — user stories, architecture, API surface, data models, and acceptance criteria |
| 2 | **heady-skill-foundry** | Design, build, and package installable Heady skill packs for Buddy, IDE, and Web surfaces with manifests, permissions, and registry integration |
| 3 | **heady-buddy-permission-ops** | Design and manage the permission graph and delegation vault — scoping AI companion access, building delegation chains, and consent flows |
| 4 | **heady-memory-ledger-design** | Architect the Memory Ledger with temporal indexing, privacy controls, retention policies, and audit-ready access logging |
| 5 | **heady-liquid-module-design** | Design the Liquid Module Registry for dynamic discovery, delivery, and hot-loading of apps, connectors, skills, and workflows at runtime |
| 6 | **heady-manager-surface-design** | Design the Mission Control Manager Surface — unified dashboard for agent orchestration, task monitoring, permission management, and system health |
| 7 | **heady-cross-device-handoff** | Design the Cross-Device Handoff Mesh for seamless task and context transfer between Android, desktop, and web surfaces |
| 8 | **heady-trust-receipts** | Design Trust Receipts and Action Playback for auditability — action logging, decision replay, consent records, and compliance reporting |
| 9 | **heady-arena-productization** | Productize the Heady Arena for multi-model comparison and intelligent route selection with evaluation frameworks, leaderboards, and arena-as-a-service |
| 10 | **heady-projection-composer** | Design the Projection Composer for context-driven UI/app delivery — adaptive interfaces that reshape based on user intent and device |

## Directory Structure

```
new-heady-skills/
├── SUMMARY.md
├── heady-feature-forge/
│   └── SKILL.md
├── heady-skill-foundry/
│   └── SKILL.md
├── heady-buddy-permission-ops/
│   └── SKILL.md
├── heady-memory-ledger-design/
│   └── SKILL.md
├── heady-liquid-module-design/
│   └── SKILL.md
├── heady-manager-surface-design/
│   └── SKILL.md
├── heady-cross-device-handoff/
│   └── SKILL.md
├── heady-trust-receipts/
│   └── SKILL.md
├── heady-arena-productization/
│   └── SKILL.md
└── heady-projection-composer/
    └── SKILL.md
```

## Validation

All 10 skills pass `agentskills validate` successfully.
