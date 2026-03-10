'use strict';

const { readFileSync, readdirSync } = require('node:fs');
const { join, basename } = require('node:path');

const SCHEMAS_DIR = join(__dirname, '..', 'schemas');

/**
 * Central schema registry that loads, stores, and retrieves JSON Schema definitions.
 */
class SchemaRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this._schemas = new Map();
  }

  /**
   * Load a single schema from a JSON object.
   *
   * @param {string} name — schema name (e.g., 'health-response')
   * @param {object} schema — valid JSON Schema object
   */
  register(name, schema) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('Schema name must be a non-empty string');
    }
    if (!schema || typeof schema !== 'object') {
      throw new TypeError('Schema must be a valid object');
    }
    this._schemas.set(name, schema);
  }

  /**
   * Load a schema from a JSON file.
   *
   * @param {string} filePath — absolute or relative path to a JSON Schema file
   * @param {string} [name] — optional name override (defaults to filename without extension)
   */
  loadFromFile(filePath, name) {
    const raw = readFileSync(filePath, 'utf8');
    const schema = JSON.parse(raw);
    const schemaName = name || basename(filePath, '.json');
    this.register(schemaName, schema);
  }

  /**
   * Load all .json schema files from the built-in schemas directory.
   */
  loadBuiltinSchemas() {
    const files = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      this.loadFromFile(join(SCHEMAS_DIR, file));
    }
  }

  /**
   * Load all .json schema files from a custom directory.
   *
   * @param {string} dirPath — directory containing JSON Schema files
   */
  loadFromDirectory(dirPath) {
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      this.loadFromFile(join(dirPath, file));
    }
  }

  /**
   * Get a schema by name.
   *
   * @param {string} name
   * @returns {object|undefined}
   */
  get(name) {
    return this._schemas.get(name);
  }

  /**
   * Check if a schema exists.
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._schemas.has(name);
  }

  /**
   * List all registered schema names.
   *
   * @returns {string[]}
   */
  list() {
    return Array.from(this._schemas.keys());
  }

  /**
   * Remove a schema by name.
   *
   * @param {string} name
   * @returns {boolean}
   */
  remove(name) {
    return this._schemas.delete(name);
  }

  /**
   * Generate a TypeScript type stub from a JSON Schema.
   * Produces a basic interface definition with property types.
   *
   * @param {string} name — schema name
   * @returns {string} TypeScript interface declaration
   */
  generateTypeStub(name) {
    const schema = this._schemas.get(name);
    if (!schema) {
      throw new Error(`Schema '${name}' not found in registry`);
    }

    const interfaceName = toPascalCase(name);
    const required = new Set(schema.required || []);
    const lines = [`export interface ${interfaceName} {`];

    if (schema.properties) {
      for (const [prop, def] of Object.entries(schema.properties)) {
        const optional = required.has(prop) ? '' : '?';
        const tsType = jsonSchemaTypeToTS(def);
        const desc = def.description ? `  /** ${def.description} */\n` : '';
        lines.push(`${desc}  ${prop}${optional}: ${tsType};`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate TypeScript stubs for all registered schemas.
   *
   * @returns {string} concatenated TypeScript declarations
   */
  generateAllTypeStubs() {
    const stubs = [];
    for (const name of this._schemas.keys()) {
      stubs.push(this.generateTypeStub(name));
    }
    return stubs.join('\n\n');
  }
}

/**
 * Convert a kebab-case name to PascalCase.
 *
 * @param {string} str
 * @returns {string}
 */
function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Map a JSON Schema type definition to a TypeScript type string.
 *
 * @param {object} def — JSON Schema property definition
 * @returns {string}
 */
function jsonSchemaTypeToTS(def) {
  if (def.enum) {
    return def.enum.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ');
  }

  if (def.const !== undefined) {
    return typeof def.const === 'string' ? `'${def.const}'` : String(def.const);
  }

  switch (def.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      if (def.items) {
        return `${jsonSchemaTypeToTS(def.items)}[]`;
      }
      return 'unknown[]';
    case 'object':
      if (def.properties) {
        const props = Object.entries(def.properties)
          .map(([k, v]) => `${k}: ${jsonSchemaTypeToTS(v)}`)
          .join('; ');
        return `{ ${props} }`;
      }
      if (def.additionalProperties === true) {
        return 'Record<string, unknown>';
      }
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

module.exports = {
  SchemaRegistry,
  toPascalCase,
  jsonSchemaTypeToTS,
};
