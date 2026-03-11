<!--
  © 2026 Heady™Systems Inc.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
# 🚀 Heady™ AI Platform — Quick Start Guide

> Last updated: February 2026

## System Status

Everything is PM2-managed and auto-starts. To check status:

```bash
pm2 list
```

All 23 services start automatically from `ecosystem.config.cjs`. No manual setup required.

## Architecture

```
┌──────────────────────────────────────────────────┐
│            HeadyBuddy Overlay                    │
│  (Browser Extension • Chrome Tab • Mobile)       │
├──────────────────────────────────────────────────┤
│         Cloudflare Edge Proxy Layer              │
│  Workers AI  •  Vectorize  •  KV Cache           │
├──────────────────────────────────────────────────┤
│         HeadyManager (port 3301)                 │
│  Express Runtime • Orchestrator • MCP Server     │
├──────────────────────────────────────────────────┤
│         HeadyBrain + 20 AI Nodes                 │
│  Arena Mode • Liquid Gateway • Auto-Success       │
├──────────────────────────────────────────────────┤
│         3D Spatial Vector Memory                 │
│  HF Embeddings • 5 Shards • 8 Octant Zones      │
├──────────────────────────────────────────────────┤
│         DuckDB Vector Memory V2                  │
│  HNSW Index • Cosine Similarity • Session Memory  │
├──────────────────────────────────────────────────┤
│         Security Layer                           │
│  PQC (ML-KEM + ML-DSA) • mTLS • Rate Limiter    │
└──────────────────────────────────────────────────┘
```

## Key API Endpoints (port 3301)

| Endpoint | Description |
|----------|-------------|
| `GET /api/brain/health` | Brain orchestrator health |
| `POST /api/brain/chat` | AI chat (multi-model routing) |
| `POST /api/brain/search` | Knowledge search |
| `POST /api/vector/query` | Semantic vector search |
| `POST /api/vector/store` | Ingest into vector memory |
| `GET /api/vector/stats` | Vector memory statistics |
| `GET /api/vector/3d/map` | 3D spatial zone visualization |
| `GET /api/memory/health` | Memory system health |
| `POST /api/memory/process` | Gain-or-reject memory protocol |
| `POST /api/memory/recall` | Recall memories by query |
| `GET /api/memory/stats` | Memory statistics |

## PM2 Services

> **🧠 DEFAULT INTELLIGENCE PROCESSING:**
> **Blatantly Obvious Note:** All data handled by Heady™ is processed intelligently by default. Heady evaluates your task and provides what it found as the **best action in response**.
>
> You can trigger this explicitly by providing Heady with: `"stuff for heady to intelligently process"`
> Or by using the shortcut: `"heady's intelligence processing shortcut"`
>
> *If ever necessary*, you can bypass the default routing and use specific services directly. The 24 specialized services (HeadyBuddy, HeadyMaestro, HeadyBuilder, etc.) are available to use if you need dedicated focus, but default handling is intelligent routing.

| Service | Port | Purpose |
|---------|------|---------|
| heady-manager | 3301 | Core runtime, API, orchestrator |
| hcfp-auto-success | — | Policy enforcement engine |
| site-headysystems | 9000 | headysystems.com |
| site-headyme | 9001 | headyme.com |
| site-headyconnection | 9002 | headyconnection.org |
| site-headybuddy | 9003 | headybuddy.org |
| site-headymcp | 9004 | headymcp.com |
| site-headyio | 9005 | headyio.com |
| site-headyapi | 9006 | headyapi.com |
| site-headyos | 9007 | headyos.com |
| site-headyweb | 3000 | HeadyWeb search engine |

## Restart / Reload

```bash
# Restart everything
pm2 restart ecosystem.config.cjs

# Restart just the core
pm2 restart heady-manager

# Re-ingest all project knowledge into vector memory
node scripts/ingest-all-knowledge.js
```

## Live Properties

| Property | URL |
|----------|-----|
| HeadySystems | <https://headysystems.com> |
| HeadyMe | <https://headyme.com> |
| HeadyIO | <https://headyio.com> |
| HeadyAPI | <https://headyapi.com> |
| HeadyMCP | <https://headymcp.com> |
| HeadyConnection | <https://headyconnection.org> |
| HeadyBuddy | <https://headybuddy.org> |
| HeadyOS | <https://headyos.com> |
