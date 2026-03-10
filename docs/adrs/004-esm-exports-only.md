# ADR-004: ESM Exports Only — No CommonJS

## Status
Accepted

## Context
Mixed module systems (CJS + ESM) cause import resolution issues and prevent tree-shaking. Node.js has full ESM support.

## Decision
- All modules use `export default` and named `export {}`
- No `module.exports` or `require()` anywhere
- package.json includes `"type": "module"`
- Dynamic imports via `import()` where needed

## Consequences
- Consistent module resolution
- Tree-shaking enabled
- Top-level await supported
- All imports are statically analyzable
