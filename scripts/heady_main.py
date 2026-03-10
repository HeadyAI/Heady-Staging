"""
Heady Main Orchestrator — System Entry Point
==============================================
The single entry point that bootstraps the entire Heady swarm on a Colab
runtime. Wires together the message bus, auth system, swarm coordinator,
individual agent bees, and runtime infrastructure into a running system.

This file is designed to be run as the main cell in a Colab notebook.
It detects which runtime it's on (cortex/synapse/reflex) and starts
the appropriate agents for that runtime's role.

Usage in Colab:
    # Cell 1: Install dependencies
    # !pip install redis uvloop structlog fastapi uvicorn cloudflared --break-system-packages -q
    
    # Cell 2: Mount drive + set env vars
    # from google.colab import drive
    # drive.mount('/content/drive')
    # import os
    # os.environ["HEADY_RUNTIME"] = "cortex"
    # os.environ["JWT_SECRET"] = "your-secret-here"
    # os.environ["HMAC_SECRET"] = "your-hmac-secret"
    # os.environ["REDIS_URL"] = "redis://your-redis:6379/0"
    
    # Cell 3: Run the orchestrator
    # from heady_main import main
    # await main()

© 2026 HeadySystems Inc. — Sacred Geometry v4.0
"""

import asyncio
import json
import logging
import os
import sys
import time

# Local imports — all from the Heady toolkit
from heady_bus import HeadyBus
from heady_auth import HeadyAuth, validate_secrets
from heady_swarm import HeadySwarm, HeadyBee, BeeRole, TaskOpportunity, AgentMessage
from heady_colab_runtime import (
    RuntimeBootstrap, get_gpu_state, setup_logger,
    PHI, PSI, FIB, TASK_ALLOCATION,
)
from heady_agent_prompts import AGENTS, get_prompt

# ---------------------------------------------------------------------------
# Runtime → Agent mapping
# ---------------------------------------------------------------------------
# Each Colab runtime hosts a specific set of agents based on its GPU 
# capabilities. Heavy inference agents go on Cortex (A100 80GB), vector
# and execution agents on Synapse (A100 40GB), and lightweight monitoring
# and compliance agents on Reflex (T4/L4).

RUNTIME_AGENTS = {
    "cortex": [
        {"id": "bridge", "role": BeeRole.QUEEN, "caps": ["coordination", "topology"]},
        {"id": "alpha", "role": BeeRole.SCOUT, "caps": ["market_data", "signal_generation"]},
        {"id": "risk", "role": BeeRole.FORAGER, "caps": ["risk_assessment", "veto_authority"]},
    ],
    "synapse": [
        {"id": "data", "role": BeeRole.SCOUT, "caps": ["data_enrichment", "vector_search"]},
        {"id": "execution", "role": BeeRole.FORAGER, "caps": ["execution", "order_routing"]},
    ],
    "reflex": [
        {"id": "sentinel", "role": BeeRole.NURSE, "caps": ["monitoring", "health_check"]},
        {"id": "compliance", "role": BeeRole.FORAGER, "caps": ["compliance", "regulatory"]},
        {"id": "view", "role": BeeRole.FORAGER, "caps": ["rendering", "dashboard"]},
    ],
}


# ---------------------------------------------------------------------------
# Agent task handlers
# ---------------------------------------------------------------------------
# Each agent needs a task handler — an async function that processes
# TaskOpportunity instances for that agent's domain. These are the stubs
# that you wire to your actual trading logic, ML inference, data pipelines, etc.

async def alpha_handler(task: TaskOpportunity):
    """Alpha Agent task handler — signal generation.
    
    In production, this connects to your technical analysis pipeline,
    evaluates market conditions, and generates structured trading signals.
    The signal must include instrument, direction, confidence, stop loss,
    take profit, and reward-risk ratio before being forwarded to Risk.
    """
    return {
        "agent": "alpha",
        "task_id": task.task_id,
        "domain": task.domain,
        "status": "processed",
        "note": "Wire this to your signal generation pipeline",
    }


async def risk_handler(task: TaskOpportunity):
    """Risk Agent task handler — signal validation and drawdown monitoring.
    
    In production, this checks every incoming signal against the Apex
    trailing drawdown, contract limits, time-of-day restrictions, and
    the 30% consistency rule. It has absolute veto power — if Risk says
    no, the trade does not execute, period.
    """
    if task.domain == "emergency":
        # Emergency flatten — this is the highest priority operation
        return {"agent": "risk", "action": "EMERGENCY_FLATTEN", "reason": task.payload.get("reason")}
    
    return {
        "agent": "risk",
        "task_id": task.task_id,
        "ternary_state": 1,  # 1=approve, 0=neutral, -1=reject
        "note": "Wire this to your Apex drawdown tracker",
    }


async def execution_handler(task: TaskOpportunity):
    """Execution Agent task handler — order routing.
    
    In production, this takes Risk+Compliance-approved signals and routes
    them to the exchange via Tradovate/Rithmic API. It manages bracket
    orders, tracks fill quality, and reports slippage metrics.
    """
    return {
        "agent": "execution",
        "task_id": task.task_id,
        "status": "routed",
        "note": "Wire this to your Tradovate/Rithmic API client",
    }


async def sentinel_handler(task: TaskOpportunity):
    """Sentinel Agent task handler — system health monitoring.
    
    In production, this continuously monitors event loop lag, memory usage,
    connection pool saturation, API latencies, and agent heartbeats. When
    anomalies are detected, it alerts the Risk Agent which can trigger
    emergency flatten if the system is degraded.
    """
    return {
        "agent": "sentinel",
        "task_id": task.task_id,
        "health": "ok",
        "note": "Wire this to your OpenTelemetry/Grafana stack",
    }


async def compliance_handler(task: TaskOpportunity):
    """Compliance Agent task handler — regulatory rule enforcement.
    
    In production, this validates every trade against Apex rules: contract
    limits, trading hours, news blackouts, and the 30% consistency rule.
    Every decision is logged to an immutable audit trail.
    """
    return {
        "agent": "compliance",
        "task_id": task.task_id,
        "compliance_check": "pass",
        "note": "Wire this to your Apex compliance rule engine",
    }


async def data_handler(task: TaskOpportunity):
    """Data Agent task handler — context enrichment.
    
    In production, this runs embedding generation, FAISS vector search,
    historical pattern matching, and sentiment analysis. It serves enriched
    context to Alpha and other agents through the Context Fabric.
    """
    return {
        "agent": "data",
        "task_id": task.task_id,
        "enrichment": "complete",
        "note": "Wire this to your FAISS/embedding pipeline",
    }


async def view_handler(task: TaskOpportunity):
    """View Agent task handler — dashboard rendering.
    
    In production, this aggregates state from all agents and projects it
    into the admin dashboard. It handles WebSocket updates for real-time
    visualization of the agent topology, P&L, drawdown gauge, and positions.
    """
    return {
        "agent": "view",
        "task_id": task.task_id,
        "rendered": True,
        "note": "Wire this to your dashboard WebSocket server",
    }


async def bridge_handler(task: TaskOpportunity):
    """Bridge Builder task handler — topology management.
    
    The Bridge Builder primarily operates through the HeadySwarm coordinator
    rather than through task handling. This handler catches any direct tasks
    that come through the standard task pipeline.
    """
    return {
        "agent": "bridge",
        "task_id": task.task_id,
        "action": "topology_maintained",
    }


# Map agent IDs to their task handlers
AGENT_HANDLERS = {
    "alpha": alpha_handler,
    "risk": risk_handler,
    "execution": execution_handler,
    "sentinel": sentinel_handler,
    "compliance": compliance_handler,
    "data": data_handler,
    "view": view_handler,
    "bridge": bridge_handler,
}


# ---------------------------------------------------------------------------
# Main bootstrap
# ---------------------------------------------------------------------------
async def main(runtime_id: str = None):
    """Bootstrap the Heady system on this runtime.
    
    This is the main entry point. It performs the full startup sequence:
    
    1. Detect runtime identity (cortex/synapse/reflex)
    2. Validate required secrets
    3. Bootstrap the Colab runtime (GPU, keepalive, tunnel, checkpoints)
    4. Connect the message bus
    5. Initialize the auth system
    6. Start the swarm coordinator (if this is the cortex/bridge runtime)
    7. Create and start HeadyBee instances for this runtime's agents
    8. Register all agents with the swarm
    9. Enter the main run loop
    
    The system runs until interrupted (Ctrl+C) or the runtime disconnects.
    On shutdown, it checkpoints state and closes connections gracefully.
    """
    # 1. Runtime identity
    runtime_id = runtime_id or os.environ.get("HEADY_RUNTIME", "cortex")
    logger = setup_logger(f"heady-{runtime_id}")
    
    logger.info("=" * 60)
    logger.info("HEADY SYSTEM BOOTSTRAP — %s" % runtime_id.upper())
    logger.info("Sacred Geometry v4.0 — HeadyBee/HeadySwarm Orchestration")
    logger.info("=" * 60)
    
    # 2. Validate secrets (soft mode — warn but don't crash in dev)
    try:
        validate_secrets()
        logger.info("All required secrets validated")
    except EnvironmentError:
        logger.warning(
            "Running without all required secrets. "
            "This is OK for development/testing but NOT for production. "
            "Set JWT_SECRET, HMAC_SECRET, and REDIS_URL before going live."
        )
    
    # 3. Bootstrap the Colab runtime
    runtime = RuntimeBootstrap(runtime_id, port=int(os.environ.get("PORT", "8001")))
    runtime.start()
    
    # 4. Connect the message bus
    redis_url = os.environ.get("REDIS_URL")
    bus = await HeadyBus.connect(redis_url=redis_url, logger=logger)
    bus_health = await bus.health_check()
    logger.info("Message bus: %s mode, connected=%s" % (bus_health["mode"], bus_health["connected"]))
    
    # 5. Initialize auth
    jwt_secret = os.environ.get("JWT_SECRET", "dev-secret-not-for-production")
    hmac_secret = os.environ.get("HMAC_SECRET", "dev-hmac-not-for-production")
    auth = HeadyAuth(jwt_secret=jwt_secret, hmac_secret=hmac_secret)
    logger.info("Auth system initialized")
    
    # 6. Start swarm coordinator (only on the cortex/bridge runtime)
    swarm = None
    if runtime_id == "cortex":
        swarm = HeadySwarm(bus=bus, logger=logger)
        # Register ALL agents (not just local ones) so the coordinator knows about them
        for rt_id, rt_agents in RUNTIME_AGENTS.items():
            for agent_cfg in rt_agents:
                gpu = get_gpu_state()
                await swarm.register_agent(
                    agent_cfg["id"],
                    agent_cfg["caps"],
                    rt_id,
                    gpu.free_mb if rt_id == runtime_id else 0,
                )
        logger.info("HeadySwarm coordinator started — %d agents registered" % len(swarm.agents))
    
    # 7. Create HeadyBee instances for THIS runtime's agents
    bees: list[HeadyBee] = []
    my_agents = RUNTIME_AGENTS.get(runtime_id, [])
    
    for agent_cfg in my_agents:
        handler = AGENT_HANDLERS.get(agent_cfg["id"])
        bee = HeadyBee(
            agent_id=agent_cfg["id"],
            role=agent_cfg["role"],
            capabilities=agent_cfg["caps"],
            bus=bus,
            logger=logger,
            task_handler=handler,
        )
        bees.append(bee)
        
        # Issue a JWT for this agent
        token = auth.issue_agent_token(agent_cfg["id"])
        logger.info(
            "Agent '%s' ready — role=%s, %d tools authorized, JWT issued"
            % (agent_cfg["id"], agent_cfg["role"].value, 
               len(auth.validate_token(token)["tools"]))
        )
    
    # 8. Print system status
    logger.info("-" * 40)
    logger.info("Runtime:     %s" % runtime_id)
    logger.info("GPU:         %s" % (runtime.gpu.name if runtime.gpu.available else "CPU"))
    logger.info("VRAM Free:   %d MB" % runtime.gpu.free_mb)
    logger.info("Agents:      %s" % ", ".join(a["id"] for a in my_agents))
    logger.info("Bus:         %s" % bus_health["mode"])
    logger.info("Swarm:       %s" % ("coordinator" if swarm else "worker"))
    logger.info("Tunnel:      %s" % (runtime.tunnel_url or "disabled"))
    logger.info("-" * 40)
    logger.info("HEADY SYSTEM ONLINE — φ = %.15f" % PHI)
    logger.info("-" * 40)
    
    # 9. Run the main loop
    # In a real deployment, the bees run concurrently with the swarm.
    # Here we start all concurrent tasks and wait.
    tasks = []
    
    # Start the swarm coordinator (if on cortex)
    if swarm:
        tasks.append(asyncio.create_task(_safe_run(swarm.start, "HeadySwarm", logger)))
    
    # Start all local bees
    for bee in bees:
        tasks.append(asyncio.create_task(_safe_run(bee.start, f"HeadyBee-{bee.agent_id}", logger)))
    
    # Periodic checkpoint save
    tasks.append(asyncio.create_task(_checkpoint_loop(runtime, swarm, bees, logger)))
    
    # Wait for all tasks (runs until interrupted)
    try:
        logger.info("Entering main run loop — %d concurrent tasks" % len(tasks))
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        logger.info("Main loop cancelled")
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    finally:
        # Graceful shutdown
        logger.info("Shutting down gracefully...")
        
        # Checkpoint final state
        if swarm:
            state = swarm.get_swarm_status()
            runtime.save_checkpoint(state)
            logger.info("Final state checkpointed")
        
        # Stop bees
        for bee in bees:
            await bee.stop()
        
        # Stop swarm
        if swarm:
            await swarm.stop()
        
        # Close bus
        await bus.close()
        
        # Stop runtime
        runtime.shutdown()
        
        logger.info("HEADY SYSTEM SHUTDOWN COMPLETE")


async def _safe_run(coro_fn, name: str, logger):
    """Run an async function with error handling and restart logic.
    
    If the coroutine crashes, log the error and restart it with a 
    Fibonacci-based backoff. This prevents a single agent crash from
    taking down the entire system.
    """
    attempt = 0
    while True:
        try:
            await coro_fn()
            break  # Clean exit
        except asyncio.CancelledError:
            break
        except Exception as e:
            attempt += 1
            backoff = FIB[min(attempt + 3, len(FIB) - 1)] * 0.1
            logger.error(
                "%s crashed (attempt %d): %s. Restarting in %.1fs"
                % (name, attempt, str(e), backoff)
            )
            await asyncio.sleep(backoff)


async def _checkpoint_loop(runtime, swarm, bees, logger):
    """Periodically checkpoint the swarm state to Google Drive.
    
    Runs every 5 minutes (300 seconds). This ensures that if the Colab
    runtime disconnects, we can restore the agent state when it reconnects.
    The checkpoint includes the full swarm status (agent states, queue depth,
    topology, completed/failed task counts).
    """
    while True:
        await asyncio.sleep(300)  # 5 minutes
        try:
            state = {
                "runtime": runtime.runtime_id,
                "gpu": get_gpu_state().__dict__,
                "bees": [{"id": b.agent_id, "energy": b.energy, "role": b.role.value} for b in bees],
            }
            if swarm:
                state["swarm"] = swarm.get_swarm_status()
            
            path = runtime.save_checkpoint(state)
            logger.info("Checkpoint saved: %s" % path)
        except Exception as e:
            logger.error("Checkpoint failed: %s" % str(e))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Heady Main Orchestrator")
    print("=" * 50)
    print("Use in Colab: await main()")
    print("Use standalone: asyncio.run(main('cortex'))")
    print()
    print("Runtime → Agent mapping:")
    for rt_id, agents in RUNTIME_AGENTS.items():
        agent_names = ", ".join(a["id"] for a in agents)
        print(f"  {rt_id:8s} → {agent_names}")
    print()
    print("To run in test mode (mock bus, no Redis):")
    print("  asyncio.run(main('cortex'))")
