# Heady Canonical Phi-Math Integration Brief

Target repo: https://github.com/HeadyMe/Heady-pre-production

New source of truth:
The user provided a canonical Heady Phi-Math Foundation reference implementation. Treat that implementation as the desired source-of-truth for constants, thresholds, Fibonacci sizing, fusion weights, backoff/timing helpers, CSL gates, cosine similarity, and exports.

Primary objective:
Audit the repo for incompatible, missing, stale, or inconsistent phi-math usage and make a focused implementation pass to align the codebase with the canonical reference where feasible in one pass.

Specific priorities:
1. Find the actual shared phi-math module(s) in the repo and compare them to the canonical reference.
2. Fix export mismatches that are currently causing broken imports or ad hoc local shims.
3. Replace the most harmful incompatible assumptions in orchestration/liquid modules with canonical names and helpers.
4. Reduce duplication or divergence around phi constants if feasible.
5. Add or update tests that validate canonical phi-math behavior and key consumers.
6. Do not overclaim full repo-wide normalization if only a subset is feasible in one pass.

Important context:
- Previous phases already fixed some broken imports by adding local derivations or replacements.
- This pass should improve the real source-of-truth rather than only patch consumers.
- If the canonical implementation conflicts with existing repo patterns, prefer honest compatibility and minimal breakage.

Required deliverables:
1. Implement the top 3-6 highest-impact phi-math integration fixes feasible in one pass.
2. Save full report to /home/user/workspace/heady_phi_math_report.md
3. Save implementation notes to /home/user/workspace/heady_phi_math_changes.md
4. Return under 1000 words with:
   - PR status
   - what changed
   - files changed
   - validation results
   - remaining risks