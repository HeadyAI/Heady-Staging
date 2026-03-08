/**
 * Precision Adapter — base class for extended-precision truth values.
 * Provides a Decimal-backed HighPrecisionTruthValue with configurable
 * significant digits.
 */

import Decimal from 'decimal.js';

export interface PrecisionConfig {
    mode: 'standard' | 'arbitrary';
    significantDigits: number;
}

const DEFAULT_CONFIG: PrecisionConfig = {
    mode: 'standard',
    significantDigits: 20,
};

export class HighPrecisionTruthValue {
    readonly value: Decimal;
    readonly label?: string;
    protected config: PrecisionConfig;

    constructor(
        rawValue: number | string | Decimal,
        label?: string,
        config: Partial<PrecisionConfig> = {}
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        Decimal.set({ precision: this.config.significantDigits });
        this.value = new Decimal(rawValue.toString()).clamp(0, 1);
        this.label = label;
    }

    get asNumber(): number {
        return this.value.toNumber();
    }

    /**
     * 256-bit representation as [q3, q2, q1, q0] (4×64-bit quadwords)
     */
    to256Bit(): [bigint, bigint, bigint, bigint] {
        const scaled = this.value.times(new Decimal(2).pow(236));
        const hex = scaled.toHex().replace('0x', '').padStart(64, '0');
        return [
            BigInt('0x' + hex.slice(0, 16)),
            BigInt('0x' + hex.slice(16, 32)),
            BigInt('0x' + hex.slice(32, 48)),
            BigInt('0x' + hex.slice(48, 64)),
        ];
    }

    static from256Bit(
        q3: bigint,
        q2: bigint,
        q1: bigint,
        q0: bigint,
        label?: string
    ): HighPrecisionTruthValue {
        const hex = [q3, q2, q1, q0]
            .map((q) => q.toString(16).padStart(16, '0'))
            .join('');
        const value = new Decimal('0x' + hex).div(new Decimal(2).pow(236));
        return new HighPrecisionTruthValue(value, label);
    }

    toString(): string {
        return `HighPrecision(${this.value.toFixed(this.config.significantDigits)}${this.label ? ` "${this.label}"` : ''})`;
    }
}
