# PROMPT 2: Naming Audit & Consistency Enforcement

## For: Perplexity Computer

## Objective: Eliminate ALL naming errors, enforce consistent naming across the entire Heady ecosystem

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are auditing the Heady™ monorepo (`HeadyMe/Heady-pre-production-9f2f0642`) for naming inconsistencies. Your job is to find and fix EVERY naming error so the system has 100% consistent naming.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md`, `site-registry.yaml`, and `heady-registry.json`.

### AUDIT 1: Package.json Name Consistency

Scan every `package.json` across the monorepo. The canonical npm scope is `@heady-ai/`. Every package must follow this pattern:

```
Root:         heady-systems (no scope — this is the monorepo root)
Services:     @heady-ai/heady-brain, @heady-ai/heady-conductor, etc.
Packages:     @heady-ai/phi-math, @heady-ai/csl-router, etc.
Apps:         @heady-ai/headyweb, @heady-ai/command-center, etc.
```

For each file found:

1. Check if the `name` field uses the `@heady-ai/` scope
2. Check if the version is `3.2.3`
3. Check if internal `dependencies`/`devDependencies` reference the correct scoped names
4. Fix all mismatches

### AUDIT 2: Import/Require Path Naming

Search the entire `src/`, `services/`, `packages/`, `workers/`, and `cloudflare/` directories for:

```
# Bad patterns to find and fix:
require('heady-fetch')        → should use local path or @heady-ai/heady-fetch
require('heady-env')          → should use local path  
require('heady-yaml')         → should use local path
require('../../../heady-*')   → normalize relative paths
import from 'heady-*'         → use @heady-ai/ scope or relative
```

### AUDIT 3: Site Registry Naming

Cross-reference these THREE sources and ensure they all agree:

1. `configs/_domains/site-registry.yaml` (24 properties)
2. `src/sites/site-registry.json` (detailed config)
3. `services/heady-web/sites/` directory listing

For each site, verify:

- `id` is consistent across all three sources
- `slug` matches the id
- `domain` is correctly mapped
- PM2 process names follow pattern `site-{id}`
- Directory paths are consistent

### AUDIT 4: Service Directory Naming

Each service in `services/` must have:

- Directory named `heady-{service}` (lowercase, kebab-case)
- `package.json` with `name: "@heady-ai/heady-{service}"`
- `version: "3.2.3"`
- Main entry file (e.g., `index.js`, `server.js`, or documented in package.json `main`)

### AUDIT 5: GitHub Repo Naming

Map each GitHub repo to its function:

- `{domain}-core` repos → projected from monorepo (headysystems-core, headyos-core, etc.)
- `{domain}-production` repos → live deployment targets
- Template repos should have `template-` prefix
- Archived repos should remain archived

Verify that every active `-core` repo's `package.json` name matches `@heady-ai/{name}`.

### AUDIT 6: Docker & Worker Naming

- Docker service names in `docker-compose.production.yml` must match service directory names
- Docker labels `com.headysystems.service` must match service name
- Cloudflare Worker names in `wrangler.toml` must match directory names
- Worker route patterns must match domain names from site registry

### AUDIT 7: Environment Variable Naming

Scan `.env.template` for naming patterns:

- All vars should be `SCREAMING_SNAKE_CASE`
- Service-specific vars should prefix with service name: `HEADY_BRAIN_*`, `HEADY_MCP_*`
- No deprecated or duplicate variable names

### DELIVERABLES

Create a ZIP file named `02-naming-audit-results.zip` containing:

- `naming-audit-report.md` — Complete audit findings with line numbers
- `naming-fixes.patch` — Git patch file with all fixes applied
- `naming-map.json` — Complete name mapping: `{ "old_name": "new_name" }` for everything changed
- `import-fixes-log.md` — Every require/import path that was corrected
- `consistency-matrix.csv` — Cross-reference table: file → expected name → actual name → status
