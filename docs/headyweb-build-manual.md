# HeadyWeb — Build & Operations Manual

**AI-Native Browser: Chromium-Beta + Comet-Beta Hybrid**
**Stack: Electron 33+ | Vanilla JS/Web Components | electron-vite | No React**

---

## Executive Summary

HeadyWeb is a fully functional AI-native desktop browser built on Electron (Chromium), combining Google Chromium's browser shell architecture with Perplexity Comet's agentic AI design. Every tab is an isolated Chromium renderer, a HeadyBuddy sidecar panel provides Comet-style AI task execution on any page, and the full Heady MCP ecosystem plugs in natively via Chrome DevTools Protocol (CDP).

---

## Part 1: Architecture Overview

### What "Chromium-Beta + Comet-Beta" Means

- **chromium-beta**: Browser shell using Electron — bundles a full, stable, pinned Chromium release. Every page runs in a real Chromium process with full HTML5, WebGL, WebAssembly, and extension support. "Beta" = experimental features enabled (WebMCP, etc.)
- **comet-beta**: Perplexity Comet's agentic design pattern:
  - AI backend (model server) plans and issues commands
  - UI layer (browser window + tab bar)
  - Sidecar panel handles task dispatch between AI and extensions
  - Browser extensions execute actions via CDP

HeadyWeb mapping: AI backend = HeadyBrain/HeadyBuddy, Sidecar = HeadyBuddy WebContentsView, execution layer = MCP+CDP bridge.

### Process Architecture

```
HeadyWeb (Main Process — Node.js)
├── BaseWindow (native OS window container)
│   ├── ToolbarView (WebContentsView — vanilla JS/Web Components)
│   ├── TabView[0..N] (WebContentsView — real Chromium per tab)
│   └── SidecarView (WebContentsView — HeadyBuddy panel)
├── MCP Server (heady-mcp IPC bridge)
├── CDP Bridge (--remote-debugging-port=9229)
└── HeadyAutoContext Indexer (fs.watch + vector memory)

GPU Process (Chromium)
Network Process (Chromium)
Renderer Process × N (one per WebContentsView)
```

---

## Part 2: Build Instructions

### Step 1 — Scaffold

```bash
npx create-electron-app@latest heady-web --template=vite-typescript
cd heady-web
pnpm add zustand immer pino @modelcontextprotocol/sdk
pnpm add -D electron-devtools-installer @playwright/test playwright-mcp
pnpm list electron  # should be 33+ for WebContentsView stability
```

### Step 2 — Directory Structure

```
heady-web/
├── src/
│   ├── main/                   # Main process (Node.js)
│   │   ├── index.ts            # App entry point, window creation
│   │   ├── windows/
│   │   │   ├── base-window.ts  # BaseWindow + layout manager
│   │   │   ├── tab-manager.ts  # WebContentsView tab lifecycle
│   │   │   └── sidecar.ts      # HeadyBuddy sidecar panel
│   │   ├── ipc/
│   │   │   ├── handlers.ts     # ipcMain handlers
│   │   │   └── channels.ts     # channel name constants
│   │   ├── mcp/
│   │   │   ├── server.ts       # heady-mcp native server
│   │   │   └── cdp-bridge.ts   # CDP → MCP tool translation
│   │   ├── context/
│   │   │   ├── autocontext.ts  # HeadyAutoContext v2 indexer
│   │   │   └── page-extractor.ts # CSL DOM simplification
│   │   └── session/
│   │       └── manager.ts      # session.fromPartition profiles
│   ├── preload/
│   │   ├── toolbar.ts          # Context bridge for toolbar
│   │   ├── sidecar.ts          # Context bridge for sidecar
│   │   └── page.ts             # Injected into every web page
│   └── renderer/
│       ├── toolbar/            # Web Components: tab bar, address bar
│       ├── sidecar/            # Web Components: HeadyBuddy chat panel
│       └── shared/             # Shared utilities, hooks, stores
├── resources/                  # Icons, native assets
├── electron.vite.config.ts     # Unified Vite config
├── electron-forge.config.ts    # Packaging config
└── hive_config.json            # Heady system config
```

### Step 3 — BaseWindow + Multi-Tab Core

Uses `BaseWindow + WebContentsView` (BrowserView is deprecated). BaseWindow is a pure layout container composing multiple WebContentsView children.

**Key design decisions:**
- φ-derived layout: SIDECAR_WIDTH = fib(14) = 377, TOOLBAR_HEIGHT = 55 ≈ φ × 34
- Isolated `session.fromPartition()` per tab
- Simplified DOM extraction: max 233 nodes (fib(13)) — interactable elements only
- Pino structured logging throughout (LR-004)

### Step 4 — IPC Channel Wiring

All communication flows through typed IPC channels. Zero direct renderer-to-renderer — everything routes through Main:

- `tabs:create/close/select` — tab management
- `nav:go/back/forward/reload` — navigation
- `sidecar:toggle/query` — sidecar control
- `cdp:execute/screenshot/accessibility` — AI agent bridge

### Step 5 — HeadyBuddy Sidecar

Implements Comet's dual-channel: SSE for conversation, WebSocket for automation commands. Registered MCP tools:

| Tool | Purpose |
|------|---------|
| `browser_click` | Click element by ref ID from accessibility tree |
| `browser_type` | Type text into focused/targeted input |
| `browser_navigate` | Navigate current tab to URL |
| `browser_read_page` | Get simplified DOM (interactable only) |
| `browser_screenshot` | Capture viewport for visual verification |
| `browser_accessibility` | Get accessibility tree snapshot |
| `webmcp_discover` | Discover WebMCP tools on current page |

### Step 6 — CDP Bridge

Chrome DevTools Protocol bridge makes AI actions indistinguishable from human input. Every Electron app exposes CDP via `--remote-debugging-port`.

### Step 7 — Page Injection Preload

Every page gets `page.ts` injected — builds `window.__headyNodes` reference map. MutationObserver re-indexes on DOM changes. Max fib(13)=233 nodes for token efficiency.

### Step 8 — φ-Scaled Constants

```typescript
export const PHI = 1.618033988749895;
export const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];

// Layout
TOOLBAR_HEIGHT  = 55      // FIB[9] + FIB[8]
SIDECAR_WIDTH   = FIB[14] // 377
BORDER_RADIUS   = FIB[7]  // 13

// Timing
HEARTBEAT_MS    = 29034   // φ⁷ × 1000
TASK_TIMEOUT_MS = 4236    // φ² × 1618
BACKOFF_MS      = [1618, 2618, 4236, 6854, 11090, 17944, 29034]

// CSL
CSL.include = 0.382  CSL.boost = 0.618  CSL.inject = 0.718
```

---

## Part 3: AI Agent Wiring

### Hybrid Page Understanding
- **Primary:** Accessibility tree snapshot — compact, semantic
- **Secondary:** Simplified DOM with node refs — Comet-style (@e1: button "Sign In")
- **Fallback:** Screenshot — for canvas, WebGL, CAPTCHA
- Result: ~93% fewer tokens than full Playwright MCP tree dumps

### Task Execution Flow (Comet "entropy_request" pattern)
1. User input → sidecar IPC → Main → HeadyBrain API
2. HeadyBrain runs HCFullPipeline stages 0-4
3. Task decomposed → tool call sequence
4. Execute: browser_read_page → browser_click → browser_type → browser_screenshot → verify
5. Result streamed via SSE
6. RECEIPT stage: audit log + wisdom.json update

### WebMCP Integration (Chrome 146+)
Progressive enhancement via `navigator.modelContext.getTools()` — 67% compute reduction vs visual browsing. Enabled via `--enable-features=WebMCP`.

---

## Part 4: MCP Server Integration

Native MCP server in Electron main process — sub-millisecond tool call latency:
- Streamable-HTTP transport (external clients)
- Stdio transport (local Claude/Windsurf)
- 4-transport gateway per Liquid Latent OS Layer 0 spec

---

## Part 5: Session Management & Security

| Partition | Usage | Persistence |
|-----------|-------|-------------|
| `persist:tab-{id}` | Regular tabs | Survives restart |
| `persist:heady-profile` | HeadyMe account | Long-lived auth |
| `incognito-{uuid}` | Private tabs | In-memory only |
| `persist:auth-headysystems` | Admin/service | Shared across service tabs |

### 8 Sanitization Layers
1. Zod schema validation
2. Max-length (4236 chars = φ² × 1618)
3. DOMPurify on HTML content
4. Parameterized queries (SQL injection)
5. CSP headers (XSS)
6. URL allowlist (SSRF)
7. path.resolve() jail (path traversal)
8. Secret pattern detection before logging

---

## Part 6: Performance

- **Baseline:** 200-400MB + ~50-100MB per tab → ~700MB for 5 tabs + sidecar
- **Mitigations:** V8 snapshots, route-based code splitting, Web Workers for indexer, tab suspension, cache limits on φ⁸ intervals

---

## Part 7: Deployment & Packaging

```bash
pnpm run make                    # Current platform
pnpm run make --platform=darwin  # macOS .dmg
pnpm run make --platform=win32   # Windows .exe
pnpm run make --platform=linux   # Linux .deb/.rpm/AppImage
```

Auto-updater publishes to Cloudflare R2 at `releases.headysystems.com`.

---

## Part 8: HeadyBuddy Operating Instructions

### On Every Application Start
1. VALIDATE — no priority enums
2. AUTOCONTEXT — fs.watch active
3. MCP_READY — port 3034
4. CDP_READY — port 9229
5. LAYER — read ACTIVE_LAYER
6. RECEIPT — Ed25519-signed startup receipt

### On Every Tool Call Failure
5-Phase Deterministic Optimization Loop: Detect → Extract → Analyze → Derive → Synthesize

### Health Endpoint (localhost:3034/health)
```json
{
  "status": "healthy",
  "tabs_open": 3,
  "sidecar_active": true,
  "mcp_connected": true,
  "cdp_port": 9229,
  "autocontext_files_indexed": 6200,
  "vector_memory_entries": 1247,
  "active_layer": "cloud-sys"
}
```

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Shell | Electron 33+ | Full Chromium, Node.js main |
| Build | electron-vite + Vite | HMR all process types |
| UI | Vanilla JS + Web Components | Zero framework overhead |
| Styling | CSS custom properties + φ spacing | Native, no Tailwind |
| State | Zustand + Immer | Lightweight immutable state |
| Multi-tab | BaseWindow + WebContentsView | Modern Electron, process isolation |
| Sessions | session.fromPartition() | Per-tab isolation |
| AI Bridge | CDP via executeJavaScript | Human-indistinguishable actions |
| MCP | @modelcontextprotocol/sdk | Native, 4 transports |
| Logging | pino | Structured JSON, correlation IDs |
| Packaging | electron-forge | Multi-platform makers |
| WebMCP | navigator.modelContext | Progressive enhancement |

---

*© 2026 HeadySystems Inc.*
