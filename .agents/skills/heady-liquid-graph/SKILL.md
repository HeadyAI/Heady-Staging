---
name: heady-liquid-graph
description: Use when building directed state graphs for multi-agent orchestration, fan-out/fan-in parallelism, or typed state machines. Absorbed from LangGraph's directed graph patterns with φ-scaled parallelism. Keywords include state graph, DAG, directed graph, fan-out, fan-in, parallelism, typed state, LangGraph, state machine.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidGraph
  absorption_source: "LangGraph (38M PyPI/mo) → directed graphs with typed state"
  super_prompt_section: "§5.4"
---

# Heady™ Liquid Graph (LiquidGraph)

## When to Use This Skill

Use this skill when:
- Building multi-step agent pipelines with branching logic
- Implementing fan-out/fan-in parallel execution
- Managing typed state across pipeline stages
- Creating cyclic graphs for iterative agent loops

## Architecture

### Graph Primitives

| Primitive | Description |
|---|---|
| **StateNode** | Agent or function with typed input/output |
| **Edge** | Directed connection with optional condition |
| **StatePatch** | Incremental state update (Reducer pattern) |
| **Checkpoint** | Snapshot point for replay/recovery |
| **FanOut** | Parallel dispatch to N nodes |
| **FanIn** | Aggregate results from N nodes |

### State Management

```typescript
interface GraphState {
  messages: Message[];        // Conversation history
  artifacts: Record<string, any>; // Inter-node typed outputs
  metadata: {
    currentNode: string;
    iteration: number;
    checkpointId: string;
  };
}
```

### Execution Model

- **Sequential**: Node A → Node B → Node C
- **Parallel**: Node A → [Node B, Node C, Node D] → Node E (fan-out/fan-in)
- **Conditional**: Node A → (if condition) Node B else Node C
- **Cyclic**: Node A → Node B → (if !done) Node A (iterative refinement)
- **Nested**: Graph node contains a sub-graph

## Instructions

### Building a State Graph

1. Define state schema (TypeScript interface)
2. Create nodes as async functions accepting state, returning state patch
3. Add edges with optional conditions
4. Set entry point and end conditions
5. Configure checkpointing (Redis/PostgreSQL)
6. Execute with initial state

### Fan-Out/Fan-In Pattern

1. Define fan-out node that returns array of sub-tasks
2. Configure parallel execution limit (default: φ² = 2.618 → 3 concurrent)
3. Define fan-in node that aggregates results
4. Handle partial failures with fallback logic

## Output Format

- Execution Trace (per-node state snapshots)
- Graph Visualization (Mermaid)
- Performance Metrics (latency per node)
- Checkpoint IDs for replay
