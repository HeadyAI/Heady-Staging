// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Sacred Geometry v2.0 — Topology, Ring Placement, Coherence Scoring
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import {
  PHI, PSI, PSI2, FIB, CSL_THRESHOLDS,
  cosineSimilarity, normalize, phiFusionWeights, phiThreshold,
} from './phi-math-v2.js';

const RINGS = Object.freeze({
  CENTRAL: { name: 'Central Hub', radius: 0, nodes: ['HeadySoul'] },
  INNER:   { name: 'Inner Ring', radius: PSI, nodes: ['HeadyBrains', 'HeadyConductor', 'HeadyVinci'] },
  MIDDLE:  { name: 'Middle Ring', radius: 1, nodes: ['JULES', 'BUILDER', 'OBSERVER', 'MURPHY', 'ATLAS', 'PYTHIA'] },
  OUTER:   { name: 'Outer Ring', radius: PHI, nodes: ['BRIDGE', 'MUSE', 'SENTINEL', 'NOVA', 'JANITOR', 'SOPHIA', 'CIPHER', 'LENS'] },
  GOVERNANCE: { name: 'Governance Shell', radius: PHI * PHI, nodes: ['HeadyCheck', 'HeadyAssure', 'HeadyAware', 'HeadyPatterns', 'HeadyMC', 'HeadyRisk'] },
});

function getNodePosition(nodeName) {
  for (const [ringKey, ring] of Object.entries(RINGS)) {
    const idx = ring.nodes.indexOf(nodeName);
    if (idx !== -1) {
      const angle = (2 * Math.PI * idx) / ring.nodes.length;
      return {
        ring: ringKey,
        radius: ring.radius,
        angle,
        x: ring.radius * Math.cos(angle),
        y: ring.radius * Math.sin(angle),
        z: ring.radius * PSI,
      };
    }
  }
  return null;
}

function geometricDistance(nodeA, nodeB) {
  const posA = typeof nodeA === 'string' ? getNodePosition(nodeA) : nodeA;
  const posB = typeof nodeB === 'string' ? getNodePosition(nodeB) : nodeB;
  if (!posA || !posB) return Infinity;
  return Math.sqrt(
    Math.pow(posA.x - posB.x, 2) +
    Math.pow(posA.y - posB.y, 2) +
    Math.pow(posA.z - posB.z, 2)
  );
}

function shortestGeometricPath(from, to) {
  const posFrom = typeof from === 'string' ? getNodePosition(from) : from;
  const posTo = typeof to === 'string' ? getNodePosition(to) : to;
  if (!posFrom || !posTo) return { path: [], distance: Infinity };

  const path = [from];
  if (posFrom.ring === posTo.ring) {
    path.push(to);
    return { path, distance: geometricDistance(from, to) };
  }
  path.push('HeadyConductor');
  path.push(to);
  return {
    path,
    distance: geometricDistance(from, 'HeadyConductor') + geometricDistance('HeadyConductor', to),
  };
}

function systemCoherence(nodeEmbeddings) {
  const entries = Object.entries(nodeEmbeddings);
  if (entries.length < 2) return 1.0;

  let totalSim = 0;
  let count = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      totalSim += cosineSimilarity(entries[i][1], entries[j][1]);
      count++;
    }
  }
  return count === 0 ? 1.0 : totalSim / count;
}

function detectDrift(nodeEmbeddings, threshold = CSL_THRESHOLDS.LOW) {
  const entries = Object.entries(nodeEmbeddings);
  const drifted = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sim = cosineSimilarity(entries[i][1], entries[j][1]);
      if (sim < threshold) {
        drifted.push({ nodeA: entries[i][0], nodeB: entries[j][0], similarity: sim });
      }
    }
  }
  return drifted;
}

const FIBONACCI_SPACING = FIB.slice(0, FIB[6]).map(f => f);
const TYPOGRAPHY_SCALE = [1, PHI, PHI * PHI, PHI * PHI * PHI, PHI * PHI * PHI * PHI];

function goldenLayout(totalWidth, totalHeight) {
  return {
    primary:   { width: totalWidth * PSI, height: totalHeight },
    secondary: { width: totalWidth * PSI2, height: totalHeight },
    golden:    { width: totalWidth, height: totalWidth / PHI },
  };
}

function colorHarmony(baseHue, count = FIB[5]) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push((baseHue + i * 360 / PHI) % 360);
  }
  return colors;
}

function getAllNodes() {
  return Object.values(RINGS).flatMap(r => r.nodes);
}

function getNodeRing(nodeName) {
  for (const [key, ring] of Object.entries(RINGS)) {
    if (ring.nodes.includes(nodeName)) return key;
  }
  return null;
}

export {
  RINGS, getNodePosition, geometricDistance, shortestGeometricPath,
  systemCoherence, detectDrift,
  FIBONACCI_SPACING, TYPOGRAPHY_SCALE,
  goldenLayout, colorHarmony,
  getAllNodes, getNodeRing,
};

export default {
  RINGS, getNodePosition, geometricDistance, shortestGeometricPath,
  systemCoherence, detectDrift,
  FIBONACCI_SPACING, TYPOGRAPHY_SCALE,
  goldenLayout, colorHarmony,
  getAllNodes, getNodeRing,
};
