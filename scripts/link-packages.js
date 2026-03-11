#!/usr/bin/env node
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  Heady Systems — Workspace Package Linker                       ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  FILE: scripts/link-packages.js                                 ║
// ║  PURPOSE: Symlink @heady/* packages into node_modules           ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packagesDir = path.join(root, 'packages');
const nmScope = path.join(root, 'node_modules', '@heady');

if (!fs.existsSync(packagesDir)) process.exit(0);

fs.mkdirSync(nmScope, { recursive: true });

let linked = 0;
for (const name of fs.readdirSync(packagesDir)) {
  const pkgDir = path.join(packagesDir, name);
  const pkgJson = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJson)) continue;

  let meta;
  try { meta = JSON.parse(fs.readFileSync(pkgJson, 'utf8')); } catch { continue; }
  if (!meta.name || !meta.name.startsWith('@heady/')) continue;

  const shortName = meta.name.replace('@heady/', '');
  const target = path.join(nmScope, shortName);

  if (!fs.existsSync(target)) {
    try {
      fs.symlinkSync(pkgDir, target, 'dir');
      linked++;
    } catch {
      // ignore if already exists (race condition)
    }
  }
}

if (linked > 0) console.log(`[heady] linked ${linked} @heady/* workspace package(s)`);
