/* © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL. */
// STUB — awaiting full implementation

'use strict';

const path = require('path');
const fs = require('fs');

function getRegistryPath(name) {
  const configsDir = path.join(__dirname, '../../configs');
  return {
    json: path.join(configsDir, `${name}.json`),
    yaml: path.join(configsDir, `${name}.yaml`),
    yml: path.join(configsDir, `${name}.yml`)
  };
}

function loadRegistry(name) {
  const paths = getRegistryPath(name);

  // Try JSON first
  if (fs.existsSync(paths.json)) {
    try {
      const content = fs.readFileSync(paths.json, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      return {
        ok: false,
        reason: 'parse-error',
        error: err.message
      };
    }
  }

  // Try YAML files
  for (const yamlPath of [paths.yaml, paths.yml]) {
    if (fs.existsSync(yamlPath)) {
      return {
        ok: false,
        reason: 'yaml-not-implemented',
        path: yamlPath
      };
    }
  }

  return {
    ok: false,
    reason: 'not-found',
    searched: paths
  };
}

module.exports = { loadRegistry, getRegistryPath };
