/**
 * ∞ Heady™ Latent OS — Barrel Export & Bootstrap Factory
 * Part of Heady™Systems™ Sovereign AI Platform v4.0.0
 * © 2026 Heady™Systems Inc. — Proprietary
 */

'use strict';

const vectorSpaceOps = require('./vector-space-ops');
const { VectorMemory } = require('./vector-memory');
const { EmbeddingProvider } = require('./embedding-provider');
const { FederatedMemory } = require('./vector-federation');
const { VectorPipeline } = require('./vector-pipeline');
const { SelfAwareness } = require('./self-awareness');
const { DriftDetector } = require('./drift-detector');
const { SpatialMapper } = require('./spatial-mapper');
const { MemoryConsolidator } = require('./memory-consolidation');
const { GraphRAG, KnowledgeGraph } = require('./graph-rag');

/**
 * Factory: create a fully wired Latent OS instance.
 * @param {object} [opts]
 * @param {number} [opts.dims=384]
 * @param {number} [opts.shards=8]
 * @param {number} [opts.consolidateIntervalMs=300000]
 * @returns {object} Latent OS subsystems
 */
function createLatentOS(opts = {}) {
    const dims = opts.dims || 384;
    const shards = opts.shards || 8;

    // Core memory
    const memory = new VectorMemory({ dims, shardCount: shards });

    // Embedding provider
    const embedProvider = new EmbeddingProvider({ dims });

    // Ingestion pipeline
    const pipeline = new VectorPipeline({ memory, embedProvider });

    // Self-awareness
    const awareness = new SelfAwareness({ dims, memory });

    // Drift detector
    const driftDetector = new DriftDetector({ awareness });

    // Spatial mapper
    const spatialMapper = new SpatialMapper();

    // Memory consolidator
    const consolidator = new MemoryConsolidator({
        memory,
        intervalMs: opts.consolidateIntervalMs || 300_000,
    });

    // Graph RAG
    const graph = new KnowledgeGraph();
    const graphRag = new GraphRAG({ memory, graph });

    // Cross-wire events
    pipeline.on && pipeline.on('stored', (entry) => {
        try { spatialMapper.add && spatialMapper.add(entry.key, entry.vector); } catch (_) {}
    });

    awareness.on && awareness.on('drift-detected', (data) => {
        try { driftDetector.onDriftSignal && driftDetector.onDriftSignal(data); } catch (_) {}
    });

    function shutdown() {
        consolidator.stop && consolidator.stop();
        driftDetector.stop && driftDetector.stop();
        awareness.stop && awareness.stop();
    }

    function stats() {
        return {
            memory: memory.stats ? memory.stats() : {},
            awareness: awareness.getCoherence ? { coherence: awareness.getCoherence() } : {},
            consolidator: consolidator.stats ? consolidator.stats() : {},
        };
    }

    return {
        memory,
        embedProvider,
        pipeline,
        awareness,
        driftDetector,
        spatialMapper,
        consolidator,
        graphRag,
        graph,
        shutdown,
        stats,
    };
}

module.exports = {
    createLatentOS,
    // Vector math
    vectorSpaceOps,
    // Memory
    VectorMemory,
    // Embedding
    EmbeddingProvider,
    // Federation
    FederatedMemory,
    // Pipeline
    VectorPipeline,
    // Self-awareness
    SelfAwareness,
    // Drift detection
    DriftDetector,
    // Spatial mapping
    SpatialMapper,
    // Memory consolidation
    MemoryConsolidator,
    // Graph RAG
    GraphRAG,
    KnowledgeGraph,
};
