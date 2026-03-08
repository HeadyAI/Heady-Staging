/**
 * Semantic Transformer — transforms identified boolean logic into CSL gate equivalents.
 */

import { ASTScanner, ScanResult } from './ast-scanner.js';

export interface TransformConfig {
    minConfidence: number;
    includeComments: boolean;
    dryRun: boolean;
}

export interface TransformResult {
    scan: ScanResult;
    transforms: Array<{
        original: string;
        transformed: string;
        confidence: number;
    }>;
    totalTransformed: number;
}

const DEFAULT_CONFIG: TransformConfig = {
    minConfidence: 0.7,
    includeComments: true,
    dryRun: true,
};

export class SemanticTransformer {
    private scanner: ASTScanner;
    private config: TransformConfig;

    constructor(config: Partial<TransformConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.scanner = new ASTScanner();
    }

    transform(source: string, filename?: string): TransformResult {
        const scan = this.scanner.scan(source, filename);

        const transforms = scan.patterns
            .filter((p) => p.confidence >= this.config.minConfidence)
            .map((pattern) => {
                let transformed = pattern.code;

                switch (pattern.type) {
                    case 'boolean_and':
                        transformed = pattern.code.replace(
                            /(\w+)\s*&&\s*(\w+)/,
                            'AND([truthValue($1), truthValue($2)])'
                        );
                        break;
                    case 'boolean_or':
                        transformed = pattern.code.replace(
                            /(\w+)\s*\|\|\s*(\w+)/,
                            'OR([truthValue($1), truthValue($2)])'
                        );
                        break;
                    case 'boolean_not':
                        transformed = pattern.code.replace(
                            /!(\w+)/,
                            'NOT(truthValue($1))'
                        );
                        break;
                    default:
                        break;
                }

                return {
                    original: pattern.code,
                    transformed,
                    confidence: pattern.confidence,
                };
            });

        return {
            scan,
            transforms,
            totalTransformed: transforms.length,
        };
    }
}
