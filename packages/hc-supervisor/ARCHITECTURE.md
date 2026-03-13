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
<!-- ║  FILE: packages/hc-supervisor/ARCHITECTURE.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HCSupervisor Architecture

## System Design

HCSupervisor is the multi-agent orchestration layer for the Heady system, implementing a distributed task routing and execution framework based on capability matching.

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Task Submission Layer                       │
│  (submitTask, submitParallelTasks, event emission)             │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────────┐
│              HCSupervisor Core Engine                           │
│  ├─ Task Router (capability matching, health-aware routing)    │
│  ├─ Agent Health Manager (tracking, SLO monitoring)            │
│  ├─ Execution Engine (timeout, retry, aggregation)             │
│  ├─ Metrics Collector (latency, throughput, success rate)      │
│  └─ Event Emitter (lifecycle notifications)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
    ┌────────────────┴────────────────┬──────────────┐
    │                                 │              │
┌───┴──────┐  ┌──────────┐  ┌────────┴────┐  ┌─────┴────┐
│  Agents  │  │ Logging  │  │ Phi-Math    │  │ Bee      │
│ Registry │  │ (Logger) │  │ (Constants) │  │ (Concur) │
└──────────┘  └──────────┘  └─────────────┘  └──────────┘
```

## Core Components

### 1. HCSupervisor Class (EventEmitter)

The main orchestrator that manages all operations.

**Responsibilities:**
- Accept and validate tasks
- Route tasks to suitable agents
- Execute tasks with timeout/retry logic
- Track agent health and availability
- Emit lifecycle events
- Collect and report metrics

**Key Data Structures:**
- `agents` (Map): Active agent registry with configuration
- `agentHealth` (Map): Per-agent health status
- `activeTasks` (Map): Currently executing tasks
- `metrics`: Aggregated performance metrics

### 2. Agent Catalog

Static configuration of all available agents and their capabilities.

```javascript
AGENT_CATALOG = {
  builder: {
    name: 'builder',
    skills: ['build', 'deploy', 'test', 'lint'],
    timeout: 30000,
    criticality: 'high',
  },
  researcher: {
    skills: ['news-ingestion', 'concept-extraction', 'trend-analysis'],
    timeout: 45000,
    criticality: 'medium',
  },
  // ... more agents
}
```

**Agent Metadata:**
- **skills**: Task types this agent can handle
- **timeout**: Default task timeout (SLO)
- **criticality**: Business importance (critical/high/medium/low)
- **endpoint**: HTTP endpoint (from env vars)
- **health**: Current health status

### 3. Task Routing Engine

Determines which agent(s) should execute a task.

**Routing Strategies:**

1. **Capability Match (default)**
   - Find all agents with required skill
   - Sort by health status (healthy first)
   - Sort by load (fewer active tasks first)
   - Assign to top-ranked agent

2. **Direct Routing**
   - Use specified agent(s) if provided
   - Skip capability matching
   - Validate health before assignment

3. **Load Balanced**
   - Distribute tasks across multiple agents with skill
   - Consider current load and health
   - Implement round-robin if equally healthy

4. **Parallel Fanout**
   - Submit same task to multiple agents
   - Return first successful result
   - Used for high-criticality tasks

**Routing Algorithm:**
```
1. Parse task requirements (type, agents, strategy)
2. Apply strategy-specific agent selection:
   - DIRECT: Filter by specified agents only
   - CAPABILITY_MATCH: Find agents with skill
   - LOAD_BALANCED: Sort by load
   - PARALLEL_FANOUT: Select multiple agents
3. Filter by health (remove unhealthy agents)
4. Sort by (health_score, request_count)
5. Return sorted agent list
```

### 4. Execution Engine

Manages task execution lifecycle.

**Task Lifecycle:**
```
PENDING → ASSIGNED → EXECUTING → COMPLETED
                         ↓
                       TIMEOUT/FAILED → (RETRY) → EXECUTING
                         ↓
                       FAILED (max retries exceeded)
```

**Execution Flow:**
1. Validate task has required fields (id, type, payload)
2. Create task record with metadata
3. Emit `task:assigned` event
4. Route task to appropriate agent(s)
5. Execute with timeout protection (Promise.race)
6. Handle success/failure:
   - Success: Update metrics, emit `task:completed`
   - Timeout: Mark agent degraded, retry if attempts available
   - Failure: Check retry eligibility, emit `task:failed`

**Retry Logic:**
- Uses PHI-based exponential backoff
- Formula: `backoff_ms = 100 * φ^(attempt-1)`
- φ (golden ratio) = 1.618034 from @heady/phi-math
- Configurable max retries (default: 3)

**Timeout Handling:**
- Each task gets timeout promise
- `Promise.race()` between agent execution and timeout
- First to resolve wins
- Timeout triggers agent health degradation

### 5. Agent Health Manager

Tracks agent availability and performance.

**Health States:**
- `HEALTHY`: Accepting tasks normally
- `DEGRADED`: Minor issues, still accepting tasks
- `UNHEALTHY`: Major issues, limited task acceptance
- `UNAVAILABLE`: Offline or not responding

**Health Transitions:**
```
HEALTHY
  ├─ (consecutive failures ≥ 1) → DEGRADED
  └─ (consecutive failures ≥ 3) → UNHEALTHY

DEGRADED
  ├─ (success) → HEALTHY
  └─ (more failures) → UNHEALTHY

UNHEALTHY
  └─ (manual reset or periodic health check success) → DEGRADED

UNAVAILABLE
  └─ (manual reset) → DEGRADED
```

**Health Checks:**
- Periodic ping every 5 seconds (configurable)
- Validates agent endpoint responsiveness
- Updates consecutive failure counter
- Automatic state transitions based on thresholds

**Health Scoring:**
- Used for agent selection ranking
- Lower score = higher priority
- `HEALTHY: 0, DEGRADED: 1, UNHEALTHY: 2, UNAVAILABLE: 3`

### 6. Metrics Collector

Aggregates performance data.

**Metrics Tracked:**
- Per-supervisor:
  - `tasksProcessed`: Total tasks
  - `tasksSucceeded`: Successful tasks
  - `tasksFailed`: Failed tasks
  - `totalLatency`: Sum of all latencies
  - `avgLatency`: totalLatency / tasksProcessed
  - `successRate`: tasksSucceeded / tasksProcessed * 100

- Per-agent:
  - `requests`: Total requests sent
  - `successes`: Successful executions
  - `failures`: Failed executions
  - `avgLatency`: Average response time
  - `successRate`: successes / requests * 100

**Metric Recording:**
- `recordTaskSuccess()`: Called on task completion
- `recordTaskFailure()`: Called on task failure
- Updates counters and latency totals
- Non-blocking collection (no performance impact)

### 7. Event System

EventEmitter-based notification system for task lifecycle.

**Emitted Events:**
- `task:assigned`: Task routed to agent
- `task:executing`: Task execution started
- `task:completed`: Task finished successfully
- `task:failed`: Task execution failed

**Event Payload:**
```javascript
{
  taskId: string,
  agent?: string,      // for executing events
  result?: object,     // for completed events
  error?: string,      // for failed events
  task?: TaskRecord    // for assigned events
}
```

**Usage Pattern:**
```javascript
supervisor.on('task:completed', (event) => {
  console.log(`Task ${event.taskId} completed`);
  processResult(event.result);
});

supervisor.on('task:failed', (event) => {
  console.error(`Task ${event.taskId} failed: ${event.error}`);
  handleError(event.taskId, event.error);
});
```

## Data Flow

### Single Task Submission

```
submitTask(task)
    ↓
[Validate task fields]
    ↓
[Create task record] → emit('task:assigned')
    ↓
routeTask()
    ├─ Find agents by skill
    ├─ Filter healthy agents
    └─ Sort by health & load
    ↓
executeTask()
    ├─ Mark EXECUTING
    ├─ emit('task:executing')
    ├─ callAgent() wrapped in Promise.race
    │  ├─ Call agent endpoint
    │  └─ Race against timeout
    ├─ Handle result:
    │  ├─ Success:
    │  │  ├─ Mark COMPLETED
    │  │  ├─ Record metrics
    │  │  └─ emit('task:completed')
    │  ├─ Timeout:
    │  │  ├─ Mark TIMEOUT
    │  │  ├─ Degrade agent health
    │  │  └─ Retry if available
    │  └─ Failure:
    │     ├─ Update agent health
    │     ├─ Retry if available
    │     └─ emit('task:failed') if max retries exceeded
    └─ Return result
```

### Parallel Task Submission

```
submitParallelTasks(tasks)
    ↓
[Chunk tasks by maxConcurrentTasks]
    ↓
For each chunk:
    ├─ Map each task to submitTask(task)
    ├─ Catch errors and record failures
    ├─ Await Promise.all(chunk)
    └─ Repeat for next chunk
    ↓
[Aggregate results]
    ├─ Successful: [{taskId, result, error: null}]
    └─ Failed: [{taskId, result: null, error: string}]
    ↓
Return {results, errors, succeeded, failed}
```

## Dependencies

### @heady/phi-math

Provides mathematical constants and functions.

**Used for:**
- PHI constant (1.618034): Golden ratio for backoff calculation
- PSI constant (0.618034): Secondary ratio
- CSL_GATES: Sacred geometry constant for scaling
- `phiBackoff()`: Exponential backoff formula
- `phiScale()`: Scaling operations

**Example:**
```javascript
const backoff = phiMath.phiBackoff(attempt); // Returns milliseconds
```

### @heady/structured-logger

Structured logging for observability.

**Used for:**
- `logger.info()`: General information
- `logger.warn()`: Warnings (e.g., agent degradation)
- `logger.error()`: Errors and failures
- `logger.debug()`: Detailed debugging info

**Example:**
```javascript
this.logger.info('Task completed', { 
  taskId, 
  agent: primaryAgent.name,
  latency: duration 
});
```

### @heady/bee (optional)

Concurrent task execution framework.

**Used for:**
- Manages work queues
- Distributes execution across threads/processes
- Coordinates parallel execution
- Optional dependency (supervisor works without it)

## Configuration

**Constructor Options:**
```javascript
{
  maxConcurrentTasks: 20,           // Default batch size
  defaultTimeout: 30000,             // 30 seconds
  enableMetrics: true,               // Track performance
  enableHealthChecks: true,          // Periodic health pings
  healthCheckInterval: 5000,         // Every 5 seconds
  retryStrategy: 'exponential-backoff',
  maxRetries: 3,                     // Retry up to 3 times
}
```

**Environment Variables:**
```bash
AGENT_BUILDER_ENDPOINT=http://localhost:8000/agents/builder
AGENT_RESEARCHER_ENDPOINT=http://localhost:8001/agents/researcher
AGENT_DEPLOYER_ENDPOINT=http://localhost:8002/agents/deployer
AGENT_AUDITOR_ENDPOINT=http://localhost:8003/agents/auditor
AGENT_OBSERVER_ENDPOINT=http://localhost:8004/agents/observer
AGENT_CLAUDE_CODE_ENDPOINT=http://localhost:8005/agents/claude-code

AGENT_MOCK_MODE=true  # For testing without real agents
```

## Performance Characteristics

### Time Complexity
- Task routing: O(n) where n = number of agents
- Health check: O(n) for all agents
- Metrics retrieval: O(1) amortized
- Agent status: O(n) per-agent status lookup

### Space Complexity
- O(t) for active tasks (t = concurrent tasks)
- O(n) for agent registry (n = fixed, 6 agents)
- O(n) for health tracking
- O(n) for metrics storage

### Throughput
- Single task: ~100-1000ms depending on agent
- Parallel batch (20 concurrent): ~1-2s for 100 tasks
- Health checks: Negligible impact (<1% overhead)

## Failure Handling

**Task-Level Failures:**
- Agent timeout: Retry with backoff
- Agent error: Record failure, retry or fail task
- Invalid task: Reject immediately with validation error

**Agent-Level Failures:**
- Single failure: Mark degraded, continue routing
- Multiple failures: Mark unhealthy, route around
- Persistent failure: Mark unavailable, skip entirely

**Supervisor-Level Failures:**
- Health check failed: Use cached status
- Metrics update failed: Continue execution
- Event emission failed: Log and continue

**Graceful Degradation:**
- No healthy agents for skill: Return error
- Some agents degraded: Use healthy ones
- All agents unhealthy: Fail task
- Memory pressure: Reject new tasks, drain queue

## Future Enhancements

1. **Distributed Routing**
   - Multi-supervisor coordination
   - Agent pool management across instances
   - Load sharing

2. **ML-Based Optimization**
   - Learn optimal routing patterns
   - Predict agent performance
   - Adaptive timeout adjustment

3. **Advanced Retry Strategies**
   - Circuit breaker pattern
   - Intelligent backoff adaptation
   - Task prioritization queues

4. **Integration with Heady Brain**
   - Governance-aware routing
   - Concept alignment validation
   - Readiness evaluation

5. **Streaming Results**
   - Long-running task progress updates
   - Partial result streaming
   - Real-time metrics publication
