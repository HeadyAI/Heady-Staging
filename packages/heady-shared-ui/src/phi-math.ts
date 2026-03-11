/**
 * @heady-ai/shared-ui — φ-Scaled Design Token Mathematics
 * 
 * All spacing, sizing, timing, and typography values derive from
 * the golden ratio φ = 1.618033988749895.
 */

/** The golden ratio */
export const PHI = 1.618033988749895;

/** Inverse of the golden ratio */
export const PHI_INV = 1 / PHI; // ≈ 0.618

/** Square of the golden ratio */
export const PHI_SQ = PHI * PHI; // ≈ 2.618

/** Fibonacci sequence generator */
export function fibonacci(n: number): number[] {
    const seq = [0, 1];
    for (let i = 2; i < n; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq.slice(0, n);
}

/** Generate φ-scaled spacing values from a base unit */
export function phiSpacing(base: number = 4, steps: number = 10): number[] {
    const values: number[] = [];
    for (let i = -2; i < steps; i++) {
        values.push(Math.round(base * Math.pow(PHI, i) * 100) / 100);
    }
    return values;
}

/** Generate φ-scaled font sizes from a base size */
export function phiFontSizes(base: number = 16): Record<string, number> {
    return {
        xs: Math.round(base * Math.pow(PHI, -2)),     // ~6px
        sm: Math.round(base * Math.pow(PHI, -1)),     // ~10px
        base: base,                                      // 16px
        lg: Math.round(base * PHI),                   // ~26px
        xl: Math.round(base * PHI_SQ),                // ~42px
        '2xl': Math.round(base * Math.pow(PHI, 3)),      // ~68px
        '3xl': Math.round(base * Math.pow(PHI, 4)),      // ~110px
    };
}

/** Generate φ-scaled timing values for animations (ms) */
export function phiTiming(base: number = 200): Record<string, number> {
    return {
        instant: Math.round(base * Math.pow(PHI, -3)),
        fast: Math.round(base * Math.pow(PHI, -1)),
        normal: base,
        slow: Math.round(base * PHI),
        slower: Math.round(base * PHI_SQ),
        slowest: Math.round(base * Math.pow(PHI, 3)),
    };
}

/** Generate CSS custom properties from design tokens */
export function generateCSSTokens(base: number = 4): string {
    const spacing = phiSpacing(base);
    const fonts = phiFontSizes();
    const timing = phiTiming();

    const lines = [':root {'];

    spacing.forEach((v, i) => {
        lines.push(`  --space-${i}: ${v}px;`);
    });

    Object.entries(fonts).forEach(([key, val]) => {
        lines.push(`  --font-${key}: ${val}px;`);
    });

    Object.entries(timing).forEach(([key, val]) => {
        lines.push(`  --timing-${key}: ${val}ms;`);
    });

    lines.push(`  --phi: ${PHI};`);
    lines.push(`  --phi-inv: ${PHI_INV};`);
    lines.push(`  --golden-angle: 137.508deg;`);
    lines.push('}');

    return lines.join('\n');
}
