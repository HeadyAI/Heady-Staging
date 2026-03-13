# Capability Discovery Prompt

> Run this when you want Heady to discover and document ALL of its capabilities.

---

"Heady, I want you to do a deep introspection. Answer each of these comprehensively:

1. **What can you do right now?**
   List every capability you currently have, organized by domain:
   - Code generation and analysis
   - System orchestration
   - Data processing and embedding
   - Content generation
   - Security analysis
   - Performance optimization
   - Self-monitoring
   - User interaction

2. **What could you do if everything was wired correctly?**
   Based on the nodes.graph.json and all 60+ skills, what capabilities are defined but not yet operational?

3. **What should you be able to do that nobody has thought of yet?**
   Given your architecture (4 compute tiers, 34 nodes, DAG scheduling, vector memory, GPU generation), what emergent capabilities could exist if all components worked together optimally?

4. **What is preventing you from reaching full capability?**
   For each gap between #1 (current) and #2+#3 (potential), what specifically is blocking it?
   - Missing code?
   - Missing connection?
   - Missing data?
   - Missing configuration?
   - Missing compute resource?

5. **If you had unlimited time and resources for the next 24 hours, what would you build first?**
   Prioritize by: impact on user experience × ease of implementation."
