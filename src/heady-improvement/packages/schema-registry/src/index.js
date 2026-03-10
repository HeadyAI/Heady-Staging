'use strict';

const { SchemaRegistry, toPascalCase, jsonSchemaTypeToTS } = require('./registry');
const { createValidator, validateBuiltin } = require('./validator');

module.exports = {
  SchemaRegistry,
  createValidator,
  validateBuiltin,
  toPascalCase,
  jsonSchemaTypeToTS,
};
