'use strict';
/**
 * Scaling Module — Barrel Export
 * Provides all 16 scaling modules for distributed systems architecture.
 */
module.exports = {
    ApiContracts: require('./api-contracts'),
    ApiVersioning: require('./api-versioning'),
    AutoScaler: require('./auto-scaler'),
    CloudRunOptimizer: require('./cloud-run-optimizer'),
    CQRSManager: require('./cqrs-manager'),
    DeadLetterQueue: require('./dead-letter-queue'),
    DistributedTracer: require('./distributed-tracer'),
    ErrorCodes: require('./error-codes'),
    EventBusNATS: require('./event-bus-nats'),
    FeatureFlags: require('./feature-flags'),
    GRPCBridge: require('./grpc-bridge'),
    HeadyServicesProto: require('./heady-services.proto'),
    HNSWTuner: require('./hnsw-tuner'),
    JITLoader: require('./jit-loader'),
    PgBouncerPool: require('./pgbouncer-pool'),
    ResourceAllocator: require('./resource-allocator'),
    ResponseCache: require('./response-cache'),
    SagaCoordinator: require('./saga-coordinator'),
};
