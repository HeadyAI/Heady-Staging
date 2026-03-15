/**
 * phi-math-foundation — CJS entrypoint
 * Re-exports from the TypeScript dist build, with fallback to phi-math
 */
'use strict';

let foundation;
try {
  foundation = require('./dist/index.js');
} catch {
  // Fallback: re-export core phi-math if dist not built
  foundation = require('../phi-math/index.js');
}

module.exports = foundation;
