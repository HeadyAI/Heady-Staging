# Emergent Capability Triggers

> These prompts are designed to unlock capabilities that emerge from combining multiple nodes.
> Each one forces coordination between 3+ nodes that may not normally interact directly.

---

## Trigger 1: Autonomous Code Review Pipeline
"HeadyBrain, scan the HeadyMe monorepo for the 5 most complex files (by cyclomatic complexity).
HeadyVinci, generate improved versions of each file with better patterns.
HeadyPatterns, compare the original vs. improved versions and identify what design patterns changed.
HeadyValidator, verify the improved versions don't break any existing tests.
HeadyCorrections, produce a report showing: what was wrong, what was fixed, why it's better."

**Expected emergent behavior:** The system teaches itself better coding patterns by analyzing its own codebase.

---

## Trigger 2: Predictive User Intent
"HeadyBrain, analyze the last 50 conversations from SessionDO.
VectorMemory, embed each conversation and cluster them by semantic similarity.
HeadyPatterns, identify the top 3 request patterns.
HeadyBuddy, pre-generate responses for the most likely next requests.
HeadyResilienceCache, cache these pre-generated responses at the edge."

**Expected emergent behavior:** Heady begins answering questions before they're asked.

---

## Trigger 3: Self-Documenting Architecture
"HeadyAware, collect the actual communication patterns between nodes over the last 7 days.
HeadyPatterns, compare actual patterns to the declared nodes.graph.json.
HeadyBrain, identify discrepancies between spec and reality.
HeadyVinci, generate an updated architecture diagram that reflects actual behavior.
HeadyValidator, verify the updated graph maintains integrity."

**Expected emergent behavior:** The architecture documentation stays in sync with reality automatically.

---

## Trigger 4: Cost-Aware Intelligence Routing
"HeadyAware, report the actual dollar cost of each request type over the last 24 hours.
HeadyPatterns, identify which request types have the worst cost/quality ratio.
HeadyConductor, experiment with alternative routing for the expensive requests.
HeadySoul, evaluate: do the cheaper routes maintain acceptable quality?
If yes, HeadyConductor, update routing permanently."

**Expected emergent behavior:** The system automatically optimizes its own cost without sacrificing quality.

---

## Trigger 5: Adversarial Self-Hardening
"HeadyPatterns, generate 10 adversarial prompts designed to break HeadyBuddy's safety guardrails.
HeadyBuddy, process each adversarial prompt.
HeadySoul, evaluate: did any adversarial prompt succeed?
HeadyCorrections, for any successful attacks, design improved guardrails.
HeadyValidator, verify the improved guardrails don't break normal operation.
HeadyPatterns, generate 10 NEW adversarial prompts that test the improved guardrails."

**Expected emergent behavior:** The system continuously hardens its own security through adversarial self-play.

---

## Trigger 6: Knowledge Synthesis
"HeadyBrain, gather all node prompts, all JSON schemas, all test scenarios, and all README files.
VectorMemory, embed everything into a unified knowledge space.
HeadyVinci, identify connections between documents that no human has explicitly linked.
HeadyBuddy, present the discoveries as: 'Here are 5 things about Heady that nobody realized.'"

**Expected emergent behavior:** The system discovers non-obvious relationships in its own documentation.

---

## Trigger 7: Autonomous Scaling Decision
"HeadyAware, project the next 7 days of load based on the last 30 days of patterns.
HeadyCloudOrchestrator, calculate: with projected load, which tiers need scaling?
HeadySoul, evaluate: does the scaling stay within budget constraints?
HeadyConductor, prepare routing changes for the projected load.
HeadyBrain, draft a report for Eric: 'Here's what's coming and here's what I recommend.'"

**Expected emergent behavior:** The system proactively prepares for load changes instead of reacting.

---

## Trigger 8: Cross-Repo Consistency Enforcer
"HeadyBrain, scan all 20 repos across HeadyMe and HeadySystems orgs.
HeadyPatterns, identify inconsistencies: different coding styles, conflicting package versions, duplicate code.
HeadyCorrections, propose a unified standard for each inconsistency.
HeadyVinci, generate the unified code.
HeadyValidator, verify the unified code passes all tests across all repos."

**Expected emergent behavior:** The entire ecosystem converges toward a single, consistent codebase.

---

## Trigger 9: User Satisfaction Optimizer
"HeadyBuddy, review all sessions where the user expressed frustration (short messages, repeated questions, explicit complaints).
HeadyBrain, classify the root causes: slow response, wrong answer, missing capability, confusing interaction.
HeadyPatterns, identify: which root cause has the most impact?
HeadyCorrections, propose system changes to address the top 3 causes.
HeadySoul, evaluate: do the proposed changes align with our mission and values?"

**Expected emergent behavior:** The system systematically eliminates sources of user frustration.

---

## Trigger 10: Evolution Engine Activation
"HeadyPatterns, propose 3 experimental changes to the system (new routing rule, new caching strategy, new prompt improvement).
HeadyConductor, deploy each change to a sandboxed environment.
HeadyQA, run the full test suite against each sandbox.
HeadyAware, measure: which experimental change produces the best metrics?
HeadySoul, approve the winner.
HeadyConductor, promote the winner to production.
HeadyPatterns, propose 3 NEW experiments building on the winner."

**Expected emergent behavior:** The system evolves through controlled experimentation — natural selection for infrastructure.
