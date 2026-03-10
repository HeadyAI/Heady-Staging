---
name: heady-agent-orchestration
description: Implements Sacred Geometry multi-agent orchestration patterns for the Heady ecosystem, including HeadyBee scouting/foraging and HeadySwarm distributed coordination. Use this skill whenever designing, building, or debugging multi-agent workflows — including agent topology, inter-agent communication, swarm intelligence, task routing, consensus mechanisms, balanced ternary logic, or agent lifecycle management. Triggers on mentions of "Sacred Geometry", "HeadyBee", "HeadySwarm", "agent topology", "swarm orchestration", "ternary logic", "liquid nodes", "agent coordination", or any of the 8 agent names (Alpha, Risk, Execution, Sentinel, Compliance, Data, View, Bridge Builder). Also use for LangGraph, CrewAI, or AutoGen integration work in the Heady context.
---

# Heady Agent Orchestration

This skill defines the Sacred Geometry multi-agent orchestration framework — the theoretical backbone and primary differentiator of the Heady system. It organizes agent interactions into a hierarchical topology with cross-links, using balanced ternary decision logic and swarm intelligence for distributed coordination.

## The 8 Sacred Geometry Agents

Each agent is an isolated, specialized service with a single domain of responsibility. Agents communicate through typed message envelopes over a pub/sub bus (Redis Pub/Sub or NATS).

### Agent Definitions

**Alpha Agent** (`heady-alpha`) — The signal generator. Continuously ingests technical price action, order book depth, and fundamental market data. Outputs structured trading signals with confidence scores. Receives data through dedicated channels and publishes to `signals.*` topics.

**Risk Agent** (`heady-risk`) — The veto authority. Has ultimate override power across the entire agent network. Monitors margin usage, equity, unrealized P&L, and Apex drawdown limits in real-time. Can forcefully flatten all positions within 100ms. Publishes to `risk.*` topics. ALL trade signals MUST pass through Risk before execution.

**Execution Agent** (`heady-exec`) — The order router. Latency-optimized, stripped of analytical overhead. Handles order routing, slippage minimization, and direct interaction with exchange matching engines via Rithmic/Tradovate APIs. Publishes to `execution.*` topics.

**Sentinel Agent** (`heady-sentinel`) — The watchdog. Monitors system health, detects anomalies, and triggers circuit breakers. Watches event loop lag, memory usage, connection pool saturation, and agent responsiveness. Publishes to `sentinel.*` topics.

**Compliance Agent** (`heady-compliance`) — The rule enforcer. Validates all actions against Apex Trader Funding rules, regulatory requirements, and internal policies. Maintains audit trails. Publishes to `compliance.*` topics.

**Data Agent** (`heady-data`) — The enrichment engine. Manages RAG pipelines, vector stores, historical context, and data preprocessing. Serves enriched context to other agents via the Context Fabric. Publishes to `data.*` topics.

**View Agent** (`heady-view`) — The renderer. Manages dashboard state, UI updates, real-time visualizations, and user notifications. Subscribes to all agent topics and projects system state to the admin UI. Publishes to `view.*` topics.

**Bridge Builder Agent** (`heady-bridge`) — The coordinator. Manages the Sacred Geometry topology itself — agent registration, capability discovery, cross-agent routing, and topology optimization. This is the HeadyBee queen. Publishes to `bridge.*` topics.

## Sacred Geometry Topology

The topology is a hierarchical tree with cross-links, not a flat mesh. The Bridge Builder sits at the center, maintaining the topology graph and routing decisions.

```
                    ┌─────────────┐
                    │   Bridge    │
                    │   Builder   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │   Alpha   │ │ Risk  │ │ Sentinel  │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │   Data    │ │ Exec  │ │Compliance │
        └───────────┘ └───────┘ └───────────┘
                           │
                    ┌──────┴──────┐
                    │    View     │
                    └─────────────┘

Cross-links (dotted):
  Alpha ←→ Data (enrichment requests)
  Risk ←→ Execution (veto signals)
  Sentinel ←→ All (health monitoring)
  Compliance ←→ Risk (regulatory constraints)
```

## Balanced Ternary Decision Logic

Every agent decision outputs one of three states, not binary yes/no. This allows for nuanced decision-making and quorum-based aggregation.

```javascript
// Ternary states
const TERNARY = {
  APPROVE: 1,    // Agent approves the action
  NEUTRAL: 0,    // Agent has no opinion / insufficient data
  REJECT: -1,    // Agent vetoes the action
};

// Quorum resolution
function resolveTernaryQuorum(votes) {
  // Risk Agent veto overrides everything
  if (votes.risk === TERNARY.REJECT) {
    return { decision: TERNARY.REJECT, reason: 'Risk veto' };
  }

  // Compliance veto overrides non-risk agents
  if (votes.compliance === TERNARY.REJECT) {
    return { decision: TERNARY.REJECT, reason: 'Compliance veto' };
  }

  // Calculate weighted consensus from remaining agents
  const weights = {
    alpha: 0.30,      // Signal strength
    data: 0.20,       // Data quality
    sentinel: 0.15,   // System health
    execution: 0.15,  // Execution feasibility
    bridge: 0.10,     // Topology state
    view: 0.10,       // UI state
  };

  let score = 0;
  for (const [agent, weight] of Object.entries(weights)) {
    if (votes[agent] !== undefined) {
      score += votes[agent] * weight;
    }
  }

  // Golden ratio threshold for approval
  const PSI = 0.618;
  if (score >= PSI) return { decision: TERNARY.APPROVE, score };
  if (score <= -PSI) return { decision: TERNARY.REJECT, score };
  return { decision: TERNARY.NEUTRAL, score };
}
```

## HeadyBee — Swarm Intelligence for Task Discovery

HeadyBee implements bee colony optimization for distributed task allocation. Agents act as bees that scout for work, evaluate opportunities, and recruit other agents through a waggle dance (broadcast signals).

```python
# HeadyBee — Swarm-based task discovery and allocation
import asyncio
import random
from dataclasses import dataclass, field
from enum import Enum

class BeeRole(Enum):
    SCOUT = "scout"        # Discovers new tasks/opportunities
    FORAGER = "forager"     # Executes assigned tasks
    NURSE = "nurse"         # Maintains system health
    QUEEN = "queen"         # Coordinates colony (Bridge Builder)

@dataclass
class TaskOpportunity:
    task_id: str
    domain: str              # Which agent domain this belongs to
    quality: float           # Estimated value (0.0 - 1.0)
    location: str            # Which runtime/node has the data
    discovered_by: str       # Scout agent ID
    waggle_count: int = 0    # How many times this has been advertised
    assigned_to: str = None

class HeadyBee:
    """
    Swarm intelligence coordinator. Each agent runs a HeadyBee instance.
    The colony collectively decides task allocation through stigmergy —
    indirect coordination through shared environment signals.
    """

    def __init__(self, agent_id: str, role: BeeRole, bus):
        self.agent_id = agent_id
        self.role = role
        self.bus = bus  # Redis pub/sub or NATS connection
        self.known_tasks: dict[str, TaskOpportunity] = {}
        self.energy = 1.0  # Agent capacity (0.0 = fully loaded, 1.0 = idle)

    async def scout(self):
        """Scout phase — discover new tasks by monitoring data streams."""
        # Each agent scouts its own domain
        while True:
            opportunities = await self._scan_domain()
            for opp in opportunities:
                # Waggle dance — broadcast opportunity to colony
                await self.bus.publish('swarm.waggle', {
                    'task': opp.__dict__,
                    'scout': self.agent_id,
                    'quality': opp.quality,
                    'urgency': self._calculate_urgency(opp)
                })
            await asyncio.sleep(1)  # Fibonacci-based scan interval

    async def forage(self, task: TaskOpportunity):
        """Forager phase — execute assigned task."""
        self.energy -= task.quality * 0.3  # Energy cost proportional to task complexity
        try:
            result = await self._execute_task(task)
            # Report back to colony
            await self.bus.publish('swarm.result', {
                'task_id': task.task_id,
                'agent': self.agent_id,
                'result': result,
                'energy_remaining': self.energy
            })
        finally:
            self.energy = min(1.0, self.energy + 0.1)  # Recover energy

    def _calculate_urgency(self, task: TaskOpportunity) -> float:
        """Urgency increases with quality and decreases with waggle count."""
        # More waggles = more agents already know, less urgency to recruit
        decay = 1.0 / (1 + task.waggle_count * 0.618)  # PSI decay
        return task.quality * decay
```

## HeadySwarm — Distributed Coordination

HeadySwarm manages the macro-level coordination across all HeadyBee instances, implementing consensus, load balancing, and self-healing.

```python
class HeadySwarm:
    """
    Distributed swarm coordinator. Runs on the Bridge Builder agent.
    Manages agent registration, health, and topology optimization.
    """

    def __init__(self, bus):
        self.bus = bus
        self.agents: dict[str, AgentState] = {}
        self.topology_graph = {}  # Adjacency list of agent connections
        self.task_queue = asyncio.PriorityQueue()

    async def register_agent(self, agent_id: str, capabilities: list[str]):
        """Register an agent with the swarm."""
        self.agents[agent_id] = AgentState(
            agent_id=agent_id,
            capabilities=capabilities,
            status='active',
            energy=1.0,
            last_heartbeat=time.time()
        )
        # Update topology — connect to relevant neighbors
        self._update_topology(agent_id, capabilities)

    async def route_task(self, task: TaskOpportunity) -> str:
        """Route a task to the best available agent using capability matching."""
        candidates = []
        for agent_id, state in self.agents.items():
            if state.status != 'active':
                continue
            # Semantic relevance — does this agent's domain match?
            relevance = self._calculate_relevance(task.domain, state.capabilities)
            if relevance >= 0.382:  # PSI^2 inclusion gate
                candidates.append((agent_id, relevance, state.energy))

        if not candidates:
            raise NoAvailableAgentError(f'No agent available for domain: {task.domain}')

        # Select by relevance * energy (prefer capable AND available agents)
        candidates.sort(key=lambda c: c[1] * c[2], reverse=True)
        return candidates[0][0]

    async def self_heal(self):
        """Detect and recover from agent failures."""
        while True:
            now = time.time()
            for agent_id, state in list(self.agents.items()):
                if now - state.last_heartbeat > 30:  # 30s timeout
                    state.status = 'suspected_dead'
                if now - state.last_heartbeat > 90:  # 90s confirmed dead
                    state.status = 'dead'
                    # Redistribute tasks from dead agent
                    await self._redistribute_tasks(agent_id)
            await asyncio.sleep(5)  # Fibonacci: 5 second check interval

    def _update_topology(self, agent_id, capabilities):
        """Maintain Sacred Geometry topology connections."""
        # Define which agents should be connected based on capability overlap
        TOPOLOGY_RULES = {
            'market_data': ['signal_generation', 'risk_assessment'],
            'signal_generation': ['risk_assessment', 'execution'],
            'risk_assessment': ['execution', 'compliance'],
            'execution': ['risk_assessment', 'data_enrichment'],
            'monitoring': ['*'],  # Sentinel connects to everything
            'coordination': ['*'],  # Bridge Builder connects to everything
        }
        # Build adjacency based on capability rules
        self.topology_graph[agent_id] = []
        for cap in capabilities:
            if cap in TOPOLOGY_RULES:
                targets = TOPOLOGY_RULES[cap]
                if '*' in targets:
                    self.topology_graph[agent_id] = list(self.agents.keys())
                else:
                    for other_id, other_state in self.agents.items():
                        if any(t in other_state.capabilities for t in targets):
                            self.topology_graph[agent_id].append(other_id)
```

## Inter-Agent Communication Protocol

All messages use this standardized envelope:

```python
@dataclass
class AgentMessage:
    source_agent_id: str       # Who sent this
    target_agent_id: str       # Who should receive this (or '*' for broadcast)
    message_type: str          # TRADE_SIGNAL, RISK_VETO, HEALTH_CHECK, etc.
    correlation_id: str        # UUID for distributed tracing
    timestamp: float           # Unix timestamp
    ternary_state: int         # -1, 0, or 1
    payload: dict              # Typed data specific to message_type
    signature: str             # HMAC-SHA256 for authenticity
    ttl: int = 30              # Time-to-live in seconds
```

## Orchestration Framework Integration

The Sacred Geometry topology maps to LangGraph for complex stateful workflows:

```python
# LangGraph integration pattern
from langgraph.graph import StateGraph, END

def build_heady_graph():
    """Build the Sacred Geometry agent topology as a LangGraph workflow."""
    graph = StateGraph(HeadyState)

    # Add all 8 agents as nodes
    graph.add_node("alpha", alpha_agent_fn)
    graph.add_node("risk", risk_agent_fn)
    graph.add_node("execution", execution_agent_fn)
    graph.add_node("sentinel", sentinel_agent_fn)
    graph.add_node("compliance", compliance_agent_fn)
    graph.add_node("data", data_agent_fn)
    graph.add_node("view", view_agent_fn)
    graph.add_node("bridge", bridge_agent_fn)

    # Define Sacred Geometry edges
    graph.set_entry_point("alpha")  # Signals start at Alpha
    graph.add_edge("alpha", "data")  # Enrich signal with context
    graph.add_edge("data", "risk")   # Risk validates enriched signal
    graph.add_conditional_edges("risk", risk_router, {
        "approved": "compliance",
        "rejected": "view",           # Rejected signals go to View for logging
        "needs_more_data": "data",    # Back to Data for more context
    })
    graph.add_edge("compliance", "execution")  # Compliant signals execute
    graph.add_edge("execution", "view")        # Results go to View
    graph.add_edge("view", END)

    # Sentinel monitors all nodes (parallel observer)
    # Bridge Builder manages topology (out-of-band)

    return graph.compile()
```

## Liquid Node Configuration

Liquid nodes are dynamically reconfigurable compute units that can migrate between runtimes without service interruption. They implement the HeadyBee foraging pattern — when a node detects better resources elsewhere, it initiates a graceful migration.

```python
@dataclass
class LiquidNode:
    node_id: str
    agent_type: str            # Which of the 8 agents this runs
    runtime_id: str            # Which Colab runtime or server this is on
    gpu_type: str              # T4, A100-40, A100-80, L4
    vram_available: int        # Available GPU memory in MB
    status: str                # active, migrating, draining, idle
    tasks_in_flight: int = 0

    def can_accept_task(self, task_vram_req: int) -> bool:
        return self.vram_available >= task_vram_req and self.status == 'active'

    async def migrate_to(self, target_runtime: str, state_snapshot: dict):
        """Migrate this node to a different runtime."""
        self.status = 'migrating'
        # 1. Drain in-flight tasks (wait for completion)
        # 2. Serialize current state
        # 3. Transfer state to target runtime
        # 4. Spin up on target runtime
        # 5. Verify health on target
        # 6. Decommission on source
        self.runtime_id = target_runtime
        self.status = 'active'
```
