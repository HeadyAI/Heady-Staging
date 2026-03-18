/**
 * CSLRouter — Continuous Semantic Logic routing (replaces ALL if/else routing)
 * Routes every task using cosine similarity between query and bee intent vectors
 * HeadySystems Inc. — src/services/csl-router.js
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'csl-router' });

// φ-Calibrated CSL thresholds
const PHI = 1.618033988749895;
const THRESHOLDS = {
  EXACT_MATCH:      0.99,               // Cache hit
  HIGH_CONFIDENCE:  0.85,               // Single bee, no doubt
  ROUTING:          1 / PHI,            // 0.618 — standard gate
  WEAK_MATCH:       0.40,               // Needs clarification
  NO_MATCH:         0.20,               // Full fallback
};

const RouteSchema = z.object({
  input: z.string().min(1),
  userId: z.string().uuid().optional(),
  context: z.record(z.unknown()).default({}),
  allowMultiRoute: z.boolean().default(true),
  maxRoutes: z.number().int().min(1).max(5).default(3),
  namespace: z.string().default('global'),
});

const BeeManifestSchema = z.object({
  beeId: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  swarmId: z.string().optional(),
  priority: z.number().default(1.0),
  maxConcurrent: z.number().int().default(1),
});

// ── Built-in Heady bee manifest ────────────────────────────────────────────
// These 22 core bee types cover the primary routing needs
const CORE_BEES = [
  { beeId: 'code-generator-bee',    description: 'Generate, write, create code functions classes modules APIs',    keywords: ['code','generate','write','function','class','module','api','implement','build','create'] },
  { beeId: 'code-reviewer-bee',     description: 'Review audit analyze refactor improve existing code',             keywords: ['review','audit','analyze','refactor','improve','check','quality','lint','optimize code'] },
  { beeId: 'debugger-bee',          description: 'Debug fix errors exceptions bugs issues problems',                keywords: ['debug','fix','error','exception','bug','issue','broken','fails','crash','problem'] },
  { beeId: 'test-writer-bee',       description: 'Write unit integration tests test cases test suites vitest jest', keywords: ['test','vitest','jest','unit','integration','coverage','spec','assert','mock'] },
  { beeId: 'docs-bee',              description: 'Write documentation README JSDoc comments API docs markdown',     keywords: ['docs','documentation','readme','jsdoc','comment','explain','describe','markdown'] },
  { beeId: 'architect-bee',         description: 'System design architecture patterns infrastructure planning',     keywords: ['architecture','design','system','infrastructure','pattern','scale','diagram','plan'] },
  { beeId: 'grant-writer-bee',      description: 'Write SBIR STTR NSF DOE grants proposals funding applications',  keywords: ['grant','sbir','sttr','nsf','doe','proposal','funding','application','award','milestone'] },
  { beeId: 'patent-bee',            description: 'Patent claims provisional non-provisional PCT IP strategy',       keywords: ['patent','claim','provisional','non-provisional','pct','intellectual property','prior art','ip'] },
  { beeId: 'research-bee',          description: 'Research investigate analyze information facts knowledge',        keywords: ['research','investigate','analyze','find','search','information','what is','how does'] },
  { beeId: 'data-pipeline-bee',     description: 'ETL data pipeline ingestion transformation Postgres SQL',        keywords: ['data','pipeline','etl','postgres','sql','neon','transform','ingest','query','schema'] },
  { beeId: 'vector-ops-bee',        description: 'Vector embeddings Qdrant pgvector similarity search HNSW',       keywords: ['vector','embedding','qdrant','pgvector','similarity','hnsw','semantic search','cosine'] },
  { beeId: 'auth-bee',              description: 'Authentication Firebase Auth OAuth JWT cookies security',         keywords: ['auth','authentication','oauth','jwt','cookie','firebase','login','session','permission'] },
  { beeId: 'deploy-bee',            description: 'Deploy Cloud Run Cloudflare Workers Pages CI/CD containers',     keywords: ['deploy','cloud run','cloudflare','workers','pages','container','docker','ci','cd','release'] },
  { beeId: 'cost-optimizer-bee',    description: 'Optimize costs reduce spend budget tokens compute billing',       keywords: ['cost','optimize','reduce','budget','spend','billing','tokens','compute','expensive','savings'] },
  { beeId: 'ux-designer-bee',       description: 'UI UX design interface components layout wireframe',             keywords: ['ui','ux','design','interface','component','layout','wireframe','user experience','visual'] },
  { beeId: 'coordinator-bee',       description: 'Coordinate orchestrate plan route delegate tasks workflow',       keywords: ['coordinate','orchestrate','plan','route','delegate','workflow','manage','direct','swarm'] },
  { beeId: 'summarizer-bee',        description: 'Summarize condense distill extract key points brief',            keywords: ['summarize','summary','condense','brief','tldr','key points','extract','distill','shorten'] },
  { beeId: 'translator-bee',        description: 'Translate language convert format transform data structure',     keywords: ['translate','convert','transform','format','json','yaml','csv','language','convert data'] },
  { beeId: 'evaluator-bee',         description: 'Evaluate score rank compare assess quality alternatives',        keywords: ['evaluate','score','rank','compare','assess','quality','best','which','better','alternatives'] },
  { beeId: 'memory-bee',            description: 'Remember store retrieve recall persistent context user history',  keywords: ['remember','store','recall','memory','history','context','user data','persist','save','retrieve'] },
  { beeId: 'clarifier-bee',         description: 'Clarify ambiguous unclear questions ask follow up',              keywords: ['clarify','unclear','ambiguous','question','what do you mean','more info','confused'] },
  { beeId: 'fallback-bee',          description: 'Handle unmatched unknown fallback general purpose tasks',         keywords: ['help','general','anything','miscellaneous','other','fallback','default'] },
];

export default class CSLRouter {
  #env;
  #bees = new Map();
  #beeVectors = new Map(); // beeId → float32 vector
  #cfWorkersAI;

  constructor(env) {
    this.#env = env;
    this.#cfWorkersAI = env.CF_WORKERS_AI_BASE ?? 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/ai';

    // Pre-register core bees
    for (const bee of CORE_BEES) {
      this.register(bee);
    }
  }

  /** Register a bee in the routing table */
  register(rawBee) {
    const bee = BeeManifestSchema.parse(rawBee);
    this.#bees.set(bee.beeId, bee);
    // Vector will be computed lazily on first route call
    this.#beeVectors.delete(bee.beeId);
    return bee;
  }

  async #embed(text) {
    // Cloudflare Workers AI — bge-large-en-v1.5 (1024 dimensions, free)
    const resp = await fetch(`${this.#cfWorkersAI}/v1/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#env.CLOUDFLARE_API_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: '@cf/baai/bge-large-en-v1.5', input: text }),
    });
    const data = await resp.json();
    return data.result?.data?.[0]?.embedding ?? new Array(1024).fill(0);
  }

  #cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot   += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  async #getBeeVector(bee) {
    if (this.#beeVectors.has(bee.beeId)) return this.#beeVectors.get(bee.beeId);
    const text = `${bee.description} ${bee.keywords.join(' ')}`;
    const vec = await this.#embed(text);
    this.#beeVectors.set(bee.beeId, vec);
    return vec;
  }

  /**
   * Route input to best matching bee(s) using cosine similarity
   */
  async route(rawInput) {
    const input = RouteSchema.parse(rawInput);
    const routeId = uuidv4();
    const start = Date.now();

    // Embed the user input
    const queryVector = await this.#embed(input.input);

    // Compute similarity against ALL registered bees
    const similarities = await Promise.all(
      [...this.#bees.values()].map(async (bee) => {
        const beeVec = await this.#getBeeVector(bee);
        const similarity = this.#cosineSimilarity(queryVector, beeVec);
        return { beeId: bee.beeId, bee, similarity };
      })
    );

    // Sort descending by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    const top = similarities[0];
    let routes = [];
    let strategy = 'fallback';

    if (top.similarity >= THRESHOLDS.EXACT_MATCH) {
      routes = [{ ...top, confidence: 'exact', threshold: 'EXACT_MATCH' }];
      strategy = 'cache_hit';
    } else if (top.similarity >= THRESHOLDS.HIGH_CONFIDENCE) {
      routes = [{ ...top, confidence: 'high', threshold: 'HIGH_CONFIDENCE' }];
      strategy = 'single';
    } else if (top.similarity >= THRESHOLDS.ROUTING) {
      // Multi-route: all bees above the φ threshold
      const above = input.allowMultiRoute
        ? similarities.filter(s => s.similarity >= THRESHOLDS.ROUTING).slice(0, input.maxRoutes)
        : [top];
      routes = above.map(s => ({ ...s, confidence: 'routing', threshold: 'ROUTING' }));
      strategy = routes.length > 1 ? 'ensemble' : 'single';
    } else if (top.similarity >= THRESHOLDS.WEAK_MATCH) {
      routes = [{ ...top, confidence: 'weak', threshold: 'WEAK_MATCH' }];
      strategy = 'clarify';
    } else {
      routes = [{ beeId: 'fallback-bee', bee: this.#bees.get('fallback-bee'), similarity: 0, confidence: 'fallback', threshold: 'NO_MATCH' }];
      strategy = 'fallback';
    }

    const durationMs = Date.now() - start;
    logger.info({ routeId, strategy, topBee: routes[0]?.beeId, topSimilarity: top.similarity.toFixed(4), durationMs }, 'csl_routed');

    return {
      routeId,
      strategy,
      routes,
      topSimilarity: top.similarity,
      allSimilarities: similarities.slice(0, 5).map(s => ({ beeId: s.beeId, similarity: s.similarity.toFixed(4) })),
      thresholds: THRESHOLDS,
      durationMs,
    };
  }

  /** Get all registered bees */
  getManifest() {
    return [...this.#bees.values()];
  }
}
