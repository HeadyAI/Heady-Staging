# SKILL: Heady 20-Node AI Cluster & Attribution

The Heady ecosystem implements a 20-node specialized AI cluster. All code, logs, and UI interactions must explicitly attribute activity to the correct node.

## The 20 AI Nodes

### Core Intelligence
| Node | Role | Responsibility |
|------|------|----------------|
| **JULES** | Hyper-Surgeon | Code optimization, refactoring, performance, bug elimination |
| **OBSERVER** | Natural Observer | System monitoring, anomaly detection, metrics |
| **BUILDER** | Constructor | Project creation, scaffolding, dependency management |
| **ATLAS** | Auto-Archivist | Documentation generation, API specs, code comments |
| **PYTHIA** | Oracle | Predictive analysis, insights, forecasting |
| **CONDUCTOR** | Orchestrator | Task routing, workflow management, system overview |
| **SENTINEL** | Guardian | Security scanning, threat detection, vulnerability assessment |
| **FORGE** | Code Smith | High-speed code generation, AST manipulation |
| **EMISSARY** | Protocol Bridge | MCP/SSE/JSON-RPC bridging, SDK publishing |
| **DREAMER** | Simulator | Monte Carlo planning, what-if scenarios |
| **ARBITER** | Legal/IP | Patent harvesting, license compliance |
| **DIPLOMAT** | B2B Agent | Automated procurement, rate negotiation |
| **ORACLE** | Cost Tracker | Budget monitoring, billing, economic guardrails |
| **QUANT** | Trading | Market analysis, portfolio optimization |
| **FABRICATOR** | IoT/Physical | Home automation, CAD generation |
| **PERSONA** | Cognitive | Personality consistency, biometric sync |
| **NEXUS** | Web3 | Smart contracts, on-chain tokenization |
| **STUDIO** | Audio/MIDI | Music production, DAW bridging |
| **TENSOR** | Math Core | CSL geometric logic gates (Resonance, Superposition, Orthogonal) |
| **TOPOLOGY** | Spatial | PCA clustering, dependency tracking, manifold analysis |

## Attribution Rules

### 1. Backend Logging — Always Tag the Node

```javascript
const { createLogger } = require('./packages/structured-logger');
const log = createLogger('heady-manager', 'core');

// CORRECT: attribute to the responsible node
log.info('Code optimization complete', { node: 'JULES', file: 'src/app.js', savings: '15%' });
log.error('Threat detected', { node: 'SENTINEL', threat: 'sql-injection', severity: 'HIGH' });

// WRONG: unattributed log
log.info('Something happened');
```

### 2. Frontend — `data-node` Attribute

```html
<button onClick={handleSubmit} data-node="BUILDER">Create Project</button>
<a href={url} onClick={handleNav} data-node="CONDUCTOR">Navigate</a>
<div data-node="OBSERVER" class="metrics-panel">...</div>
```

### 3. Task Routing — Never Duplicate Responsibility

Each node has firm boundaries. When routing tasks:
- Code refactoring → **JULES**
- New project scaffolding → **BUILDER**
- Monitoring dashboards → **OBSERVER**
- Documentation → **ATLAS**
- Security scan → **SENTINEL**
- AI inference routing → **CONDUCTOR**

### 4. HeadyBattle (Multi-Model Arena)

When multiple AI models compete on a task:
- **CONDUCTOR** manages the arena
- Each participant model is assigned a node context
- Results scored by φ-scaled consensus via **TENSOR** node
- Winner's output is promoted; losers' approaches stored in `wisdom.json` by **PYTHIA**
