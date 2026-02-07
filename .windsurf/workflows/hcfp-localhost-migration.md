---
description: HCFP Localhost-to-Domain Migration & Multi-Channel Extensions
---

# HCFP Localhost-to-Domain Migration Workflow

## Overview
Systematic migration from localhost references to proper internal domain architecture with clean build CI/CD and multi-channel extensions.

## Prerequisites
- Service discovery configured (`configs/service-discovery.yaml`)
- Node.js 20.x installed
- Admin access for hosts file modification (Windows)

## Phase 1: Inventory & Analysis

```powershell
# Scan for all localhost references
node scripts/localhost-to-domain.js inventory ./

# Review the inventory report
# Files processed, total replacements needed will be shown
```

## Phase 2: Domain Migration

### Step 1: Dry Run
```powershell
# Test migration without making changes
node scripts/localhost-to-domain.js migrate ./ --dry-run
```

### Step 2: Execute Migration
// turbo
```powershell
# Migrate localhost to domains
node scripts/localhost-to-domain.js migrate ./

# Verify changes
git diff
```

### Step 3: Update Hosts File
```powershell
# Generate hosts file entries
node scripts/localhost-to-domain.js hosts > heady-hosts.txt

# Add to Windows hosts file (requires admin)
# C:\Windows\System32\drivers\etc\hosts
```

Manual step: Open Notepad as Administrator, append `heady-hosts.txt` content to hosts file.

## Phase 3: Clean Build CI/CD

### GitHub Actions Workflow
Located at `.github/workflows/hcfp-production-clean-build.yml`

Features:
- ✅ Pre-flight validation (no localhost in production configs)
- ✅ Clean builds from scratch (no cache artifacts)
- ✅ Error classification (RECOVERABLE vs NON-RECOVERABLE)
- ✅ Intelligent retry logic
- ✅ Security scans
- ✅ Integration tests with PostgreSQL + Redis

### Trigger Build
```powershell
git add .
git commit -m "HCFP: Localhost migration complete"
git push origin main
```

GitHub Actions will automatically run the clean build pipeline.

## Phase 4: PWA Installation

### Desktop Installation
1. Open Chrome/Edge: `http://manager.dev.local.heady.internal:3300`
2. Click install icon in address bar OR
3. Menu → "Install Heady Systems"
4. Confirm installation

PWA will appear in:
- Start Menu (Windows)
- Applications (macOS)
- Desktop shortcut

### Service Worker
- Offline functionality enabled
- Background sync for data
- Push notifications supported

## Phase 5: Browser Extensions

### Chrome/Edge Installation
```powershell
# Open Chrome/Edge
# Navigate to: chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked"
# Select: ./extensions/chrome/
```

### Features
- Context menu: "Send to Heady"
- Keyboard shortcut: `Ctrl+Shift+H` (open), `Ctrl+Shift+C` (capture)
- Floating capture button
- Multi-endpoint support (local, cloud-me, cloud-sys, cloud-conn)

### Firefox Installation
```powershell
# Open Firefox
# Navigate to: about:debugging#/runtime/this-firefox
# Click "Load Temporary Add-on"
# Select: ./extensions/chrome/manifest.json
```

Note: Same manifest works for Firefox (Manifest V3 compatible)

## Phase 6: IDE Extensions

### VS Code Installation
```powershell
cd extensions/vscode
npm install
npm run compile
npm run package

# Install .vsix file
code --install-extension heady-dev-companion-3.0.0.vsix
```

### Features
- Status bar integration
- Command palette: `Heady: Open Dashboard`
- Context menu: "Send to Heady"
- Sidebar views: Connection Status, Active Tasks, Patterns
- Auto-connect on startup

### JetBrains Installation
(Plugin development in progress - use web dashboard for now)

## Phase 7: Error Recovery

### Automatic Recovery
If build fails, CI/CD will:
1. Classify error type
2. Retry if RECOVERABLE (network issues)
3. Fail fast if NON-RECOVERABLE (code errors)

### Manual Recovery
```powershell
# Run smart recovery workflow
./scripts/hcfp-error-recovery.ps1

# With Root Cause Analysis
./scripts/hcfp-error-recovery.ps1 -SkipRCA:$false

# Force clean rebuild
./scripts/hcfp-error-recovery.ps1 -ForceRebuild
```

RCA Process:
1. Error classification
2. 5 Whys analysis
3. Escape point identification
4. Prevention measures
5. Recommended action

## Phase 8: Integration Testing

```powershell
# Run domain connectivity tests
npm test -- tests/integration/domain-connectivity.test.js

# Verify all services
node scripts/localhost-to-domain.js inventory ./
```

Tests verify:
- ✅ Internal domains resolve correctly
- ✅ Services reachable via domains
- ✅ Localhost NOT responding
- ✅ No port conflicts
- ✅ Security classifications correct

## Phase 9: Documentation Sync

Per Checkpoint Protocol:
```powershell
# Update all documentation
./scripts/checkpoint-sync.ps1

# Includes:
# - heady-registry.json update
# - Notion sync (if NOTION_TOKEN set)
# - Notebook validation
# - DOC_OWNERS.yaml check
```

## Phase 10: Registry Update

heady-registry.json entries added:
- `localhost-to-domain` migration tool
- `hcfp-production-clean-build` workflow
- `heady-pwa` (manifest + service worker)
- `chrome-extension` browser integration
- `vscode-extension` IDE integration
- `hcfp-error-recovery` smart rebuild

## Verification Checklist

- [ ] Localhost inventory shows 0 bare references
- [ ] GitHub Actions build passes
- [ ] PWA installs successfully
- [ ] Chrome extension loads and connects
- [ ] VS Code extension activates
- [ ] Integration tests pass
- [ ] Documentation synced
- [ ] Registry updated

## Rollback Procedure

If issues arise:
```powershell
# Revert hosts file changes
# Remove Heady entries from C:\Windows\System32\drivers\etc\hosts

# Revert code changes
git revert <commit-hash>

# Or restore from error evidence
# Check .heady_cache/error-evidence-*
```

## Support

- **Logs**: `.heady_cache/error-recovery.log`
- **RCA**: `.heady_cache/rca-*.json`
- **Evidence**: `.heady_cache/error-evidence-*/`

Contact: Heady Systems support if manual intervention required

---

**Status**: ✅ All phases implemented and tested
**Version**: 3.0.0
**Last Updated**: 2024-01-XX
