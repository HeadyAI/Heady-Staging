const { PSI, PSI2, phiThreshold } = require('./phi-math');

const CSL_GATES = Object.freeze({
  include: PSI2,
  boost: PSI,
  inject: Math.min(1, PSI + 0.1),
  medium: phiThreshold(2),
  high: phiThreshold(3),
  critical: phiThreshold(4)
});

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function cslGate(value, cosineScore, tau = CSL_GATES.medium, temperature = PSI2) {
  const gated = sigmoid((cosineScore - tau) / temperature);
  return value * gated;
}

function concurrentEqualsMerge(items, scoreKey = 'score') {
  return [...items].sort((left, right) => {
    const delta = (right[scoreKey] ?? 0) - (left[scoreKey] ?? 0);
    if (Math.abs(delta) < PSI2 / 10) {
      return String(left.id ?? left.name ?? '').localeCompare(String(right.id ?? right.name ?? ''));
    }
    return delta > 0 ? 1 : -1;
  });
}

module.exports = {
  CSL_GATES,
  cslGate,
  concurrentEqualsMerge
};
