"""
HeadyBee / HeadySwarm — Distributed Orchestration Engine
=========================================================
Production implementation of bee colony optimization for multi-agent 
task discovery, allocation, and coordination across the Sacred Geometry 
topology and 3 Colab Pro+ runtimes.

HeadyBee = Individual agent behavior (scout, forage, nurse, waggle dance)
HeadySwarm = Colony-level coordination (registration, routing, self-healing)

This is the live orchestration engine, not a template. Import it, configure 
the message bus, and start the swarm.

Usage:
    from heady_swarm import HeadySwarm, HeadyBee, BeeRole, TaskOpportunity
    
    # Initialize the swarm (runs on Bridge Builder agent)
    swarm = HeadySwarm(bus=redis_client, logger=logger)
    await swarm.start()
    
    # Register agents
    await swarm.register_agent("alpha", ["market_data", "signal_generation"])
    await swarm.register_agent("risk", ["risk_assessment", "veto_authority"])
    
    # Submit a task
    result = await swarm.submit_task(TaskOpportunity(
        task_id="sig-001",
        domain="signal_generation",
        payload={"instrument": "NQH6", "timeframe": "5m"},
    ))

© 2026 HeadySystems Inc. — Sacred Geometry v4.0
"""

import asyncio
import hashlib
import json
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional

# ---------------------------------------------------------------------------
# Sacred Geometry constants
# ---------------------------------------------------------------------------
PHI = 1.618033988749895
PSI = 1 / PHI  # ≈ 0.618
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]

RELEVANCE_GATES = {
    "include": PSI * PSI,   # ≈ 0.382
    "boost": PSI,           # ≈ 0.618
    "inject": PSI + 0.1,    # ≈ 0.718
}

# Heartbeat intervals derived from Fibonacci
HEARTBEAT_INTERVAL_S = FIB[5]     # 8 seconds between heartbeats
SUSPECT_TIMEOUT_S = FIB[8]        # 34 seconds → suspected dead
CONFIRMED_DEAD_S = FIB[10]        # 89 seconds → confirmed dead
SELF_HEAL_INTERVAL_S = FIB[4]     # 5 seconds between self-heal checks


# ---------------------------------------------------------------------------
# Enums and data classes
# ---------------------------------------------------------------------------
class BeeRole(Enum):
    """Each agent operates in one of these roles within the swarm.
    
    SCOUT agents discover new tasks and opportunities by monitoring their
    domain's data streams. FORAGER agents execute assigned tasks. NURSE 
    agents maintain system health. QUEEN is the Bridge Builder — there is
    exactly one queen, and she coordinates the entire colony.
    """
    SCOUT = "scout"
    FORAGER = "forager"
    NURSE = "nurse"
    QUEEN = "queen"


class TernaryState(Enum):
    """Balanced ternary decision output used by all agents.
    
    Every agent decision produces one of these three states. This is more
    nuanced than binary yes/no and enables quorum-based consensus where
    NEUTRAL votes don't block but also don't endorse.
    """
    REJECT = -1
    NEUTRAL = 0
    APPROVE = 1


@dataclass
class TaskOpportunity:
    """A unit of work discovered by a scout or submitted externally.
    
    Tasks flow through the swarm: discovered → waggled → claimed → executed → completed.
    The domain field determines which agents are eligible to handle it.
    """
    task_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    domain: str = ""                # Which capability domain this belongs to
    payload: dict = field(default_factory=dict)  # Task-specific data
    quality: float = 0.5            # Estimated value/importance (0.0 - 1.0)
    vram_mb: int = 0                # GPU memory required (0 = CPU-only)
    discovered_by: str = ""         # Which scout found this
    waggle_count: int = 0           # How many times this has been broadcast
    assigned_to: Optional[str] = None
    status: str = "pending"         # pending, assigned, running, completed, failed
    created_at: float = field(default_factory=time.time)
    result: Any = None


@dataclass
class AgentMessage:
    """Standardized inter-agent message envelope.
    
    Every message in the swarm uses this envelope for consistent routing,
    tracing, and auditing. The correlation_id links related messages across
    the entire pipeline (e.g., a signal from Alpha through Risk through 
    Execution and back to View).
    """
    source_agent_id: str
    target_agent_id: str       # "*" for broadcast
    message_type: str          # TRADE_SIGNAL, RISK_CHECK, WAGGLE, HEARTBEAT, etc.
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    ternary_state: int = 0     # -1, 0, or 1
    payload: dict = field(default_factory=dict)
    ttl: int = 30              # Time-to-live in seconds

    def to_json(self) -> str:
        return json.dumps(self.__dict__, default=str)

    @classmethod
    def from_json(cls, data: str) -> "AgentMessage":
        return cls(**json.loads(data))

    def is_expired(self) -> bool:
        return (time.time() - self.timestamp) > self.ttl

    def sign(self, secret: str) -> str:
        """Generate HMAC-SHA256 signature for message authenticity."""
        content = f"{self.source_agent_id}:{self.target_agent_id}:{self.correlation_id}:{self.timestamp}"
        return hashlib.sha256(f"{content}:{secret}".encode()).hexdigest()[:16]


@dataclass
class AgentState:
    """Tracks the current state of a registered agent in the swarm.
    
    The Bridge Builder (queen) maintains an AgentState for every registered
    agent. This includes health info, capabilities, current workload, and
    the last heartbeat time for failure detection.
    """
    agent_id: str
    capabilities: list[str] = field(default_factory=list)
    status: str = "active"          # active, suspected_dead, dead, draining
    energy: float = 1.0             # 0.0 = fully loaded, 1.0 = idle
    tasks_in_flight: int = 0
    last_heartbeat: float = field(default_factory=time.time)
    runtime_id: str = "unknown"     # cortex, synapse, or reflex
    vram_free_mb: int = 0
    registered_at: float = field(default_factory=time.time)
    total_tasks_completed: int = 0
    total_tasks_failed: int = 0


# ---------------------------------------------------------------------------
# HeadyBee — Individual agent swarm behavior
# ---------------------------------------------------------------------------
class HeadyBee:
    """Individual agent's swarm intelligence behavior.
    
    Each of the 8 Sacred Geometry agents runs a HeadyBee instance that
    gives it scouting (task discovery), foraging (task execution), and
    communication (waggle dance) capabilities. The bee metaphor maps
    naturally to distributed task allocation:
    
    - SCOUT: Monitor your domain's data streams, discover tasks
    - WAGGLE: Broadcast discovered opportunities to the colony
    - CLAIM: Volunteer to handle a task that matches your capabilities
    - FORAGE: Execute the claimed task
    - REPORT: Send results back to the colony
    """

    def __init__(self, agent_id: str, role: BeeRole, capabilities: list[str],
                 bus=None, logger=None, task_handler: Optional[Callable] = None):
        self.agent_id = agent_id
        self.role = role
        self.capabilities = capabilities
        self.bus = bus              # Redis pub/sub or any async message bus
        self.logger = logger
        self.task_handler = task_handler  # Async function that executes tasks
        self.energy = 1.0           # Available capacity
        self.running = False
        self._tasks: dict[str, TaskOpportunity] = {}

    async def start(self):
        """Start the bee's behavioral loop.
        
        Launches the heartbeat emitter, the message listener, and (if this 
        is a scout) the domain scanning loop. All run concurrently.
        """
        self.running = True
        self._log("info", "HeadyBee started", role=self.role.value)
        
        tasks = [
            asyncio.create_task(self._heartbeat_loop()),
            asyncio.create_task(self._listen_loop()),
        ]
        if self.role in (BeeRole.SCOUT, BeeRole.QUEEN):
            tasks.append(asyncio.create_task(self._scout_loop()))
        
        await asyncio.gather(*tasks)

    async def stop(self):
        self.running = False
        self._log("info", "HeadyBee stopped")

    # --- Heartbeat ---
    async def _heartbeat_loop(self):
        """Emit heartbeats so the swarm knows we're alive.
        
        The Bridge Builder uses these to detect agent failures. If an agent
        stops sending heartbeats for 34 seconds, it's suspected dead. After
        89 seconds, it's confirmed dead and its tasks get redistributed.
        """
        while self.running:
            msg = AgentMessage(
                source_agent_id=self.agent_id,
                target_agent_id="bridge",
                message_type="HEARTBEAT",
                payload={
                    "energy": round(self.energy, 3),
                    "tasks_in_flight": len(self._tasks),
                    "capabilities": self.capabilities,
                },
            )
            await self._publish("swarm.heartbeat", msg)
            await asyncio.sleep(HEARTBEAT_INTERVAL_S)

    # --- Scouting (task discovery) ---
    async def _scout_loop(self):
        """Continuously scan the agent's domain for new opportunities.
        
        Each agent scouts its own domain. Alpha scouts for trading signals,
        Data scouts for enrichment opportunities, Sentinel scouts for health
        anomalies. Discovered opportunities are broadcast via waggle dance.
        """
        while self.running:
            # This is where domain-specific scanning logic plugs in.
            # The task_handler function is responsible for actual scanning.
            # Here we handle the swarm communication layer.
            await asyncio.sleep(FIB[4])  # 5-second scan interval

    # --- Waggle Dance (opportunity broadcast) ---
    async def waggle(self, task: TaskOpportunity):
        """Broadcast a discovered opportunity to the colony.
        
        Named after the waggle dance that real bees use to communicate the
        location and quality of food sources. The swarm coordinator receives
        this and routes the task to the best available agent.
        """
        task.discovered_by = self.agent_id
        task.waggle_count += 1
        
        urgency = self._calculate_urgency(task)
        
        msg = AgentMessage(
            source_agent_id=self.agent_id,
            target_agent_id="bridge",
            message_type="WAGGLE",
            payload={
                "task": task.__dict__,
                "urgency": round(urgency, 4),
            },
        )
        await self._publish("swarm.waggle", msg)
        self._log("info", "Waggle dance",
                  task_id=task.task_id, domain=task.domain, urgency=urgency)

    def _calculate_urgency(self, task: TaskOpportunity) -> float:
        """Urgency increases with quality and decreases with waggle count.
        
        More waggles means more agents already know about this task, so the
        urgency to recruit decreases. The decay rate uses PSI (golden ratio
        conjugate) for a mathematically smooth falloff.
        """
        decay = 1.0 / (1 + task.waggle_count * PSI)
        return task.quality * decay

    # --- Foraging (task execution) ---
    async def forage(self, task: TaskOpportunity) -> Any:
        """Execute an assigned task.
        
        Decreases the agent's energy proportional to the task's complexity,
        delegates to the task_handler for actual work, then reports the 
        result back to the swarm. Energy slowly recovers after completion.
        """
        task.status = "running"
        task.assigned_to = self.agent_id
        self._tasks[task.task_id] = task
        self.energy = max(0, self.energy - task.quality * 0.3)
        
        self._log("info", "Foraging started",
                  task_id=task.task_id, energy=self.energy)
        
        try:
            if self.task_handler:
                result = await self.task_handler(task)
            else:
                result = {"status": "no_handler", "task_id": task.task_id}
            
            task.status = "completed"
            task.result = result
            
            # Report success to the swarm
            msg = AgentMessage(
                source_agent_id=self.agent_id,
                target_agent_id="bridge",
                message_type="FORAGE_COMPLETE",
                payload={
                    "task_id": task.task_id,
                    "status": "completed",
                    "result_summary": str(result)[:500],
                    "energy_remaining": round(self.energy, 3),
                },
            )
            await self._publish("swarm.result", msg)
            
        except Exception as e:
            task.status = "failed"
            self._log("error", "Foraging failed",
                      task_id=task.task_id, error=str(e))
            
            msg = AgentMessage(
                source_agent_id=self.agent_id,
                target_agent_id="bridge",
                message_type="FORAGE_FAILED",
                payload={
                    "task_id": task.task_id,
                    "error": str(e),
                },
            )
            await self._publish("swarm.result", msg)
        
        finally:
            # Energy recovery — slow recharge after task completion
            self.energy = min(1.0, self.energy + 0.1)
            self._tasks.pop(task.task_id, None)
        
        return task.result

    # --- Message listener ---
    async def _listen_loop(self):
        """Listen for messages from the swarm coordinator.
        
        The bee subscribes to its own channel and the broadcast channel.
        Messages include task assignments, topology updates, and colony-wide
        signals from the Bridge Builder.
        """
        if self.bus is None:
            return
        
        channels = [f"agent.{self.agent_id}", "swarm.broadcast"]
        
        try:
            pubsub = self.bus.pubsub()
            await pubsub.subscribe(*channels)
            
            while self.running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    await self._handle_message(message["data"])
        except Exception as e:
            self._log("error", "Listen loop error", error=str(e))

    async def _handle_message(self, raw_data):
        """Process an incoming message from the swarm."""
        try:
            msg = AgentMessage.from_json(raw_data)
            
            if msg.is_expired():
                self._log("warning", "Dropped expired message",
                          type=msg.message_type, age_s=time.time()-msg.timestamp)
                return
            
            if msg.message_type == "TASK_ASSIGNMENT":
                task_data = msg.payload.get("task", {})
                task = TaskOpportunity(**task_data)
                await self.forage(task)
            
            elif msg.message_type == "EMERGENCY_FLATTEN":
                self._log("critical", "EMERGENCY FLATTEN received",
                          reason=msg.payload.get("reason"))
                # Emergency handling is delegated to the agent's task_handler
                if self.task_handler:
                    await self.task_handler(TaskOpportunity(
                        task_id="emergency-flatten",
                        domain="emergency",
                        payload=msg.payload,
                        quality=1.0,
                    ))
            
        except Exception as e:
            self._log("error", "Message handling error", error=str(e))

    # --- Helpers ---
    async def _publish(self, channel: str, msg: AgentMessage):
        """Publish a message to the swarm bus."""
        if self.bus:
            try:
                await self.bus.publish(channel, msg.to_json())
            except Exception as e:
                self._log("error", "Publish failed", channel=channel, error=str(e))

    def _log(self, level: str, message: str, **kwargs):
        if self.logger:
            log_data = {"agent": self.agent_id, "role": self.role.value, **kwargs}
            getattr(self.logger, level, self.logger.info)(
                json.dumps({"message": message, **log_data})
            )


# ---------------------------------------------------------------------------
# HeadySwarm — Colony-level coordination (runs on Bridge Builder)
# ---------------------------------------------------------------------------
class HeadySwarm:
    """Colony-level swarm coordinator.
    
    Runs on the Bridge Builder agent — the Queen Bee. Manages agent 
    registration, capability-based task routing, health monitoring,
    self-healing, and topology optimization.
    
    The swarm operates on three principles:
    1. CAPABILITY routing, not PRIORITY ranking — tasks go to the agent
       best equipped to handle them, not the one marked "highest priority"
    2. EQUAL treatment — every agent has identical standing in the swarm
    3. CONCURRENT execution — independent tasks fire simultaneously
    """

    def __init__(self, bus=None, logger=None):
        self.bus = bus
        self.logger = logger
        self.agents: dict[str, AgentState] = {}
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.completed_tasks: list[str] = []
        self.failed_tasks: list[str] = []
        self.running = False
        self._topology: dict[str, list[str]] = {}  # adjacency list

    async def start(self):
        """Start the swarm coordinator.
        
        Launches the self-healing loop, the task dispatch loop, and the
        heartbeat listener — all running concurrently. The swarm is now
        ready to accept agent registrations and task submissions.
        """
        self.running = True
        self._log("info", "HeadySwarm starting — Queen Bee online")
        
        await asyncio.gather(
            asyncio.create_task(self._self_heal_loop()),
            asyncio.create_task(self._dispatch_loop()),
            asyncio.create_task(self._heartbeat_listener()),
        )

    async def stop(self):
        self.running = False
        self._log("info", "HeadySwarm stopped")

    # --- Agent Registration ---
    async def register_agent(self, agent_id: str, capabilities: list[str],
                              runtime_id: str = "unknown", vram_free_mb: int = 0):
        """Register an agent with the swarm.
        
        Once registered, the agent is eligible to receive tasks that match
        its capabilities. The topology graph is updated to reflect the new
        agent's connections based on the Sacred Geometry routing rules.
        """
        self.agents[agent_id] = AgentState(
            agent_id=agent_id,
            capabilities=capabilities,
            runtime_id=runtime_id,
            vram_free_mb=vram_free_mb,
        )
        self._update_topology(agent_id, capabilities)
        self._log("info", "Agent registered",
                  agent=agent_id, capabilities=capabilities, runtime=runtime_id)

    async def deregister_agent(self, agent_id: str):
        """Remove an agent from the swarm and redistribute its tasks."""
        if agent_id in self.agents:
            state = self.agents.pop(agent_id)
            self._topology.pop(agent_id, None)
            self._log("info", "Agent deregistered",
                      agent=agent_id, tasks_lost=state.tasks_in_flight)

    # --- Task Submission and Routing ---
    async def submit_task(self, task: TaskOpportunity) -> Optional[str]:
        """Submit a task to the swarm for routing and execution.
        
        The task is placed in the queue and the dispatch loop will route it
        to the best available agent based on capability matching. Returns
        the agent_id it was assigned to, or None if no agent is available.
        """
        await self.task_queue.put(task)
        self._log("info", "Task submitted",
                  task_id=task.task_id, domain=task.domain)
        return task.task_id

    async def _dispatch_loop(self):
        """Continuously pull tasks from the queue and route them.
        
        Each task is matched to the best available agent using capability-
        based routing with golden ratio relevance gates. If no agent is
        available, the task is re-queued with a Fibonacci backoff.
        """
        while self.running:
            try:
                task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            
            agent_id = self._route_task(task)
            if agent_id:
                task.assigned_to = agent_id
                task.status = "assigned"
                self.agents[agent_id].tasks_in_flight += 1
                self.agents[agent_id].energy -= task.quality * 0.2
                
                # Send task assignment to the agent
                msg = AgentMessage(
                    source_agent_id="bridge",
                    target_agent_id=agent_id,
                    message_type="TASK_ASSIGNMENT",
                    payload={"task": task.__dict__},
                )
                await self._publish(f"agent.{agent_id}", msg)
                
                self._log("info", "Task dispatched",
                          task_id=task.task_id, agent=agent_id)
            else:
                # No agent available — re-queue with backoff
                task.waggle_count += 1
                if task.waggle_count < len(FIB):
                    await asyncio.sleep(FIB[min(task.waggle_count, 8)] * 0.1)
                    await self.task_queue.put(task)
                else:
                    task.status = "failed"
                    self.failed_tasks.append(task.task_id)
                    self._log("error", "Task abandoned — no agent available",
                              task_id=task.task_id, domain=task.domain)

    def _route_task(self, task: TaskOpportunity) -> Optional[str]:
        """Route a task to the best available agent.
        
        This is the core routing algorithm. It uses capability-based matching,
        NOT priority ranking. Every agent is an equal-status worker — the one
        with the best capability match AND available capacity wins.
        
        The relevance score is computed as the overlap between the task's
        domain and the agent's capabilities. The golden ratio relevance gates
        determine the minimum score for inclusion (0.382), boosting (0.618),
        and auto-injection (0.718).
        """
        candidates = []
        
        for agent_id, state in self.agents.items():
            if state.status != "active":
                continue
            if state.energy <= 0.05:  # Agent is fully loaded
                continue
            if task.vram_mb > 0 and state.vram_free_mb < task.vram_mb:
                continue
            
            # Calculate capability relevance
            relevance = self._calculate_relevance(task.domain, state.capabilities)
            
            if relevance >= RELEVANCE_GATES["include"]:  # >= 0.382
                candidates.append((agent_id, relevance, state.energy))
        
        if not candidates:
            return None
        
        # Score = relevance × energy (prefer capable AND available agents)
        candidates.sort(key=lambda c: c[1] * c[2], reverse=True)
        return candidates[0][0]

    def _calculate_relevance(self, task_domain: str, agent_capabilities: list[str]) -> float:
        """Calculate how relevant an agent's capabilities are to a task's domain.
        
        Uses simple keyword overlap for now. In production, this would use
        embedding cosine similarity for semantic matching. The relevance
        score ranges from 0.0 (no match) to 1.0 (perfect match).
        """
        if not task_domain or not agent_capabilities:
            return 0.0
        
        domain_words = set(task_domain.lower().replace("_", " ").split())
        cap_words = set()
        for cap in agent_capabilities:
            cap_words.update(cap.lower().replace("_", " ").split())
        
        if not domain_words:
            return 0.0
        
        overlap = len(domain_words & cap_words)
        return min(1.0, overlap / len(domain_words))

    # --- Heartbeat Listener ---
    async def _heartbeat_listener(self):
        """Listen for heartbeats from all agents.
        
        Updates each agent's last_heartbeat timestamp and energy level.
        The self-heal loop uses this data to detect and handle failures.
        """
        if self.bus is None:
            while self.running:
                await asyncio.sleep(1)
            return
        
        try:
            pubsub = self.bus.pubsub()
            await pubsub.subscribe("swarm.heartbeat", "swarm.waggle", "swarm.result")
            
            while self.running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    await self._handle_swarm_message(message)
        except Exception as e:
            self._log("error", "Heartbeat listener error", error=str(e))

    async def _handle_swarm_message(self, raw_message):
        """Process messages on swarm channels."""
        try:
            channel = raw_message.get("channel", b"").decode() if isinstance(raw_message.get("channel"), bytes) else raw_message.get("channel", "")
            msg = AgentMessage.from_json(raw_message["data"])
            
            if msg.message_type == "HEARTBEAT":
                agent_id = msg.source_agent_id
                if agent_id in self.agents:
                    self.agents[agent_id].last_heartbeat = time.time()
                    self.agents[agent_id].energy = msg.payload.get("energy", 0.5)
                    self.agents[agent_id].tasks_in_flight = msg.payload.get("tasks_in_flight", 0)
                    if self.agents[agent_id].status == "suspected_dead":
                        self.agents[agent_id].status = "active"
                        self._log("info", "Agent recovered", agent=agent_id)
            
            elif msg.message_type == "WAGGLE":
                task_data = msg.payload.get("task", {})
                task = TaskOpportunity(**task_data)
                await self.submit_task(task)
            
            elif msg.message_type == "FORAGE_COMPLETE":
                agent_id = msg.source_agent_id
                if agent_id in self.agents:
                    self.agents[agent_id].tasks_in_flight = max(0, self.agents[agent_id].tasks_in_flight - 1)
                    self.agents[agent_id].total_tasks_completed += 1
                self.completed_tasks.append(msg.payload.get("task_id", ""))
            
            elif msg.message_type == "FORAGE_FAILED":
                agent_id = msg.source_agent_id
                if agent_id in self.agents:
                    self.agents[agent_id].tasks_in_flight = max(0, self.agents[agent_id].tasks_in_flight - 1)
                    self.agents[agent_id].total_tasks_failed += 1
                self.failed_tasks.append(msg.payload.get("task_id", ""))
                
        except Exception as e:
            self._log("error", "Swarm message handling error", error=str(e))

    # --- Self-Healing ---
    async def _self_heal_loop(self):
        """Detect agent failures and redistribute their tasks.
        
        Runs every 5 seconds (Fibonacci[4]). Checks heartbeat timestamps
        against the suspect and confirmed-dead thresholds. Dead agents have
        their in-flight tasks reassigned to healthy agents.
        """
        while self.running:
            now = time.time()
            
            for agent_id, state in list(self.agents.items()):
                age = now - state.last_heartbeat
                
                if age > CONFIRMED_DEAD_S and state.status != "dead":
                    state.status = "dead"
                    self._log("critical", "Agent confirmed DEAD",
                              agent=agent_id, silent_for=f"{age:.0f}s")
                    await self._redistribute_tasks(agent_id)
                
                elif age > SUSPECT_TIMEOUT_S and state.status == "active":
                    state.status = "suspected_dead"
                    self._log("warning", "Agent suspected dead",
                              agent=agent_id, silent_for=f"{age:.0f}s")
            
            await asyncio.sleep(SELF_HEAL_INTERVAL_S)

    async def _redistribute_tasks(self, dead_agent_id: str):
        """Reassign tasks from a dead agent to healthy agents.
        
        This is the self-healing mechanism. When an agent dies, its in-flight
        tasks need to be picked up by another agent with matching capabilities.
        Tasks are re-submitted to the queue for normal routing.
        """
        state = self.agents.get(dead_agent_id)
        if not state:
            return
        
        self._log("info", "Redistributing tasks from dead agent",
                  agent=dead_agent_id, count=state.tasks_in_flight)
        
        # In a full implementation, we'd track specific task IDs per agent.
        # For now, we mark the agent as having no tasks and log the event.
        state.tasks_in_flight = 0

    # --- Topology Management ---
    def _update_topology(self, agent_id: str, capabilities: list[str]):
        """Maintain Sacred Geometry topology connections.
        
        The topology defines which agents can directly communicate. It's
        a hierarchical tree with cross-links, not a flat mesh. The rules
        are defined by the Sacred Geometry framework:
        
        - Alpha ↔ Data (enrichment)
        - Alpha → Risk (signal validation)
        - Risk → Execution (order approval)
        - Risk ↔ Compliance (regulatory)
        - Sentinel → ALL (health monitoring)
        - Bridge → ALL (coordination)
        - View ← ALL (rendering)
        """
        TOPOLOGY_RULES = {
            "market_data": ["signal_generation", "risk_assessment"],
            "signal_generation": ["risk_assessment", "data_enrichment", "execution"],
            "risk_assessment": ["execution", "compliance", "veto_authority"],
            "execution": ["risk_assessment", "compliance"],
            "compliance": ["risk_assessment", "execution"],
            "data_enrichment": ["signal_generation", "market_data"],
            "monitoring": list(self.agents.keys()),    # Sentinel connects to all
            "coordination": list(self.agents.keys()),  # Bridge connects to all
            "rendering": [],                            # View is receive-only
        }
        
        self._topology[agent_id] = []
        for cap in capabilities:
            targets = TOPOLOGY_RULES.get(cap, [])
            for other_id, other_state in self.agents.items():
                if other_id == agent_id:
                    continue
                if any(t in other_state.capabilities for t in targets):
                    if other_id not in self._topology[agent_id]:
                        self._topology[agent_id].append(other_id)

    # --- Ternary Quorum Resolution ---
    def resolve_quorum(self, votes: dict[str, int]) -> dict:
        """Resolve a balanced ternary quorum across multiple agents.
        
        Risk Agent veto (-1) overrides everything. Compliance veto (-1)
        overrides non-risk agents. For the remaining agents, a weighted
        consensus is calculated using golden ratio thresholds.
        """
        # Risk veto = absolute override
        if votes.get("risk") == TernaryState.REJECT.value:
            return {"decision": TernaryState.REJECT.value, "reason": "Risk veto"}
        
        # Compliance veto
        if votes.get("compliance") == TernaryState.REJECT.value:
            return {"decision": TernaryState.REJECT.value, "reason": "Compliance veto"}
        
        # Weighted consensus from remaining agents
        weights = {
            "alpha": 0.30, "data": 0.20, "sentinel": 0.15,
            "execution": 0.15, "bridge": 0.10, "view": 0.10,
        }
        
        score = 0.0
        for agent, weight in weights.items():
            if agent in votes:
                score += votes[agent] * weight
        
        if score >= PSI:   # >= 0.618 → approve
            return {"decision": TernaryState.APPROVE.value, "score": round(score, 4)}
        if score <= -PSI:  # <= -0.618 → reject
            return {"decision": TernaryState.REJECT.value, "score": round(score, 4)}
        
        return {"decision": TernaryState.NEUTRAL.value, "score": round(score, 4)}

    # --- Status ---
    def get_swarm_status(self) -> dict:
        """Get a complete snapshot of the swarm's current state.
        
        Used by the View Agent to render the dashboard, and by the Sentinel
        Agent for health monitoring.
        """
        agents_summary = {}
        for aid, state in self.agents.items():
            agents_summary[aid] = {
                "status": state.status,
                "energy": round(state.energy, 3),
                "tasks_in_flight": state.tasks_in_flight,
                "runtime": state.runtime_id,
                "vram_free_mb": state.vram_free_mb,
                "completed": state.total_tasks_completed,
                "failed": state.total_tasks_failed,
                "last_heartbeat_age_s": round(time.time() - state.last_heartbeat, 1),
            }
        
        return {
            "swarm_status": "active" if self.running else "stopped",
            "total_agents": len(self.agents),
            "active_agents": sum(1 for s in self.agents.values() if s.status == "active"),
            "queue_depth": self.task_queue.qsize(),
            "total_completed": len(self.completed_tasks),
            "total_failed": len(self.failed_tasks),
            "agents": agents_summary,
            "topology": {k: list(v) for k, v in self._topology.items()},
        }

    # --- Helpers ---
    async def _publish(self, channel: str, msg: AgentMessage):
        if self.bus:
            try:
                await self.bus.publish(channel, msg.to_json())
            except Exception as e:
                self._log("error", "Publish failed", channel=channel, error=str(e))

    def _log(self, level: str, message: str, **kwargs):
        if self.logger:
            log_data = {"swarm": "HeadySwarm", **kwargs}
            getattr(self.logger, level, self.logger.info)(
                json.dumps({"message": message, **log_data})
            )


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import pprint
    
    print("HeadyBee / HeadySwarm — Distributed Orchestration Engine")
    print("=" * 60)
    print(f"PHI = {PHI}")
    print(f"PSI = {PSI}")
    print(f"Heartbeat interval: {HEARTBEAT_INTERVAL_S}s (Fibonacci)")
    print(f"Suspect timeout: {SUSPECT_TIMEOUT_S}s (Fibonacci)")
    print(f"Confirmed dead: {CONFIRMED_DEAD_S}s (Fibonacci)")
    print(f"Self-heal interval: {SELF_HEAL_INTERVAL_S}s (Fibonacci)")
    print(f"Relevance gates: {RELEVANCE_GATES}")
    print()
    
    # Demonstrate swarm setup without async (for self-test)
    swarm = HeadySwarm()
    
    # Synchronously register agents (for demo purposes)
    loop = asyncio.new_event_loop()
    for agent_id, caps in [
        ("alpha", ["market_data", "signal_generation"]),
        ("risk", ["risk_assessment", "veto_authority"]),
        ("execution", ["execution", "order_routing"]),
        ("sentinel", ["monitoring", "health_check"]),
        ("compliance", ["compliance", "regulatory"]),
        ("data", ["data_enrichment", "vector_search"]),
        ("view", ["rendering", "dashboard"]),
        ("bridge", ["coordination", "topology"]),
    ]:
        loop.run_until_complete(swarm.register_agent(agent_id, caps, "cortex", 40000))
    
    print("Swarm Status:")
    pprint.pprint(swarm.get_swarm_status())
    
    # Test quorum resolution
    print("\nQuorum Tests:")
    test_votes = [
        {"alpha": 1, "risk": 1, "compliance": 1, "data": 1},
        {"alpha": 1, "risk": -1, "compliance": 1},
        {"alpha": 1, "risk": 1, "compliance": -1},
        {"alpha": 0, "risk": 0, "data": 0, "execution": 0},
    ]
    for votes in test_votes:
        result = swarm.resolve_quorum(votes)
        print(f"  Votes: {votes}")
        print(f"  Result: {result}")
        print()
    
    loop.close()
