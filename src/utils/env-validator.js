'use strict';

const fs = require('fs');

const REQUIRED = [
  { key: 'PORT', validate: v => !isNaN(v) && v > 0 && v < 65536 },
  { key: 'NODE_ENV', validate: v => ['development', 'staging', 'production'].includes(v) },
  { key: 'JWT_SECRET', validate: v => v.length >= 32 },
  { key: 'EMBEDDINGS_PROVIDER', validate: v => ['ollama', 'openai', 'vertex'].includes(v) },
  { key: 'MEMORY_STORE_PATH', validate: v => v.length > 0 },
  { key: 'MCP_BEARER_TOKEN', validate: v => v.length >= 32 },
];

function validateEnv() {
  let valid = true;
  for (const { key, validate } of REQUIRED) {
    const val = process.env[key];
    if (!val || !validate(val)) {
      console.error(`❌ ENV: ${key} is missing or invalid`);
      valid = false;
    }
  }

  const dirs = ['data/memory', 'data/logs', 'data/checkpoints'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return valid;
}

module.exports = { validateEnv };
