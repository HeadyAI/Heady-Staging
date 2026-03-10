const test = require('node:test');
const assert = require('node:assert/strict');
const { CSL_GATES, cslGate } = require('../shared/csl-gates');


test('CSL gates remain phi-aligned', () => {
  assert.ok(CSL_GATES.include > 0.3 && CSL_GATES.include < 0.4);
  assert.ok(CSL_GATES.boost > 0.6 && CSL_GATES.boost < 0.7);
  assert.ok(CSL_GATES.inject > 0.7 && CSL_GATES.inject < 0.8);
  assert.ok(cslGate(1, 0.95, CSL_GATES.medium) > cslGate(1, 0.5, CSL_GATES.medium));
});
