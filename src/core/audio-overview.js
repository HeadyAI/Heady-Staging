/* © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL. */
// STUB — awaiting full implementation

'use strict';

class AudioOverview {
  constructor(options = {}) {
    this.options = options;
  }

  getOverview() {
    return {
      ok: false,
      reason: 'not-implemented',
      data: null
    };
  }

  generateSummary(audioData = null) {
    return {
      ok: false,
      reason: 'not-implemented',
      summary: null,
      segments: []
    };
  }
}

module.exports = { AudioOverview };
