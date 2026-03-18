/**
 * NEMESIS — Agent Reputation & Trust System
 * 5-pillar scoring: coherence 35%, completion 25%, reliability 20%, integrity 10%, stability 10%
 * 0-1000 scale, AAA→CCC grades
 * Priority: 0.786
 */
const { PSI } = require('../../mandala/constants');

class Nemesis {
  constructor() {
    this.scores = new Map();
    this.weights = { coherence: 0.35, completion: 0.25, reliability: 0.20, integrity: 0.10, stability: 0.10 };
    this.grades = [
      { min: 900, grade: 'AAA' }, { min: 800, grade: 'AA' }, { min: 700, grade: 'A' },
      { min: 600, grade: 'BBB' }, { min: 500, grade: 'BB' }, { min: 400, grade: 'B' },
      { min: 300, grade: 'CCC' }, { min: 200, grade: 'CC' }, { min: 0, grade: 'C' }
    ];
  }

  score(agentId) {
    const s = this.scores.get(agentId) || { coherence: 500, completion: 500, reliability: 500, integrity: 500, stability: 500 };
    const total = Object.entries(this.weights).reduce((sum, [k, w]) => sum + s[k] * w, 0);
    const grade = this.grades.find(g => total >= g.min)?.grade || 'C';
    return { agentId, total: Math.round(total), grade, pillars: s };
  }

  record(agentId, pillar, delta) {
    if (!this.scores.has(agentId)) {
      this.scores.set(agentId, { coherence: 500, completion: 500, reliability: 500, integrity: 500, stability: 500 });
    }
    const s = this.scores.get(agentId);
    s[pillar] = Math.max(0, Math.min(1000, s[pillar] + delta));
  }
}

module.exports = { Nemesis };
