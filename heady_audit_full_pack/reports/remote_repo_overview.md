# Repository Overview: remote-headyme-main

**Audit date:** 2026-03-10

## Summary

A large-scale **JavaScript/TypeScript monorepo** for the "Heady" AI agent platform. The repository contains ~14,650 tracked files (excluding `node_modules` and `.git`), organized across ~137 top-level directories. It is a pnpm workspace monorepo with Turborepo orchestration.

## Top-Level Structure

| Directory/File | Purpose |
|---|---|
| `src/` (85 subdirs) | Primary source: bees, agents, orchestration, MCP, pipeline, gateway, services |
| `services/` (58 subdirs) | Microservices: AI router, MCP servers, auth, billing, discord-bot, hive, etc. |
| `packages/` (42 subdirs) | Shared packages: SDK, types, schemas, kernel, orchestrator, bee-factory, MCP |
| `skills/` (25 subdirs) | Claude Code skill definitions (SKILL.md per skill) |
| `configs/` (36 subdirs) | Configuration: pipeline, governance, agent profiles, domains, deployment |
| `workers/` (11 entries) | Cloudflare Workers: edge auth, MCP transport, API gateway |
| `docs/` (41 subdirs) | Documentation, architecture guides, research, patents, audit reports |
| `tests/` (14 subdirs) | Test suites: unit, e2e, semantic-routing, patent, auto-generated |
| `infra/` (19 subdirs) | Terraform, Kubernetes manifests, Cloud Run configs, CI/CD |
| `scripts/` (14 subdirs) | Build scripts, generators, bootstrap, deployment helpers |
| `heady-*` (50+ dirs) | Feature modules: cognition, full-rebuild, latent-os, enterprise, etc. |
| `.agents/` | Agent skill definitions and workflow definitions for Claude/Gemini |
| `.github/` | CI/CD workflows (30+), CODEOWNERS, issue/PR templates, Dependabot |
| `templates/` | Scaffolding templates: MCP servers, swarm bees, projections |
| `Heady-pre-production-9f2f0642-main/` | Embedded pre-production snapshot of the platform |
| `_archive/` | Archived older versions of source, configs, and tests |

## File Distribution by Extension (top 15)

| Extension | Count | Category |
|---|---|---|
| `.js` | 21,141 | Code (JavaScript) |
| `.map` | 7,262 | Source maps |
| `.ts` | 4,526 | Code (TypeScript) |
| `.json` | 3,077 | Config/data |
| `.md` | 3,009 | Documentation |
| `.yaml`/`.yml` | 1,196 | Config/CI |
| `.html` | 384 | Web pages |
| `.mjs` | 365 | ES modules |
| `.mts` | 321 | TS ES modules |
| `.cts` | 267 | CommonJS TS |
| `.sh` | 254 | Shell scripts |
| `.cjs` | 228 | CommonJS JS |
| `.py` | 190 | Python |
| `.css` | 148 | Styles |
| `.jsx`/`.tsx` | 186 | React components |

**Approximate distribution:** ~70% code (JS/TS), ~10% source maps, ~8% config/data (JSON/YAML), ~7% documentation (MD), ~5% other (shell, Python, HTML, CSS, SQL, Terraform).

## Languages & Frameworks

- **Primary:** JavaScript, TypeScript (Node.js runtime)
- **Secondary:** Python (core pipeline, MCP bridge, VSA)
- **Infrastructure:** Terraform, YAML (Kubernetes, Cloud Run, Cloudflare)
- **Package management:** pnpm workspaces + Turborepo
- **Build:** Webpack, TypeScript compiler
- **Test:** Jest
- **Runtime:** PM2 (ecosystem.config.cjs), Cloudflare Workers (Wrangler)
- **Database:** Prisma ORM, SQL migrations (PostgreSQL implied)
- **Frontend:** React (JSX/TSX), CSS
- **CI/CD:** GitHub Actions (30+ workflows), Google Cloud Build

## Notable Root-Level Files

| File | Purpose |
|---|---|
| `CLAUDE.md` (16.5 KB) | Claude Code project conventions and instructions |
| `AGENTS.md` | Agent-specific instructions |
| `SECURITY.md` | Security policy and vulnerability reporting |
| `CONTRIBUTING.md` | Contribution guidelines |
| `.env` / `.env.example` / `.env.template` | Environment configuration (`.env` is committed) |
| `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` | Node.js package management |
| `turbo.json` / `tsconfig.json` | Build system configuration |
| `Dockerfile` / `Dockerfile.production` / `Dockerfile.monorepo` / `Dockerfile.universal` | Container build (4 variants) |
| `docker-compose.yml` / `docker-compose.production.yml` / `docker-compose.full.yml` | Container orchestration |
| `cloudbuild.yaml` | Google Cloud Build pipeline |
| `render.yaml` | Render.com deployment config |
| `ecosystem.config.cjs` | PM2 process manager config |
| `Makefile` | Build automation |
| `renovate.json` | Dependency auto-update config (Renovate) |
| `heady-manager.js` (53 KB) | Core orchestration manager |
| `swarm-coordinator.js` (44 KB) | Swarm coordination logic |
| `bee-factory.js` (27 KB) | Bee agent factory |
| `seventeen-swarm-orchestrator.js` (24 KB) | Multi-swarm orchestrator |
| `csl-engine.js` (34 KB) | Cognitive Semantic Logic engine |
| `mcp-gateway.js` (12 KB) | MCP gateway entry point |
| `tool-registry.js` (8.8 KB) | Tool registration system |
| `heady-registry.json` (46 KB) | Platform service registry |
| `hcfullpipeline.json` (54 KB) | Full pipeline configuration |

## Deployment Targets

- Google Cloud Run (via `cloudbuild.yaml`, `infra/cloud-run/`)
- Cloudflare Workers (8 workers with `wrangler.toml`)
- Kubernetes (`infra/kubernetes/`)
- Render.com (`render.yaml`)
- Docker Compose (local/staging/production)
- PM2 process management
- Terraform for infrastructure provisioning

## Monorepo Topology

The repo is structured as a **pnpm workspace monorepo** with Turborepo for task orchestration. Key workspaces include `packages/*`, `services/*`, `workers/*`, and `apps/*`. There is also an embedded pre-production snapshot (`Heady-pre-production-9f2f0642-main/`) that duplicates much of the structure.
