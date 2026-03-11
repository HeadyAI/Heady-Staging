import { Pool } from 'pg';
import pino from 'pino';

const MAX_SUGGESTION_LENGTH: number = 100;
const MIN_SUGGESTION_FREQUENCY: number = 2;

interface FullTextSearchResult {
  id: string;
  content: string;
  similarity: number;
  source: string;
  metadata: Record<string, unknown>;
}

interface FullTextRow {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, unknown>;
  rank: number;
}

interface SuggestionRow {
  suggestion: string;
  frequency: number;
}

export class FullTextSearchEngine {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool, logger: pino.Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  public async search(query: string, limit: number, offset: number): Promise<FullTextSearchResult[]> {
    const startTime = Date.now();

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (limit < 1 || limit > 100) {
      throw new Error(`Invalid limit: ${limit}, must be between 1 and 100`);
    }

    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}, must be >= 0`);
    }

    try {
      const plainQuery = this.sanitizeQuery(query);
      const tsquery = this.buildTsQuery(plainQuery);

      const sqlQuery = `
        SELECT
          id,
          content,
          source,
          metadata,
          ts_rank(tsvector, to_tsquery('english', $1)) as rank
        FROM search_index
        WHERE tsvector @@ to_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2
        OFFSET $3
      `;

      const result = await this.pool.query(sqlQuery, [tsquery, limit, offset]);

      const results: FullTextSearchResult[] = result.rows.map((row: FullTextRow) => ({
        id: row.id,
        content: row.content,
        similarity: Math.round(row.rank * 10000) / 10000,
        source: row.source,
        metadata: row.metadata || {},
      }));

      const duration = Date.now() - startTime;

      this.logger.debug(
        {
          component: 'fulltext_search',
          queryLength: query.length,
          limit,
          offset,
          resultsCount: results.length,
          durationMs: duration,
        },
        'Full-text search executed'
      );

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        {
          component: 'fulltext_search',
          error,
          durationMs: duration,
          queryLength: query.length,
        },
        'Full-text search failed'
      );

      throw error;
    }
  }

  public async getSuggestions(prefix: string, limit: number): Promise<string[]> {
    const startTime = Date.now();

    if (!prefix || prefix.trim().length === 0) {
      throw new Error('Prefix cannot be empty');
    }

    if (limit < 1 || limit > 50) {
      throw new Error(`Invalid limit: ${limit}, must be between 1 and 50`);
    }

    try {
      const sanitized = this.sanitizeQuery(prefix);

      const query = `
        SELECT
          word,
          COUNT(*) as frequency
        FROM (
          SELECT word FROM ts_stat('SELECT tsvector FROM search_index')
          WHERE word ILIKE $1 || '%'
        ) AS words
        GROUP BY word
        ORDER BY frequency DESC, word ASC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [sanitized, limit]);

      const suggestions = result.rows
        .map((row: SuggestionRow) => row.suggestion || row.word)
        .filter((s: string) => s.length <= MAX_SUGGESTION_LENGTH);

      const duration = Date.now() - startTime;

      this.logger.debug(
        {
          component: 'fulltext_search',
          action: 'suggestions',
          prefixLength: prefix.length,
          limit,
          suggestionsCount: suggestions.length,
          durationMs: duration,
        },
        'Suggestions generated'
      );

      return suggestions;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        {
          component: 'fulltext_search',
          action: 'suggestions',
          error,
          durationMs: duration,
        },
        'Failed to generate suggestions'
      );

      throw error;
    }
  }

  public async indexContent(
    id: string,
    content: string,
    source: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!id || !content || !source) {
      throw new Error('Missing required parameters: id, content, or source');
    }

    try {
      const tsvector = await this.generateTsvector(content);

      const query = `
        INSERT INTO search_index (id, content, tsvector, source, metadata)
        VALUES ($1, $2, to_tsvector('english', $3), $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET
          content = $2,
          tsvector = to_tsvector('english', $3),
          source = $4,
          metadata = $5,
          updated_at = CURRENT_TIMESTAMP
      `;

      await this.pool.query(query, [id, content, content, source, JSON.stringify(metadata)]);

      this.logger.debug(
        { component: 'fulltext_search', action: 'index_content', id, source },
        'Content indexed for full-text search'
      );
    } catch (error) {
      this.logger.error(
        { component: 'fulltext_search', action: 'index_content', id, error },
        'Failed to index content'
      );

      throw error;
    }
  }

  public async deleteIndex(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID is required');
    }

    try {
      const query = `
        UPDATE search_index
        SET tsvector = NULL
        WHERE id = $1
      `;

      await this.pool.query(query, [id]);

      this.logger.debug(
        { component: 'fulltext_search', action: 'delete_index', id },
        'Index entry cleared'
      );
    } catch (error) {
      this.logger.error(
        { component: 'fulltext_search', action: 'delete_index', id, error },
        'Failed to delete index'
      );

      throw error;
    }
  }

  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, '')
      .replace(/\s+/g, ' ');
  }

  private buildTsQuery(query: string): string {
    const terms = query.split(/\s+/).filter((term) => term.length > 0);

    if (terms.length === 0) {
      throw new Error('Query contains no valid terms');
    }

    return terms.map((term) => `${term}:*`).join(' & ');
  }

  private async generateTsvector(content: string): Promise<string> {
    const sanitized = this.sanitizeQuery(content);
    const terms = sanitized.split(/\s+/).filter((term) => term.length > 0);

    if (terms.length === 0) {
      return '';
    }

    return terms
      .map((term, index) => `'${term}':${index + 1}`)
      .join(',');
  }

  public async getIndexStats(): Promise<{
    totalIndexedDocuments: number;
    vocabulary: {
      uniqueTerms: number;
      averageFrequency: number;
    };
  }> {
    try {
      const countQuery = `
        SELECT COUNT(*) as count FROM search_index WHERE tsvector IS NOT NULL
      `;
      const countResult = await this.pool.query(countQuery);

      const statsQuery = `
        SELECT
          COUNT(*) as unique_terms,
          AVG(count) as avg_frequency
        FROM ts_stat('SELECT tsvector FROM search_index')
      `;
      const statsResult = await this.pool.query(statsQuery);

      return {
        totalIndexedDocuments: parseInt(countResult.rows[0].count, 10),
        vocabulary: {
          uniqueTerms: parseInt(statsResult.rows[0].unique_terms || 0, 10),
          averageFrequency: parseFloat(statsResult.rows[0].avg_frequency || 0),
        },
      };
    } catch (error) {
      this.logger.error(
        { component: 'fulltext_search', action: 'get_index_stats', error },
        'Failed to get index stats'
      );

      throw error;
    }
  }
}
