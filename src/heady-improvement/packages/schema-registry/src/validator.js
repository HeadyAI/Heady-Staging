'use strict';

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { SchemaRegistry } = require('./registry');

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid — whether the payload is valid
 * @property {object[] | null} errors — array of detailed error objects, or null if valid
 */

/**
 * Create a validator backed by a SchemaRegistry instance and Ajv.
 *
 * @param {SchemaRegistry} registry
 * @returns {{ validatePayload: (schemaName: string, data: any) => ValidationResult, ajv: Ajv }}
 */
function createValidator(registry) {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
  });
  addFormats(ajv);

  /** @type {Map<string, import('ajv').ValidateFunction>} */
  const compiledCache = new Map();

  /**
   * Get or compile the Ajv validate function for a schema.
   *
   * @param {string} schemaName
   * @returns {import('ajv').ValidateFunction}
   */
  function getValidateFn(schemaName) {
    if (compiledCache.has(schemaName)) {
      return compiledCache.get(schemaName);
    }
    const schema = registry.get(schemaName);
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found in registry. Available: ${registry.list().join(', ')}`);
    }
    const fn = ajv.compile(schema);
    compiledCache.set(schemaName, fn);
    return fn;
  }

  /**
   * Validate a data payload against a named schema.
   *
   * @param {string} schemaName — name of the schema in the registry
   * @param {any} data — payload to validate
   * @returns {ValidationResult}
   */
  function validatePayload(schemaName, data) {
    const validate = getValidateFn(schemaName);
    const valid = validate(data);

    if (valid) {
      return { valid: true, errors: null };
    }

    const errors = (validate.errors || []).map((err) => ({
      path: err.instancePath || '/',
      keyword: err.keyword,
      message: err.message || 'Validation failed',
      params: err.params || {},
      schemaPath: err.schemaPath,
      data: err.data,
    }));

    return { valid: false, errors };
  }

  /**
   * Clear the compiled schema cache (useful after schemas are updated).
   */
  function clearCache() {
    compiledCache.clear();
  }

  return {
    validatePayload,
    clearCache,
    ajv,
  };
}

/**
 * Convenience function: create a registry with built-in schemas, then validate.
 *
 * @param {string} schemaName
 * @param {any} data
 * @returns {ValidationResult}
 */
function validateBuiltin(schemaName, data) {
  const registry = new SchemaRegistry();
  registry.loadBuiltinSchemas();
  const { validatePayload } = createValidator(registry);
  return validatePayload(schemaName, data);
}

module.exports = {
  createValidator,
  validateBuiltin,
};
