#!/usr/bin/env node
/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * Stale Reference Scanner
 * Finds lingering localhost, headyio.com, CascadeProjects, and competitor references.
 */
const { execSync } = require('child_process');

const PATTERNS = [
    { label: 'headyio.com (should be headyio.com)', pattern: 'heady\\.io', exclude: 'archive|node_modules|\\.git|CHANGELOG' },
    { label: 'CascadeProjects', pattern: 'CascadeProjects', exclude: 'archive|node_modules|\\.git' },
    { label: 'windsurf-next', pattern: 'windsurf-next', exclude: 'archive|node_modules|\\.git' },
    { label: 'localhost (review needed)', pattern: 'localhost', exclude: 'node_modules|\\.git|healthcheck|domain-connectivity|ecosystem\\.config|stale-scanner|package\\.json' },
    { label: 'Exposed tokens/secrets', pattern: 'sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}', exclude: 'node_modules|\\.git|archive' },
];

console.log('═══════════════════════════════════════════════');
console.log('  🔍 Stale Reference Scanner');
console.log('═══════════════════════════════════════════════\n');

let totalFindings = 0;

for (const p of PATTERNS) {
    try {
        const result = execSync(
            `grep -rn "${p.pattern}" /home/headyme/Heady/src/ /home/headyme/Heady/configs/ --include="*.js" --include="*.yaml" --include="*.yml" --include="*.json" --include="*.md" 2>/dev/null | grep -vE "${p.exclude}" | head -20`,
            { encoding: 'utf8', timeout: 10000 }
        ).trim();

        if (result) {
            const count = result.split('\n').length;
            totalFindings += count;
            console.log(`⚠️  ${p.label}: ${count} occurrences`);
            result.split('\n').slice(0, 5).forEach(line => console.log(`    ${line}`));
            if (count > 5) console.log(`    ... and ${count - 5} more`);
            console.log('');
        } else {
            console.log(`✅ ${p.label}: clean`);
        }
    } catch {
        console.log(`✅ ${p.label}: clean`);
    }
}

console.log(`\n📊 Total findings: ${totalFindings}`);
console.log('═══════════════════════════════════════════════');
