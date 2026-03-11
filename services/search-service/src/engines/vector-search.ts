import { Pool } from 'pg';
import pino from 'pino';

const VECTOR_DIMENSION: number = 384;
const HNSW_M: number = 32;
const HNSW_EF_CONSTRUCTION: number = 200;
const COSINE_SIMILARITY_THRESHOLD: number = 0.0;

interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  source: string;
  metadata: Record<string, unknown>;
}

interface EmbeddingRow {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export class VectorSearchEngine {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool, logger: pino.Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  public async search(
    embedding: number[],
    limit: number,
    offset: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now();

    if (!Array.isArray(embedding) || embedding.length !== VECTOR_DIMENSION) {
      throw new Error(
        `Invalid embedding dimension: expected ${VECTOR_DIMENSION}, got ${embedding.length}`
      );
    }

    if (limit < 1 || limit > 100) {
      throw new Error(`Invalid limit: ${limit}, must be between 1 and 100`);
    }

    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}, must be >= 0`);
    }

    if (threshold < COSINE_SIMILARITY_THRESHOLD || threshold > 1.0) {
      throw new Error(
        `Invalid threshold: ${threshold}, must be between ${COSINE_SIMILARITY_THRESHOLD} and 1.0`
      );
    }

    try {
      const embeddingStr = `[${embedding.join(',')}]`;

      const query = `
        SELECT
          id,
          content,
          source,
          metadata,
          (1 - (embedding <=> $1::vector)) AS similarity
        FROM search_index
        WHERE (1 - (embedding <=> $1::vector)) >= $2
        ORDER BY similarity DESC
        LIMIT $3
        OFFSET $4
      `;

      const result = await this.pool.query(query, [embeddingStr, threshold, limit, offset]);

      const results: VectorSearchResult[] = result.rows.map((row: EmbeddingRow) => ({
        id: row.id,
        content: row.content,
        similarity: Math.round(row.similarity * 10000) / 10000,
        source: row.source,
        metadata: row.metadata || {},
      }));

      const duration = Date.now() - startTime;

      this.logger.debug(
        {
          component: 'vector_search',
          vectorDimension: VECTOR_DIMENSION,
          limit,
          offset,
          threshold,
          resultsCount: results.length,
          durationMs: duration,
        },
        'Vector search executed'
      );

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        {
          component: 'vector_search',
          error,
          durationMs: duration,
          limit,
          offset,
          threshold,
        },
        'Vector search failed'
      );

      throw error;
    }
  }

  public async indexEmbedding(
    id: string,
    content: string,
    embedding: number[],
    source: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!Array.isArray(embedding) || embedding.length !== VECTOR_DIMENSION) {
      throw new Error(
        `Invalid embedding dimension: expected ${VECTOR_DIMENSION}, got ${embedding.length}`
      );
    }

    if (!id || !content || !source) {
      throw new Error('Missing required parameters: id, content, or source');
    }

    try {
      const embeddingStr = `[${embedding.join(',')}]`;

      const query = `
        INSERT INTO search_index (id, content, embedding, source, metadata)
        VALUES ($1, $2, $3::vector, $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET
          content = $2,
          embedding = $3::vector,
          source = $4,
          metadata = $5,
          updated_at = CURRENT_TIMESTAMP
      `;

      await this.pool.query(query, [id, content, embeddingStr, source, JSON.stringify(metadata)]);

      this.logger.debug(
        { component: 'vector_search', action: 'index_embedding', id, source },
        'Embedding indexed'
      );
    } catch (error) {
      this.logger.error(
        { component: 'vector_search', action: 'index_embedding', id, error },
        'Failed to index embedding'
      );

      throw error;
    }
  }

  public async deleteEmbedding(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID is required');
    }

    try {
      const query = 'DELETE FROM search_index WHERE id = $1';
      await this.pool.query(query, [id]);

      this.logger.debug(
        { component: 'vector_search', action: 'delete_embedding', id },
        'Embedding deleted'
      );
    } catch (error) {
      this.logger.error(
        { component: 'vector_search', action: 'delete_embedding', id, error },
        'Failed to delete embedding'
      );

      throw error;
    }
  }

  public async getIndexStats(): Promise<{
    totalDocuments: number;
    vectorDimension: number;
    hnsw: {
      m: number;
      efConstruction: number;
    };
  }> {
    try {
      const query = 'SELECT COUNT(*) as count FROM search_index WHERE embedding IS NOT NULL';
      const result = await this.pool.query(query);

      return {
        totalDocuments: parseInt(result.rows[0].count, 10),
        vectorDimension: VECTOR_DIMENSION,
        hnsw: {
          m: HNSW_M,
          efConstruction: HNSW_EF_CONSTRUCTION,
        },
      };
    } catch (error) {
      this.logger.error(
        { component: 'vector_search', action: 'get_index_stats', error },
        'Failed to get index stats'
      );

      throw error;
    }
  }
}
