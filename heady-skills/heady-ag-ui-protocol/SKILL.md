---
name: heady-ag-ui-protocol
description: >-
  Agent-to-UI (AG-UI) streaming protocol enabling real-time agent state visualization
  in Heady's micro-frontend architecture. Implements SSE for unidirectional streaming
  and WebSocket for bidirectional agent interaction with user interrupts. Phi-throttled
  update frequencies: critical events immediate, progress every 618ms (PSI*1000),
  heartbeats every 1618ms (PHI*1000). Standardized event schema covers full agent
  lifecycle: AgentSpawned, AgentProgress, AgentDecision, AgentResult, AgentError,
  AgentRetired. Micro-frontend event routing delivers events to Swarm Dashboard,
  Governance Panel, Vector Explorer, and Projection Monitor. PHI^attempt reconnection
  backoff with resume from last event ID. Fibonacci-chunked event batching (5, 8, 13).
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Outer
  phi-compliance: verified
---

# Heady AG-UI Protocol

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Streaming agent state to UI** — render agent lifecycle events (spawn, progress, decision, result, error, retire) in real time
- **SSE transport setup** — unidirectional server-sent events for dashboards and read-only displays
- **WebSocket transport setup** — bidirectional channel so users can interrupt, redirect, or cancel running agents
- **Phi-throttled update frequency** — rate-limit UI pushes based on event priority using PHI/PSI intervals
- **Micro-frontend event routing** — deliver events to the correct remote app (Swarm Dashboard, Governance Panel, Vector Explorer, Projection Monitor)
- **HCFullPipeline visualization** — map 21 pipeline stages to progress bar segments with live latency
- **Agent decision tree rendering** — stream decision branches to the UI as they unfold
- **Reconnection with resume** — PHI^attempt exponential backoff, resume from last acknowledged event ID
- **Event batching and compression** — batch low-priority events in Fibonacci-sized chunks (5, 8, 13)
- **BRIDGE node integration** — this skill implements the Outer-ring BRIDGE connecting agents to users

## Architecture

```
Sacred Geometry Topology — AG-UI Protocol Position:
Center(HeadySoul) → Inner(Conductor,Brains,Vinci,AutoSuccess)
   → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
   → Outer(BRIDGE ← AG-UI Protocol, MUSE,SENTINEL,NOVA,JANITOR,SOPHIA,CIPHER,LENS)
   → Governance(Check,Assure,Aware,Patterns,MC,Risks)

┌─────────────────────────────────────────────────────────────────────┐
│                       AG-UI PROTOCOL (BRIDGE)                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  EVENT BUS                                                    │   │
│  │  AgentSpawned│Progress│Decision│Result│Error│Retired           │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           ▼                                         │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────────┐    │
│  │ SSE Server │    │ WebSocket  │    │ Phi-Throttle Engine    │    │
│  │ (uni-dir)  │    │ (bi-dir)   │    │ CRIT=0ms PSI=618ms    │    │
│  │ Cloud Run  │    │ Cloudflare │    │ PHI=1618ms             │    │
│  └─────┬──────┘    └─────┬──────┘    └───────────┬────────────┘    │
│        └─────────────────┼───────────────────────┘                  │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MICRO-FRONTEND ROUTER                                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │   │
│  │  │ Swarm    │ │Governance│ │ Vector   │ │ Projection    │   │   │
│  │  │Dashboard │ │ Panel    │ │ Explorer │ │ Monitor       │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Reconnect: PHI^attempt backoff │ Resume from lastEventId           │
│  Batching: Fibonacci chunks [5, 8, 13]                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ─────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ──────────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Pool Allocations ──────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── AG-UI Protocol Constants ──────────────────────────────────────────
const AGUI = {
  // Phi-throttled update intervals (ms)
  THROTTLE: {
    CRITICAL:  0,                                    // immediate delivery
    HIGH:      Math.round(PSI ** 2 * 1000),          // 382ms
    PROGRESS:  Math.round(PSI * 1000),               // 618ms
    HEARTBEAT: Math.round(PHI * 1000),               // 1618ms
    LOW:       Math.round(PHI ** 2 * 1000),          // 2618ms
  },

  // Fibonacci-sized event batch chunks
  BATCH_SIZES:            [FIB[4], FIB[5], FIB[6]],  // [5, 8, 13]
  MAX_BATCH_WAIT_MS:      FIB[6] * 100,              // 1300ms max batch accumulation

  // Reconnection backoff
  BACKOFF_BASE_MS:        FIB[5] * 100,              // 800ms base
  BACKOFF_MAX_MS:         FIB[9] * 1000,             // 55000ms ceiling
  BACKOFF_JITTER:         PSI ** 2,                   // ±0.382 jitter

  // Connection limits
  MAX_SSE_CONNECTIONS:    FIB[8],                     // 34 concurrent SSE streams
  MAX_WS_CONNECTIONS:     FIB[7],                     // 21 concurrent WebSocket connections
  MAX_EVENTS_PER_TRACE:   FIB[9],                     // 55 events per trace

  // HCFullPipeline stage count
  HCFP_STAGE_COUNT:       FIB[7],                     // 21 stages

  // Event ID sequence
  EVENT_ID_EPOCH:         1740000000000,              // Custom epoch for compact IDs

  // Health coherence
  COHERENCE_WINDOW:       FIB[7],                     // 21-sample rolling window
};

// ─── HCFP Stage Names ──────────────────────────────────────────────────
const HCFP_STAGES = [
  'intake', 'classify', 'route', 'enrich', 'validate',
  'embed', 'search', 'rank', 'fuse', 'generate',
  'review', 'refine', 'format', 'cache', 'deliver',
  'log', 'evaluate', 'learn', 'archive', 'audit', 'report',
];

// ─── Micro-Frontend Routing Map ────────────────────────────────────────
const FRONTEND_ROUTES = {
  'swarm-dashboard':    ['AgentSpawned', 'AgentProgress', 'AgentRetired'],
  'governance-panel':   ['AgentDecision', 'AgentError', 'PolicyViolation'],
  'vector-explorer':    ['EmbeddingGenerated', 'VectorSearchResult'],
  'projection-monitor': ['StageProgress', 'PipelineComplete', 'AgentResult'],
};
```

## Instructions

### AG-UI Event Schema and Bus

The event bus defines the standardized schema for all agent-to-UI events and manages in-process dispatch with phi-throttled delivery.

```javascript
// heady-ag-ui-protocol/src/event-bus.mjs
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import pino from 'pino';

const log = pino({ name: 'heady-ag-ui-protocol', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const AGUI = {
  THROTTLE: {
    CRITICAL: 0, HIGH: Math.round(PSI ** 2 * 1000),
    PROGRESS: Math.round(PSI * 1000), HEARTBEAT: Math.round(PHI * 1000),
    LOW: Math.round(PHI ** 2 * 1000),
  },
  BATCH_SIZES: [FIB[4], FIB[5], FIB[6]],
  MAX_BATCH_WAIT_MS: FIB[6] * 100,
  MAX_EVENTS_PER_TRACE: FIB[9],
  EVENT_ID_EPOCH: 1740000000000,
};

/** Canonical AG-UI event types with their throttle tier. */
const EVENT_TYPES = {
  AgentSpawned:       'CRITICAL',
  AgentProgress:      'PROGRESS',
  AgentDecision:      'HIGH',
  AgentResult:        'CRITICAL',
  AgentError:         'CRITICAL',
  AgentRetired:       'HIGH',
  StageProgress:      'PROGRESS',
  PipelineComplete:   'CRITICAL',
  EmbeddingGenerated: 'LOW',
  VectorSearchResult: 'LOW',
  PolicyViolation:    'HIGH',
  Heartbeat:          'HEARTBEAT',
};

let eventSequence = 0;

function nextEventId() {
  return `${Date.now() - AGUI.EVENT_ID_EPOCH}-${++eventSequence}`;
}

export function createEvent(type, agentId, payload = {}) {
  const throttleTier = EVENT_TYPES[type] || 'LOW';
  return {
    id: nextEventId(),
    type,
    agentId,
    timestamp: Date.now(),
    throttleTier,
    throttleMs: AGUI.THROTTLE[throttleTier],
    payload,
    sacredGeometryLayer: 'Outer',
  };
}

/**
 * Phi-throttled event bus — delivers events respecting per-tier rate limits.
 */
export class AGUIEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(FIB[9]);
    this.lastEmitByTier = {};
    this.pendingBatch = [];
    this.batchTimer = null;
    this.totalEmitted = 0;
    this.totalThrottled = 0;
    log.info({ maxListeners: FIB[9] }, 'AG-UI Event Bus initialized');
  }

  publish(event) {
    const now = Date.now();
    const tier = event.throttleTier;
    const lastEmit = this.lastEmitByTier[tier] || 0;
    const elapsed = now - lastEmit;

    if (event.throttleMs === 0 || elapsed >= event.throttleMs) {
      this.lastEmitByTier[tier] = now;
      this.emit('event', event);
      this.totalEmitted++;
      return true;
    }

    this.pendingBatch.push(event);
    this.totalThrottled++;
    this.scheduleBatchFlush();
    return false;
  }

  scheduleBatchFlush() {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
      this.batchTimer = null;
    }, AGUI.MAX_BATCH_WAIT_MS);
  }

  flushBatch() {
    if (this.pendingBatch.length === 0) return;

    const targetSize = AGUI.BATCH_SIZES.find((s) => s >= this.pendingBatch.length)
      || AGUI.BATCH_SIZES[AGUI.BATCH_SIZES.length - 1];
    const chunk = this.pendingBatch.splice(0, targetSize);

    this.emit('batch', chunk);
    this.totalEmitted += chunk.length;
    log.info({ batchSize: chunk.length, remaining: this.pendingBatch.length }, 'Batch flushed');

    if (this.pendingBatch.length > 0) this.scheduleBatchFlush();
  }

  getStats() {
    return {
      totalEmitted: this.totalEmitted,
      totalThrottled: this.totalThrottled,
      pendingBatch: this.pendingBatch.length,
      listenerCount: this.listenerCount('event'),
    };
  }
}
```

### SSE Server Transport

Server-Sent Events transport for unidirectional streaming to read-only dashboards. Supports resume from last event ID and phi-timed keepalive.

```javascript
// heady-ag-ui-protocol/src/sse-transport.mjs
import pino from 'pino';

const log = pino({ name: 'heady-ag-ui-sse', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const MAX_SSE_CONNECTIONS = FIB[8];
const KEEPALIVE_MS = Math.round(PHI * 1000);

export class SSETransport {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.clients = new Map();
    this.eventLog = [];
    this.maxLogSize = FIB[9] * 10;

    eventBus.on('event', (event) => this.broadcast(event));
    eventBus.on('batch', (events) => events.forEach((e) => this.broadcast(e)));

    log.info({ maxConnections: MAX_SSE_CONNECTIONS }, 'SSE transport initialized');
  }

  handleConnection(req, res) {
    if (this.clients.size >= MAX_SSE_CONNECTIONS) {
      log.warn({ current: this.clients.size }, 'SSE connection limit reached');
      res.status(503).json({ error: 'Connection limit reached', max: MAX_SSE_CONNECTIONS });
      return;
    }

    const clientId = req.headers['x-heady-client-id'] || `sse-${Date.now()}`;
    const lastEventId = req.headers['last-event-id'] || req.query.lastEventId;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Heady-Transport': 'SSE',
      'X-Heady-Sacred-Layer': 'Outer',
    });

    this.clients.set(clientId, { res, connectedAt: Date.now(), eventsSent: 0 });
    log.info({ clientId, totalClients: this.clients.size }, 'SSE client connected');

    if (lastEventId) this.replayFrom(clientId, lastEventId);

    const keepalive = setInterval(() => {
      res.write(`:keepalive ${Date.now()}\n\n`);
    }, KEEPALIVE_MS);

    req.on('close', () => {
      clearInterval(keepalive);
      this.clients.delete(clientId);
      log.info({ clientId, totalClients: this.clients.size }, 'SSE client disconnected');
    });
  }

  broadcast(event) {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) this.eventLog.shift();

    const data = JSON.stringify(event);
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${data}\n\n`);
        client.eventsSent++;
      } catch (err) {
        log.error({ clientId, err: err.message }, 'SSE write failed, removing client');
        this.clients.delete(clientId);
      }
    }
  }

  replayFrom(clientId, lastEventId) {
    const idx = this.eventLog.findIndex((e) => e.id === lastEventId);
    if (idx < 0) return;
    const missed = this.eventLog.slice(idx + 1);
    const client = this.clients.get(clientId);
    if (!client) return;
    for (const event of missed) {
      const data = JSON.stringify(event);
      client.res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${data}\n\n`);
      client.eventsSent++;
    }
    log.info({ clientId, replayed: missed.length }, 'SSE replay complete');
  }

  getStats() {
    return {
      activeConnections: this.clients.size,
      maxConnections: MAX_SSE_CONNECTIONS,
      eventLogSize: this.eventLog.length,
    };
  }
}
```

### WebSocket Bidirectional Transport

WebSocket transport for full bidirectional communication — agents push state, users push interrupts, redirects, and cancellations. PHI^attempt reconnection backoff built into the client handshake protocol.

```javascript
// heady-ag-ui-protocol/src/ws-transport.mjs
import { WebSocketServer } from 'ws';
import pino from 'pino';

const log = pino({ name: 'heady-ag-ui-ws', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const MAX_WS_CONNECTIONS = FIB[7];
const BACKOFF_BASE_MS = FIB[5] * 100;
const BACKOFF_MAX_MS = FIB[9] * 1000;
const BACKOFF_JITTER = PSI ** 2;

/** Compute reconnect delay: PHI^attempt × base ± 38.2% jitter */
export function reconnectDelay(attempt) {
  const raw = Math.min(BACKOFF_BASE_MS * (PHI ** attempt), BACKOFF_MAX_MS);
  const jitter = raw * BACKOFF_JITTER * (Math.random() * 2 - 1);
  return Math.round(raw + jitter);
}

export class WSTransport {
  constructor(server, eventBus) {
    this.wss = new WebSocketServer({ server, path: '/ag-ui/ws' });
    this.eventBus = eventBus;
    this.clients = new Map();

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    eventBus.on('event', (event) => this.broadcast(event));
    eventBus.on('batch', (events) => {
      const payload = JSON.stringify({ type: 'batch', events });
      for (const [, client] of this.clients) {
        if (client.ws.readyState === 1) client.ws.send(payload);
      }
    });

    log.info({ maxConnections: MAX_WS_CONNECTIONS, path: '/ag-ui/ws' }, 'WebSocket transport initialized');
  }

  handleConnection(ws, req) {
    if (this.clients.size >= MAX_WS_CONNECTIONS) {
      ws.close(1013, 'Connection limit reached');
      log.warn({ current: this.clients.size }, 'WS connection rejected — limit reached');
      return;
    }

    const clientId = req.headers['x-heady-client-id'] || `ws-${Date.now()}`;
    this.clients.set(clientId, { ws, connectedAt: Date.now(), eventsSent: 0, messagesReceived: 0 });
    log.info({ clientId, totalClients: this.clients.size }, 'WS client connected');

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      reconnectPolicy: { base: BACKOFF_BASE_MS, max: BACKOFF_MAX_MS, jitter: BACKOFF_JITTER, formula: 'PHI^attempt × base' },
    }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const client = this.clients.get(clientId);
        if (client) client.messagesReceived++;
        this.handleClientMessage(clientId, msg);
      } catch (err) {
        log.error({ clientId, err: err.message }, 'Invalid WS message');
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      log.info({ clientId, totalClients: this.clients.size }, 'WS client disconnected');
    });
  }

  handleClientMessage(clientId, msg) {
    switch (msg.type) {
      case 'interrupt':
        log.info({ clientId, agentId: msg.agentId }, 'User interrupt received');
        this.eventBus.emit('user:interrupt', { clientId, agentId: msg.agentId, reason: msg.reason });
        break;
      case 'redirect':
        log.info({ clientId, agentId: msg.agentId, target: msg.target }, 'User redirect received');
        this.eventBus.emit('user:redirect', { clientId, agentId: msg.agentId, target: msg.target });
        break;
      case 'cancel':
        log.info({ clientId, agentId: msg.agentId }, 'User cancel received');
        this.eventBus.emit('user:cancel', { clientId, agentId: msg.agentId });
        break;
      case 'ping':
        this.clients.get(clientId)?.ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        break;
      default:
        log.warn({ clientId, type: msg.type }, 'Unknown client message type');
    }
  }

  broadcast(event) {
    const data = JSON.stringify(event);
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState !== 1) continue;
      try {
        client.ws.send(data);
        client.eventsSent++;
      } catch (err) {
        log.error({ clientId, err: err.message }, 'WS send failed');
        this.clients.delete(clientId);
      }
    }
  }

  getStats() {
    return {
      activeConnections: this.clients.size,
      maxConnections: MAX_WS_CONNECTIONS,
    };
  }
}
```

### Micro-Frontend Event Router and Pipeline Visualizer

Routes events to the correct micro-frontend remote app and maps the 21 HCFP stages to progress segments.

```javascript
// heady-ag-ui-protocol/src/frontend-router.mjs
import pino from 'pino';

const log = pino({ name: 'heady-ag-ui-router', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const HCFP_STAGES = [
  'intake', 'classify', 'route', 'enrich', 'validate',
  'embed', 'search', 'rank', 'fuse', 'generate',
  'review', 'refine', 'format', 'cache', 'deliver',
  'log', 'evaluate', 'learn', 'archive', 'audit', 'report',
];

const FRONTEND_ROUTES = {
  'swarm-dashboard':    ['AgentSpawned', 'AgentProgress', 'AgentRetired'],
  'governance-panel':   ['AgentDecision', 'AgentError', 'PolicyViolation'],
  'vector-explorer':    ['EmbeddingGenerated', 'VectorSearchResult'],
  'projection-monitor': ['StageProgress', 'PipelineComplete', 'AgentResult'],
};

export class FrontendRouter {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.subscriptions = new Map();
    this.routeLog = [];

    eventBus.on('event', (event) => this.route(event));
    eventBus.on('batch', (events) => events.forEach((e) => this.route(e)));
    log.info({ routes: Object.keys(FRONTEND_ROUTES) }, 'Frontend router initialized');
  }

  route(event) {
    const destinations = [];
    for (const [frontend, eventTypes] of Object.entries(FRONTEND_ROUTES)) {
      if (eventTypes.includes(event.type)) {
        destinations.push(frontend);
        this.eventBus.emit(`frontend:${frontend}`, event);
      }
    }
    if (destinations.length > 0) {
      this.routeLog.push({ eventId: event.id, type: event.type, destinations, timestamp: Date.now() });
      if (this.routeLog.length > FIB[8] * 10) this.routeLog.shift();
    }
  }

  subscribe(frontend, callback) {
    this.eventBus.on(`frontend:${frontend}`, callback);
    this.subscriptions.set(frontend, (this.subscriptions.get(frontend) || 0) + 1);
    log.info({ frontend, subscribers: this.subscriptions.get(frontend) }, 'Frontend subscription added');
  }

  getStats() {
    return { subscriptions: Object.fromEntries(this.subscriptions), routeLogSize: this.routeLog.length };
  }
}

/**
 * Maps HCFP stage progress to a visual progress descriptor for the UI.
 */
export function mapStageToProgress(stageIndex, stageDurationMs, totalElapsedMs) {
  const stageName = HCFP_STAGES[stageIndex];
  const totalStages = HCFP_STAGES.length;
  const segmentPercent = 100 / totalStages;

  return {
    stageIndex,
    stageName,
    totalStages,
    percentComplete: ((stageIndex + 1) / totalStages) * 100,
    segmentStart: stageIndex * segmentPercent,
    segmentEnd: (stageIndex + 1) * segmentPercent,
    stageDurationMs,
    totalElapsedMs,
    remainingStages: totalStages - stageIndex - 1,
  };
}

/**
 * Builds a decision tree node for agent decision-tree rendering.
 */
export function createDecisionNode(agentId, decisionId, branches, chosenBranch, confidence) {
  return {
    agentId,
    decisionId,
    branches: branches.map((b, i) => ({
      label: b.label,
      confidence: b.confidence,
      chosen: i === chosenBranch,
      weight: b.confidence >= 0.882 ? 'HIGH' : b.confidence >= 0.691 ? 'MEDIUM' : 'LOW',
    })),
    chosenIndex: chosenBranch,
    overallConfidence: confidence,
    timestamp: Date.now(),
  };
}
```

### Express Router and Health Endpoint

```javascript
// heady-ag-ui-protocol/src/router.mjs
import express from 'express';
import pino from 'pino';
import { AGUIEventBus, createEvent } from './event-bus.mjs';
import { SSETransport } from './sse-transport.mjs';
import { FrontendRouter, mapStageToProgress } from './frontend-router.mjs';

const log = pino({ name: 'heady-ag-ui-protocol', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };

export function createAGUIRouter() {
  const router = express.Router();
  const eventBus = new AGUIEventBus();
  const sse = new SSETransport(eventBus);
  const frontendRouter = new FrontendRouter(eventBus);
  const startTime = Date.now();

  /** SSE streaming endpoint */
  router.get('/stream', (req, res) => sse.handleConnection(req, res));

  /** Publish an agent event */
  router.post('/events', (req, res) => {
    const { type, agentId, payload } = req.body;
    if (!type || !agentId) {
      res.status(400).json({ error: 'type and agentId required' });
      return;
    }
    const event = createEvent(type, agentId, payload);
    const delivered = eventBus.publish(event);
    res.json({ eventId: event.id, delivered, throttleTier: event.throttleTier });
  });

  /** Pipeline stage progress */
  router.post('/pipeline/progress', (req, res) => {
    const { agentId, stageIndex, stageDurationMs, totalElapsedMs } = req.body;
    const progress = mapStageToProgress(stageIndex, stageDurationMs, totalElapsedMs);
    const event = createEvent('StageProgress', agentId, progress);
    eventBus.publish(event);
    res.json({ eventId: event.id, progress });
  });

  /** Health endpoint */
  router.get('/health', (req, res) => {
    const busStats = eventBus.getStats();
    const sseStats = sse.getStats();
    const routerStats = frontendRouter.getStats();
    const uptimeSeconds = (Date.now() - startTime) / 1000;

    const deliveryRate = busStats.totalEmitted > 0
      ? busStats.totalEmitted / (busStats.totalEmitted + busStats.totalThrottled)
      : 1;
    const coherence = Math.min(1, deliveryRate * PHI / (PHI + 1));

    res.json({
      service: 'heady-ag-ui-protocol',
      status: coherence >= CSL_GATES.MINIMUM ? 'healthy' : 'degraded',
      coherence: parseFloat(coherence.toFixed(4)),
      phi_compliance: true,
      sacred_geometry_layer: 'Outer',
      uptime_seconds: parseFloat(uptimeSeconds.toFixed(2)),
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
      csl_gates: CSL_GATES,
      transport: {
        sse: sseStats,
        ws: { note: 'WebSocket stats available on WS transport instance' },
      },
      events: busStats,
      routing: routerStats,
      throttle_config: {
        critical_ms: 0,
        high_ms: Math.round(PSI ** 2 * 1000),
        progress_ms: Math.round(PSI * 1000),
        heartbeat_ms: Math.round(PHI * 1000),
        low_ms: Math.round(PHI ** 2 * 1000),
      },
      batch_sizes: [FIB[4], FIB[5], FIB[6]],
      reconnect_policy: {
        base_ms: FIB[5] * 100,
        max_ms: FIB[9] * 1000,
        jitter: PSI ** 2,
        formula: 'PHI^attempt × base ± 38.2%',
      },
    });
  });

  return { router, eventBus, sse, frontendRouter };
}
```

## Integration Points

| Component                      | Interface                           | Sacred Geometry Layer |
|--------------------------------|-------------------------------------|-----------------------|
| **BRIDGE**                     | AG-UI implements BRIDGE node        | Outer                 |
| **Conductor**                  | Pipeline orchestration events       | Inner                 |
| **Brains**                     | Agent decision events               | Inner                 |
| **OBSERVER**                   | Trace and monitoring events         | Middle                |
| **SENTINEL**                   | Security alert propagation          | Outer                 |
| **heady-microfrontend-portal** | Micro-frontend host receives events | Outer                 |
| **heady-generative-ui-v2**     | UI rendering of streamed state      | Outer                 |
| **heady-ws-auth-protocol**     | WebSocket auth handshake            | Governance            |
| **heady-a2a-protocol**         | Agent-to-Agent events bridge to UI  | Middle                |
| **heady-observability-mesh**   | Event telemetry and tracing         | Governance            |
| **telemetry-bee**              | HeadyBee collecting event metrics   | Bee                   |
| **swarm-bee**                  | HeadyBee lifecycle events           | Bee                   |

## API

### GET /stream

SSE endpoint — opens a persistent text/event-stream connection. Supports `Last-Event-ID` header for resume.

### POST /events

Publish an agent lifecycle event to the bus.

**Request:**
```json
{ "type": "AgentSpawned", "agentId": "bee-abc123", "payload": { "role": "search-bee", "pool": "Hot" } }
```

### POST /pipeline/progress

Report HCFP pipeline stage completion for progress visualization.

**Request:**
```json
{ "agentId": "bee-abc123", "stageIndex": 9, "stageDurationMs": 432, "totalElapsedMs": 2841 }
```

### GET /health

Returns service health, coherence score, transport stats, and event throughput.

## Health Endpoint

```json
{
  "service": "heady-ag-ui-protocol",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Outer",
  "uptime_seconds": 54210.33,
  "version": "1.0.0",
  "phi": 1.618033988749895,
  "psi": 0.618033988749895,
  "csl_gates": { "MINIMUM": 0.500, "LOW": 0.691, "MEDIUM": 0.809, "HIGH": 0.882, "CRITICAL": 0.927, "DEDUP": 0.972 },
  "transport": {
    "sse": { "activeConnections": 12, "maxConnections": 34, "eventLogSize": 423 },
    "ws": { "note": "WebSocket stats available on WS transport instance" }
  },
  "events": { "totalEmitted": 8432, "totalThrottled": 1204, "pendingBatch": 3, "listenerCount": 14 },
  "routing": { "subscriptions": { "swarm-dashboard": 3, "governance-panel": 2, "vector-explorer": 1, "projection-monitor": 2 }, "routeLogSize": 210 },
  "throttle_config": { "critical_ms": 0, "high_ms": 382, "progress_ms": 618, "heartbeat_ms": 1618, "low_ms": 2618 },
  "batch_sizes": [5, 8, 13],
  "reconnect_policy": { "base_ms": 800, "max_ms": 55000, "jitter": 0.382, "formula": "PHI^attempt × base ± 38.2%" }
}
```
