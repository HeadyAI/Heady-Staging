const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) {
  throw new Error('Pass the repo root to audit.');
}

const patterns = {
  ericHead: /Eric Head/gi,
  localhost: /localhost|127\.0\.0\.1/gi,
  localStorage: /localStorage/gi,
  consoleLog: /console\.log/gi,
  todos: /TODO|FIXME|placeholder|implement later/gi
};

const findings = { filesScanned: 0, matches: {} };
for (const key of Object.keys(patterns)) findings.matches[key] = [];

function walk(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const resolved = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(resolved);
      continue;
    }
    if (!/\.(js|ts|tsx|jsx|json|md|yml|yaml|html|css)$/i.test(entry.name)) continue;
    findings.filesScanned += 1;
    const content = fs.readFileSync(resolved, 'utf8');
    for (const [label, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        findings.matches[label].push(resolved);
      }
    }
  }
}

walk(root);
process.stdout.write(JSON.stringify(findings, null, 2));
