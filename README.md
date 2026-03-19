# 🧪 Heady Testing — Full Stack Test Repository

> **Testing infrastructure for the [Heady™ Ecosystem](https://headysystems.com)**

Comprehensive testing repository for the Heady AI platform — unit tests, integration tests, end-to-end tests, load tests, and chaos engineering experiments.

## Test Categories

- **Unit Tests**: Component-level testing with Jest
- **Integration Tests**: Cross-service API testing
- **E2E Tests**: Full pipeline validation (HCFullPipeline)
- **Load Tests**: Phi-ramped load curves (8→13→21→34→55→89 RPS)
- **Chaos Tests**: Fault injection via HeadyDisasterForge

## CSL Quality Gates

| Gate | Threshold | Purpose |
|------|-----------|---------|
| MINIMUM | 0.500 | Basic functionality |
| MEDIUM | 0.809 | Production acceptable |
| HIGH | 0.882 | Production recommended |
| CRITICAL | 0.927 | Enterprise required |

## License

© 2026 HeadySystems Inc. All rights reserved.
