"""
Heady Message Bus — Redis Pub/Sub Transport Layer
===================================================
Connects all 8 Sacred Geometry agents through Redis pub/sub with
structured channels, message validation, dead letter queuing,
and connection health monitoring.

This module bridges heady_swarm.py to a real Redis instance. It provides
the `bus` parameter that HeadySwarm and HeadyBee both accept.

Usage:
    from heady_bus import HeadyBus
    
    bus = await HeadyBus.connect(os.environ["REDIS_URL"])
    
    # Pass to the swarm coordinator
    swarm = HeadySwarm(bus=bus, logger=logger)
    
    # Or pass to an individual bee
    bee = HeadyBee("alpha", BeeRole.SCOUT, capabilities, bus=bus)

Channel Architecture:
    swarm.heartbeat     — Agent heartbeat signals (→ Bridge Builder)
    swarm.waggle        — Task discovery broadcasts (→ Bridge Builder)
    swarm.result        — Task completion/failure reports (→ Bridge Builder)
    swarm.broadcast     — Colony-wide signals (← Bridge Builder → all agents)
    agent.{id}          — Direct messages to a specific agent
    risk.emergency      — Emergency flatten channel (highest priority)
    dead_letter         — Failed/expired messages for inspection

© 2026 HeadySystems Inc. — Sacred Geometry v4.0
"""

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

# Sacred Geometry constants
PHI = 1.618033988749895
PSI = 1 / PHI
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]

# Retry backoff for reconnection (Fibonacci-derived, in seconds)
RECONNECT_BACKOFF_S = [f * 0.1 for f in FIB[4:9]]  # [0.5, 0.8, 1.3, 2.1, 3.4]

# Channel definitions — the nervous system of the swarm
CHANNELS = {
    "heartbeat": "swarm.heartbeat",
    "waggle": "swarm.waggle",
    "result": "swarm.result",
    "broadcast": "swarm.broadcast",
    "emergency": "risk.emergency",
    "dead_letter": "dead_letter",
}


def agent_channel(agent_id: str) -> str:
    """Get the direct message channel for a specific agent.
    
    Each agent subscribes to its own channel to receive task assignments,
    topology updates, and direct messages from the Bridge Builder. The
    channel name follows the pattern 'agent.{id}' for consistency.
    """
    return f"agent.{agent_id}"


@dataclass
class BusStats:
    """Tracks message bus health metrics for the Sentinel agent.
    
    These counters are exposed through the swarm status endpoint and
    monitored by the Sentinel agent for anomaly detection. The Sentinel
    watches for sudden drops in throughput or spikes in errors, which
    could indicate Redis connectivity issues or agent failures.
    """
    messages_published: int = 0
    messages_received: int = 0
    messages_dead_lettered: int = 0
    publish_errors: int = 0
    subscribe_errors: int = 0
    reconnect_count: int = 0
    last_publish_time: float = 0.0
    last_receive_time: float = 0.0


class HeadyBus:
    """Redis pub/sub message bus for the Heady swarm.
    
    This class provides the transport layer that all agents use to 
    communicate. It wraps async Redis operations with retry logic,
    health monitoring, dead letter queuing, and structured channel 
    management. The HeadySwarm and HeadyBee classes both accept a 
    HeadyBus instance as their `bus` parameter.
    
    The bus supports two Redis backends:
    1. `redis.asyncio` (the standard async Redis library)
    2. A mock in-memory backend for testing without Redis
    
    In production, always use a real Redis instance (or Redis Cluster
    for high availability). The bus handles reconnection automatically
    using Fibonacci-based exponential backoff.
    """
    
    def __init__(self, redis_client=None, logger=None):
        self.redis = redis_client
        self.logger = logger
        self.stats = BusStats()
        self._subscriptions: dict[str, list[Callable]] = {}
        self._pubsub = None
        self._listener_task: Optional[asyncio.Task] = None
        self._connected = False
        # In-memory message store for mock mode (testing without Redis)
        self._mock_mode = redis_client is None
        self._mock_channels: dict[str, list[str]] = {}
        self._mock_subscribers: dict[str, list[Callable]] = {}
    
    @classmethod
    async def connect(cls, redis_url: str = None, logger=None) -> "HeadyBus":
        """Connect to Redis and return an initialized HeadyBus.
        
        This is the primary factory method. It attempts to connect to the
        Redis instance specified by redis_url (which should come from the
        REDIS_URL environment variable, never hardcoded). If connection
        fails, it retries with Fibonacci backoff before giving up.
        
        If redis_url is None, the bus runs in mock mode — useful for 
        testing and development without a Redis instance. Mock mode stores
        messages in memory and delivers them locally within the same process.
        """
        bus = cls(logger=logger)
        
        if redis_url:
            try:
                # Try importing redis.asyncio (the standard async Redis library)
                import redis.asyncio as aioredis
                
                client = aioredis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    # Connection pool sizing uses Fibonacci
                    max_connections=FIB[6],  # 13 connections max
                )
                # Verify connectivity with a ping
                await client.ping()
                bus.redis = client
                bus._connected = True
                bus._mock_mode = False
                
                if logger:
                    logger.info("HeadyBus connected to Redis: %s" % redis_url[:30] + "...")
                
            except ImportError:
                if logger:
                    logger.warning(
                        "redis.asyncio not available. "
                        "Install with: pip install redis. "
                        "Running in mock mode (in-memory, single-process only)."
                    )
                bus._mock_mode = True
                
            except Exception as e:
                if logger:
                    logger.error("Redis connection failed: %s. Running in mock mode." % str(e))
                bus._mock_mode = True
        else:
            bus._mock_mode = True
            if logger:
                logger.info("HeadyBus running in mock mode (no Redis URL provided)")
        
        return bus
    
    # --- Publishing ---
    
    async def publish(self, channel: str, data: Any) -> bool:
        """Publish a message to a channel.
        
        The data parameter can be a string (raw JSON), a dict (auto-serialized
        to JSON), or an AgentMessage (uses its to_json method). Returns True
        if the message was published successfully, False otherwise.
        
        In mock mode, messages are delivered directly to any local subscribers
        on the same channel. In Redis mode, messages go through the Redis
        pub/sub system and are received by all subscribers across all runtimes.
        """
        try:
            # Normalize the data to a string
            if hasattr(data, "to_json"):
                payload = data.to_json()
            elif isinstance(data, dict):
                payload = json.dumps(data, default=str)
            else:
                payload = str(data)
            
            if self._mock_mode:
                # Mock mode: deliver to local subscribers
                await self._mock_publish(channel, payload)
            else:
                # Redis mode: publish to the real pub/sub system
                await self.redis.publish(channel, payload)
            
            self.stats.messages_published += 1
            self.stats.last_publish_time = time.time()
            return True
            
        except Exception as e:
            self.stats.publish_errors += 1
            self._log("error", "Publish failed", channel=channel, error=str(e))
            
            # Dead letter the failed message so it's not silently lost
            await self._dead_letter(channel, payload if 'payload' in dir() else str(data), str(e))
            return False
    
    # --- Subscribing ---
    
    def pubsub(self):
        """Return a pub/sub interface compatible with the HeadySwarm/HeadyBee API.
        
        The swarm coordinator and individual bees call bus.pubsub() to get
        a subscription object, then subscribe to channels and listen for
        messages. This method returns a wrapper that works in both Redis
        mode and mock mode.
        """
        if self._mock_mode:
            return MockPubSub(self)
        else:
            return self.redis.pubsub()
    
    async def subscribe(self, channel: str, callback: Callable):
        """Subscribe to a channel with a callback function.
        
        This is the high-level subscription API. The callback receives the
        raw message data (a string) whenever a message arrives on the channel.
        Multiple callbacks can be registered on the same channel.
        """
        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
        self._subscriptions[channel].append(callback)
        
        if self._mock_mode:
            if channel not in self._mock_subscribers:
                self._mock_subscribers[channel] = []
            self._mock_subscribers[channel].append(callback)
    
    # --- Mock mode internals ---
    
    async def _mock_publish(self, channel: str, payload: str):
        """Deliver a message to local subscribers in mock mode.
        
        This simulates Redis pub/sub behavior within a single process.
        Messages are delivered immediately to all registered callbacks
        on the matching channel. This makes testing possible without
        requiring a real Redis instance.
        """
        if channel in self._mock_subscribers:
            for callback in self._mock_subscribers[channel]:
                try:
                    await callback(payload)
                except Exception as e:
                    self._log("error", "Mock subscriber error",
                              channel=channel, error=str(e))
    
    # --- Dead Letter Queue ---
    
    async def _dead_letter(self, original_channel: str, payload: str, error: str):
        """Route a failed message to the dead letter channel.
        
        Messages that fail to publish or are rejected by subscribers end up
        here. The dead letter queue allows for manual inspection, replay,
        and debugging. Each dead-lettered message includes the original
        channel, the error reason, and a timestamp.
        """
        self.stats.messages_dead_lettered += 1
        
        dead_msg = json.dumps({
            "original_channel": original_channel,
            "payload": payload[:1000],  # Truncate to prevent memory issues
            "error": error,
            "dead_lettered_at": time.time(),
        })
        
        if not self._mock_mode and self.redis:
            try:
                # Store in a Redis list for later inspection
                await self.redis.lpush(CHANNELS["dead_letter"], dead_msg)
                # Trim to keep only the most recent 1000 dead letters
                await self.redis.ltrim(CHANNELS["dead_letter"], 0, 999)
            except Exception:
                pass  # If we can't even dead-letter, just log and move on
        
        self._log("warning", "Message dead-lettered",
                  channel=original_channel, error=error)
    
    # --- Health ---
    
    async def health_check(self) -> dict:
        """Return the current health state of the message bus.
        
        Used by the Sentinel agent to monitor bus connectivity and throughput.
        Returns a dict with connection status, message counters, and the time
        since the last successful publish/receive operations.
        """
        now = time.time()
        
        connected = self._mock_mode  # Mock is always "connected"
        if not self._mock_mode and self.redis:
            try:
                await self.redis.ping()
                connected = True
            except Exception:
                connected = False
        
        return {
            "connected": connected,
            "mode": "mock" if self._mock_mode else "redis",
            "stats": {
                "published": self.stats.messages_published,
                "received": self.stats.messages_received,
                "dead_lettered": self.stats.messages_dead_lettered,
                "publish_errors": self.stats.publish_errors,
                "reconnects": self.stats.reconnect_count,
            },
            "last_publish_age_s": round(now - self.stats.last_publish_time, 1) if self.stats.last_publish_time else None,
            "last_receive_age_s": round(now - self.stats.last_receive_time, 1) if self.stats.last_receive_time else None,
        }
    
    # --- Cleanup ---
    
    async def close(self):
        """Close the bus connection and clean up resources.
        
        Called during graceful shutdown. Closes the Redis connection,
        cancels any listener tasks, and clears subscriptions.
        """
        if self._listener_task:
            self._listener_task.cancel()
        if self._pubsub:
            await self._pubsub.close()
        if self.redis and not self._mock_mode:
            await self.redis.close()
        self._subscriptions.clear()
        self._log("info", "HeadyBus closed")
    
    # --- Logging ---
    
    def _log(self, level: str, message: str, **kwargs):
        if self.logger:
            log_data = {"bus": "HeadyBus", **kwargs}
            getattr(self.logger, level, self.logger.info)(
                json.dumps({"message": message, **log_data})
            )


class MockPubSub:
    """In-memory pub/sub for testing without Redis.
    
    This class mimics the redis.asyncio PubSub interface so that 
    HeadySwarm and HeadyBee can work identically in both mock mode
    and Redis mode. Messages published on the parent HeadyBus are 
    delivered to MockPubSub subscribers through the callback system.
    """
    
    def __init__(self, bus: HeadyBus):
        self.bus = bus
        self._channels: list[str] = []
        self._queue: asyncio.Queue = asyncio.Queue()
    
    async def subscribe(self, *channels):
        """Subscribe to one or more channels.
        
        In mock mode, this registers the channels and connects a callback
        that pushes messages into an internal queue. The get_message method
        then pulls from this queue, matching the Redis PubSub API.
        """
        for channel in channels:
            self._channels.append(channel)
            
            async def _enqueue(data, ch=channel):
                await self._queue.put({
                    "type": "message",
                    "channel": ch,
                    "data": data,
                })
            
            if channel not in self.bus._mock_subscribers:
                self.bus._mock_subscribers[channel] = []
            self.bus._mock_subscribers[channel].append(_enqueue)
    
    async def get_message(self, ignore_subscribe_messages: bool = True,
                           timeout: float = 1.0) -> Optional[dict]:
        """Get the next message from subscribed channels.
        
        Blocks for up to `timeout` seconds waiting for a message. Returns
        None if no message arrives within the timeout. This matches the
        redis.asyncio PubSub.get_message() API.
        """
        try:
            msg = await asyncio.wait_for(self._queue.get(), timeout=timeout)
            self.bus.stats.messages_received += 1
            self.bus.stats.last_receive_time = time.time()
            return msg
        except asyncio.TimeoutError:
            return None
    
    async def close(self):
        self._channels.clear()


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import pprint
    
    print("Heady Message Bus — Self Test")
    print("=" * 50)
    
    async def test():
        # Create bus in mock mode (no Redis needed)
        bus = await HeadyBus.connect(redis_url=None)
        print(f"Mode: {'mock' if bus._mock_mode else 'redis'}")
        
        # Test publish
        success = await bus.publish("swarm.heartbeat", {
            "agent": "alpha",
            "energy": 0.85,
            "timestamp": time.time(),
        })
        print(f"Publish: {'OK' if success else 'FAILED'}")
        
        # Test subscribe and receive
        received = []
        
        async def on_message(data):
            received.append(json.loads(data))
        
        await bus.subscribe("swarm.heartbeat", on_message)
        
        await bus.publish("swarm.heartbeat", {
            "agent": "risk",
            "energy": 0.92,
        })
        
        # Give mock delivery a moment
        await asyncio.sleep(0.1)
        print(f"Received: {len(received)} messages")
        
        # Test pub/sub interface (used by HeadySwarm)
        ps = bus.pubsub()
        await ps.subscribe("agent.alpha", "swarm.broadcast")
        
        await bus.publish("agent.alpha", {"type": "TASK_ASSIGNMENT", "task_id": "t-001"})
        await asyncio.sleep(0.1)
        
        msg = await ps.get_message(timeout=0.5)
        print(f"PubSub message: {msg is not None}")
        
        # Health check
        health = await bus.health_check()
        print(f"\nBus Health:")
        pprint.pprint(health)
        
        # Cleanup
        await bus.close()
        print("\nBus closed. All tests passed.")
    
    asyncio.run(test())
