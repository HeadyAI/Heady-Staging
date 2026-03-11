import pino from 'pino';
import { VectorSearchEngine } from './vector-search';
import { FullTextSearchEngine } from './fulltext-search';

interface HybridSearchResult {
  id: string;
  content: string;
  similarity: number;
  confidence: number;
  source: string;
  metadata: Record<string, unknown>;
}

interface VectorResult {
  id: string;
  content: string;
  similarity: number;
  source: string;
  metadata: Record<string, unknown>;
}

interface FullTextResult {
  id: string;
  content: string;
  similarity: number;
  source: string;
  metadata: Record<string, unknown>;
}

const PHI: number = 1.618033988749895;
const EPSILON: number = 1e-10;

export class HybridSearchEngine {
  private vectorEngine: VectorSearchEngine;
  private fullTextEngine: FullTextSearchEngine;
  private vectorWeight: number;
  private fullTextWeight: number;
  private logger: pino.Logger;

  constructor(
    vectorEngine: VectorSearchEngine,
    fullTextEngine: FullTextSearchEngine,
    vectorWeight: number = 0.618,
    fullTextWeight: number = 0.382,
    logger: pino.Logger
  ) {
    this.vectorEngine = vectorEngine;
    this.fullTextEngine = fullTextEngine;

    const totalWeight = vectorWeight + fullTextWeight;

    if (totalWeight <= 0) {
      throw new Error('Sum of weights must be greater than 0');
    }

    this.vectorWeight = vectorWeight / totalWeight;
    this.fullTextWeight = fullTextWeight / totalWeight;
    this.logger = logger;

    const deviation = Math.abs(this.vectorWeight + this.fullTextWeight - 1.0);
    if (deviation > EPSILON) {
      this.logger.warn(
        {
          component: 'hybrid_search',
          vectorWeight: this.vectorWeight,
          fullTextWeight: this.fullTextWeight,
          deviation,
        },
        'Weight normalization resulted in deviation'
      );
    }
  }

  public async search(
    query: string,
    embedding: number[],
    limit: number,
    offset: number,
    minConfidence: number
  ): Promise<HybridSearchResult[]> {
    const startTime = Date.now();

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Valid embedding is required');
    }

    if (minConfidence < 0 || minConfidence > 1) {
      throw new Error('minConfidence must be between 0 and 1');
    }

    try {
      const [vectorResults, fullTextResults] = await Promise.all([
        this.vectorEngine.search(embedding, limit * 3, 0, 0.0),
        this.fullTextEngine.search(query, limit * 3, 0),
      ]);

      const scores = this.mergeAndScore(vectorResults, fullTextResults, limit);

      const results = scores
        .filter((item) => item.confidence >= minConfidence)
        .slice(offset, offset + limit)
        .map((item) => ({
          id: item.id,
          content: item.content,
          similarity: item.similarity,
          confidence: item.confidence,
          source: item.source,
          metadata: item.metadata,
        }));

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'hybrid_search',
          queryLength: query.length,
          vectorResults: vectorResults.length,
          fullTextResults: fullTextResults.length,
          mergedResults: scores.length,
          filteredResults: results.length,
          minConfidence,
          durationMs: duration,
          vectorWeight: this.vectorWeight,
          fullTextWeight: this.fullTextWeight,
        },
        'Hybrid search completed'
      );

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        {
          component: 'hybrid_search',
          error,
          durationMs: duration,
          queryLength: query.length,
        },
        'Hybrid search failed'
      );

      throw error;
    }
  }

  private mergeAndScore(
    vectorResults: VectorResult[],
    fullTextResults: FullTextResult[],
    limit: number
  ): HybridSearchResult[] {
    const scoreMap = new Map<string, HybridSearchResult>();

    vectorResults.forEach((result, index) => {
      const vectorScore = this.calculatePositionalScore(index, vectorResults.length);
      const combinedScore = vectorScore * this.vectorWeight;

      if (!scoreMap.has(result.id)) {
        scoreMap.set(result.id, {
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          confidence: combinedScore,
          source: result.source,
          metadata: result.metadata,
        });
      } else {
        const existing = scoreMap.get(result.id)!;
        existing.confidence += combinedScore;
        existing.similarity = Math.max(existing.similarity, result.similarity);
      }
    });

    fullTextResults.forEach((result, index) => {
      const fullTextScore = this.calculatePositionalScore(index, fullTextResults.length);
      const combinedScore = fullTextScore * this.fullTextWeight;

      if (!scoreMap.has(result.id)) {
        scoreMap.set(result.id, {
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          confidence: combinedScore,
          source: result.source,
          metadata: result.metadata,
        });
      } else {
        const existing = scoreMap.get(result.id)!;
        existing.confidence += combinedScore;
        existing.similarity = Math.max(existing.similarity, result.similarity);
      }
    });

    const sorted = Array.from(scoreMap.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    const maxConfidence = sorted.length > 0 ? sorted[0].confidence : 1.0;

    return sorted
      .map((item) => ({
        ...item,
        confidence: Math.min(item.confidence / (maxConfidence + EPSILON), 1.0),
      }))
      .slice(0, limit);
  }

  private calculatePositionalScore(position: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    const normalizedPosition = position / total;
    const decayFactor = Math.pow(PHI, -normalizedPosition * 2);

    return Math.max(decayFactor, EPSILON);
  }

  public getWeights(): { vector: number; fullText: number } {
    return {
      vector: this.vectorWeight,
      fullText: this.fullTextWeight,
    };
  }
}
