/**
 * @heady/sacred-geometry-sdk
 * Sacred Geometry Design System SDK — the only design system built on mathematical harmony.
 *
 * Re-exports everything from constants, fibonacci, and layouts modules.
 *
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

const constants = require('./constants');
const fibonacci  = require('./fibonacci');
const layouts    = require('./layouts');

module.exports = {
  // ── Constants ──────────────────────────────────────────────────────────────
  ...constants,

  // ── Fibonacci Utilities ────────────────────────────────────────────────────
  // (fib, fibCeil, fibFloor override FIB_CACHE-only exports from constants)
  ...fibonacci,

  // ── Layout Utilities ───────────────────────────────────────────────────────
  ...layouts,

  // Named sub-modules for selective import
  constants,
  fibonacci,
  layouts,
};
