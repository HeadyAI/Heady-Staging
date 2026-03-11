# Heady Phase 4 Implementation Brief

Target repo: https://github.com/HeadyMe/Heady-pre-production

Context:
- Phase 1 through Phase 3 plus a canonical phi-math integration pass were already completed.
- The user has reiterated the MAXIMUM POTENTIAL builder directive and wants continued concrete repo improvement, not principle restatement.
- This pass should focus on the highest-value remaining gaps that can realistically be improved in one pass.

Priority targets for this pass:
1. Continue canonical phi-math normalization in secondary variants if feasible (`shared/phi-math-v2.js`, package variant, or high-risk consumers).
2. Improve documentation discoverability with a clear index / navigation for setup, architecture, deployment, and operational docs.
3. Add a higher-value integration or smoke path covering end-to-end request flow if feasible.
4. Reduce remaining misleading orchestration or liquid-node behavior if a clear high-impact fix is available.
5. Keep production readiness improving: no fake success, no fake health, no insecure defaults.

Strong preferences:
- Favor source-of-truth fixes over local shims.
- Favor real verification over static edits.
- Prefer 3-6 meaningful fixes with proof over broad unverified edits.
- Do not overclaim complete system perfection.

Required deliverables from coding agent:
1. Implement the next 3-6 highest-impact realistic fixes.
2. Save full report to /home/user/workspace/heady_phase4_report.md
3. Save implementation notes to /home/user/workspace/heady_phase4_changes.md
4. Return under 1000 words with:
   - PR status
   - what changed
   - files changed
   - validation results
   - remaining risks