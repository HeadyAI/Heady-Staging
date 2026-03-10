# Contributing to Heady

## How to Contribute

### Bugs
Open an issue using the bug report template. Include: steps to reproduce, expected/actual behavior, logs.

### Features
Open a feature request. Describe the use case and which agent(s) are affected.

### Code
1. Fork → branch: `git checkout -b feature/my-feature`
2. Code (follow ESLint + Prettier configs)
3. Test: `npm test`
4. Commit: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
5. PR against `main`

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready |
| `develop` | Integration |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `hotfix/*` | Urgent production fixes |

## Code Style
- ESLint config: `.eslintrc.json`
- Prettier config: `.prettierrc`
- Naming: camelCase (vars/fns), PascalCase (classes), kebab-case (files)

## ADRs
For significant changes, create an ADR in `docs/ADR/` using the template.
