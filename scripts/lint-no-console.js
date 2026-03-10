const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = ['services', 'shared', 'scripts', 'tests', 'packages'];
const violations = [];
const exemptFiles = new Set(['scripts/lint-no-console.js']);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(target);
      continue;
    }
    if (!target.endsWith('.js')) {
      continue;
    }
    const relative = path.relative(root, target);
    if (exemptFiles.has(relative)) {
      continue;
    }
    const content = fs.readFileSync(target, 'utf8');
    if (/console\.(log|debug|info)\s*\(/.test(content)) {
      violations.push(relative);
    }
  }
}

for (const target of targets) {
  const dir = path.join(root, target);
  if (fs.existsSync(dir)) {
    walk(dir);
  }
}

if (violations.length) {
  process.stderr.write(JSON.stringify({ ok: false, violations }, null, 2) + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write(JSON.stringify({ ok: true, checked: targets }, null, 2) + '\n');
}
