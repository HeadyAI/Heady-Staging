# Heady Audit Full Pack

This package consolidates a broad Heady audit using:
- Attached Heady context bundles extracted from the workspace
- A public clone of the HeadyMe pre-production repository
- Local Heady and Perplexity skill definitions available in the workspace

## Contents

### reports/
Generated audit reports covering:
- remote repository overview, governance, and capabilities
- extracted bundle service, domain, and governance inventories
- local skill inventory and application mapping

### source_snapshots/
Key source-of-truth files copied from the extracted bundles:
- SYSTEM_PRIME_DIRECTIVE
- UNBREAKABLE_LAWS
- MASTER_DIRECTIVES
- heady-registry.json
- SERVICE_INDEX.json
- full rebuild prompt

### repo_basis/
Reference basis used for the audit:
- local_skills/: local skill SKILL.md files copied from the workspace
- remote_repo_selected/: selected public remote repo files, governance files, workflows, and skills

### manifests/
Machine-readable package metadata and lightweight remote repo stats.

## Notes

- The public remote repository basis used for comparison is: https://github.com/HeadyMe/Heady-pre-production-9f2f0642
- The extracted bundles preserved their differing architectural views, so mismatch analysis is documented in the reports rather than normalized away.
- This package is designed as a compact but comprehensive audit bundle, not a full mirror of every source repository file.
