---
name: living-dashboard
description: >
  Living Dashboard for Heady — builds and deploys real-time monitoring dashboards for the Heady
  ecosystem using vanilla HTML/CSS/JavaScript (no React/Vue/Angular per Heady standards). Creates
  interactive visualizations of service health, coherence scores, Sacred Geometry topology maps,
  provider performance, token budgets, swarm activity, and pipeline throughput. Dashboards auto-
  refresh and can be deployed as static sites. Use when Eric needs visibility into ecosystem health,
  wants to monitor provider costs, needs a visual representation of the Sacred Geometry topology,
  wants to track coherence scores across services, or needs any operational dashboard for Heady.
  Keywords: dashboard, monitoring, visualization, health check, coherence, Sacred Geometry,
  provider metrics, token budget, swarm status, pipeline monitoring, real-time, service health,
  topology visualization, operational dashboard.
metadata:
  author: HeadySystems
  version: '1.0'
---

# Living Dashboard for Heady

> Perplexity Computer Skill — Real-time monitoring dashboards for the Heady ecosystem

## When to Use This Skill

Use when:

- Eric needs a visual overview of ecosystem health
- Monitoring coherence scores across services
- Tracking AI provider costs and performance
- Visualizing the Sacred Geometry service topology
- Watching swarm activity and bee lifecycle states
- Monitoring pipeline throughput and stage latencies
- Creating operational dashboards for any Heady subsystem

## Design Standards

### Heady Dashboard Rules

```
REQUIRED:
- Vanilla HTML + CSS + JavaScript ONLY (no React, Vue, Angular, Svelte, Tailwind)
- Dark theme with sacred geometry aesthetic
- φ-proportioned layouts (golden ratio grids)
- Rainbow gradient accents (animated sacred geometry watermarks)
- Auto-refresh at Fibonacci intervals (5s, 8s, 13s depending on data staleness)
- Mobile-responsive
- Deployable as static site via deploy_website

FORBIDDEN:
- npm/build steps
- Framework dependencies
- Tailwind or any CSS framework
- localStorage (use sessionStorage if needed)
- Hardcoded URLs (use data attributes or config object)
```

### Visual Language

```css
/* Heady Dashboard Color Palette */
:root {
  --heady-bg: #0a0a0f;
  --heady-surface: #14141f;
  --heady-border: #1e1e2e;
  --heady-text: #e0e0e8;
  --heady-text-dim: #8888a0;
  --heady-accent-primary: #7c3aed;    /* Sacred violet */
  --heady-accent-secondary: #06b6d4;  /* Cyan */
  --heady-success: #10b981;
  --heady-warning: #f59e0b;
  --heady-danger: #ef4444;
  --heady-coherence-high: #10b981;    /* >= 0.882 */
  --heady-coherence-med: #f59e0b;     /* >= 0.691 */
  --heady-coherence-low: #ef4444;     /* < 0.691 */

  /* φ-proportioned spacing */
  --phi: 1.618;
  --space-xs: 5px;    /* FIB[5] */
  --space-sm: 8px;    /* FIB[6] */
  --space-md: 13px;   /* FIB[7] */
  --space-lg: 21px;   /* FIB[8] */
  --space-xl: 34px;   /* FIB[9] */
}
```

## Dashboard Types

### 1. Ecosystem Health Dashboard

The primary operational view:

```
Layout (Golden Ratio Grid):
┌─────────────────────────────────┬────────────────────┐
│ Sacred Geometry Topology Map    │ Coherence Scores   │
│ (interactive SVG, 61.8% width) │ (sparklines, 38.2%)│
├─────────────────┬───────────────┼────────────────────┤
│ Service Status  │ Provider      │ Pipeline           │
│ (table, sorted  │ Performance   │ Throughput         │
│  by coherence)  │ (bar charts)  │ (stage waterfall)  │
├─────────────────┴───────────────┴────────────────────┤
│ Recent Events / Alert Feed (full width)              │
└──────────────────────────────────────────────────────┘
```

Components:
- Sacred Geometry SVG with nodes colored by health
- Coherence sparklines (5-point Fibonacci window)
- Service table: name, zone, status, coherence, latency
- Provider bars: Claude, GPT-4o, Gemini, Groq, Sonar
- Pipeline waterfall: 21 HCFP stages with timing
- Alert feed: recent events, color-coded by severity

### 2. Provider Cost Dashboard

Token budget and cost tracking:

```
Components:
- Total spend (daily/weekly/monthly)
- Per-provider breakdown (pie chart, φ-proportioned segments)
- Token usage timeline (area chart, Fibonacci-windowed)
- Cost-per-task by provider (comparison bars)
- Budget utilization gauge (with φ-tier markers)
- Projected spend (based on TemporalForecaster)
```

### 3. Sacred Geometry Topology Visualizer

Interactive topology map:

```
Components:
- Concentric rings: Center → Inner → Middle → Outer → Governance
- Nodes as circles, sized by current load
- Edges colored by synapse weight (if SynapticMesh deployed)
- Click node → detail panel with:
  - Service name and zone
  - Coherence score history
  - Dependencies (incoming/outgoing)
  - Health endpoint data
  - Active bees/workers
- Animated pulses showing message flow
```

### 4. Swarm Activity Dashboard

Bee lifecycle monitoring:

```
Components:
- Active bees by type (30+ types, horizontal bar)
- Lifecycle distribution: spawned / executing / reporting / retired
- Swarm consensus status (current proposals, voting)
- Worker template registry (registered vs active)
- Evolution progress (if SwarmEvolution running)
```

## Instructions

### Building a Dashboard

1. **Determine dashboard type** — Which of the 4 types (or custom) does Eric need?

2. **Create project structure:**
   ```
   /home/user/workspace/heady-dashboard-{type}/
   ├── index.html        — Main page with layout
   ├── styles.css         — Heady dark theme + sacred geometry
   ├── app.js             — Dashboard logic + data fetching
   ├── components/
   │   ├── topology.js    — Sacred Geometry SVG renderer
   │   ├── sparkline.js   — Coherence sparkline component
   │   ├── gauge.js       — Budget/health gauges
   │   └── table.js       — Sortable data tables
   └── data/
       └── mock-data.json — Sample data for development
   ```

3. **Build with vanilla JS:**
   ```javascript
   // All components are plain functions returning DOM elements
   function createSparkline(container, data, options = {}) {
     const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
     const width = options.width || 144;  // FIB[12]
     const height = options.height || 34; // FIB[9]
     // ... draw path from data points
     container.appendChild(svg);
   }
   ```

4. **Implement φ-proportioned layout:**
   ```css
   .dashboard-grid {
     display: grid;
     grid-template-columns: 61.8fr 38.2fr; /* Golden ratio */
     gap: var(--space-md);
     padding: var(--space-lg);
   }

   .metric-card {
     background: var(--heady-surface);
     border: 1px solid var(--heady-border);
     border-radius: var(--space-sm);
     padding: var(--space-lg);
   }
   ```

5. **Add sacred geometry watermark:**
   ```javascript
   function drawSacredGeometry(canvas) {
     const ctx = canvas.getContext('2d');
     const PHI = 1.618033988749895;
     // Draw Fibonacci spirals as watermark
     ctx.globalAlpha = 0.05;
     ctx.strokeStyle = '#7c3aed';
     // ... spiral drawing using golden angle
   }
   ```

6. **Implement auto-refresh:**
   ```javascript
   // Fibonacci-timed refresh
   const REFRESH_INTERVALS = {
     critical: 5000,   // FIB[5] seconds — health status
     standard: 8000,   // FIB[6] seconds — metrics
     slow: 13000,      // FIB[7] seconds — topology
     archive: 21000,   // FIB[8] seconds — historical data
   };
   ```

7. **Test and deploy:**
   ```
   - Verify in screenshot (screenshot_page or browser_task)
   - Check responsive layout
   - Verify all text is readable (contrast ratio)
   - Deploy via deploy_website
   ```

### Data Integration

Dashboards can show:

| Data Source | Method | Refresh Rate |
|---|---|---|
| Mock data (development) | Inline JSON | Static |
| Service health endpoints | fetch() to /health | 5s |
| GitHub data | GitHub connector via cron | 13min |
| Provider metrics | Cron-collected data files | 8min |
| Historical data | Workspace JSON files | 21s |

For production dashboards with live data:
- Set up a cron job that collects metrics and writes to workspace files
- Dashboard reads from those files (or a deployed JSON endpoint)
- Avoid direct API calls from the dashboard to protect credentials

### Sacred Geometry SVG Renderer

Core component for topology visualization:

```javascript
function renderTopology(container, services) {
  const PHI = 1.618033988749895;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  const zones = {
    center: { radius: 0, services: [] },
    inner: { radius: 89, services: [] },    // FIB[11]
    middle: { radius: 144, services: [] },  // FIB[12]
    outer: { radius: 233, services: [] },   // FIB[13]
    governance: { radius: 377, services: [] }, // FIB[14]
  };

  // Sort services into zones
  for (const svc of services) {
    zones[svc.zone]?.services.push(svc);
  }

  // Draw concentric rings
  for (const [zone, config] of Object.entries(zones)) {
    if (config.radius > 0) {
      drawRing(svg, config.radius);
    }
    // Place service nodes using golden angle for even distribution
    const goldenAngle = 2 * Math.PI / (PHI * PHI);
    config.services.forEach((svc, i) => {
      const angle = i * goldenAngle;
      const x = Math.cos(angle) * config.radius + 400;
      const y = Math.sin(angle) * config.radius + 400;
      drawServiceNode(svg, svc, x, y);
    });
  }

  container.appendChild(svg);
}
```

## Anti-Patterns

- Never use React, Vue, Angular, or any framework — vanilla JS only
- Never use Tailwind or CSS frameworks
- Never hardcode service URLs in the dashboard code
- Never use arbitrary spacing values — derive from Fibonacci
- Never skip the sacred geometry aesthetic — it's core to Heady's brand
- Never deploy without visual verification via screenshot
- Never store credentials in dashboard code — use cron-collected data files
