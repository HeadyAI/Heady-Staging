# START HERE — Heady Systems Master Build Guide

> **For Windsurf/Cascade:** Point to this file for full project context and build instructions.
> **Version:** 3.0.0 | **Updated:** 2026-02-14

---

## Quick Navigation

| Section | What | Time |
|---------|------|------|
| [1. Security First](#1-security-first) | Run remediation before anything else | 15 min |
| [2. Armor Boot Fix](#2-armor-boot-fix) | Fix the Lexar ARMOR 700 Ventoy boot | 30 min |
| [3. HeadyBuddy](#3-headybuddy) | AI companion overlay (desktop + mobile) | 2-3 hrs |
| [4. HeadyAI-IDE](#4-headyai-ide) | Custom IDE from Windsurf/VSCode base | 3-4 hrs |
| [5. HeadyWeb](#5-headyweb) | Custom browser from Chromium + Comet | 4-6 hrs |
| [6. CLI Commands](#6-hc-cli) | `hc` command reference | Reference |
| [7. Deep Scan Findings](#7-deep-scan) | Architecture improvements roadmap | Reference |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADY ECOSYSTEM                          │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  HeadyBuddy  │ HeadyAI-IDE  │   HeadyWeb   │   HeadyOS     │
│  AI Overlay  │  Custom IDE  │   Browser    │  Boot Drive   │
│  (Electron)  │  (VSCode)    │  (Chromium)  │  (Ventoy)     │
├──────────────┴──────────────┴──────────────┴───────────────┤
│              HEADY MANAGER (Node.js MCP Server)             │
│              Port 3301 • Express • Sacred Geometry           │
├─────────────────────────────────────────────────────────────┤
│  Services: Brain | Conductor | Imagination | Monte Carlo    │
│  Infra:    Docker | Cloudflare | Render | GitHub Actions    │
│  Data:     PostgreSQL | Redis | Heady Registry JSON         │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

```powershell
# Required
node -v      # v20+ required
npm -v       # v10+
git --version
docker --version

# Recommended
python3 --version  # 3.12+
pwsh --version     # PowerShell 7+
```

---

## 1. Security First

**Run this BEFORE any other work.** See `DEEP_SCAN_REPORT.md` for full findings.

```powershell
# Dry run first (no changes)
.\scripts\security-remediation.ps1 -DryRun

# Apply fixes
.\scripts\security-remediation.ps1

# Review and commit
git diff
git add -A && git commit -m "security: remove hardcoded secrets and update .gitignore"
```

**Manual steps required:**
- Rotate PostgreSQL password (`heady_secret` is exposed)
- Rotate PgAdmin password (`heady_admin`)
- Rotate Grafana password (`heady_grafana`)
- Enable GitHub Dependabot + Secret Scanning in repo settings

---

## 2. Armor Boot Fix

The Lexar ARMOR 700 (2TB USB SSD) has a corrupted Ventoy install — only 3MB EFI partition (needs 32MB), no Active flag, GRUB loads but can't find boot files.

```powershell
# Option A: Fresh install (FORMATS the drive — backs up nothing)
.\scripts\create_bootable_drive.ps1 -Target Armor

# Option B: Try update-only first (preserves data if possible)
.\scripts\create_bootable_drive.ps1 -Target Armor -UpdateOnly

# The script will:
# 1. Auto-detect the Armor 700
# 2. Install/update Ventoy with proper 32MB EFI partition
# 3. Create ISOs/, Dropzone/, HeadyOS/ folders
# 4. Download Ubuntu 24.04 + Parrot 6.2 ISOs
# 5. Copy ISOs to the drive
# 6. Create ventoy.json config
```

**After install:** Reboot → BIOS (F2/Del) → Set `UEFI: Lexar ARMOR 700` as boot priority.

---

## 3. HeadyBuddy

AI companion overlay that floats above all apps. Think Dynamic Island + Jarvis.

### Architecture

```
┌─────────────────────────────────────────┐
│      FLOATING OVERLAY (Always Visible)  │
│  Compact pill → Expands to dashboard    │
│  Voice: "Hey Heady"                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         INTELLIGENCE LAYER              │
│  Vision AI → Context AI → Action AI    │
│  (See)       (Understand)   (Execute)   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         EXECUTION LAYER                 │
│  UI Automation | API Control | System   │
│  (Visible)     | (Invisible)  | (Bgnd)  │
└─────────────────────────────────────────┘
```

### Build (Desktop — Electron)

```powershell
cd headybuddy
npm install
npm start
```

**Key features to implement:**
- Always-on-top transparent Electron window
- Screen capture analysis (Claude Vision API)
- RobotJS for UI automation (clicks, typing)
- WebSocket for real-time cross-device sync
- Task queue for background operations (API calls, file ops)
- Voice activation ("Hey Heady") via Web Speech API

### Build (Mobile — React Native)

```powershell
cd headybuddy-mobile
npm install
npx react-native run-android
```

**See:** GitHub Issue #48 for full implementation code.

---

## 4. HeadyAI-IDE

Custom IDE built from VSCode/Windsurf with Heady branding and built-in AI.

### Strategy: Configuration-Based Customization

Instead of forking VSCode source, use the **extension + configuration** approach:

1. **Product JSON override** — Custom branding (name, icon, colors)
2. **Built-in extension** — HeadyBuddy sidebar panel
3. **Default settings** — Heady Dark theme, AI-first keybindings
4. **Pre-installed extensions** — ESLint, Prettier, GitLens, Docker, Python

### Build Steps

```powershell
# 1. Clone VSCode (or use windsurf-next as base)
git clone https://github.com/microsoft/vscode.git HeadyAI-IDE
cd HeadyAI-IDE

# 2. Apply Heady branding
#    - Edit product.json: nameShort="HeadyAI-IDE", nameLong="HeadyAI IDE"
#    - Replace icons in resources/
#    - Set theme colors in src/vs/workbench/

# 3. Build
yarn install
yarn run compile

# 4. Package
yarn run gulp vscode-win32-x64-archive   # Windows
yarn run gulp vscode-linux-x64-archive   # Linux
```

### Key Customizations

| File | Change |
|------|--------|
| `product.json` | `nameShort: "HeadyAI-IDE"`, `applicationName: "headyai-ide"` |
| `resources/win32/code.ico` | Heady Sacred Geometry icon |
| `src/vs/workbench/browser/parts/activitybar/` | Add HeadyBuddy icon |
| Theme | Heady Dark: `#7B68EE` (purple), `#FFD700` (gold), `#1a1a2e` (deep blue) |

### Alternative: Extension-Only Approach

Create a VS Code extension that bundles HeadyBuddy:

```powershell
cd extensions/heady-ide-extension
npm install
npx vsce package
# Install: code --install-extension heady-ide-0.1.0.vsix
```

**See:** GitHub Issue #49 for full implementation code.

---

## 5. HeadyWeb

Custom Chromium-based browser with built-in HeadyBuddy.

### Strategy: Chromium + Comet Base

Use Chromium as the rendering engine with Comet-style modifications:

1. **Fork Chromium** (or use a pre-built framework like Electron/CEF)
2. **Add HeadyBuddy** as a built-in sidebar/floating panel
3. **Custom New Tab page** with Heady dashboard
4. **Built-in ad/tracker blocking** (uBlock Origin lists)
5. **Privacy-first** — no telemetry, local-first data

### Practical Build Path (Electron-based)

Full Chromium builds take 6+ hours and 100GB+ disk. The practical path:

```powershell
cd headybrowser-desktop
npm install
npm start
```

This uses Electron (which IS Chromium) with:
- Custom chrome UI (tabs, address bar, navigation)
- HeadyBuddy floating overlay built-in
- Ad blocking via electron-ad-blocker
- Custom new tab page with Heady dashboard
- Bookmark sync via Heady API

### Full Chromium Build Path (Advanced)

```bash
# Only if you want a fully custom browser binary
mkdir chromium && cd chromium
fetch chromium
cd src

# Apply Heady patches
patch -p1 < heady-browser.patch

# Build
gn gen out/HeadyWeb --args='
  is_debug=false
  is_official_build=true
  chrome_pgo_phase=0
  target_cpu="x64"
'
autoninja -C out/HeadyWeb chrome
```

**See:** GitHub Issue #50 for full implementation code.

---

## 6. HC CLI

The `hc` command is your unified interface. Run `hc help` for all commands.

```powershell
hc help              # Show all commands
hc status            # System health check
hc start             # Start heady-manager
hc dev               # Start with nodemon (auto-reload)
hc build             # Build frontend
hc deploy            # Run auto-deploy
hc sync              # Sync all git remotes
hc scan              # Security + lint scan
hc train             # Trigger model training
hc test              # Run test suite
hc lint              # ESLint auto-fix
hc pipeline          # Run HC pipeline
hc realmonitor       # Live system monitoring

# RX — Rapid Execute (learn from repeated errors)
hc --rx "port 3300 already in use"           # Auto-fix known error
hc --rx "module not found"                   # Reinstall deps
hc --rx list                                 # Show learned patterns
hc --rx add "my error" "my fix command"      # Teach a new fix
hc --rx clear                                # Reset learned patterns
```

### How RX Works

1. You encounter an error repeatedly
2. Run `hc --rx "the error message"`
3. RX checks learned patterns first, then 10 built-in patterns
4. If matched: executes the fix immediately
5. If not matched: tells you how to teach it
6. Every match is learned and scored for future use

Built-in patterns handle: port conflicts, missing modules, lint errors, git locks, permission issues, OOM, connection refused, build failures, test failures, Docker issues.

---

## 7. Deep Scan

Full findings in `DEEP_SCAN_REPORT.md`. Summary:

### Critical (Fix Today)
- Hardcoded secrets in docker-compose files
- Missing .gitignore entries for sensitive files
- CORS wildcard fallback
- Admin token timing attack vulnerability

### Architecture (This Week)
- Break `heady-manager.js` (76KB) into route modules
- Remove duplicate YAML parser (`yamljs`)
- Move `electron` to devDependencies
- Separate Python and JavaScript in `src/`

### 30-Day Roadmap
- Week 1: Security remediation + credential rotation
- Week 2: Break up God classes into modules
- Week 3: Expand CLI + consolidate scripts
- Week 4: Add structured logging + database migrations

---

## Windsurf Tips

When working with Cascade in Windsurf, use these patterns:

```
@workspace Read START_HERE.md and build HeadyBuddy
@workspace Follow section 4 in START_HERE.md to build HeadyAI-IDE
@workspace Run the security remediation from START_HERE.md
@workspace Implement hc --rx from the CLI section
```

---

## File Reference

| File | Purpose |
|------|---------|
| `START_HERE.md` | This file — master guide |
| `DEEP_SCAN_REPORT.md` | Full security/architecture audit |
| `IMMEDIATE_ACTION_PLAN.md` | Phased remediation checklist |
| `scripts/security-remediation.ps1` | Auto-fix hardcoded secrets |
| `scripts/create_bootable_drive.ps1` | Armor/SanDisk Ventoy setup |
| `scripts/hc.js` | CLI with --rx rapid execute |
| `heady-manager.js` | Main MCP server (needs refactor) |
| `configs/headyvm-parrot-setup.md` | HeadyVM Linux setup guide |

---

*Built with Sacred Geometry by Heady Systems*
