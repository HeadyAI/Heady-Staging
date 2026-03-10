#!/usr/bin/env node
/**
 * CJS→ESM converter for Heady codebase.
 * Handles the common patterns found in src/ files.
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  'heady-manager.js',
  'src/utils/logger.js',
  'src/utils/env-validator.js',
  'src/utils/metrics.js',
  'src/gateway/health.js',
  'src/gateway/ai-gateway.js',
  'src/gateway/error-handler.js',
  'src/gateway/dashboard-router.js',
  'src/gateway/rate-limiter.js',
  'src/gateway/auth.js',
  'src/mcp/mcp-server.js',
  'src/mcp/tool-registry.js',
  'src/agents/agent-router.js',
  'src/agents/agent-manager.js',
  'src/memory/memory-router.js',
  'src/memory/memory-store.js',
  'src/services/auto-success.js',
  'src/routes/auth-routes.js',
];

const ROOT = path.resolve(__dirname, '..');

for (const file of FILES) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }

  let code = fs.readFileSync(fullPath, 'utf8');
  const original = code;
  const imports = [];
  let needsCreateRequire = false;
  let needsDirname = false;

  // Remove 'use strict'; (ESM is strict by default)
  code = code.replace(/^'use strict';\n\n?/m, '');

  // Convert: const X = require('Y');
  // BUT skip try{} blocks and inline requires
  code = code.replace(/^(const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?\s*$/gm, (match, decl, name, mod) => {
    return `import ${name} from '${mod}';`;
  });

  // Convert: const { X, Y } = require('Z');
  code = code.replace(/^(const|let|var)\s+(\{[^}]+\})\s*=\s*require\(['"]([^'"]+)['"]\);?\s*$/gm, (match, decl, destructure, mod) => {
    // Fix uuid special case: { v4: uuidv4 } → { v4 as uuidv4 }
    let clean = destructure.replace(/(\w+)\s*:\s*(\w+)/g, '$1 as $2');
    return `import ${clean} from '${mod}';`;
  });

  // Convert: module.exports = { X, Y };
  code = code.replace(/^module\.exports\s*=\s*(\{[^}]+\});?\s*$/gm, (match, obj) => {
    return `export ${obj.replace(/;$/, '')};`;
  });

  // Convert: module.exports = X;
  code = code.replace(/^module\.exports\s*=\s*(\w+);?\s*$/gm, (match, name) => {
    return `export default ${name};`;
  });

  // Handle try { X = require('Y') } catch patterns - leave inline requires
  // These need createRequire
  const inlineRequires = code.match(/require\(['"][^'"]+['"]\)/g);
  if (inlineRequires) {
    // Check if there are still require() calls that weren't converted
    const remainingRequires = code.match(/(?<!import .* from .*)require\(['"][^'"]+['"]\)/g);
    if (remainingRequires && remainingRequires.length > 0) {
      needsCreateRequire = true;
    }
  }

  // Handle __dirname usage
  if (code.includes('__dirname') || code.includes('__filename')) {
    needsDirname = true;
  }

  // Add createRequire import if needed
  if (needsCreateRequire) {
    // Add createRequire at top, and define require
    const createRequireLine = `import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\n`;
    // Insert after last import statement or at top
    const lastImportIdx = code.lastIndexOf('\nimport ');
    if (lastImportIdx !== -1) {
      const endOfLine = code.indexOf('\n', lastImportIdx + 1);
      code = code.slice(0, endOfLine + 1) + createRequireLine + code.slice(endOfLine + 1);
    } else {
      code = createRequireLine + code;
    }
  }

  // Add __dirname polyfill if needed
  if (needsDirname) {
    const dirnamePoly = `import { fileURLToPath } from 'node:url';\nimport { dirname } from 'node:path';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n`;
    // Insert after imports
    const lastImportIdx = code.lastIndexOf('\nimport ');
    if (lastImportIdx !== -1) {
      const endOfLine = code.indexOf('\n', lastImportIdx + 1);
      code = code.slice(0, endOfLine + 1) + dirnamePoly + code.slice(endOfLine + 1);
    } else {
      code = dirnamePoly + code;
    }
  }

  if (code !== original) {
    fs.writeFileSync(fullPath, code);
    console.log(`CONVERTED: ${file}`);
  } else {
    console.log(`UNCHANGED: ${file}`);
  }
}

console.log('\nDone. Run: node heady-manager.js to test.');
