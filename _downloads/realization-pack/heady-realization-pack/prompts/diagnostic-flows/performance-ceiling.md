# Performance Ceiling Discovery Prompt

> Run this when you want to find and push through performance bottlenecks.

---

"Heady, run a performance diagnostic across all tiers:

## Latency Analysis
1. What is the current end-to-end latency for each request type?
   - Simple chat response (edge-only)
   - Context-enriched response (edge + local)
   - Code generation (edge + local + GPU)
   - Full orchestration (all tiers)

2. For each request type, where does the time go?
   - Network transit (CF → Tunnel → local → Redis → worker → back)
   - Queue wait time
   - Actual compute time
   - Serialization/deserialization
   - Cache lookup time

3. What is the theoretical minimum latency for each request type?
   - Assume zero queue wait, zero cache miss, optimal routing
   - How close are we to theoretical minimum?

## Throughput Analysis
4. What is the current sustained throughput (req/s) before degradation?
5. What resource hits 100% utilization first? (CPU, memory, GPU, network, queue depth)
6. If we doubled that resource, what would the new throughput ceiling be?

## Efficiency Analysis
7. What percentage of compute cycles are doing useful work vs. overhead?
8. What is our cache hit rate? Could it be higher?
9. Are there redundant computations happening across nodes?
10. What data is being serialized/deserialized unnecessarily?

## Recommendation
For each finding, propose a specific optimization and estimate the improvement."
