# HOB Diagnostic Flow — Full System Assessment

> Run this prompt when you need Heady to perform a complete health assessment and produce actionable recommendations.

---

## STEP 1: IDENTIFY

"Heady, scan the entire HeadyMe ecosystem. For every repo, every service, every domain, every data store, and every infrastructure component, answer:
- Is it implemented? (code exists)
- Is it connected? (wired to other components)
- Is it tested? (automated tests exist and pass)
- Is it deployed? (running in the correct tier)
- Is it monitored? (health checks, metrics, alerting)
- Is it documented? (README, API docs, prompt docs)

Present the results as a matrix: rows = components, columns = the 6 dimensions above, values = ✅/⚠️/❌."

---

## STEP 2: CLASSIFY

"For every component that has at least one ❌ or ⚠️, classify the gap:
- **Critical**: System cannot function correctly without this
- **High**: System functions but with degraded capability
- **Medium**: System functions but with technical debt
- **Low**: Nice to have, not blocking

Group by classification and estimate effort (hours) to resolve."

---

## STEP 3: PLAN

"For each Critical and High gap, produce a task plan:
- What nodes are involved?
- What tier should the work run on?
- What are the dependencies?
- What is the acceptance criteria?
- What test proves it's fixed?

Output the plan as a DAG that HeadyConductor can execute."

---

## STEP 4: EXECUTE

"Execute the plan. Build everything. Wire everything. Test everything. Report back with:
- What was built (file list with line counts)
- What was connected (edges verified)
- What was tested (test results)
- What remains (if anything)"

---

## STEP 5: VERIFY

"Run HeadyValidator against the updated system. Report:
- All 6 gate results
- Overall verdict
- If FAIL: what specifically failed and what's needed to fix it"
