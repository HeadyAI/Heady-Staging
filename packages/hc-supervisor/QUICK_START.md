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
<!-- ║  FILE: packages/hc-supervisor/QUICK_START.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HCSupervisor Quick Start Guide

## 30-Second Intro

HCSupervisor routes tasks to the right agent based on what you need done:

```javascript
const { HCSupervisor } = require('@heady/hc-supervisor');

const supervisor = new HCSupervisor();

// Submit a task - supervisor finds the right agent automatically
const result = await supervisor.submitTask({
  id: 'task-1',
  type: 'build',           // What needs to be done
  payload: { repo: 'my-repo' },  // Task data
});

console.log(result);
```

## Installation

```bash
npm install @heady/hc-supervisor
```

## Basic Usage

### 1. Create a Supervisor

```javascript
const { HCSupervisor } = require('@heady/hc-supervisor');

const supervisor = new HCSupervisor({
  maxConcurrentTasks: 20,
  defaultTimeout: 30000,
});
```

### 2. Listen for Events (Optional)

```javascript
supervisor.on('task:completed', (event) => {
  console.log(`✓ ${event.taskId} completed`);
});

supervisor.on('task:failed', (event) => {
  console.error(`✗ ${event.taskId} failed: ${event.error}`);
});
```

### 3. Submit Tasks

**Single task:**
```javascript
const result = await supervisor.submitTask({
  id: 'build-main',
  type: 'build',
  payload: { repo: 'heady-core', branch: 'main' },
});
```

**Multiple tasks in parallel:**
```javascript
const { results, errors, succeeded, failed } = await supervisor.submitParallelTasks([
  { id: 'task-1', type: 'lint', payload: {} },
  { id: 'task-2', type: 'test', payload: {} },
  { id: 'task-3', type: 'build', payload: {} },
]);

console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
```

### 4. Check Status

```javascript
// Get metrics
const metrics = supervisor.getMetrics();
console.log(`Success rate: ${metrics.successRate.toFixed(1)}%`);

// Get agent status
const status = supervisor.getAgentStatus();
Object.entries(status).forEach(([name, info]) => {
  console.log(`${name}: ${info.health} (${info.successRate.toFixed(1)}%)`);
});

// Check specific task
const taskStatus = supervisor.getTaskStatus('task-1');
console.log(taskStatus);
```

### 5. Shutdown

```javascript
supervisor.shutdown();
```

## Common Task Types

| Task Type | Agent | Use Case |
|-----------|-------|----------|
| `build` | builder | Compile/bundle code |
| `test` | builder | Run test suites |
| `lint` | builder | Code quality checks |
| `deploy` | deployer | Deploy to production |
| `docker-build` | deployer | Build Docker image |
| `code-audit` | auditor | Security analysis |
| `security-scan` | auditor | Vulnerability scan |
| `health-check` | observer | System health |
| `metrics-collection` | observer | Gather metrics |
| `concept-extraction` | researcher | Extract concepts |
| `code-analysis` | claude-code | Analyze code |
| `documentation` | claude-code | Generate docs |

## Environment Setup

Set agent endpoints:

```bash
export AGENT_BUILDER_ENDPOINT=http://localhost:8000/agents/builder
export AGENT_RESEARCHER_ENDPOINT=http://localhost:8001/agents/researcher
export AGENT_DEPLOYER_ENDPOINT=http://localhost:8002/agents/deployer
export AGENT_AUDITOR_ENDPOINT=http://localhost:8003/agents/auditor
export AGENT_OBSERVER_ENDPOINT=http://localhost:8004/agents/observer
export AGENT_CLAUDE_CODE_ENDPOINT=http://localhost:8005/agents/claude-code
```

For testing without agents:
```bash
export AGENT_MOCK_MODE=true
```

## Configuration Examples

### Conservative (Lower Latency)
```javascript
new HCSupervisor({
  maxConcurrentTasks: 5,
  defaultTimeout: 10000,
  maxRetries: 1,
});
```

### Aggressive (Higher Throughput)
```javascript
new HCSupervisor({
  maxConcurrentTasks: 100,
  defaultTimeout: 60000,
  maxRetries: 5,
});
```

### High Reliability
```javascript
new HCSupervisor({
  maxConcurrentTasks: 10,
  defaultTimeout: 120000,
  maxRetries: 3,
  healthCheckInterval: 1000,
});
```

## Error Handling

```javascript
try {
  const result = await supervisor.submitTask({
    id: 'task-1',
    type: 'build',
    payload: { repo: 'my-repo' },
  });
} catch (error) {
  if (error.message.includes('No suitable agents')) {
    console.error('No agents available for this task type');
  } else if (error.message.includes('timeout')) {
    console.error('Task execution timed out');
  } else {
    console.error('Task failed:', error.message);
  }
}
```

## Real-World Example

```javascript
const { HCSupervisor } = require('@heady/hc-supervisor');

async function deployNewRelease() {
  const supervisor = new HCSupervisor();
  
  // Listen to events
  supervisor.on('task:completed', (event) => {
    console.log(`✓ ${event.taskId} completed`);
  });
  
  supervisor.on('task:failed', (event) => {
    console.error(`✗ ${event.taskId}: ${event.error}`);
    process.exit(1);
  });
  
  // Run deployment pipeline
  const tasks = [
    {
      id: 'lint',
      type: 'lint',
      payload: { repo: 'heady-core' },
    },
    {
      id: 'test',
      type: 'test',
      payload: { repo: 'heady-core' },
    },
    {
      id: 'build',
      type: 'build',
      payload: { repo: 'heady-core' },
    },
    {
      id: 'security-scan',
      type: 'security-scan',
      payload: { repo: 'heady-core' },
    },
    {
      id: 'deploy',
      type: 'deploy',
      payload: { service: 'heady-core', env: 'production' },
    },
  ];
  
  console.log('Starting deployment pipeline...');
  const { succeeded, failed } = await supervisor.submitParallelTasks(tasks);
  
  console.log(`\nDeployment complete: ${succeeded} succeeded, ${failed} failed`);
  
  const metrics = supervisor.getMetrics();
  console.log(`Success rate: ${metrics.successRate.toFixed(1)}%`);
  console.log(`Avg latency: ${metrics.avgLatency.toFixed(0)}ms`);
  
  supervisor.shutdown();
}

deployNewRelease().catch(console.error);
```

## Monitoring Pattern

```javascript
// Log metrics every 30 seconds
setInterval(() => {
  const metrics = supervisor.getMetrics();
  const status = supervisor.getAgentStatus();
  
  console.log('\n=== SUPERVISOR STATUS ===');
  console.log(`Processed: ${metrics.tasksProcessed}`);
  console.log(`Success: ${metrics.successRate.toFixed(1)}%`);
  console.log(`Avg latency: ${metrics.avgLatency.toFixed(0)}ms`);
  console.log(`Active: ${metrics.activeTasks}`);
  
  console.log('\n=== AGENT STATUS ===');
  Object.entries(status).forEach(([name, info]) => {
    console.log(`${name.padEnd(15)} ${info.health.padEnd(10)} ${info.successRate.toFixed(0)}%`);
  });
}, 30000);
```

## Troubleshooting

**No agents found for task type**
- Check agent catalog: `supervisor.getAgentCatalog()`
- Verify task type matches a skill
- Check agent health: `supervisor.getAgentStatus()`

**Tasks timing out**
- Increase timeout: `{ timeout: 60000 }`
- Check agent endpoints are accessible
- Monitor agent performance metrics

**Low success rate**
- Check agent health status
- Review error messages in logs
- Increase maxRetries if transient failures
- Check agent endpoints in environment variables

**High latency**
- Reduce maxConcurrentTasks
- Check agent response times
- Monitor system resources

## API Quick Reference

```javascript
// Submit tasks
await supervisor.submitTask({ id, type, payload, timeout? })
await supervisor.submitParallelTasks([{ id, type, payload }, ...])

// Check status
supervisor.getMetrics()
supervisor.getAgentStatus()
supervisor.getTaskStatus(taskId)
supervisor.getAgentCatalog()

// Events
supervisor.on('task:assigned', ...)
supervisor.on('task:executing', ...)
supervisor.on('task:completed', ...)
supervisor.on('task:failed', ...)

// Cleanup
supervisor.shutdown()
```

## Next Steps

- Read [README.md](./README.md) for comprehensive documentation
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [examples.js](./examples.js) for more patterns
- Run tests: `npm test`

## Getting Help

- Check the agent catalog: `console.log(supervisor.getAgentCatalog())`
- Monitor events: Add event listeners
- Review metrics: `supervisor.getMetrics()`
- Check logs: Look for structured-logger output
- See full documentation: [README.md](./README.md)
