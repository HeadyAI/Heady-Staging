---
name: heady-skill-foundry
description: Design, build, and package installable Heady skill packs for Buddy, IDE, and Web surfaces. Use when creating new action packs, defining skill manifests, wiring skills into the Heady registry, or planning a skill marketplace strategy.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Skill Foundry

Use this skill when you need to **design, build, test, or package installable skill packs** for the Heady ecosystem. The Skill Foundry covers the full lifecycle from concept to registry entry.

## When to Use This Skill

- You are creating a new Heady action pack for Buddy, IDE, or Web
- You need to define a skill manifest with triggers, permissions, and capabilities
- You want to plan a skill marketplace or registry architecture
- You are wiring a new skill into Heady's dynamic module system
- You need to validate that a skill pack meets Heady packaging standards

## Instructions

### 1. Define the Skill Concept

Clearly articulate:

- **Skill name** — lowercase, hyphenated, descriptive (e.g., `code-quality-check`)
- **Target surface(s)** — Buddy, IDE, Web, or cross-surface
- **Trigger conditions** — when should this skill activate? (keywords, context signals, explicit invocation)
- **Capability summary** — what does the skill do in 1-2 sentences?

### 2. Design the Skill Manifest

Every Heady skill pack requires a manifest that defines:

```yaml
name: skill-name
version: "1.0"
surfaces: [buddy, ide, web]
triggers:
  keywords: ["relevant", "trigger", "words"]
  contexts: ["when-coding", "when-reviewing"]
permissions:
  required: ["read-files", "execute-code"]
  optional: ["write-files", "network-access"]
capabilities:
  - name: primary-action
    description: What the main action does
    parameters:
      - name: input
        type: string
        required: true
dependencies:
  tools: ["heady-coder", "heady-memory"]
  models: []
```

### 3. Write the Skill Instructions

Create clear, reusable instructions that any Heady agent can follow:

- Step-by-step workflow with decision points
- Input validation rules
- Output format specifications
- Error handling guidance
- Chaining patterns with other Heady tools

### 4. Define Permission Requirements

Map each skill action to the Heady permission model:

| Action | Permission | Scope | Justification |
|--------|-----------|-------|---------------|
| Read context | `read-files` | Current workspace | Needed to analyze code |
| Execute tool | `execute-code` | Sandboxed | Runs generated code safely |

### 5. Package the Skill

Structure the skill pack directory:

```
skill-name/
├── SKILL.md          # Main instructions and frontmatter
├── manifest.yaml     # Machine-readable manifest
├── examples/         # Usage examples
│   └── basic.md
└── tests/            # Validation tests
    └── smoke.md
```

### 6. Register in the Skill Registry

Prepare the registry entry:

- Category classification (coding, data, productivity, security, etc.)
- Search keywords for discovery
- Compatibility matrix (surfaces, OS versions)
- Dependency graph

### 7. Validate the Skill Pack

Before publishing:

- Verify manifest schema compliance
- Confirm all referenced tools exist
- Test trigger conditions fire correctly
- Validate permission scopes are minimal and justified
- Run example scenarios end-to-end

## Tips

- **One skill, one job** — skills should be focused and composable, not monolithic
- **Permissions are minimal** — request only what the skill actually needs
- **Think about discovery** — write descriptions and keywords that help agents find the right skill
- **Version from day one** — use semantic versioning so updates don't break consumers
- **Test on all target surfaces** — a Buddy skill and a Web skill have different interaction patterns
