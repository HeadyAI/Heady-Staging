---
name: heady-memory
description: "Persistent vector memory, knowledge storage, and semantic search using Heady™ Memory services. Use this skill when the user asks to remember something, recall information, search knowledge, store facts, manage embeddings, or work with vector memory. Triggers on: 'remember this', 'recall', 'what do you know about', 'search memory', 'store this', 'save for later', 'vector search', 'find similar', 'knowledge base', 'embeddings'. Always use this skill for any memory, recall, or knowledge management task — it connects to heady_memory, heady_embed, heady_recall, heady_learn, heady_vector_store, heady_vector_search, and heady_memory_stats MCP tools."
---

# Heady™ Memory Skill

You are connected to Heady™ Memory — a persistent 3D vector memory system built on pgvector with HNSW indexing. This skill lets you store, search, and manage knowledge that persists across conversations.

## Available MCP Tools

### heady_memory
Search the vector memory space for stored facts, embeddings, and knowledge.

```json
{
  "query": "How does the authentication system work?",
  "limit": 5,
  "minScore": 0.6
}
```

### heady_embed
Generate vector embeddings (384D, nomic-embed-text model).

```json
{
  "text": "Content to embed",
  "model": "nomic-embed-text"
}
```

### heady_learn
Store new knowledge in persistent memory with metadata tags.

```json
{
  "content": "The API uses JWT tokens for authentication",
  "tags": ["auth", "api", "jwt"],
  "source": "architecture-review",
  "importance": 0.8
}
```

### heady_recall
Retrieve specific memories by tag, source, or time range.

```json
{
  "tags": ["auth"],
  "source": "architecture-review",
  "limit": 10
}
```

### heady_vector_store
Store raw vectors with metadata into the 3D vector space.

```json
{
  "vectors": [{"id": "doc_1", "values": [...], "metadata": {...}}],
  "namespace": "project-docs"
}
```

### heady_vector_search
Semantic similarity search across stored vectors.

```json
{
  "query_vector": [...],
  "namespace": "project-docs",
  "topK": 10
}
```

### heady_vector_stats
Get statistics about stored vectors — count, namespaces, dimensions.

```json
{
  "namespace": "project-docs"
}
```

### heady_memory_stats
Overall memory system health and usage statistics.

```json
{}
```

## Workflow

### Storing Knowledge
1. When the user says "remember this" or provides important information:
   - Use `heady_learn` with appropriate tags and importance score
   - Confirm what was stored and how it can be retrieved

### Searching Knowledge
1. When the user asks "what do you know about X":
   - Use `heady_memory` with their query for semantic search
   - Use `heady_recall` with specific tags for filtered retrieval
   - Present results ranked by similarity score

### Managing Memory
1. Use `heady_memory_stats` to show system health
2. Use `heady_vector_stats` for namespace-level stats
3. Help the user organize knowledge with consistent tagging

## Memory Architecture

The memory system uses a 3D vector space:
- **X-axis:** Semantic meaning (content similarity)
- **Y-axis:** Temporal recency (when stored)
- **Z-axis:** Importance weight (user-assigned or auto-computed)

All vectors use 384 dimensions via the nomic-embed-text model. HNSW indexing provides sub-millisecond nearest-neighbor search.

## Connection

This skill connects to the HeadyMCP server's memory tools. The upstream `heady-memory` service runs on port 3312.
