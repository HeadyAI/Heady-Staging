<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: .windsurf/workflows/foundation-rebuild.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
---
description: Foundation-first rebuild — core services, MCP/API links, edge routing, then websites and integrations
---

# Foundation Rebuild Workflow

Rebuild the Heady project from core outward following the Iterative Rebuild Protocol.
Foundation components first, high-performance MCP/API links next, websites and integrations last.

## Prerequisites
- All configs present in `configs/` (cloud-layers.yaml, brain-profiles.yaml, foundation-contract.yaml, iterative-rebuild-directive.yaml, website-definitions.yaml)
- `heady-registry.json` is current
- Node.js 18+ installed
- Docker Desktop running (for local layer)

## Phase 1: Archive Current State
1. Tag current main branch:
```powershell
git tag -a "pre-production-$(Get-Date -Format yyyyMMdd)" -m "Pre-rebuild archive"
git push origin --tags
```
2. Record registry snapshot: `cp heady-registry.json deployments/registry-$(Get-Date -Format yyyyMMdd).json`

## Phase 2: Validate Scaffold
// turbo
3. Verify all source-of-truth files referenced in `heady-registry.json` exist on disk:
```powershell
node -e "const r=require('./heady-registry.json'); const fs=require('fs'); let missing=[]; (r.components||[]).forEach(c=>{if(c.sourceOfTruth && !fs.existsSync(c.sourceOfTruth)){missing.push(c.id+': '+c.sourceOfTruth)}}); if(missing.length){console.log('MISSING:',missing.join('\n'))}else{console.log('All source-of-truth files present')}"
```

## Phase 3: Build Core Services
// turbo
4. Install dependencies:
```powershell
npm install
```
// turbo
5. Validate heady-manager starts and /api/health responds:
```powershell
node -e "const http=require('http');const r=http.get('http://internal.headyio.com:3301/api/health',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{console.log('Health:',d);process.exit(res.statusCode===200?0:1)})});r.on('error',e=>{console.error('Manager not running:',e.message);process.exit(1)})"
```
6. Validate /api/registry returns valid data:
```powershell
node -e "const http=require('http');http.get('http://internal.headyio.com:3301/api/registry',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{const j=JSON.parse(d);console.log('Components:',j.components?.length||0);process.exit(j.components?0:1)})})"
```
7. Validate /api/orchestrator/health responds:
```powershell
node -e "const http=require('http');http.get('http://internal.headyio.com:3301/api/orchestrator/health',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{console.log('Orchestrator:',d);process.exit(res.statusCode===200?0:1)})})"
```
8. Validate /api/brain/health responds:
```powershell
node -e "const http=require('http');http.get('http://internal.headyio.com:3301/api/brain/health',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{console.log('Brain:',d);process.exit(res.statusCode===200?0:1)})})"
```

## Phase 4: Wire MCP & API Links
9. Verify all /api/pulse endpoints are listed and return correct schemas
10. Verify MCP tool servers respond (filesystem, terminal, browser, github, search)
11. Verify SDK clients (JS, Python) can authenticate against the manager

## Phase 5: Deploy Edge Routing
12. Deploy edge-proxy Cloudflare Worker:
```powershell
cd workers/edge-proxy
npx wrangler deploy --env production
```
13. Verify api.heady.systems proxies correctly to Render origin
14. Verify HTTPS and CORS headers are correct end-to-end

## Phase 6: Build Websites & Frontends
15. Build and deploy HeadySystems frontend:
```powershell
cd frontend && npm run build
```
16. Build and deploy HeadyBuddy desktop app
17. Verify browser extensions connect to manager API

## Phase 7: Wire Integrations
18. Deploy and test Slack connector
19. Deploy and test Discord connector
20. Deploy and test email agent

## Phase 8: Final Validation & Checkpoint
// turbo
21. Run all tests:
```powershell
npm test
```
22. Run Checkpoint Protocol:
```powershell
pwsh -File scripts/checkpoint-sync.ps1
```
23. Run HeadySync:
```powershell
pwsh -File scripts/Heady-Sync.ps1
```
24. Update heady-registry.json with final timestamps

## Stop Conditions
- If any phase gate fails, STOP, diagnose, fix, and re-validate before proceeding
- If a critical error occurs in core services, enter recovery mode per hcfullpipeline.yaml
- If registry drift is detected, reconcile before continuing
