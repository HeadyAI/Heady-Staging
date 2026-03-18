/**
 * config/phi-constants.js — Re-export from shared/phi-constants.js
 * Provides canonical phi-derived constants for the MCP server
 */
'use strict';

const constants = require('../shared/phi-constants');

// Re-export everything plus aliases expected by index.js
module.exports = {
  ...constants,
  // Aliases expected by index.js
  PSI2: constants.PSI_SQ,
  CSL: constants.CSL_THRESHOLDS,
  TIMEOUTS: {
    DEFAULT: constants.FIB[8] * 1000,    // 34 seconds
    LONG: constants.FIB[10] * 1000,      // 89 seconds
    SHORT: constants.FIB[6] * 1000,      // 13 seconds
  },
  RATE_LIMITS: {
    WINDOW_MS: constants.FIB[10] * 1000, // 89 seconds
    MAX_REQUESTS: constants.FIB[12],      // 233 requests
  },
  PORTS: {
    MCP_SERVER: 3310,
    GATEWAY: 3300,
    API: 3301,
  },
};
