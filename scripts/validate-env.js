#!/usr/bin/env node
'use strict';
require('dotenv').config();
const fs = require('fs');

const REQUIRED = [
  { key: 'PORT', ok: v => !isNaN(v) && v > 0, hint: 'Valid port (e.g. 3301)' },
  { key: 'NODE_ENV', ok: v => ['development','staging','production'].includes(v), hint: 'development|staging|production' },
  { key: 'JWT_SECRET', ok: v => v.length >= 32, hint: '≥32 chars. openssl rand -hex 32' },
  { key: 'EMBEDDINGS_PROVIDER', ok: v => ['ollama','openai','vertex'].includes(v), hint: 'ollama|openai|vertex' },
  { key: 'MEMORY_STORE_PATH', ok: v => v.length > 0, hint: 'e.g. ./data/memory' },
  { key: 'MCP_BEARER_TOKEN', ok: v => v.length >= 32, hint: '≥32 chars. openssl rand -hex 32' },
];

console.log('\n🧠 Heady Environment Validator\n' + '─'.repeat(50));
let errors = 0;

console.log('\n📋 Required:\n');
for (const { key, ok, hint } of REQUIRED) {
  const v = process.env[key] || '';
  if (!v || !ok(v)) { console.log(`  ❌ ${key} — ${v ? 'INVALID' : 'MISSING'} (${hint})`); errors++; }
  else console.log(`  ✅ ${key}`);
}

console.log('\n📁 Directories:\n');
for (const d of ['data/memory','data/logs','data/checkpoints']) {
  if (fs.existsSync(d)) console.log(`  ✅ ${d}/`);
  else { console.log(`  ⚠️  ${d}/ missing`); }
}

console.log('\n' + '─'.repeat(50));
if (errors === 0) { console.log('\n✅ All required variables valid!\n'); process.exit(0); }
else { console.log(`\n❌ ${errors} error(s). Fix before starting.\n`); process.exit(1); }
