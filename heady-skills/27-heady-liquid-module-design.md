---
name: heady-liquid-module-design
description: Design the Heady Liquid Module Registry for dynamic app, connector, and workflow delivery. Use when architecting module hot-loading, defining connector interfaces, building a plugin marketplace, or planning dynamic delivery of Heady capabilities across surfaces.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Liquid Module Design

Use this skill when you need to **design, extend, or operate the Liquid Module Registry** — Heady's system for dynamic discovery, delivery, and hot-loading of apps, connectors, skills, and workflows at runtime.

## When to Use This Skill

- Architecting the module registry and its storage/discovery layer
- Defining the connector interface contract for third-party integrations
- Designing hot-loading and version management for runtime modules
- Planning a module marketplace with search, ratings, and trust signals
- Building dependency resolution for modules that rely on other modules
- Defining the module lifecycle (publish, install, update, deprecate, remove)

## Instructions

### 1. Define the Module Schema

Every Liquid Module has a manifest:

```yaml
module:
  name: module-name
  version: "1.2.0"
  type: app | connector | skill | workflow
  surfaces: [buddy, ide, web, android]
  entry_point: main.md | main.yaml | main.js
  permissions:
    required: [read-local, network-read]
    optional: [write-local]
  dependencies:
    - name: heady-memory
      version: ">=1.0"
    - name: heady-coder
      version: ">=2.0"
  metadata:
    author: author-name
    license: MIT
    tags: [productivity, code-quality]
    description: What this module does
    icon: icon-url
```

### 2. Design the Registry Architecture

The Liquid Module Registry consists of:

| Component | Responsibility |
|-----------|---------------|
| **Catalog** | Searchable index of all published modules |
| **Storage** | Versioned module artifacts (SKILL.md, configs, assets) |
| **Resolver** | Dependency resolution and compatibility checking |
| **Loader** | Hot-loading modules into running Heady sessions |
| **Updater** | Background update checks and migration |
| **Trust** | Verification, signing, and trust scores |

### 3. Define Connector Interfaces

Connectors bridge Heady to external services. Define a standard interface:

```
Connector Interface:
  - authenticate(credentials) → session
  - list_resources(filter) → resource[]
  - read_resource(id) → data
  - write_resource(id, data) → result
  - subscribe(event, callback) → subscription
  - health_check() → status
```

Each connector must implement the base interface plus type-specific extensions (e.g., a Git connector adds `commit`, `push`, `diff`).

### 4. Implement Hot-Loading

Modules are loaded dynamically without restarting Heady:

1. **Discovery** — user or agent requests a capability
2. **Resolution** — registry finds matching modules, resolves dependencies
3. **Download** — artifacts are fetched and cached locally
4. **Validation** — signature verification, permission check
5. **Activation** — module is loaded into the active session
6. **Cleanup** — modules are unloaded when no longer needed or session ends

### 5. Version Management

Follow semantic versioning with compatibility rules:

| Change Type | Version Bump | Backward Compatible |
|-------------|-------------|-------------------|
| Bug fix | Patch (1.0.x) | Yes |
| New feature | Minor (1.x.0) | Yes |
| Breaking change | Major (x.0.0) | No |

**Update policies:**
- Patch updates: auto-install
- Minor updates: notify + auto-install (user can defer)
- Major updates: require explicit user approval

### 6. Build the Marketplace

Module discovery and trust:

- **Search** — full-text + semantic search over module descriptions and tags
- **Categories** — apps, connectors, skills, workflows
- **Trust signals** — verified author, download count, rating, last updated
- **Reviews** — user ratings and comments
- **Compatibility** — filter by surface (Buddy, IDE, Web) and OS version

### 7. Handle Module Lifecycle

```
Draft → Published → [Updated] → Deprecated → Removed
                        ↑
                    Version bump
```

- **Published** modules are discoverable and installable
- **Deprecated** modules show a warning but remain functional
- **Removed** modules are uninstalled on next session start

## Output Format

When designing Liquid Module features, produce:

1. **Module manifest schema**
2. **Registry component architecture**
3. **Connector interface definitions**
4. **Hot-loading sequence diagram** (text-based)
5. **Version and update policy**
6. **Marketplace requirements**

## Tips

- **Modules are ephemeral** — they load and unload dynamically; don't assume persistent state
- **Dependencies must be explicit** — no implicit reliance on other modules being present
- **Permissions propagate** — a module inherits the session's permission scope, not unlimited access
- **Cache aggressively** — module artifacts should be cached locally to minimize load time
- **Sign everything** — modules must be signed; unsigned modules should be flagged and require explicit trust
