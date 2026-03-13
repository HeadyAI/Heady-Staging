/* © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL. */
// STUB — awaiting full implementation

'use strict';

class DurableEdgeAgent {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.data = {};
  }

  async fetch(request) {
    return new Response(
      JSON.stringify({
        ok: false,
        reason: 'not-implemented',
        message: 'DurableEdgeAgent fetch not yet implemented'
      }),
      {
        status: 501,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  async alarm() {
    return {
      ok: false,
      reason: 'not-implemented',
      message: 'DurableEdgeAgent alarm not yet implemented'
    };
  }

  getState() {
    return {
      ok: false,
      reason: 'not-implemented',
      state: null,
      data: this.data
    };
  }
}

module.exports = { DurableEdgeAgent };
