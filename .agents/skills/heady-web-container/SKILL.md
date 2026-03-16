---
name: heady-web-container
description: Use when providing instant in-browser full-stack application previews without Docker. Implements WASM-based OS in the browser for live coding environments. Absorbed from Bolt.new's WebContainer pattern. Keywords include web container, WASM, browser preview, sandbox, live preview, in-browser OS, instant preview, Bolt.new.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidWebContainer
  absorption_source: "Bolt.new → WASM OS in browser for instant full-stack previews"
  super_prompt_section: "§5.3"
---

# Heady™ Web Container (LiquidWebContainer)

## When to Use This Skill

Use this skill when:
- Providing instant browser-based previews of generated applications
- Running Node.js/full-stack apps entirely in the browser
- Creating sandboxed development environments without Docker
- Implementing the Silversertile dynamic app generation preview layer

## Architecture

### WebContainer Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | WebContainer API (WASM) | Node.js runtime in browser |
| **Filesystem** | In-memory virtual FS | File operations without server |
| **Network** | Service Worker proxy | HTTP requests within sandbox |
| **Terminal** | xterm.js | Interactive terminal in browser |
| **Editor** | Monaco Editor | Code editing with IntelliSense |

### Template Library

| Template | Stack | Use Case |
|---|---|---|
| `react-nextjs` | Next.js 14 + React 18 | Full-stack web apps |
| `express-api` | Express + TypeScript | REST APIs |
| `cf-worker` | Cloudflare Worker | Edge functions |
| `discord-bot` | discord.js | Discord bots |
| `chrome-ext` | Manifest V3 | Chrome extensions |
| `react-native` | Expo | Mobile apps |
| `electron` | Electron + React | Desktop apps |

## Instructions

### Launching a Preview

1. Select template based on user intent (CSL-gated)
2. Initialize WebContainer with template filesystem
3. Install dependencies via in-browser npm
4. Start dev server within WebContainer
5. Render preview in iframe with hot reload
6. Expose terminal for user interaction

### Security Boundaries

- All execution confined to browser WASM sandbox
- No access to host filesystem or network
- Service Worker intercepts all HTTP (no external calls without allowlist)
- Memory limited to browser tab allocation

## Output Format

- Live Preview URL (iframe)
- Console Output
- File System State
- Performance Metrics
