/**
 * Defuzzifier — converts fuzzy output sets back to crisp values.
 * Supports centroid, bisector, and mean-of-maximum methods.
 */

export type DefuzzMethod = 'centroid' | 'bisector' | 'mom';

export class Defuzzifier {
    private method: DefuzzMethod;

    constructor(method: DefuzzMethod = 'centroid') {
        this.method = method;
    }

    defuzzify(
        outputSet: Map<number, number>,
        range: [number, number] = [0, 1],
        resolution: number = 100
    ): number {
        switch (this.method) {
            case 'centroid':
                return this.centroid(outputSet, range, resolution);
            case 'bisector':
                return this.bisector(outputSet, range, resolution);
            case 'mom':
                return this.meanOfMaximum(outputSet);
            default:
                return this.centroid(outputSet, range, resolution);
        }
    }

    private centroid(
        outputSet: Map<number, number>,
        range: [number, number],
        resolution: number
    ): number {
        let numerator = 0;
        let denominator = 0;
        const step = (range[1] - range[0]) / resolution;

        for (let x = range[0]; x <= range[1]; x += step) {
            const μ = outputSet.get(Math.round(x * 1000) / 1000) ?? 0;
            numerator += x * μ;
            denominator += μ;
        }

        return denominator === 0 ? (range[0] + range[1]) / 2 : numerator / denominator;
    }

    private bisector(
        outputSet: Map<number, number>,
        range: [number, number],
        resolution: number
    ): number {
        const step = (range[1] - range[0]) / resolution;
        let totalArea = 0;

        for (let x = range[0]; x <= range[1]; x += step) {
            totalArea += outputSet.get(Math.round(x * 1000) / 1000) ?? 0;
        }

        let runningArea = 0;
        for (let x = range[0]; x <= range[1]; x += step) {
            runningArea += outputSet.get(Math.round(x * 1000) / 1000) ?? 0;
            if (runningArea >= totalArea / 2) return x;
        }

        return (range[0] + range[1]) / 2;
    }

    private meanOfMaximum(outputSet: Map<number, number>): number {
        let maxMu = 0;
        const maxPoints: number[] = [];

        for (const [x, μ] of outputSet.entries()) {
            if (μ > maxMu) {
                maxMu = μ;
                maxPoints.length = 0;
                maxPoints.push(x);
            } else if (μ === maxMu) {
                maxPoints.push(x);
            }
        }

        return maxPoints.length > 0
            ? maxPoints.reduce((a, b) => a + b, 0) / maxPoints.length
            : 0.5;
    }
}
