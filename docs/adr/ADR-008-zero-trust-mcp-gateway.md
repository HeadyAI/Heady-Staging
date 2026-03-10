# ADR-008: Zero-Trust MCP Gateway Architecture

## Status
Accepted

## Date
2026-02-01

## Context
The MCP gateway enables AI agents to execute tools. Tool execution is inherently dangerous. A compromised agent could exfiltrate data, modify system state, or attack external services.

## Decision
We implement a zero-trust MCP gateway where every request is authenticated, every tool execution is sandboxed, and every result is validated. CSL-gated routing measures cosine similarity between request embeddings and tool capability vectors. Tool execution occurs in isolated WASM sandboxes with Fibonacci-derived memory limits (default fib(11) = 89MB, max fib(13) = 233MB).

All connections require mutual TLS. Every execution is logged to an append-only Merkle tree audit trail.

## Consequences

### Benefits
Zero-trust eliminates attacks from "trusted internal network" assumptions. CSL-gated routing provides semantic-level prompt injection protection. WASM sandboxing prevents unauthorized resource access. Merkle tree audit trails provide tamper-evident compliance records.

### Risks
Multiple security layers add latency. We mitigate by caching auth decisions, pre-computing gate vectors, and maintaining warm connection pools.

### Related ADRs
ADR-001 (CSL), ADR-004 (circuit breaker), ADR-007 (sessions)
