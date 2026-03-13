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
<!-- ║  FILE: packages/hc-supervisor/README.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HCSupervisor - Multi-Agent Task Router for Heady System

The HCSupervisor is the central orchestration layer for the Heady system, routing tasks to specialized agents based on capability matching and managing parallel execution with health tracking.

## Overview

```
┌─────────────────────────────────────────┐
│  HCSupervisor                           │
│  ├─ Task Routing                        │
│  ├─ Agent Health Management             │
│  ├─ Parallel Execution & Aggregation    │
│  ├─ Result Tracking                     │
│  └─ Event Emission                      │
└─────────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬─────────┬──────────┬──────────┐
    │          │          │         │          │          │
  Builder  Researcher Deployer Auditor Observer ClaudeCode
```

## Features

- **Capability-Based Routing**: Automatically matches tasks to agents with required skills
- **Health Tracking**: Monitors agent health and routes around failures
- **Parallel Execution**: Fan-out tasks to multiple agents with concurrency limits
- **Result Aggregation**: Collects and aggregates results from parallel executions
- **Exponential Backoff**: Uses PHI-based retry logic for resilience
- **Event Emission**: Emits lifecycle events for monitoring and logging
- **Metrics**: Collects detailed metrics on task execution and agent performance
- **No Magic Numbers**: All constants from @heady/phi-math

## Agent Catalog

| Agent | Skills | Criticality | Timeout |
|-------|--------|-------------|---------|
| builder | build, deploy, test, lint | high | 30s |
| researcher | news-ingestion, concept-extraction, trend-analysis | medium | 45s |
| deployer | render-deploy, docker-build, cloud-bridge, env-sync | high | 60s |
| auditor | code-audit, security-scan, brand-check, dependency-audit | medium | 40s |
| observer | health-check, metrics-collection, alert-evaluation, readiness-probe | critical | 15s |
| claude-code | code-analysis, security-audit, documentation, concept-alignment, task-planning, governance-check, readiness-eval | high | 120s |

## Installation

```bash
npm install @heady/hc-supervisor
```

## Quick Start

```javascript
const { HCSupervisor } = require('@heady/hc-supervisor');

// Create supervisor instance
const supervisor = new HCSupervisor({
  maxConcurrentTasks: 20,
  defaultTimeout: 30000,
  enableHealthChecks: true,
  healthCheckInterval: 5000,
});

// Listen to events
supervisor.on('task:assigned', (event) => {
  console.log('Task assigned:', event.taskId);
});

supervisor.on('task:completed', (event) => {
  console.log('Task completed:', event.taskId, event.result);
});

supervisor.on('task:failed', (event) => {
  console.log('Task failed:', event.taskId, event.error);
});

// Submit a single task
const result = await supervisor.submitTask({
  id: 'task-001',
  type: 'build',
  payload: { repo: 'heady-core' },
  timeout: 30000,
});

console.log('Result:', result);
```

## Task Submission

### Single Task

```javascript
// Route to agent with 'build' skill automatically
const result = await supervisor.submitTask({
  id: 'task-build-001',
  type: 'build',
  payload: {
    repo: 'heady-core',
    branch: 'main',
  },
  timeout: 30000,
});
```

### Direct Routing

```javascript
// Route to specific agent(s)
const result = await supervisor.submitTask({
  id: 'task-002',
  type: 'security-scan',
  agents: ['auditor'],
  strategy: 'direct',
  payload: {
    targetPath: '/code',
  },
});
```

### Parallel Tasks

```javascript
// Submit multiple tasks with concurrency limits
const tasks = [
  { id: 'task-1', type: 'lint', payload: { repo: 'repo-1' } },
  { id: 'task-2', type: 'test', payload: { repo: 'repo-2' } },
  { id: 'task-3', type: 'build', payload: { repo: 'repo-3' } },
];

const { results, errors, succeeded, failed } = await supervisor.submitParallelTasks(tasks);

console.log(`Completed: ${succeeded}, Failed: ${failed}`);
results.forEach(r => console.log(`✓ ${r.taskId}`));
errors.forEach(e => console.log(`✗ ${e.taskId}: ${e.error}`));
```

## Configuration Options

```javascript
const supervisor = new HCSupervisor({
  // Max concurrent tasks (enforced per batch)
  maxConcurrentTasks: 20,
  
  // Default timeout for all tasks (ms)
  defaultTimeout: 30000,
  
  // Enable/disable metrics collection
  enableMetrics: true,
  
  // Enable/disable health checks
  enableHealthChecks: true,
  
  // Health check interval (ms)
  healthCheckInterval: 5000,
  
  // Retry strategy: 'exponential-backoff' (default) or 'linear'
  retryStrategy: 'exponential-backoff',
  
  // Max retries before failure
  maxRetries: 3,
});
```

## Agent Endpoints

Set agent endpoints via environment variables:

```bash
# Example .env
AGENT_BUILDER_ENDPOINT=http://localhost:8000/agents/builder
AGENT_RESEARCHER_ENDPOINT=http://localhost:8001/agents/researcher
AGENT_DEPLOYER_ENDPOINT=http://localhost:8002/agents/deployer
AGENT_AUDITOR_ENDPOINT=http://localhost:8003/agents/auditor
AGENT_OBSERVER_ENDPOINT=http://localhost:8004/agents/observer
AGENT_CLAUDE_CODE_ENDPOINT=http://localhost:8005/agents/claude-code
```

## API Reference

### HCSupervisor Class

#### Constructor

```javascript
new HCSupervisor(options?)
```

#### Methods

##### submitTask(task)

Submit a single task for execution.

**Parameters:**
- `task` (Object)
  - `id` (string, required): Unique task identifier
  - `type` (string, required): Task type/skill (e.g., 'build', 'deploy')
  - `payload` (Object, required): Task payload
  - `agents` (Array<string>, optional): Preferred agent names
  - `strategy` (string, optional): Routing strategy ('capability-match', 'direct', etc.)
  - `timeout` (number, optional): Timeout in milliseconds

**Returns:** Promise<Object> - Task execution result

**Example:**
```javascript
const result = await supervisor.submitTask({
  id: 'build-main',
  type: 'build',
  payload: { repo: 'heady-core' },
});
```

##### submitParallelTasks(tasks)

Submit multiple tasks in parallel with concurrency limits.

**Parameters:**
- `tasks` (Array<Object>): Array of task definitions (same format as submitTask)

**Returns:** Promise<Object>
- `results` (Array): Successful task results
- `errors` (Array): Failed tasks
- `succeeded` (number): Count of successful tasks
- `failed` (number): Count of failed tasks

**Example:**
```javascript
const { results, errors, succeeded, failed } = await supervisor.submitParallelTasks([
  { id: 'task-1', type: 'lint', payload: {} },
  { id: 'task-2', type: 'test', payload: {} },
]);
```

##### getMetrics()

Get current performance metrics.

**Returns:** Object
- `tasksProcessed` (number): Total tasks processed
- `tasksSucceeded` (number): Successful tasks
- `tasksFailed` (number): Failed tasks
- `avgLatency` (number): Average task latency (ms)
- `successRate` (number): Success rate percentage
- `activeTasks` (number): Currently executing tasks
- `queuedTasks` (number): Queued tasks
- `agentMetrics` (Object): Per-agent metrics

**Example:**
```javascript
const metrics = supervisor.getMetrics();
console.log(`Success rate: ${metrics.successRate.toFixed(2)}%`);
console.log(`Avg latency: ${metrics.avgLatency.toFixed(0)}ms`);
```

##### getAgentStatus()

Get health and performance status of all agents.

**Returns:** Object - Agent status map

**Example:**
```javascript
const status = supervisor.getAgentStatus();
Object.entries(status).forEach(([name, info]) => {
  console.log(`${name}: ${info.health} (${info.successRate.toFixed(1)}%)`);
});
```

##### getTaskStatus(taskId)

Get current status of a specific task.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** Object|null - Task status or null if not found

##### getAgentCatalog()

Get all available agent configurations.

**Returns:** Object - Agent catalog

##### shutdown()

Clean up resources and stop health checks.

**Example:**
```javascript
supervisor.shutdown();
```

### Events

The supervisor emits the following events:

#### task:assigned
Emitted when a task is assigned to an agent.

```javascript
supervisor.on('task:assigned', (event) => {
  console.log(event.taskId, event.task);
});
```

#### task:executing
Emitted when task execution starts.

```javascript
supervisor.on('task:executing', (event) => {
  console.log(`Task ${event.taskId} executing on ${event.agent}`);
});
```

#### task:completed
Emitted when task completes successfully.

```javascript
supervisor.on('task:completed', (event) => {
  console.log(`Task ${event.taskId} completed`);
  console.log(event.result);
});
```

#### task:failed
Emitted when task fails.

```javascript
supervisor.on('task:failed', (event) => {
  console.log(`Task ${event.taskId} failed: ${event.error}`);
});
```

## Health Checks

The supervisor continuously monitors agent health:

```javascript
// Get agent health status
const status = supervisor.getAgentStatus();
// status.{agentName}.health = 'healthy', 'degraded', 'unhealthy', or 'unavailable'
```

**Health States:**
- `HEALTHY`: Agent is operating normally
- `DEGRADED`: Agent has minor issues but accepting tasks
- `UNHEALTHY`: Agent experiencing failures, limited routing
- `UNAVAILABLE`: Agent offline, no tasks routed

## Retry Strategy

Tasks are retried using PHI-based exponential backoff:

```
Attempt 1: ~100ms
Attempt 2: ~162ms (100 * φ)
Attempt 3: ~262ms (100 * φ²)
Attempt 4: ~424ms (100 * φ³)
```

Where φ (phi) = 1.618034 (golden ratio from @heady/phi-math)

## Error Handling

```javascript
try {
  const result = await supervisor.submitTask({
    id: 'task-001',
    type: 'build',
    payload: { repo: 'heady-core' },
  });
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Task timed out after retries');
  } else if (error.message.includes('No suitable agents')) {
    console.error('No agents available for this task type');
  } else {
    console.error('Task execution failed:', error.message);
  }
}
```

## Monitoring Example

```javascript
const supervisor = new HCSupervisor();

// Monitor metrics every 10 seconds
setInterval(() => {
  const metrics = supervisor.getMetrics();
  const status = supervisor.getAgentStatus();
  
  console.log('\n=== SUPERVISOR METRICS ===');
  console.log(`Processed: ${metrics.tasksProcessed}`);
  console.log(`Success: ${metrics.tasksSucceeded} (${metrics.successRate.toFixed(1)}%)`);
  console.log(`Avg Latency: ${metrics.avgLatency.toFixed(0)}ms`);
  console.log(`Active Tasks: ${metrics.activeTasks}`);
  
  console.log('\n=== AGENT STATUS ===');
  Object.entries(status).forEach(([name, info]) => {
    console.log(`${name.padEnd(15)} ${info.health.padEnd(10)} ${info.successRate.toFixed(1)}%`);
  });
}, 10000);
```

## Integration with Heady Brain

The supervisor integrates with the Heady Brain for:

- Task validation and governance checks
- Agent selection optimization
- Readiness evaluation
- Concept alignment

## Contributing

See the main Heady repository for contribution guidelines.

## License

MIT - See LICENSE file in the Heady repository
