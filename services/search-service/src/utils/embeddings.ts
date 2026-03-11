import crypto from 'crypto';
import pino from 'pino';

const EMBEDDING_DIMENSION: number = 384;
const SEED_PREFIX: string = 'heady-embedding';

interface EmbeddingCache {
  hash: string;
  embedding: number[];
  timestamp: number;
}

export class EmbeddingsService {
  private logger: pino.Logger;
  private cache: Map<string, EmbeddingCache>;
  private readonly maxCacheSize: number = 10000;
  private readonly cacheExpirationMs: number = 3600000;

  constructor(logger: pino.Logger) {
    this.logger = logger;
    this.cache = new Map();
  }

  public async generate(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const hash = this.hashText(text);

    const cached = this.cache.get(hash);
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      this.logger.debug(
        { component: 'embeddings', action: 'cache_hit', textLength: text.length },
        'Embedding retrieved from cache'
      );
      return [...cached.embedding];
    }

    const embedding = this.generateDeterministicEmbedding(text);

    this.cacheEmbedding(hash, embedding);

    this.logger.debug(
      {
        component: 'embeddings',
        action: 'generate',
        textLength: text.length,
        embeddingDimension: embedding.length,
      },
      'Embedding generated'
    );

    return embedding;
  }

  public async generateBatch(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    if (texts.length > 1000) {
      throw new Error('Batch size cannot exceed 1000');
    }

    const startTime = Date.now();

    const embeddings = await Promise.all(
      texts.map((text) => this.generate(text))
    );

    const duration = Date.now() - startTime;

    this.logger.debug(
      {
        component: 'embeddings',
        action: 'batch_generate',
        batchSize: texts.length,
        durationMs: duration,
        averageDurationMs: Math.round(duration / texts.length),
      },
      'Batch embeddings generated'
    );

    return embeddings;
  }

  private generateDeterministicEmbedding(text: string): number[] {
    const normalized = text.toLowerCase().trim();

    const hashStream = crypto.createHash('sha256');
    hashStream.update(SEED_PREFIX);
    hashStream.update(normalized);
    const hash = hashStream.digest();

    const embedding: number[] = [];

    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      const byteIndex = (i * 2) % hash.length;
      const byteValue = hash[byteIndex];

      const normalizedValue = (byteValue / 255.0) * 2.0 - 1.0;

      embedding.push(normalizedValue);
    }

    this.normalizeEmbedding(embedding);

    return embedding;
  }

  private normalizeEmbedding(embedding: number[]): void {
    let magnitudeSquared: number = 0;

    for (const value of embedding) {
      magnitudeSquared += value * value;
    }

    const magnitude = Math.sqrt(magnitudeSquared);

    if (magnitude < 1e-10) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = 0;
      }
      return;
    }

    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  private hashText(text: string): string {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  private cacheEmbedding(hash: string, embedding: number[]): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(hash, {
      hash,
      embedding: [...embedding],
      timestamp: Date.now(),
    });
  }

  private isCacheExpired(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age > this.cacheExpirationMs;
  }

  public clearCache(): void {
    const previousSize = this.cache.size;
    this.cache.clear();

    this.logger.info(
      { component: 'embeddings', action: 'clear_cache', clearedEntries: previousSize },
      'Embedding cache cleared'
    );
  }

  public getCacheStats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      utilizationPercent: Math.round((this.cache.size / this.maxCacheSize) * 100),
    };
  }

  public static calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct: number = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }

    return Math.max(-1.0, Math.min(1.0, dotProduct));
  }

  public static calculateEuclideanDistance(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let sumSquaredDiff: number = 0;

    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sumSquaredDiff += diff * diff;
    }

    return Math.sqrt(sumSquaredDiff);
  }
}
