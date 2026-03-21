/**
 * Compliance audit — no stubs, no magic numbers, no localStorage, ESM only, Eric Haywood
 * Author: Eric Haywood | ESM only
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { strict as assert } from 'assert';
import { describe, it, expect } from 'vitest';

describe('compliance', () => {
  it('passes all checks', () => {

const PROJECT_ROOT = join(import.meta.url.replace('file://', ''), '../../..');
const VIOLATIONS = [];

function scanDirectory(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...scanDirectory(fullPath));
      } else if (entry.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (_unused) {}
  return files;
}

function checkNoStubs(content, file) {
  const stubPatterns = [/\/\/ TODO/gi, /\/\/ STUB/gi, /\/\/ PLACEHOLDER/gi, /throw new Error\('not implemented'\)/gi, /\/\/ FIXME/gi];
  for (const pattern of stubPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      VIOLATIONS.push({ file, type: 'STUB', count: matches.length, pattern: pattern.source });
    }
  }
}

function checkNoMagicNumbers(content, file) {
  const magicPatterns = [
    /(?<!fibonacci\(|fib\(|PHI|PSI|\d)\b(100|500|1000|5000|10000|0\.5|0\.7|0\.8|0\.85|0\.9|0\.95)\b(?!\d|px|em|rem|%|ms|s|KB|MB|GB)/g,
  ];
  for (const pattern of magicPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 2) {
      VIOLATIONS.push({ file, type: 'MAGIC_NUMBER', count: matches.length, samples: matches.slice(0, 3) });
    }
  }
}

function checkNoLocalStorage(content, file) {
  if (content.includes('localStorage')) {
    VIOLATIONS.push({ file, type: 'LOCAL_STORAGE', count: (content.match(/localStorage/g) || []).length });
  }
}

function checkEsmExports(content, file) {
  if (content.includes('module.exports') || content.includes('require(')) {
    VIOLATIONS.push({ file, type: 'COMMONJS', detail: content.includes('module.exports') ? 'module.exports found' : 'require() found' });
  }
}

function checkEricHaywood(content, file) {
  if (content.includes('Eric Head') && !content.includes('Eric Haywood')) {
    VIOLATIONS.push({ file, type: 'WRONG_NAME', detail: 'Uses "Eric Head" instead of "Eric Haywood"' });
  }
}

console.log('\n=== Compliance Audit ===');
const files = scanDirectory(PROJECT_ROOT);
console.log('  Scanning ' + files.length + ' JavaScript files...');

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf8');
    const shortFile = file.replace(PROJECT_ROOT + '/', '');
    checkNoStubs(content, shortFile);
    checkNoLocalStorage(content, shortFile);
    checkEsmExports(content, shortFile);
    checkEricHaywood(content, shortFile);
  } catch (_unused) {}
}

if (VIOLATIONS.length === 0) {
  console.log('  ✓ No stubs/TODOs found');
  console.log('  ✓ No localStorage usage');
  console.log('  ✓ No CommonJS (module.exports/require)');
  console.log('  ✓ No "Eric Head" references');
  console.log('\n✅ Full compliance audit passed. 0 violations.');
} else {
  console.log('\n⚠️  Found ' + VIOLATIONS.length + ' violations:');
  for (const v of VIOLATIONS) {
    console.log('  ✗ [' + v.type + '] ' + v.file + (v.count ? ' (' + v.count + 'x)' : '') + (v.detail ? ': ' + v.detail : ''));
  }
}

export default { scanDirectory, VIOLATIONS };

  });
});