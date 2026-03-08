/**
 * Rule Engine — evaluates semantic rules against truth values.
 */

import { SemanticTruthValue } from './truth-value.js';
import { AND, OR } from './gates.js';

export interface SemanticRule {
    id: string;
    antecedents: SemanticTruthValue[];
    consequent: string;
    operator: 'AND' | 'OR';
    weight: number;
}

export interface RuleResult {
    ruleId: string;
    consequent: string;
    strength: SemanticTruthValue;
}

export class RuleEngine {
    private rules: SemanticRule[] = [];

    addRule(rule: SemanticRule): void {
        this.rules.push(rule);
    }

    evaluate(): RuleResult[] {
        return this.rules.map((rule) => {
            const strength =
                rule.operator === 'AND'
                    ? AND(rule.antecedents)
                    : OR(rule.antecedents);

            return {
                ruleId: rule.id,
                consequent: rule.consequent,
                strength: new SemanticTruthValue(
                    strength.value * rule.weight,
                    `rule:${rule.id}`
                ),
            };
        });
    }

    clear(): void {
        this.rules = [];
    }
}
