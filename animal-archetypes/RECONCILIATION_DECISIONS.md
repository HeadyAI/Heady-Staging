# Reconciliation Decisions

## Canonical decisions

- Operational pipeline count is 21 stages because both `hcfullpipeline.yaml` and `hcfullpipeline.json` define the pipeline that way.
- Current enforced bee capacity is 6765 for runtime guards because it is Fibonacci-aligned in `heady-cognitive-config.json`.
- Strategic ceiling can still be described as 10000 in roadmap language, but runtime configs should not enforce 10000 until the rest of the platform is capacity-tested.
- Auto-Success timing remains phi-derived with a 29034ms base cycle.
- Cross-environment purity is enforced by `domain-router`, `validate-no-localhost.mjs`, and environment-only URLs.
