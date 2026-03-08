/**
 * @heady-ai/semantic-logic
 * 
 * Continuous Semantic Logic Gate Engine for Heady AI.
 */

export { SemanticTruthValue, truthValue } from './core/truth-value.js';
export type { GateType } from './core/gates.js';
export {
  AND, OR, NOT, NAND, NOR, XOR, XNOR, IMPLY,
  WEIGHTED_AND, WEIGHTED_OR,
  createGate, evaluateGateChain,
} from './core/gates.js';
export type { SemanticGate } from './core/gates.js';
export type { MembershipFunction, MembershipType } from './core/membership.js';
export {
  triangular, trapezoidal, gaussian, sigmoid, bell,
} from './core/membership.js';
export { SemanticVariable } from './core/semantic-variable.js';
export type { LinguisticTerm } from './core/semantic-variable.js';
export { RuleEngine } from './core/rule-engine.js';
export type { SemanticRule, RuleResult } from './core/rule-engine.js';
export { Defuzzifier } from './core/defuzzifier.js';
export type { DefuzzMethod } from './core/defuzzifier.js';
export { ASTScanner } from './transform/ast-scanner.js';
export type { ScanResult, LogicPattern } from './transform/ast-scanner.js';
export { SemanticTransformer } from './transform/transformer.js';
export type { TransformConfig, TransformResult } from './transform/transformer.js';

