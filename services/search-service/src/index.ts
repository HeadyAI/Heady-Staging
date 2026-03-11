import express, { Express, Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { VectorSearchEngine } from './engines/vector-search';
import { FullTextSearchEngine } from './engines/fulltext-search';
import { HybridSearchEngine } from './engines/hybrid';
import { EmbeddingsService } from './utils/embeddings';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

const httpLogger = pinoHttp({ logger });

const PHI: number = 1.618033988749895;
const PSI: number = 0.618033988749895;
const PSI_SQUARED: number = 0.381966011250105;

interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  minConfidence?: number;
}

interface VectorSearchRequest extends SearchRequest {
  threshold?: number;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  confidence: number;
  source: string;
  metadata: Record<string, unknown>;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  database: {
    connected: boolean;
    latencyMs: number;
  };
}

class SearchService {
  private app: Express;
  private pool: Pool;
  private logger: pino.Logger;
  private vectorEngine: VectorSearchEngine;
  private fullTextEngine: FullTextSearchEngine;
  private hybridEngine: HybridSearchEngine;
  private embeddingsService: EmbeddingsService;
  private port: number;
  private isHealthy: boolean = false;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3365', 10);
    this.logger = logger;

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'heady',
      user: process.env.DB_USER || 'heady_user',
      password: process.env.DB_PASSWORD || 'heady_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(dbConfig);

    this.vectorEngine = new VectorSearchEngine(this.pool, this.logger);
    this.fullTextEngine = new FullTextSearchEngine(this.pool, this.logger);
    this.embeddingsService = new EmbeddingsService(this.logger);
    this.hybridEngine = new HybridSearchEngine(
      this.vectorEngine,
      this.fullTextEngine,
      PSI,
      PSI_SQUARED,
      this.logger
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDatabase();
  }

  private setupMiddleware(): void {
    this.app.use(httpLogger);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(this.errorHandler.bind(this));
  }

  private setupRoutes(): void {
    this.app.post('/api/search', this.handleHybridSearch.bind(this));
    this.app.post('/api/search/vector', this.handleVectorSearch.bind(this));
    this.app.post('/api/search/fulltext', this.handleFullTextSearch.bind(this));
    this.app.get('/api/search/suggest', this.handleAutocomplete.bind(this));
    this.app.get('/health', this.handleHealth.bind(this));
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS search_index (
          id UUID PRIMARY KEY,
          content TEXT NOT NULL,
          embedding VECTOR(384),
          tsvector tsvector,
          source VARCHAR(255) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_search_embedding ON search_index
          USING hnsw (embedding vector_cosine_ops)
          WITH (m = 32, ef_construction = 200);

        CREATE INDEX IF NOT EXISTS idx_search_tsvector ON search_index
          USING GIN (tsvector);

        CREATE INDEX IF NOT EXISTS idx_search_source ON search_index (source);
      `);
      client.release();
      this.isHealthy = true;
      this.logger.info({ component: 'database' }, 'Database initialized successfully');
    } catch (error) {
      this.logger.error({ component: 'database', error }, 'Failed to initialize database');
      this.isHealthy = false;
      setTimeout(() => this.initializeDatabase(), 5000);
    }
  }

  private async handleHybridSearch(
    req: Request<any, any, SearchRequest>,
    res: Response
  ): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      const { query, limit = 10, offset = 0, minConfidence = 0.5 } = req.body;

      if (!query || query.trim().length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Query parameter is required and must not be empty',
          requestId,
        });
        return;
      }

      const validLimit = Math.min(Math.max(limit, 1), 100);
      const validOffset = Math.max(offset, 0);

      const embedding = await this.embeddingsService.generate(query);
      const results = await this.hybridEngine.search(
        query,
        embedding,
        validLimit,
        validOffset,
        minConfidence
      );

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'search',
          searchType: 'hybrid',
          requestId,
          queryLength: query.length,
          resultsCount: results.length,
          durationMs: duration,
          limit: validLimit,
          offset: validOffset,
        },
        'Hybrid search completed'
      );

      res.json({
        success: true,
        requestId,
        searchType: 'hybrid',
        query,
        results,
        count: results.length,
        limit: validLimit,
        offset: validOffset,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        {
          component: 'search',
          searchType: 'hybrid',
          requestId,
          error,
          durationMs: Date.now() - startTime,
        },
        'Hybrid search failed'
      );
      throw error;
    }
  }

  private async handleVectorSearch(
    req: Request<any, any, VectorSearchRequest>,
    res: Response
  ): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      const { query, limit = 10, offset = 0, threshold = 0.6 } = req.body;

      if (!query || query.trim().length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Query parameter is required',
          requestId,
        });
        return;
      }

      const validLimit = Math.min(Math.max(limit, 1), 100);
      const validOffset = Math.max(offset, 0);
      const validThreshold = Math.min(Math.max(threshold, 0.0), 1.0);

      const embedding = await this.embeddingsService.generate(query);
      const results = await this.vectorEngine.search(
        embedding,
        validLimit,
        validOffset,
        validThreshold
      );

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'search',
          searchType: 'vector',
          requestId,
          queryLength: query.length,
          resultsCount: results.length,
          durationMs: duration,
        },
        'Vector search completed'
      );

      res.json({
        success: true,
        requestId,
        searchType: 'vector',
        query,
        results,
        count: results.length,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        { component: 'search', searchType: 'vector', requestId, error },
        'Vector search failed'
      );
      throw error;
    }
  }

  private async handleFullTextSearch(
    req: Request<any, any, SearchRequest>,
    res: Response
  ): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      const { query, limit = 10, offset = 0 } = req.body;

      if (!query || query.trim().length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Query parameter is required',
          requestId,
        });
        return;
      }

      const validLimit = Math.min(Math.max(limit, 1), 100);
      const validOffset = Math.max(offset, 0);

      const results = await this.fullTextEngine.search(query, validLimit, validOffset);

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'search',
          searchType: 'fulltext',
          requestId,
          queryLength: query.length,
          resultsCount: results.length,
          durationMs: duration,
        },
        'Full-text search completed'
      );

      res.json({
        success: true,
        requestId,
        searchType: 'fulltext',
        query,
        results,
        count: results.length,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        { component: 'search', searchType: 'fulltext', requestId, error },
        'Full-text search failed'
      );
      throw error;
    }
  }

  private async handleAutocomplete(
    req: Request<any, any, any, { q: string; limit: string }>,
    res: Response
  ): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);

    try {
      const { q, limit: limitStr } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Query parameter q is required',
          requestId,
        });
        return;
      }

      const limit = Math.min(Math.max(parseInt(limitStr as string) || 10, 1), 50);

      const suggestions = await this.fullTextEngine.getSuggestions(q, limit);

      this.logger.info(
        {
          component: 'search',
          searchType: 'autocomplete',
          requestId,
          queryLength: q.length,
          suggestionsCount: suggestions.length,
        },
        'Autocomplete completed'
      );

      res.json({
        success: true,
        requestId,
        query: q,
        suggestions,
        count: suggestions.length,
      });
    } catch (error) {
      this.logger.error(
        { component: 'search', searchType: 'autocomplete', requestId, error },
        'Autocomplete failed'
      );
      throw error;
    }
  }

  private async handleHealth(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const client = await this.pool.connect();
      const dbStartTime = Date.now();
      await client.query('SELECT 1');
      const dbLatency = Date.now() - dbStartTime;
      client.release();

      const health: HealthStatus = {
        status: this.isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: {
          connected: true,
          latencyMs: dbLatency,
        },
      };

      const statusCode = this.isHealthy ? 200 : 503;
      res.status(statusCode).json(health);

      this.logger.debug(
        {
          component: 'health',
          statusCode,
          durationMs: Date.now() - startTime,
          dbLatencyMs: dbLatency,
        },
        'Health check completed'
      );
    } catch (error) {
      this.logger.error(
        { component: 'health', error, durationMs: Date.now() - startTime },
        'Health check failed'
      );

      const health: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: {
          connected: false,
          latencyMs: Date.now() - startTime,
        },
      };

      res.status(503).json(health);
    }
  }

  private errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    this.logger.error({ component: 'error_handler', error }, 'Unhandled error');

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  public async start(): Promise<void> {
    try {
      this.app.listen(this.port, () => {
        this.logger.info(
          { component: 'server', port: this.port, environment: process.env.NODE_ENV },
          'Search service started'
        );
      });
    } catch (error) {
      this.logger.fatal({ component: 'server', error }, 'Failed to start search service');
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info({ component: 'server' }, 'Shutting down search service');
    await this.pool.end();
  }
}

const service = new SearchService();

process.on('SIGTERM', async () => {
  service.logger.info({ signal: 'SIGTERM' }, 'Received termination signal');
  await service.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  service.logger.info({ signal: 'SIGINT' }, 'Received interrupt signal');
  await service.shutdown();
  process.exit(0);
});

service.start().catch((error) => {
  logger.fatal({ error }, 'Fatal error during startup');
  process.exit(1);
});
