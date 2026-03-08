/**
 * AST Scanner — scans source code AST nodes for semantic logic patterns.
 * Identifies opportunities for CSL gate replacement of boolean logic.
 */

export interface LogicPattern {
    type: 'boolean_and' | 'boolean_or' | 'boolean_not' | 'ternary' | 'threshold';
    location: { line: number; column: number };
    code: string;
    confidence: number;
}

export interface ScanResult {
    file: string;
    patterns: LogicPattern[];
    totalNodes: number;
    semanticCandidates: number;
}

export class ASTScanner {
    private patterns: LogicPattern[] = [];

    scan(source: string, filename: string = '<inline>'): ScanResult {
        this.patterns = [];
        const lines = source.split('\n');
        let totalNodes = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            totalNodes++;

            // Detect boolean AND (&&)
            if (/&&/.test(line)) {
                this.patterns.push({
                    type: 'boolean_and',
                    location: { line: i + 1, column: line.indexOf('&&') },
                    code: line.trim(),
                    confidence: 0.85,
                });
            }

            // Detect boolean OR (||)
            if (/\|\|/.test(line)) {
                this.patterns.push({
                    type: 'boolean_or',
                    location: { line: i + 1, column: line.indexOf('||') },
                    code: line.trim(),
                    confidence: 0.85,
                });
            }

            // Detect boolean NOT (!)
            if (/(?<!=)!(?!=)/.test(line)) {
                this.patterns.push({
                    type: 'boolean_not',
                    location: { line: i + 1, column: line.search(/(?<!=)!(?!=)/) },
                    code: line.trim(),
                    confidence: 0.7,
                });
            }

            // Detect ternary
            if (/\?.*:/.test(line) && !/^\s*\/\//.test(line)) {
                this.patterns.push({
                    type: 'ternary',
                    location: { line: i + 1, column: line.indexOf('?') },
                    code: line.trim(),
                    confidence: 0.6,
                });
            }

            // Detect threshold comparisons
            if (/[<>]=?\s*\d+\.?\d*/.test(line)) {
                this.patterns.push({
                    type: 'threshold',
                    location: { line: i + 1, column: line.search(/[<>]=?/) },
                    code: line.trim(),
                    confidence: 0.75,
                });
            }
        }

        return {
            file: filename,
            patterns: this.patterns,
            totalNodes,
            semanticCandidates: this.patterns.length,
        };
    }
}
