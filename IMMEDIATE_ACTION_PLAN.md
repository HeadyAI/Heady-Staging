# IMMEDIATE ACTION PLAN — Heady Systems

> **Priority:** Critical items first, then architecture, then polish
> **Generated:** 2026-02-14 from Deep Scan + Gemini Conversation Expansion

---

## Phase 1: Security Remediation (2 hours)

- [ ] Run `.\scripts\security-remediation.ps1 -DryRun` to preview
- [ ] Run `.\scripts\security-remediation.ps1` to apply fixes
- [ ] Verify `.gitignore` now excludes `.env.hybrid`, `*.pid`, `*.bak`, `*.jsonl`
- [ ] Rotate PostgreSQL password (was `heady_secret` in `docker-compose.full.yml`)
- [ ] Rotate PgAdmin password (was `heady_admin`)
- [ ] Rotate Grafana password (was `heady_grafana`)
- [ ] Rotate IDE default password (was `heady` in `distribution/docker/`)
- [ ] Enable GitHub Dependabot alerts on all Heady repos
- [ ] Enable GitHub Secret Scanning on all Heady repos
- [ ] Fix CORS wildcard fallback in `heady-manager.js:142`
- [ ] Fix admin token timing attack in `heady-manager.js:223` (use `crypto.timingSafeEqual`)
- [ ] Commit: `git commit -m "security: phase 1 complete"`

## Phase 2: Armor Drive Boot Fix (30 min)

- [ ] Run `.\scripts\create_bootable_drive.ps1 -Target Armor -UpdateOnly` (try update first)
- [ ] If update fails: Run `.\scripts\create_bootable_drive.ps1 -Target Armor` (fresh install)
- [ ] Verify ISOs copied to `E:\ISOs\` (Ubuntu 24.04 + Parrot 6.2)
- [ ] Test boot: Restart → BIOS → UEFI: Lexar ARMOR 700
- [ ] Verify Ventoy menu shows ISO list

## Phase 3: Architecture Cleanup (1 week)

### 3a. Remove Duplicate Dependencies

- [ ] Remove `yamljs` from `package.json` — replace all imports with `js-yaml`
- [ ] Remove `yaml-jest` from devDependencies (duplicate of `jest-transform-yaml`)
- [ ] Move `electron` from dependencies to devDependencies
- [ ] Remove `node-fetch` usage — use Node 20 native `fetch()`
- [ ] Run `npm audit fix`

### 3b. Break Up heady-manager.js (76KB → modules)

- [ ] Extract health/pulse routes → `src/routes/health.js`
- [ ] Extract registry routes → `src/routes/registry.js`
- [ ] Extract pipeline routes → `src/routes/pipeline.js`
- [ ] Extract monte-carlo routes → `src/routes/monte-carlo.js`
- [ ] Extract pattern routes → `src/routes/patterns.js`
- [ ] Extract story routes → `src/routes/stories.js`
- [ ] Extract self/critique routes → `src/routes/self.js`
- [ ] Extract admin routes → `src/routes/admin.js`
- [ ] Create `src/middleware/auth.js` for token validation
- [ ] Create `src/middleware/error-handler.js` for global error handling
- [ ] Use `crypto.timingSafeEqual` in auth middleware

### 3c. Separate Python/JS in src/

- [ ] Move `src/__init__.py`, `src/heady_project/` → `python_worker/src/`
- [ ] Update `Dockerfile` and imports accordingly

### 3d. Fix Port Inconsistency

- [ ] `heady-manager.js:134` uses `3301`, docs say `3300` — pick one, use `process.env.PORT`

## Phase 4: CI/CD Hardening (3 days)

- [ ] Add `npm audit` as blocking step in CI pipeline
- [ ] Add CodeQL (SAST) GitHub Action
- [ ] Add TruffleHog secret scanning to pre-commit
- [ ] Configure branch protection on `main` (require PR reviews)
- [ ] Add Docker multi-stage build to `Dockerfile`
- [ ] Add health check endpoint test to CI

## Phase 5: Observability (1 week)

- [ ] Replace `console.log/warn/error` with structured logger (Pino or Winston)
- [ ] Add request ID middleware for distributed tracing
- [ ] Add database connection pool monitoring
- [ ] Add Knex or Prisma for database migrations
- [ ] Create `migrations/` directory with initial schema
- [ ] Configure query logging for development mode

## Phase 6: Product Builds (2 weeks)

### HeadyBuddy (Desktop Overlay)

- [ ] Electron always-on-top window with transparent background
- [ ] Floating pill UI (compact mode)
- [ ] Expand to task dashboard (expanded mode)
- [ ] Screen capture + Claude Vision analysis
- [ ] Voice activation ("Hey Heady") via Web Speech API
- [ ] WebSocket cross-device sync
- [ ] Background task executor (file ops, API calls)

### HeadyAI-IDE

- [ ] Fork VSCode or use extension-only approach
- [ ] Custom product.json branding
- [ ] Heady Dark theme (#7B68EE purple, #FFD700 gold, #1a1a2e deep blue)
- [ ] Built-in HeadyBuddy sidebar extension
- [ ] Pre-configured settings (AI-first keybindings)
- [ ] Build Windows/Linux installers

### HeadyWeb Browser

- [ ] Electron-based browser shell (tabs, address bar, navigation)
- [ ] Built-in HeadyBuddy floating panel
- [ ] Custom new tab page with Heady dashboard
- [ ] Ad/tracker blocking (uBlock Origin filter lists)
- [ ] Bookmark sync via Heady API
- [ ] Privacy-first (no telemetry)

## Phase 7: CLI Expansion

- [ ] Verify `hc --rx` works: `hc --rx "port already in use"`
- [ ] Teach common project-specific patterns: `hc --rx add "pattern" "fix"`
- [ ] Add `hc doctor` — full system diagnostic
- [ ] Add `hc clean` — remove build artifacts, caches, temp files
- [ ] Add `hc backup` — snapshot configs and registry to cloud
- [ ] Add `hc update` — pull latest from all remotes

---

## Tracking

| Phase | Status | ETA |
|-------|--------|-----|
| 1. Security | **READY** — scripts created | 2 hours |
| 2. Armor Boot | **READY** — script updated | 30 min |
| 3. Architecture | Planned | 1 week |
| 4. CI/CD | Planned | 3 days |
| 5. Observability | Planned | 1 week |
| 6. Products | Planned | 2 weeks |
| 7. CLI | **DONE** — hc.js expanded | - |

---

*Generated by Cascade Deep Scan — Heady Systems*
