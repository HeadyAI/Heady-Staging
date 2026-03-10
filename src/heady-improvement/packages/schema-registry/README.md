# @heady/schema-registry

Central JSON Schema registry with Ajv validation for the Heady platform. Provides schema loading, payload validation with detailed errors, and TypeScript type stub generation.

## Installation

```bash
npm install @heady/schema-registry
```

## Usage

### Quick Validation

```js
const { validateBuiltin } = require('@heady/schema-registry');

const result = validateBuiltin('health-response', {
  status: 'healthy',
  service: 'user-api',
  version: '1.0.0',
  uptime: 123456,
  timestamp: '2026-03-10T12:00:00.000Z',
  checks: [
    { name: 'database', status: 'healthy', latency: 12 },
  ],
});

if (!result.valid) {
  for (const err of result.errors) {
    console.error(`${err.path}: ${err.message}`);
  }
}
```

### Registry + Validator

```js
const { SchemaRegistry, createValidator } = require('@heady/schema-registry');

const registry = new SchemaRegistry();
registry.loadBuiltinSchemas(); // loads all 5 built-in schemas

// Or load custom schemas
registry.loadFromFile('/path/to/custom-schema.json');
registry.loadFromDirectory('/path/to/schemas/');

const { validatePayload } = createValidator(registry);

const result = validatePayload('error-response', {
  code: 'HEADY-AUTH-401',
  message: 'Invalid token',
  timestamp: '2026-03-10T12:00:00.000Z',
});

console.log(result.valid); // true
```

### TypeScript Type Generation

```js
const registry = new SchemaRegistry();
registry.loadBuiltinSchemas();

// Single schema
const stub = registry.generateTypeStub('auth-session');
console.log(stub);
// export interface AuthSession {
//   /** Unique user identifier */
//   userId: string;
//   /** User email address */
//   email: string;
//   ...
// }

// All schemas
const allTypes = registry.generateAllTypeStubs();
```

### Schema Management

```js
const registry = new SchemaRegistry();

registry.list();           // ['health-response', 'error-response', ...]
registry.has('auth-session'); // true
registry.get('auth-session'); // { $schema: '...', ... }
registry.remove('auth-session');
```

## Built-in Schemas

| Schema | Description |
|---|---|
| `health-response` | Health check response (status, checks, thresholds) |
| `error-response` | Error response (HEADY-SERVICE-NNN codes) |
| `auth-session` | Auth session (userId, email, provider, roles) |
| `vector-query` | Vector similarity query (384-dim, namespace, topK) |
| `service-config` | Service configuration (name, port, phi constants) |

## API Reference

| Export | Description |
|---|---|
| `SchemaRegistry` | Class for loading and managing schemas |
| `createValidator(registry)` | Create an Ajv-backed validator |
| `validateBuiltin(schemaName, data)` | Validate against built-in schemas |
| `toPascalCase(str)` | Convert kebab-case to PascalCase |
| `jsonSchemaTypeToTS(def)` | Convert JSON Schema type to TS type |
