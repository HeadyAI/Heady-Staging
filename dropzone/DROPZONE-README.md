# Heady™ Full Site Package

> **HeadySystems Inc.** — Liquid Architecture v9.0
> Created by Eric Haywood, Founder & CEO
> 60+ Provisional Patents Filed

## Package Contents

### Sites (sites/)
- **headysystems.html** → headysystems.com — The AI Operating System Company
- **headyme.html** → headyme.com — Your Personal AI Dashboard
- **headybuddy.html** → headybuddy.com — Your AI Companion — Everywhere
- **headymcp.html** → headymcp.com — Model Context Protocol Developer Platform
- **headyio.html** → headyio.com — Integration Hub — Connect Everything
- **headybot.html** → headybot.com — Agent Marketplace
- **headyapi.html** → headyapi.com — API Reference & Developer Docs
- **headylens.html** → headylens.com — Visual AI & Spatial Intelligence
- **headyai.html** → heady-ai.com — AI Research & Platform Portal
- **headyfinance.html** → headyfinance.com — AI-Powered Financial Intelligence
- **headyconnection.html** → headyconnection.org — Community · Education · Accessibility

### Admin & Monitors
- **admin-ui.html** → 1ime1.com admin control surface (Drupal task manager + all-site customizer)
- **heady-swarm-monitor.html** → Sacred Geometry 17-Swarm Live Monitor

### Shared Components (shared/)
- **buddy-embed.js** → HeadyBuddy universal cross-site widget (drop-in `<script>` tag)
- **buddy-persistence.js** → T0 Redis + T1 pgvector persistence layer (ESM)
- **cross-site-auth.js** → Firebase SSO cross-domain session handler (ESM)
- **drupal-cms-sync.js** → Bidirectional Drupal JSON:API ↔ pgvector sync (ESM)
- **worker-router.js** → Cloudflare Worker domain→file routing

### Documents (docs/)
- **Heady_Investor_Deck_2026.pptx** → 14-slide pitch deck (dark theme, charts, patent map)
- **Heady_Architecture_Overview_2026.docx** → System architecture with TOC (9 sections)
- **Heady_Master_Tracker_2026.xlsx** → 6-sheet operations tracker (budget, patents, tasks, swarms, domains, φ-constants)

## Cross-Site Architecture

### How It Links Together

1. **Cross-Site Nav** — Every page has a top navigation bar with quick-links to all 11 domains using 2-letter codes (HS, HM, HB, MC, IO, BT, AP, HL, AI, HF, HC).

2. **HeadyBuddy Everywhere** — The `buddy-embed.js` script tag at the bottom of every page provides:
   - Persistent chat panel (slides in from right)
   - Cross-site conversation continuity via `auth.headysystems.com` SSO
   - T1 Neon pgvector storage for conversation history (384D embeddings)
   - T0 Redis working memory with 30s SETEX heartbeat (PHI⁷ = 29,034ms)
   - WebSocket cross-device sync with SSE fallback
   - Task completion (mention a task name → Buddy moves it to Done)

3. **Connect Storage Modal** — Every page has a "🔗 Connect" button in the nav that opens a 4-step setup wizard:
   - Step 1: Firebase Auth (27 OAuth providers)
   - Step 2: T1 pgvector space initialized
   - Step 3: T0 Redis session started
   - Step 4: HeadyBuddy synced across all domains + devices

### Auth Flow

```
User clicks "Connect Storage" on ANY Heady site
    ↓
Firebase Auth popup via auth.headysystems.com
    ↓
Session cookie set (httpOnly, cross-domain)
    ↓
T1 pgvector namespace created: tenant:{uid}:*
    ↓
T0 Redis heartbeat started: tenant:{uid}:buddy:heartbeat
    ↓
WebSocket connected: buddy:sync channel
    ↓
HeadyBuddy chat history loaded from T1
    ↓
User is now synced across ALL 11 domains + any device
```

## Deployment

### Option 1: Cloudflare Pages (Recommended)
```bash
# Each site is a separate Pages project
# Or use Workers routing from a single project
wrangler pages deploy sites/ --project-name=heady-sites
```

### Option 2: Single Domain with Workers Routing
```javascript
// Cloudflare Worker routes incoming domains to correct HTML files
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;
    const siteMap = {
      'headysystems.com': 'headysystems.html',
      'headyme.com': 'headyme.html',
      // ... all domains
    };
    const file = siteMap[host] || 'headysystems.html';
    return fetch(`https://cdn.headysystems.com/sites/${file}`);
  }
};
```

### Option 3: R2 Static Hosting
```bash
# Upload to Cloudflare R2
for f in sites/*.html; do
  wrangler r2 object put heady-sites/$(basename $f) --file $f
done
```

## φ-Constants Used Throughout

| Constant | Value | Usage |
|----------|-------|-------|
| PHI | 1.618033988749895 | All timeouts, scaling |
| PSI (1/φ) | 0.618033988749895 | CSL include threshold |
| PHI⁷ | 29,034ms | Heartbeat interval |
| FIB[8] | 34 | Anonymous rate limit |
| FIB[10] | 89 | Auth rate limit |
| FIB[12] | 233 | Enterprise rate limit |

## Legal

- **Company:** HeadySystems Inc. (Delaware C-Corp, est. 2024)
- **Founder:** Eric Haywood (Dewayne Eric Haywood)
- **IP:** 60+ provisional patents filed (HS-2026-001 through HS-2026-062)
- **Patent Lock Zones:** llm-router.js, cognitive-telemetry.js, liquid-deploy.js, ast-schema.js

---

*φ · ψ · ∞ — Liquid Architecture v9.0*
