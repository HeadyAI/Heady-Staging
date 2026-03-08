/**
 * Continuous Semantic Logic Gates
 * Implements Zadeh (min/max), Product, and Łukasiewicz t-norms
 */

import { SemanticTruthValue } from './truth-value.js';

export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'IMPLY' | 'WEIGHTED_AND' | 'WEIGHTED_OR';
export type TNorm = 'zadeh' | 'product' | 'lukasiewicz';

export interface GateConfig {
  tnorm?: TNorm;
  weights?: number[];
}

function andGate(tnorm: TNorm, a: number, b: number): number {
  switch (tnorm) {
    case 'zadeh': return Math.min(a, b);
    case 'product': return a * b;
    case 'lukasiewicz': return Math.max(0, a + b - 1);
  }
}

function orGate(tnorm: TNorm, a: number, b: number): number {
  switch (tnorm) {
    case 'zadeh': return Math.max(a, b);
    case 'product': return a + b - a * b;
    case 'lukasiewicz': return Math.min(1, a + b);
  }
}

export function AND(inputs: SemanticTruthValue[], config: GateConfig = {}): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  if (inputs.length === 0) return new SemanticTruthValue(1.0);
  let result = inputs[0].value;
  for (let i = 1; i < inputs.length; i++) {
    result = andGate(tnorm, result, inputs[i].value);
  }
  return new SemanticTruthValue(result, `AND(${inputs.length})`);
}

export function OR(inputs: SemanticTruthValue[], config: GateConfig = {}): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  if (inputs.length === 0) return new SemanticTruthValue(0.0);
  let result = inputs[0].value;
  for (let i = 1; i < inputs.length; i++) {
    result = orGate(tnorm, result, inputs[i].value);
  }
  return new SemanticTruthValue(result, `OR(${inputs.length})`);
}

export function NOT(input: SemanticTruthValue): SemanticTruthValue {
  return new SemanticTruthValue(1 - input.value, `NOT`);
}

export function WEIGHTED_AND(inputs: SemanticTruthValue[], weights: number[]): SemanticTruthValue {
  const total = weights.reduce((s, w) => s + w, 0);
  const normalized = weights.map(w => w / total);
  const result = inputs.reduce((s, inp, i) => s + normalized[i] * inp.value, 0);
  return new SemanticTruthValue(result, `W_AND`);
}

export function WEIGHTED_OR(inputs: SemanticTruthValue[], weights: number[]): SemanticTruthValue {
  const total = weights.reduce((s, w) => s + w, 0);
  const normalized = weights.map(w => w / total);
  const weighted = inputs.map((inp, i) => inp.value * normalized[i]);
  const result = weighted.reduce((a, b) => a + b - a * b, 0);
  return new SemanticTruthValue(Math.min(1, result), `W_OR`);
}

export function NAND(inputs: SemanticTruthValue[], config: GateConfig = {}): SemanticTruthValue {
  return NOT(AND(inputs, config));
}

export function NOR(inputs: SemanticTruthValue[], config: GateConfig = {}): SemanticTruthValue {
  return NOT(OR(inputs, config));
}

export function XOR(a: SemanticTruthValue, b: SemanticTruthValue): SemanticTruthValue {
  const result = Math.abs(a.value - b.value);
  return new SemanticTruthValue(result, `XOR`);
}

export function XNOR(a: SemanticTruthValue, b: SemanticTruthValue): SemanticTruthValue {
  return NOT(XOR(a, b));
}

export function IMPLY(a: SemanticTruthValue, b: SemanticTruthValue, config: GateConfig = {}): SemanticTruthValue {
  const tnorm = config.tnorm ?? 'zadeh';
  const result = orGate(tnorm, 1 - a.value, b.value);
  return new SemanticTruthValue(result, `IMPLY`);
}

export type SemanticGate = GateType;

export function createGate(type: GateType, config: GateConfig = {}): (...inputs: SemanticTruthValue[]) => SemanticTruthValue {
  return (...inputs: SemanticTruthValue[]) => {
    switch (type) {
      case 'AND': return AND(inputs, config);
      case 'OR': return OR(inputs, config);
      case 'NOT': return NOT(inputs[0]);
      case 'NAND': return NAND(inputs, config);
      case 'NOR': return NOR(inputs, config);
      case 'XOR': return XOR(inputs[0], inputs[1]);
      case 'IMPLY': return IMPLY(inputs[0], inputs[1], config);
      case 'WEIGHTED_AND': return WEIGHTED_AND(inputs, config.weights ?? []);
      case 'WEIGHTED_OR': return WEIGHTED_OR(inputs, config.weights ?? []);
      default: throw new Error(`Unknown gate type: ${type}`);
    }
  };
}

export function evaluateGateChain(
  gates: Array<{ type: GateType; config?: GateConfig }>,
  inputs: SemanticTruthValue[]
): SemanticTruthValue {
  let current = inputs;
  for (const gate of gates) {
    const fn = createGate(gate.type, gate.config);
    current = [fn(...current)];
  }
  return current[0];
}

export { SemanticTruthValue };
