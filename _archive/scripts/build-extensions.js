#!/usr/bin/env node
/*
 * © 2026 Heady™Systems Inc.
 * Build script for Heady™ extensions — creates installable packages.
 * 
 * Outputs:
 *   dist/heady-ai-{version}.vsix   — VS Code extension
 *   dist/heady-chrome-{version}.zip — Chrome extension
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'extensions');
const VSCODE_DIR = path.join(ROOT, 'extensions', 'vscode-extension');
const CHROME_DIR = path.join(ROOT, 'extensions', 'chrome-extension');

console.log('🐝 Heady Extension Builder');
console.log('──────────────────────────');

// Ensure dist directory exists
fs.mkdirSync(DIST, { recursive: true });

// ── Build VS Code Extension (.vsix) ──────────────────────────────
console.log('\n📦 Building VS Code extension...');
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(VSCODE_DIR, 'package.json'), 'utf8'));
    const vsixName = `heady-ai-${pkg.version}.vsix`;

    // Package with vsce (no dependencies needed — extension has zero deps)
    execSync(`npx -y @vscode/vsce package --no-dependencies -o "${path.join(DIST, vsixName)}"`, {
        cwd: VSCODE_DIR,
        stdio: 'inherit',
    });

    const vsixPath = path.join(DIST, vsixName);
    if (fs.existsSync(vsixPath)) {
        const size = (fs.statSync(vsixPath).size / 1024).toFixed(1);
        console.log(`  ✅ VS Code: ${vsixName} (${size} KB)`);
    }
} catch (err) {
    console.error(`  ❌ VS Code build failed: ${err.message}`);
}

// ── Build Chrome Extension (.zip) ────────────────────────────────
console.log('\n📦 Building Chrome extension...');
try {
    const manifest = JSON.parse(fs.readFileSync(path.join(CHROME_DIR, 'manifest.json'), 'utf8'));
    const zipName = `heady-chrome-${manifest.version}.zip`;
    const zipPath = path.join(DIST, zipName);

    // Create zip of the chrome extension directory
    execSync(`cd "${CHROME_DIR}" && zip -r "${zipPath}" . -x "*.DS_Store"`, {
        stdio: 'inherit',
    });

    if (fs.existsSync(zipPath)) {
        const size = (fs.statSync(zipPath).size / 1024).toFixed(1);
        console.log(`  ✅ Chrome: ${zipName} (${size} KB)`);
    }
} catch (err) {
    console.error(`  ❌ Chrome build failed: ${err.message}`);
}

// ── Update package-info.json ─────────────────────────────────────
console.log('\n📋 Updating INSTALLABLE_PACKAGES...');
try {
    const infoPath = path.join(ROOT, 'configs', 'INSTALLABLE_PACKAGES', 'package-info.json');
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));

    const vscPkg = JSON.parse(fs.readFileSync(path.join(VSCODE_DIR, 'package.json'), 'utf8'));
    const chromeManifest = JSON.parse(fs.readFileSync(path.join(CHROME_DIR, 'manifest.json'), 'utf8'));

    info.packages['HeadyAI-VSCode'] = {
        name: 'Heady™ AI — VS Code Extension',
        version: vscPkg.version,
        description: vscPkg.description,
        file: `heady-ai-${vscPkg.version}.vsix`,
        install: `code --install-extension heady-ai-${vscPkg.version}.vsix`,
        models: ['heady-flash', 'heady-edge', 'heady-buddy', 'heady-reason', 'heady-battle-v1'],
        features: ['Model selector', 'Chat sidebar', 'Code actions', 'Battle validation', 'Status bar'],
    };

    info.packages['HeadyAI-Chrome'] = {
        name: 'Heady™ AI — Chrome Extension',
        version: chromeManifest.version,
        description: chromeManifest.description,
        file: `heady-chrome-${chromeManifest.version}.zip`,
        install: 'Load unpacked from chrome://extensions',
        models: ['heady-flash', 'heady-reason', 'heady-battle-v1'],
        features: ['Context menu actions', 'Side panel chat', 'Model-per-action routing'],
    };

    info.total_builds = Object.keys(info.packages).length;
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2) + '\n');
    console.log('  ✅ package-info.json updated');
} catch (err) {
    console.error(`  ❌ package-info update failed: ${err.message}`);
}

console.log('\n──────────────────────────');
console.log('🐝 Build complete!');
console.log(`📁 Packages in: ${DIST}`);
