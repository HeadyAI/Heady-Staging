# /heady-event-bus

Inspect, debug, monitor, and extend the Heady global.eventBus — the central nervous
system connecting all 13 Heady engines, HCFPRunner, auto-success reactor, bees, and services.

## What This Does

The global event bus (`global.eventBus`) is an EventEmitter shared across all bootstrap
modules. Every engine emits and listens on this bus for real-time coordination.

**Critical role**: The HCFPEventBridge translates HCFPRunner internal events into
global.eventBus events so the auto-success engine can react to pipeline lifecycle.

## Key Files

| File | Purpose |
|------|---------|
| `src/orchestration/hcfp-event-bridge.js` | Runner↔Bus bridge + φ⁷ autonomous trigger |
| `src/bootstrap/engine-wiring.js` | Where global.eventBus is created and passed to all engines |
| `src/orchestration/hc_auto_success.js` | Primary event consumer (39 REACTION_TRIGGERS) |
| `src/orchestration/auto-commit-deploy.js` | Emits/consumes deploy:started, pipeline:completed |

## Event Map (Runner → Bus Translation)

| HCFPRunner Event | global.eventBus Event |
|-----------------|----------------------|
| `run:start` | `pipeline:started` |
| `run:complete` | `pipeline:completed` |
| `run:stopped` | `pipeline:completed` |
| `stage:start` | `pipeline:stage:start` |
| `stage:end` | `pipeline:stage:end` |
| `stage:passed` | `pipeline:stage:passed` |
| `stage:failed` | `pipeline:failed` |
| `run:paused` | `pipeline:paused` |
| `run:resumed` | `pipeline:resumed` |

## Reverse Map (Bus → Runner)

| global.eventBus Event | HCFPRunner Action |
|----------------------|------------------|
| `pipeline:run` | `runner.run(data.task)` |
| `pipeline:trigger` | `runner.run(data.task)` |
| `pipeline:pause` | `runner.pause(data.runId)` |
| `pipeline:resume` | `runner.resume(data.runId)` |
| `pipeline:cancel` | `runner.cancel(data.runId)` |

## Usage

### Inspect Event Bus Activity (runtime)
```javascript
const bus = global.eventBus;

// Tap all pipeline events
['pipeline:started','pipeline:completed','pipeline:failed','pipeline:stage:end'].forEach(e => {
  bus.on(e, data => console.log(e, JSON.stringify(data).slice(0, 200)));
});
```

### Check Bridge Status
```bash
curl http://localhost:3301/api/hcfp-bridge/status | jq '{
  running: .running,
  cycles: .cycleCount,
  lastRun: .lastRunAt,
  wiredEvents: .wiredEventCount,
  nextTriggerMs: .triggerIntervalMs
}'
```

### Manually Trigger Pipeline via Bus
```bash
curl -X POST http://localhost:3301/api/hcfp-bridge/trigger \
  -H 'Content-Type: application/json' \
  -d '{"task":"manual-debug"}'
```

### Emit a Custom Event (Node.js)
```javascript
global.eventBus.emit('state:changed', { source: 'debug', detail: 'testing bus' });
global.eventBus.emit('pipeline:trigger', { task: 'test-run', source: 'manual' });
```

### List All Active Listeners
```javascript
const bus = global.eventBus;
const events = bus.eventNames();
console.log('Active events:', events.length);
events.forEach(e => console.log(` ${e}: ${bus.listenerCount(e)} listeners`));
```

## Auto-Success REACTION_TRIGGERS (39 total)

The auto-success engine reacts to ALL of these via `engine.react(trigger, data)`:

```
state:changed       deploy:started      deploy:completed    deploy:failed
health:degraded     health:recovered    security:alert      security:scan
governance:audit    projection:synced   projection:stale
bee:discovered      bee:spawned         bee:dissolved
vector:compacted    vector:sprawl       vector:secured
template:rendered   template:injected
error:absorbed      error:pattern       error:resolved
config:changed      config:drift
brain:routed        brain:failover
pipeline:started    pipeline:completed  pipeline:failed     ← from HCFPEventBridge
creative:job        creative:completed
trading:signal      trading:executed
buddy:query         buddy:response
registry:updated    node:activated      node:deactivated
cache:hit           cache:miss          cache:evicted
circuit:tripped     circuit:recovered
resource:pressure   resource:released
auto_success:reaction   system:boot     system:shutdown
```

## Diagnosing Bus Disconnects

### Engine not receiving pipeline events
```bash
# 1. Check bridge is running
curl http://localhost:3301/api/hcfp-bridge/status | jq .running

# 2. Check eventBus passed to bridge
# Look in engine-wiring.js section 13 — bridge created with valid eventBus reference

# 3. Check listener count for pipeline:started
node -e "console.log(global.eventBus?.listenerCount('pipeline:started'))"
```

### Bus emitting but no reactions
```bash
# Check auto-success is running and wired
curl http://localhost:3301/api/auto-success/status | jq '{running:.running, reactions:.reactionCount}'

# Check engine was passed eventBus in wire()
# In engine-wiring.js section 8: engines.autoSuccessEngine.wire({ eventBus })
```

## Autonomy Policy

- `requires_approval`: none
- `auto_run`: true
- `can_emit_events`: true
- `can_listen_events`: true
