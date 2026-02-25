const fs = require('fs');
const path = require('path');

const STALE_TERMS = ['HeadyStack', 'Parrot', 'Windsurf', 'Claude', 'OpenAI', 'Gemini', 'headysystems.local'];
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const DOCS_ARCHIVE = path.join(DOCS_DIR, 'archive');
const SCRIPTS_ARCHIVE = path.join(SCRIPTS_DIR, 'archive');

if (!fs.existsSync(DOCS_ARCHIVE)) fs.mkdirSync(DOCS_ARCHIVE, { recursive: true });
if (!fs.existsSync(SCRIPTS_ARCHIVE)) fs.mkdirSync(SCRIPTS_ARCHIVE, { recursive: true });

const DOC_STUB = (name) => `<!--
  © 2026 Heady Systems LLC.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
# ${name} (Superseded)

> **Notice:** As of the Q1 2026 Architecture Upgrade, the contents of this document have been deprecated, merged, and superseded by the core platform documentation.

The Heady AI platform has evolved from a decentralized local mesh to a federated liquid routing architecture (HeadyConductor).

## Canonical Documentation
Please refer to the following updated resources:

1. **[Quick Start Guide](../QUICKSTART.md)** — For initial setup and architecture overview.
2. **[Architecture Blueprints](../architecture/04_TARGET_STATE_BLUEPRINTS.md)** — For DuckDB V2, PQC Security, and Conductor topology.
3. **[API Reference](../API.md)** — For programmatic interaction with HeadyBrain.
4. **[CPO Executive Brief](../cpo/01_EXEC_BRIEF.md)** — For business strategy and product roadmaps.

*Original contents have been preserved in the secure \`archive/\` directory for historical reference.*
`;

const SCRIPT_STUB_BASH = `#!/bin/bash
# © 2026 Heady Systems LLC. PROPRIETARY AND CONFIDENTIAL.
echo "❌ ERROR: This deployment script has been deprecated in the 2026 HeadyConductor architecture upgrade."
echo "Please refer to docs/deployment/QUICK-DEPLOYMENT-COMMANDS.md for current deployment processes."
exit 1
`;

const SCRIPT_STUB_JS = `// © 2026 Heady Systems LLC. PROPRIETARY AND CONFIDENTIAL.
console.error("❌ ERROR: This script has been deprecated in the 2026 HeadyConductor architecture upgrade.");
console.error("Please refer to docs/deployment/QUICK-DEPLOYMENT-COMMANDS.md for current deployment processes.");
process.exit(1);
`;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    let staleFiles = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file !== 'archive' && file !== 'node_modules' && file !== '.git') {
                staleFiles = staleFiles.concat(scanDirectory(fullPath));
            }
        } else {
            if (fullPath.endsWith('.md') || fullPath.endsWith('.sh') || fullPath.endsWith('.js')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const isStale = STALE_TERMS.some(term => content.includes(term));
                if (isStale) {
                    staleFiles.push(fullPath);
                }
            }
        }
    }
    return staleFiles;
}

function run() {
    console.log("🔍 Scanning for stale docs and scripts...");
    const staleDocs = scanDirectory(DOCS_DIR);
    const staleScripts = scanDirectory(SCRIPTS_DIR);

    const allStale = [...staleDocs, ...staleScripts];
    console.log(`Found ${allStale.length} stale files. Procedings with Archive & Replace...`);

    for (const filePath of allStale) {
        const fileName = path.basename(filePath);
        const isDoc = filePath.includes('/docs/');

        // Create correct archive path maintaining subdirectory structure if needed, or flat is fine
        // We'll flatten into the respective archive folder to keep it simple
        const archiveTarget = isDoc ? DOCS_ARCHIVE : SCRIPTS_ARCHIVE;
        const archivePath = path.join(archiveTarget, `stale_2026_${fileName}`);

        console.log(`\n⏳ Processing: ${filePath}`);
        try {
            // 1. Move to archive
            fs.copyFileSync(filePath, archivePath);
            console.log(`  └─ Archived to: ${archivePath}`);

            // 2. Write stub
            let stubContent = '';
            if (fileName.endsWith('.md')) stubContent = DOC_STUB(fileName.replace('.md', ''));
            else if (fileName.endsWith('.sh')) stubContent = SCRIPT_STUB_BASH;
            else if (fileName.endsWith('.js')) stubContent = SCRIPT_STUB_JS;

            fs.writeFileSync(filePath, stubContent);
            console.log(`  └─ ✅ Successfully replaced with deprecated stub.`);
        } catch (err) {
            console.error(`  └─ ❌ Failed to process ${fileName}:`, err.message);
        }
    }

    console.log("\n✅ Document & Script Rewrite Pipeline Complete.");
}

run();
