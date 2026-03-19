/*
 * © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL.
 * Auto-Success Task Catalog — 135+ tasks across 9 categories.
 * Extracted from hc_auto_success.js for maintainability.
 */

// ─── EXTERNAL TASK SOURCES ──────────────────────────────────────────────────
let extraTasks = [];
try { extraTasks = require('../auto-flow-tasks.json'); } catch (e) { }
let nonprofitTasks = [];
try { nonprofitTasks = require('../nonprofit-tasks.json'); } catch (e) { }
let buddyTasks = [];
try { buddyTasks = require('../buddy-tasks.json'); } catch (e) { }
let prodOptTasks = [];
try { prodOptTasks = require('./production-optimization-tasks.json'); } catch (e) { }

const TASK_CATALOG = [
    ...extraTasks,
    ...nonprofitTasks,
    ...buddyTasks,
    ...prodOptTasks,
    // ═══ LEARNING (20) — Targeted system learning ═══════════════════════════
    { id: "learn-001", name: "Analyze config drift patterns", cat: "learning", pool: "warm", w: 3, desc: "Compare current configs against historical snapshots to detect drift" },
    { id: "learn-002", name: "Study service dependency graph", cat: "learning", pool: "warm", w: 3, desc: "Map and analyze inter-service dependencies for optimization" },
    { id: "learn-003", name: "Profile API response latencies", cat: "learning", pool: "warm", w: 4, desc: "Collect and analyze response time distributions across endpoints" },
    { id: "learn-004", name: "Review pipeline stage timing", cat: "learning", pool: "warm", w: 3, desc: "Analyze HCFullPipeline stage execution times for bottleneck ID" },
    { id: "learn-005", name: "Index configuration parameters", cat: "learning", pool: "cold", w: 2, desc: "Build searchable index of all YAML config params and relationships" },
    { id: "learn-006", name: "Map node capability matrix", cat: "learning", pool: "warm", w: 3, desc: "Update the capability matrix for all registered Heady nodes" },
    { id: "learn-007", name: "Analyze error frequency distribution", cat: "learning", pool: "warm", w: 4, desc: "Study error patterns to identify systemic vs transient failures" },
    { id: "learn-008", name: "Profile memory allocation patterns", cat: "learning", pool: "warm", w: 3, desc: "Track heap and RSS memory patterns to predict pressure points" },
    { id: "learn-009", name: "Study event bus throughput", cat: "learning", pool: "cold", w: 2, desc: "Measure event emission rates and listener response times" },
    { id: "learn-010", name: "Catalog available integrations", cat: "learning", pool: "cold", w: 2, desc: "Enumerate all integration points and their current utilization" },
    { id: "learn-011", name: "Analyze circuit breaker trip patterns", cat: "learning", pool: "warm", w: 3, desc: "Study which circuit breakers trip most and correlate with conditions" },
    { id: "learn-012", name: "Profile worker pool utilization", cat: "learning", pool: "warm", w: 3, desc: "Measure concurrency saturation across hot/warm/cold pools" },
    { id: "learn-013", name: "Map orchestrator routing decisions", cat: "learning", pool: "cold", w: 2, desc: "Track HCSysOrchestrator routing patterns for optimization paths" },
    { id: "learn-014", name: "Study HeadySims convergence rates", cat: "learning", pool: "warm", w: 3, desc: "Analyze Monte Carlo simulation convergence for strategy tuning" },
    { id: "learn-015", name: "Review self-critique effectiveness", cat: "learning", pool: "cold", w: 2, desc: "Measure if self-critique recommendations lead to improvements" },
    { id: "learn-016", name: "Analyze story driver narrative quality", cat: "learning", pool: "cold", w: 2, desc: "Review generated narratives for coherence and actionability" },
    { id: "learn-017", name: "Profile checkpoint protocol timing", cat: "learning", pool: "warm", w: 3, desc: "Measure checkpoint save/restore times for pipeline resilience" },
    { id: "learn-018", name: "Study task cache hit rates", cat: "learning", pool: "warm", w: 3, desc: "Analyze cache effectiveness and identify wasteful entries" },
    { id: "learn-019", name: "Map brain connector endpoint health", cat: "learning", pool: "warm", w: 4, desc: "Track brain endpoint availability patterns over time" },
    { id: "learn-020", name: "Analyze registry node activation patterns", cat: "learning", pool: "cold", w: 2, desc: "Study which nodes activate together and optimize sequences" },

    // ═══ OPTIMIZATION (20) — Performance tuning ════════════════════════════
    { id: "opt-001", name: "Optimize hot pool task ordering", cat: "optimization", pool: "hot", w: 5, desc: "Reorder hot pool tasks based on learned dependency timing" },
    { id: "opt-002", name: "Tune circuit breaker thresholds", cat: "optimization", pool: "warm", w: 4, desc: "Adjust failure thresholds based on actual error rates" },
    { id: "opt-003", name: "Rebalance worker pool concurrency", cat: "optimization", pool: "warm", w: 4, desc: "Adjust pool sizes based on current resource availability" },
    { id: "opt-004", name: "Compress task cache entries", cat: "optimization", pool: "cold", w: 2, desc: "Remove stale cache entries and compact cache storage" },
    { id: "opt-005", name: "Optimize event listener chains", cat: "optimization", pool: "warm", w: 3, desc: "Profile and streamline eventBus listener execution order" },
    { id: "opt-006", name: "Tune HeadySims cycle parameters", cat: "optimization", pool: "warm", w: 3, desc: "Adjust Monte Carlo parameters based on convergence analysis" },
    { id: "opt-007", name: "Optimize config reload frequency", cat: "optimization", pool: "cold", w: 2, desc: "Balance config freshness against file I/O overhead" },
    { id: "opt-008", name: "Tune pattern engine analysis window", cat: "optimization", pool: "warm", w: 3, desc: "Adjust sliding window sizes for optimal pattern detection" },
    { id: "opt-009", name: "Optimize log rotation schedules", cat: "optimization", pool: "cold", w: 2, desc: "Set rotation based on actual log volume patterns" },
    { id: "opt-010", name: "Tune improvement scheduler interval", cat: "optimization", pool: "warm", w: 3, desc: "Adjust 15-min cycle based on improvement generation rates" },
    { id: "opt-011", name: "Optimize conductor poll frequency", cat: "optimization", pool: "warm", w: 3, desc: "Balance system visibility against poll overhead" },
    { id: "opt-012", name: "Tune brain connector pool size", cat: "optimization", pool: "warm", w: 4, desc: "Adjust connection pool based on brain endpoint patterns" },
    { id: "opt-013", name: "Optimize resource manager poll interval", cat: "optimization", pool: "warm", w: 3, desc: "Balance resource awareness against CPU overhead from polling" },
    { id: "opt-014", name: "Tune safe mode activation thresholds", cat: "optimization", pool: "warm", w: 4, desc: "Prevent premature safe mode while protecting against overload" },
    { id: "opt-015", name: "Optimize pipeline stage parallelism", cat: "optimization", pool: "hot", w: 5, desc: "Increase parallel execution where stages are independent" },
    { id: "opt-016", name: "Tune connectivity pattern retention", cat: "optimization", pool: "cold", w: 2, desc: "Optimize how many connectivity patterns to retain for analysis" },
    { id: "opt-017", name: "Optimize NotebookLM sync batch size", cat: "optimization", pool: "cold", w: 2, desc: "Balance sync completeness against API rate limits" },
    { id: "opt-018", name: "Tune self-critique severity thresholds", cat: "optimization", pool: "warm", w: 3, desc: "Calibrate severity levels to reduce false alarms" },
    { id: "opt-019", name: "Optimize middleware ordering", cat: "optimization", pool: "warm", w: 3, desc: "Profile Express middleware and optimize execution order" },
    { id: "opt-020", name: "Tune rate limiter parameters", cat: "optimization", pool: "warm", w: 3, desc: "Adjust rate limits based on actual traffic patterns" },

    // ═══ INTEGRATION (15) — Cross-system connectivity ═════════════════════
    { id: "int-001", name: "Validate service mesh connectivity", cat: "integration", pool: "warm", w: 4, desc: "Test all inter-service connections and log results" },
    { id: "int-002", name: "Sync registry with active services", cat: "integration", pool: "warm", w: 3, desc: "Ensure heady-registry.json reflects actual availability" },
    { id: "int-003", name: "Verify MCP tool endpoint coverage", cat: "integration", pool: "warm", w: 3, desc: "Confirm all MCP tools have working backend endpoints" },
    { id: "int-004", name: "Test brain API endpoint rotation", cat: "integration", pool: "warm", w: 4, desc: "Verify brain connector failover works correctly" },
    { id: "int-005", name: "Validate Conductor–Lens agreement", cat: "integration", pool: "warm", w: 3, desc: "Compare conductor macro vs lens micro for blind spots" },
    { id: "int-006", name: "Test eventBus producer–consumer chains", cat: "integration", pool: "warm", w: 3, desc: "Verify all eventBus emitters have corresponding listeners" },
    { id: "int-007", name: "Validate pipeline–MC scheduler wiring", cat: "integration", pool: "warm", w: 3, desc: "Confirm pipeline timing data feeds into Monte Carlo" },
    { id: "int-008", name: "Verify pattern engine–self-critique loop", cat: "integration", pool: "warm", w: 3, desc: "Confirm pattern stagnation triggers self-critique" },
    { id: "int-009", name: "Test resource mgr–task scheduler wire", cat: "integration", pool: "warm", w: 3, desc: "Verify safe mode propagates from resource mgr to scheduler" },
    { id: "int-010", name: "Validate story driver event ingestion", cat: "integration", pool: "cold", w: 2, desc: "Confirm all system events route into story narratives" },
    { id: "int-011", name: "Sync HeadyBuddy conversation context", cat: "integration", pool: "cold", w: 2, desc: "Ensure buddy chat has access to current system state" },
    { id: "int-012", name: "Verify NotebookLM audit trail integrity", cat: "integration", pool: "cold", w: 2, desc: "Confirm NotebookLM sync state matches actual operations" },
    { id: "int-013", name: "Test orchestrator multi-brain routing", cat: "integration", pool: "warm", w: 4, desc: "Verify HCSysOrchestrator correctly routes to brain layers" },
    { id: "int-014", name: "Validate HCFP interceptor pipeline", cat: "integration", pool: "warm", w: 4, desc: "Confirm HCFP HeadyBattle interceptor catches events" },
    { id: "int-015", name: "Test auto-task conversion pipeline", cat: "integration", pool: "warm", w: 3, desc: "Verify recommendation events convert to tasks" },

    // ═══ MONITORING (15) — Continuous health tracking ═════════════════════
    { id: "mon-001", name: "Track CPU utilization trend", cat: "monitoring", pool: "warm", w: 4, desc: "Monitor CPU patterns and predict future pressure" },
    { id: "mon-002", name: "Track RAM utilization trend", cat: "monitoring", pool: "warm", w: 4, desc: "Monitor memory patterns and predict OOM risk" },
    { id: "mon-003", name: "Monitor disk usage growth rate", cat: "monitoring", pool: "cold", w: 2, desc: "Track disk consumption and alert on approaching limits" },
    { id: "mon-004", name: "Track service response time SLAs", cat: "monitoring", pool: "hot", w: 5, desc: "Monitor response times against SLA targets" },
    { id: "mon-005", name: "Monitor event bus queue depth", cat: "monitoring", pool: "warm", w: 3, desc: "Track event backlog for early bottleneck detection" },
    { id: "mon-006", name: "Track error rate per service", cat: "monitoring", pool: "warm", w: 4, desc: "Monitor error rates and trigger alerts on anomalies" },
    { id: "mon-007", name: "Monitor node heartbeat freshness", cat: "monitoring", pool: "warm", w: 3, desc: "Track last-seen timestamps for registered nodes" },
    { id: "mon-008", name: "Track pipeline run duration trends", cat: "monitoring", pool: "warm", w: 3, desc: "Monitor pipeline times for degradation detection" },
    { id: "mon-009", name: "Monitor brain endpoint health scores", cat: "monitoring", pool: "warm", w: 4, desc: "Track brain connector health across all endpoints" },
    { id: "mon-010", name: "Track connectivity pattern anomalies", cat: "monitoring", pool: "cold", w: 2, desc: "Detect unusual connectivity patterns in service mesh" },
    { id: "mon-011", name: "Monitor safe mode activation frequency", cat: "monitoring", pool: "warm", w: 3, desc: "Track how often and why safe mode activates" },
    { id: "mon-012", name: "Track pattern engine convergence health", cat: "monitoring", pool: "warm", w: 3, desc: "Monitor whether patterns converge or stagnate" },
    { id: "mon-013", name: "Monitor HeadySims drift frequency", cat: "monitoring", pool: "warm", w: 3, desc: "Track Monte Carlo drift alerts and resolution" },
    { id: "mon-014", name: "Track improvement implementation rate", cat: "monitoring", pool: "cold", w: 2, desc: "Monitor how many improvements get implemented" },
    { id: "mon-015", name: "Monitor continuous pipeline gate health", cat: "monitoring", pool: "warm", w: 3, desc: "Track quality/resource/stability gate pass rates" },

    // ═══ MAINTENANCE (15) — System housekeeping ═══════════════════════════
    { id: "maint-001", name: "Rotate conductor orchestration logs", cat: "maintenance", pool: "cold", w: 2, desc: "Trim conductor log to prevent unbounded memory growth" },
    { id: "maint-002", name: "Clean stale connectivity patterns", cat: "maintenance", pool: "cold", w: 2, desc: "Remove connectivity patterns older than 48 hours" },
    { id: "maint-003", name: "Compact task result cache", cat: "maintenance", pool: "cold", w: 2, desc: "Remove expired and low-value cache entries" },
    { id: "maint-004", name: "Validate registry node consistency", cat: "maintenance", pool: "warm", w: 3, desc: "Ensure heady-registry.json has no orphaned entries" },
    { id: "maint-005", name: "Clean expired circuit breaker states", cat: "maintenance", pool: "cold", w: 2, desc: "Reset circuit breakers past their timeout" },
    { id: "maint-006", name: "Trim service stub activity logs", cat: "maintenance", pool: "cold", w: 2, desc: "Cap service stub logs to prevent memory bloat" },
    { id: "maint-007", name: "Verify data directory integrity", cat: "maintenance", pool: "cold", w: 2, desc: "Ensure data/ files are valid JSON and not corrupted" },
    { id: "maint-008", name: "Update pipeline run history TTL", cat: "maintenance", pool: "cold", w: 2, desc: "Archive old pipeline runs and keep history compact" },
    { id: "maint-009", name: "Clean orphaned event listeners", cat: "maintenance", pool: "warm", w: 3, desc: "Detect and remove listeners for destroyed components" },
    { id: "maint-010", name: "Refresh node capability metadata", cat: "maintenance", pool: "warm", w: 3, desc: "Update node metadata from registry for fresh tracking" },
    { id: "maint-011", name: "Verify config file parse-ability", cat: "maintenance", pool: "cold", w: 2, desc: "Test-parse all YAML configs to catch syntax errors early" },
    { id: "maint-012", name: "Compact auto-success task history", cat: "maintenance", pool: "cold", w: 1, desc: "Trim auto-success history to cap at 2000 entries" },
    { id: "maint-013", name: "Reset stale pattern observations", cat: "maintenance", pool: "cold", w: 2, desc: "Clear pattern engine observations older than window" },
    { id: "maint-014", name: "Validate NotebookLM sync state integrity", cat: "maintenance", pool: "cold", w: 2, desc: "Ensure NotebookLM sync state matches actual sync status" },
    { id: "maint-015", name: "Health-check all mounted routers", cat: "maintenance", pool: "warm", w: 3, desc: "Verify all Express routers respond without errors" },

    // ═══ DISCOVERY (15) — Finding new opportunities ═══════════════════════
    { id: "disc-001", name: "Scan for unused config parameters", cat: "discovery", pool: "cold", w: 2, desc: "Find config params defined but never referenced in code" },
    { id: "disc-002", name: "Identify underutilized node capabilities", cat: "discovery", pool: "warm", w: 3, desc: "Find node capabilities that are rarely exercised" },
    { id: "disc-003", name: "Discover cross-service optimization paths", cat: "discovery", pool: "warm", w: 4, desc: "Identify where services could share data" },
    { id: "disc-004", name: "Map potential parallelization points", cat: "discovery", pool: "warm", w: 3, desc: "Find sequential operations that could run in parallel" },
    { id: "disc-005", name: "Identify recurring error patterns", cat: "discovery", pool: "warm", w: 4, desc: "Discover error patterns suggesting architecture improvements" },
    { id: "disc-006", name: "Scan for caching opportunities", cat: "discovery", pool: "warm", w: 3, desc: "Find repeatedly computed values that benefit from caching" },
    { id: "disc-007", name: "Discover integration gaps", cat: "discovery", pool: "warm", w: 3, desc: "Find services that should be wired together but aren't" },
    { id: "disc-008", name: "Identify resource waste patterns", cat: "discovery", pool: "warm", w: 4, desc: "Find allocated resources not effectively utilized" },
    { id: "disc-009", name: "Map potential automation targets", cat: "discovery", pool: "cold", w: 2, desc: "Identify manual processes that could be automated" },
    { id: "disc-010", name: "Discover latency reduction opportunities", cat: "discovery", pool: "hot", w: 5, desc: "Find top latency contributors and model reduction paths" },
    { id: "disc-011", name: "Scan for missing health endpoints", cat: "discovery", pool: "cold", w: 2, desc: "Find services without health endpoints" },
    { id: "disc-012", name: "Identify event bus dead letter paths", cat: "discovery", pool: "warm", w: 3, desc: "Find events emitted but never consumed" },
    { id: "disc-013", name: "Discover config simplification paths", cat: "discovery", pool: "cold", w: 2, desc: "Find redundant or overlapping configuration entries" },
    { id: "disc-014", name: "Map public domain best practice alignment", cat: "discovery", pool: "cold", w: 2, desc: "Compare architecture against industry best practices" },
    { id: "disc-015", name: "Identify capacity scaling trigger points", cat: "discovery", pool: "warm", w: 3, desc: "Discover thresholds where scaling decisions should trigger" },

    // ═══ VERIFICATION (15) — HeadyVerifier: Liquid Architecture Compliance ══
    { id: "verify-001", name: "Verify component capability definitions", cat: "verification", pool: "warm", w: 5, desc: "Ensure all components define capabilities, not static locations" },
    { id: "verify-002", name: "Verify multi-presence allocation", cat: "verification", pool: "warm", w: 5, desc: "Confirm each component has presences in all sensible locations" },
    { id: "verify-003", name: "Verify context-aware routing active", cat: "verification", pool: "hot", w: 5, desc: "Confirm LiquidAllocator context analysis runs on every flow" },
    { id: "verify-004", name: "Verify affinity scoring accuracy", cat: "verification", pool: "warm", w: 4, desc: "Validate affinity scores correlate with actual component fitness" },
    { id: "verify-005", name: "Verify no static service binding", cat: "verification", pool: "warm", w: 5, desc: "Ensure no service is hardwired — all route through liquid allocator" },
    { id: "verify-006", name: "Verify always-present components active", cat: "verification", pool: "hot", w: 5, desc: "Confirm patterns, auto-success, stream, and cloud are always present" },
    { id: "verify-007", name: "Verify flow decision SSE broadcast", cat: "verification", pool: "warm", w: 3, desc: "Confirm liquid flow decisions broadcast via SSE for real-time visibility" },
    { id: "verify-008", name: "Verify liquid state persistence", cat: "verification", pool: "cold", w: 2, desc: "Confirm liquid allocator state persists to disk every 60s" },
    { id: "verify-009", name: "Verify circuit breaker liquid coverage", cat: "verification", pool: "warm", w: 4, desc: "Ensure all critical liquid components have circuit breaker protection" },
    { id: "verify-010", name: "Verify dynamic allocation under pressure", cat: "verification", pool: "warm", w: 4, desc: "Confirm allocator reduces allocation count under resource pressure" },
    { id: "verify-011", name: "Verify cross-domain component availability", cat: "verification", pool: "warm", w: 4, desc: "Ensure components are available across all 7 Heady domains" },
    { id: "verify-012", name: "Verify HeadyBuddy bridge connectivity", cat: "verification", pool: "warm", w: 3, desc: "Confirm HeadyBuddy can access all services via bridge proxy" },
    { id: "verify-013", name: "Verify registry reflects liquid state", cat: "verification", pool: "warm", w: 4, desc: "Ensure heady-registry.json is updated with liquid allocation data" },
    { id: "verify-014", name: "Verify best-practice scores above threshold", cat: "verification", pool: "warm", w: 5, desc: "Confirm deep-scan best practice scores are >= 0.8 across all evaluators" },
    { id: "verify-015", name: "Verify cloud connector domain completeness", cat: "verification", pool: "cold", w: 3, desc: "Confirm all 7 domains and their subdomains are mapped in cloud status" },

    // ═══ CREATIVE (10) — HeadyCreative Engine Health ════════════════════════
    { id: "create-001", name: "Monitor creative engine job throughput", cat: "creative", pool: "warm", w: 4, desc: "Track jobs per minute and identify throughput bottlenecks" },
    { id: "create-002", name: "Verify model routing accuracy", cat: "creative", pool: "warm", w: 5, desc: "Confirm input→output routes to optimal models" },
    { id: "create-003", name: "Track pipeline completion rates", cat: "creative", pool: "warm", w: 4, desc: "Monitor multi-step pipeline success across all 8 pipelines" },
    { id: "create-004", name: "Monitor creative session persistence", cat: "creative", pool: "cold", w: 2, desc: "Ensure active sessions maintain state correctly" },
    { id: "create-005", name: "Verify input type coverage", cat: "creative", pool: "warm", w: 3, desc: "Confirm all 9 input types are routable to at least one model" },
    { id: "create-006", name: "Track error absorption patterns", cat: "creative", pool: "warm", w: 3, desc: "Monitor which creative operations absorb errors most frequently" },
    { id: "create-007", name: "Verify SSE creative job broadcast", cat: "creative", pool: "warm", w: 3, desc: "Confirm creative job completions broadcast via SSE" },
    { id: "create-008", name: "Monitor model provider availability", cat: "creative", pool: "hot", w: 5, desc: "Track which AI providers are responsive for creative tasks" },
    { id: "create-009", name: "Verify remix multi-input processing", cat: "creative", pool: "warm", w: 4, desc: "Confirm remix endpoint handles 2+ inputs correctly" },
    { id: "create-010", name: "Track creative output quality scores", cat: "creative", pool: "warm", w: 4, desc: "Monitor HeadyVinci's quality evaluation of creative outputs" },

    // ═══ DEEP-INTEL (10) — Deep System Intelligence Protocol ════════════════
    { id: "intel-001", name: "Monitor 3D vector store health", cat: "deep-intel", pool: "warm", w: 4, desc: "Track vector count, clustering quality, and dimension utilization" },
    { id: "intel-002", name: "Verify audit chain integrity", cat: "deep-intel", pool: "hot", w: 5, desc: "Validate SHA-256 hash chain continuity in deterministic behavior audit" },
    { id: "intel-003", name: "Track perspective coverage completeness", cat: "deep-intel", pool: "warm", w: 4, desc: "Ensure all 10 analysis perspectives are contributing findings" },
    { id: "intel-004", name: "Monitor Heady node utilization rates", cat: "deep-intel", pool: "warm", w: 3, desc: "Track which of the 10 Heady nodes are being invoked and their contribution" },
    { id: "intel-005", name: "Verify vector cluster quality", cat: "deep-intel", pool: "cold", w: 3, desc: "Analyze cluster distribution and identify under-connected regions" },
    { id: "intel-006", name: "Track composite scan score trends", cat: "deep-intel", pool: "warm", w: 4, desc: "Monitor project health scores over time for improvement trajectory" },
    { id: "intel-007", name: "Monitor multi-perspective data richness", cat: "deep-intel", pool: "warm", w: 4, desc: "Verify each stored vector has comprehensive perspective coverage" },
    { id: "intel-008", name: "Verify nearest-neighbor query accuracy", cat: "deep-intel", pool: "cold", w: 3, desc: "Test 3D spatial queries return semantically related vectors" },
    { id: "intel-009", name: "Track HeadyResearch recon success rate", cat: "deep-intel", pool: "warm", w: 4, desc: "Monitor best-practice discovery and implementation matching" },
    { id: "intel-010", name: "Monitor HeadyBattle competitive analysis freshness", cat: "deep-intel", pool: "warm", w: 3, desc: "Ensure competitive benchmarks are recent and relevant" },

    // ═══ HIVE-INTEGRATION (20) — External APIs, MCP Aggregation, SDK ════════
    { id: "hive-001", name: "HeadyCompute Assistants API health check", cat: "hive-integration", pool: "warm", w: 4, desc: "Validate HeadyCompute file search / retrieval API endpoint availability" },
    { id: "hive-002", name: "HeadyCompute embeddings endpoint readiness", cat: "hive-integration", pool: "warm", w: 4, desc: "Test text-embedding-3-small endpoint availability and latency" },
    { id: "hive-003", name: "HeadyCompute batch API queue depth", cat: "hive-integration", pool: "cold", w: 2, desc: "Check pending batch job status and completion rate" },
    { id: "hive-004", name: "Google Cloud Vertex AI health", cat: "hive-integration", pool: "warm", w: 3, desc: "Ping Vertex AI prediction endpoint and check quota" },
    { id: "hive-005", name: "Google Cloud Vision API readiness", cat: "hive-integration", pool: "cold", w: 2, desc: "Test Vision API with lightweight probe request" },
    { id: "hive-006", name: "Google Cloud NLP availability", cat: "hive-integration", pool: "cold", w: 2, desc: "Validate Natural Language API entity/sentiment endpoints" },
    { id: "hive-007", name: "Google BigQuery connection test", cat: "hive-integration", pool: "cold", w: 2, desc: "Verify BigQuery dataset access and query capability" },
    { id: "hive-008", name: "GitHub MCP server connectivity", cat: "hive-integration", pool: "warm", w: 4, desc: "Test upstream GitHub MCP server for PR/issue tool availability" },
    { id: "hive-009", name: "Puppeteer MCP server readiness", cat: "hive-integration", pool: "cold", w: 2, desc: "Validate browser automation MCP server connection" },
    { id: "hive-010", name: "Memory MCP knowledge graph sync", cat: "hive-integration", pool: "warm", w: 4, desc: "Check memory MCP server persistence and entity retrieval" },
    { id: "hive-011", name: "LiteLLM gateway model roster check", cat: "hive-integration", pool: "warm", w: 4, desc: "Verify all registered models callable through LiteLLM proxy" },
    { id: "hive-012", name: "Heady Hive SDK package integrity", cat: "hive-integration", pool: "warm", w: 3, desc: "Validate heady-hive-sdk exports, dependencies, and version" },
    { id: "hive-013", name: "SDK authentication flow test", cat: "hive-integration", pool: "warm", w: 4, desc: "Test token issue → verify → refresh lifecycle through SDK" },
    { id: "hive-014", name: "SDK event streaming health", cat: "hive-integration", pool: "warm", w: 3, desc: "Validate SSE client connection, heartbeat, and reconnect" },
    { id: "hive-015", name: "MCP aggregator tool count validation", cat: "hive-integration", pool: "warm", w: 3, desc: "Confirm all upstream MCP tools registered in aggregator" },
    { id: "hive-016", name: "Cloudflare Workers edge latency", cat: "hive-integration", pool: "cold", w: 2, desc: "Measure Cloudflare Worker response time from origin" },
    { id: "hive-017", name: "HeadyCompute Retrieval index freshness", cat: "hive-integration", pool: "cold", w: 2, desc: "Check assistant file upload age and vector store status" },
    { id: "hive-018", name: "Cross-provider model availability sync", cat: "hive-integration", pool: "warm", w: 4, desc: "Ensure model availability consistent across HeadyJules/Codex/HeadyPythia/Grok" },
    { id: "hive-019", name: "SDK client connection pool monitor", cat: "hive-integration", pool: "warm", w: 3, desc: "Track active SDK client connections and pool health" },
    { id: "hive-020", name: "Hive integration compliance audit", cat: "hive-integration", pool: "hot", w: 5, desc: "Full sweep of all external integrations, APIs, and SDK endpoints" },

    // ═══ MOP — MASTER ORCHESTRATION PROTOCOL (45) ════════════════════════════
    // Security Shield Protocol
    { id: "mop-sec-001", name: "Purge .env.hybrid from Git history", cat: "mop-security", pool: "hot", w: 5, desc: "Run git filter-repo/BFG to erase all .env.hybrid commits from history" },
    { id: "mop-sec-002", name: "Rotate leaked DB credentials", cat: "mop-security", pool: "hot", w: 5, desc: "Rotate heady_secret PostgreSQL credentials and update all services" },
    { id: "mop-sec-003", name: "Enable GitHub secret scanning org-wide", cat: "mop-security", pool: "hot", w: 5, desc: "Activate GitHub Advanced Security secret scanning on HeadyMe org" },
    { id: "mop-sec-004", name: "Remove tracked metadata files", cat: "mop-security", pool: "warm", w: 4, desc: "git rm --cached server.pid, *.jsonl, *.bak from index" },
    { id: "mop-sec-005", name: "Cryptographic signing for MCP servers", cat: "mop-security", pool: "warm", w: 4, desc: "Sign all deployed MCP server artifacts with verified checksums" },

    // Architectural Modularization
    { id: "mop-arch-001", name: "Decompose heady-manager.js God class", cat: "mop-architecture", pool: "hot", w: 5, desc: "Split 1158-line heady-manager.js into src/routing, orchestrator, health modules" },
    { id: "mop-arch-002", name: "Decompose site-generator.js", cat: "mop-architecture", pool: "hot", w: 5, desc: "Split 91KB site-generator into factory pattern with template JSON schemas" },
    { id: "mop-arch-003", name: "Separate Python and Node.js codebases", cat: "mop-architecture", pool: "warm", w: 4, desc: "Isolate Python AI logic into /services/py-core with own requirements.txt" },
    { id: "mop-arch-004", name: "Merge duplicate config directories", cat: "mop-architecture", pool: "warm", w: 3, desc: "Audit and consolidate config/ and configs/ into single authoritative dir" },
    { id: "mop-arch-005", name: "Consolidate PowerShell build scripts", cat: "mop-architecture", pool: "warm", w: 3, desc: "Merge 4 hcautobuild*.ps1 scripts into single Build-Heady.ps1 with params" },

    // Documentation & Versioning
    { id: "mop-doc-001", name: "Consolidate README files into /docs portal", cat: "mop-docs", pool: "warm", w: 3, desc: "Merge 7+ README files into single organized /docs/ documentation portal" },
    { id: "mop-doc-002", name: "Sync all version references to registry", cat: "mop-docs", pool: "warm", w: 3, desc: "Make heady-registry.json single source of truth, sync package.json + .env" },
    { id: "mop-doc-003", name: "Formalize Sacred Geometry architecture docs", cat: "mop-docs", pool: "cold", w: 2, desc: "Document Sacred Geometry + Pentagonal Architecture in technical specs" },

    // Structured Logging + Redis + Firestore
    { id: "mop-infra-001", name: "Replace console.log with pino structured logger", cat: "mop-infrastructure", pool: "hot", w: 5, desc: "Deploy pino JSON logger across all services, deprecate console.log" },
    { id: "mop-infra-002", name: "Implement Redis connection pooling", cat: "mop-infrastructure", pool: "hot", w: 5, desc: "Configure aggressive TCP connection pooling for agent state sharing" },
    { id: "mop-infra-003", name: "Add Firestore persistent artifact storage", cat: "mop-infrastructure", pool: "warm", w: 4, desc: "Implement /artifacts/{appId}/ schema in Firestore for persistent data" },
    { id: "mop-infra-004", name: "Schema segregation public vs agent data", cat: "mop-infrastructure", pool: "warm", w: 3, desc: "Enforce strict boundaries between public data and agent operational data" },

    // CI/CD Hardening
    { id: "mop-cicd-001", name: "Add post-deploy smoke tests", cat: "mop-cicd", pool: "warm", w: 4, desc: "Add automated smoke tests that ping /health after every Cloud Run deploy" },
    { id: "mop-cicd-002", name: "Unify build/deploy pipeline", cat: "mop-cicd", pool: "warm", w: 4, desc: "Merge fragmented deploy scripts into single CI/CD pipeline" },
    { id: "mop-cicd-003", name: "Add Cloud Run deploy step to deploy.yml", cat: "mop-cicd", pool: "warm", w: 3, desc: "Automate Cloud Run deployments in GitHub Actions" },
    { id: "mop-cicd-004", name: "Enforce branch protection on main", cat: "mop-cicd", pool: "warm", w: 3, desc: "Require mandatory peer reviews before merge to main" },

    // MCP Production Hardening
    { id: "mop-mcp-001", name: "Implement MCP Tool Search deferred loading", cat: "mop-mcp", pool: "hot", w: 5, desc: "Dynamic tool discovery instead of injecting all schemas — 90%+ token savings" },
    { id: "mop-mcp-002", name: "Design macro-tools for aggregate endpoints", cat: "mop-mcp", pool: "hot", w: 5, desc: "Replace granular CRUD MCP tools with high-level macro-tools (solve N+1)" },
    { id: "mop-mcp-003", name: "OAuth 2.1 for all MCP servers", cat: "mop-mcp", pool: "warm", w: 4, desc: "Implement OAuth 2.1 with .well-known/oauth-protected-resource on all MCP" },
    { id: "mop-mcp-004", name: "Non-deterministic MCP session IDs", cat: "mop-mcp", pool: "warm", w: 3, desc: "Use UUIDv4 session IDs and validate Origin/Host headers for CSRF prevention" },
    { id: "mop-mcp-005", name: "Pydantic/Zod strict data contracts", cat: "mop-mcp", pool: "warm", w: 4, desc: "Enforce strict I/O schemas on all agent communication with Zod validation" },

    // AI Gateway & Liquid Architecture
    { id: "mop-ai-001", name: "Deploy centralized AI Gateway", cat: "mop-ai-gateway", pool: "hot", w: 5, desc: "Central gateway for all outbound LLM traffic with token monitoring" },
    { id: "mop-ai-002", name: "Assign OpenAI Business as Supervisor Swarm", cat: "mop-ai-gateway", pool: "warm", w: 4, desc: "Route supervisor routing tasks through 2x OpenAI Business seats" },
    { id: "mop-ai-003", name: "Assign Claude Max as MCP Tool Caller", cat: "mop-ai-gateway", pool: "warm", w: 4, desc: "Deploy Claude Max for Code Execution and MCP Tool interaction" },
    { id: "mop-ai-004", name: "Assign Google AI Ultra for multimodal", cat: "mop-ai-gateway", pool: "warm", w: 4, desc: "Route multimodal analysis and GCloud integration to AI Ultra" },
    { id: "mop-ai-005", name: "Assign Perplexity Enterprise as Research Oracle", cat: "mop-ai-gateway", pool: "warm", w: 3, desc: "Route external truth grounding through Perplexity Enterprise API" },
    { id: "mop-ai-006", name: "Configure 3x Colab Pro+ compute nodes", cat: "mop-ai-gateway", pool: "warm", w: 4, desc: "Set up 3 decoupled Colab nodes: data synthesis, fine-tuning, validation" },
    { id: "mop-ai-007", name: "Intelligent model routing by complexity", cat: "mop-ai-gateway", pool: "hot", w: 5, desc: "Route cheap models for simple tasks, heavy models for complex reasoning" },
    { id: "mop-ai-008", name: "Per-agent token budget enforcement", cat: "mop-ai-gateway", pool: "warm", w: 4, desc: "Monitor and enforce per-agent token consumption budgets" },
    { id: "mop-ai-009", name: "Move model weights to HuggingFace Business", cat: "mop-ai-gateway", pool: "warm", w: 3, desc: "Move Sacred Geometry model weights and embeddings to 2x HF Business seats" },

    // Performance + Auth + Dynamic Sites
    { id: "mop-perf-001", name: "Standardized health endpoint JSON schema", cat: "mop-performance", pool: "warm", w: 4, desc: "Uniform /health response across ALL Cloud Run services" },
    { id: "mop-perf-002", name: "Binary inter-agent communication", cat: "mop-performance", pool: "warm", w: 3, desc: "Implement Protocol Buffers or MessagePack for agent communication" },
    { id: "mop-auth-001", name: "Standardize auth across all Heady surfaces", cat: "mop-auth", pool: "hot", w: 5, desc: "Unified auth middleware for Cloud Run, Workers, MCP, widgets — one template everywhere" },
    { id: "mop-auth-002", name: "Deploy Cloudflare Worker proxy for manager", cat: "mop-auth", pool: "warm", w: 4, desc: "Proxy manager.headysystems.com through Cloudflare Worker to Cloud Run" },
    { id: "mop-site-001", name: "Deploy site-generator as Cloud Run service", cat: "mop-sites", pool: "hot", w: 5, desc: "Interactive on-the-fly site builds tailored per user/audience on Cloud Run" },
    { id: "mop-site-002", name: "Per-user dynamic template rendering", cat: "mop-sites", pool: "warm", w: 4, desc: "Implement audience-aware template rendering for dynamic sites" },
    { id: "mop-site-003", name: "Remove PM2 site entries from ecosystem", cat: "mop-sites", pool: "warm", w: 3, desc: "Remove 40+ site PM2 entries from ecosystem.config.cjs" },

    // ═══ MONETIZATION — IaaS / SaaS PLAY (10) ═══════════════════════════════
    { id: "mon-iaas-001", name: "Package 3D vector storage as API", cat: "monetization-iaas", pool: "hot", w: 5, desc: "Expose octree spatial index as multi-tenant API with rate limiting and auth" },
    { id: "mon-iaas-002", name: "Design multi-tenant data isolation", cat: "monetization-iaas", pool: "hot", w: 5, desc: "Implement tenant-isolated vector namespaces using Neon/Upstash" },
    { id: "mon-iaas-003", name: "Build governance API tier system", cat: "monetization-iaas", pool: "warm", w: 4, desc: "Package GovernanceEngine as tiered API: $49/mo basic, $149/mo pro, enterprise" },
    { id: "mon-iaas-004", name: "Integrate Stripe billing pipeline", cat: "monetization-iaas", pool: "hot", w: 5, desc: "Wire Stripe subscriptions + usage-based billing for API consumption" },
    { id: "mon-iaas-005", name: "Create developer SDK package", cat: "monetization-iaas", pool: "warm", w: 4, desc: "Publish heady-sdk NPM package for external developer integration" },
    { id: "mon-iaas-006", name: "Design API gateway with token monitoring", cat: "monetization-iaas", pool: "hot", w: 5, desc: "Central gateway for all client API traffic with per-tenant token tracking" },
    { id: "mon-iaas-007", name: "Build developer portal and docs", cat: "monetization-iaas", pool: "warm", w: 3, desc: "Create interactive API documentation portal with code examples" },
    { id: "mon-iaas-008", name: "Implement OAuth 2.0 API key issuance", cat: "monetization-iaas", pool: "warm", w: 4, desc: "Secure API key generation and management via Firebase/OAuth 2.0" },
    { id: "mon-iaas-009", name: "Monitor API usage and billing accuracy", cat: "monetization-iaas", pool: "warm", w: 4, desc: "Track per-tenant API calls, token consumption, and billing accuracy" },
    { id: "mon-iaas-010", name: "Design SLA monitoring dashboard", cat: "monetization-iaas", pool: "warm", w: 3, desc: "Build uptime, latency, and throughput monitoring for SaaS customers" },

    // ═══ SOVEREIGN AGENT ALTERNATIVE (10) ════════════════════════════════════
    { id: "mon-agent-001", name: "Package HeadyBuddy as sovereign agent", cat: "monetization-agent", pool: "hot", w: 5, desc: "Position as OS-agnostic, bring-your-own-keys competitor to Jules/Mariner" },
    { id: "mon-agent-002", name: "Build multi-LLM router demo", cat: "monetization-agent", pool: "warm", w: 4, desc: "Create demo showing Claude/OpenAI/HF orchestration without vendor lock-in" },
    { id: "mon-agent-003", name: "Design enterprise licensing model", cat: "monetization-agent", pool: "warm", w: 4, desc: "Annual licensing for on-premise HeadyMe deployment with IP protection" },
    { id: "mon-agent-004", name: "Build data privacy compliance layer", cat: "monetization-agent", pool: "hot", w: 5, desc: "Guarantee proprietary enterprise data never leaves customer infrastructure" },
    { id: "mon-agent-005", name: "Create vendor comparison matrix", cat: "monetization-agent", pool: "cold", w: 2, desc: "Document Heady advantages vs Jules, Mariner, AutoGPT, CrewAI" },
    { id: "mon-agent-006", name: "Design white-label deployment package", cat: "monetization-agent", pool: "warm", w: 4, desc: "Create customizable Heady deployment for enterprise branding" },
    { id: "mon-agent-007", name: "Build on-premise installer", cat: "monetization-agent", pool: "warm", w: 4, desc: "Docker Compose + Helm chart for air-gapped enterprise deployment" },
    { id: "mon-agent-008", name: "Track enterprise prospect pipeline", cat: "monetization-agent", pool: "cold", w: 2, desc: "CRM-style tracking of potential enterprise licensing opportunities" },
    { id: "mon-agent-009", name: "Monitor competitive landscape shifts", cat: "monetization-agent", pool: "cold", w: 2, desc: "Track new agentic AI competitors and feature parity changes" },
    { id: "mon-agent-010", name: "Build agent capability showcase", cat: "monetization-agent", pool: "warm", w: 3, desc: "Interactive demo showing 20-node orchestration, spatial computing, governance" },

    // ═══ B2B ENTITY FORMATION (10) ══════════════════════════════════════════
    { id: "mon-b2b-001", name: "Register HeadySystems LLC/C-Corp", cat: "monetization-b2b", pool: "hot", w: 5, desc: "Formalize business structure with EIN — required for Stripe + enterprise" },
    { id: "mon-b2b-002", name: "Establish corporate bank account", cat: "monetization-b2b", pool: "hot", w: 5, desc: "Open business bank account for Stripe merchant services and revenue" },
    { id: "mon-b2b-003", name: "Configure Stripe merchant account", cat: "monetization-b2b", pool: "hot", w: 5, desc: "Set up Stripe Connect with verified business identity for SaaS billing" },
    { id: "mon-b2b-004", name: "File provisional trademark for Heady™", cat: "monetization-b2b", pool: "warm", w: 4, desc: "Protect Heady, HeadyMe, HeadyBuddy trademarks via USPTO" },
    { id: "mon-b2b-005", name: "Establish IP sovereignty documentation", cat: "monetization-b2b", pool: "warm", w: 4, desc: "Formal documentation asserting Heady has no relation to any existing entity" },
    { id: "mon-b2b-006", name: "Create standard licensing agreement", cat: "monetization-b2b", pool: "warm", w: 3, desc: "Draft enterprise licensing template (SaaS, on-premise, white-label)" },
    { id: "mon-b2b-007", name: "Set up business insurance", cat: "monetization-b2b", pool: "cold", w: 2, desc: "E&O and general liability insurance for SaaS/API services" },
    { id: "mon-b2b-008", name: "Establish vendor compliance checklist", cat: "monetization-b2b", pool: "warm", w: 3, desc: "SOC 2 readiness checklist for enterprise vendor approval processes" },
    { id: "mon-b2b-009", name: "Configure business tax accounts", cat: "monetization-b2b", pool: "warm", w: 3, desc: "Set up state + federal tax accounts for SaaS revenue reporting" },
    { id: "mon-b2b-010", name: "Track revenue and runway metrics", cat: "monetization-b2b", pool: "warm", w: 3, desc: "Dashboard tracking MRR, ARR, CAC, LTV, and runway vs burn rate" },

    // ═══ IDE ACCELERATION (10) ══════════════════════════════════════════════
    { id: "dev-ide-001", name: "Optimize multi-repo workspace context", cat: "dev-acceleration", pool: "warm", w: 4, desc: "Configure IDE to index all 5 HeadyMe repos simultaneously for cross-repo search" },
    { id: "dev-ide-002", name: "Set up Claude Code terminal integration", cat: "dev-acceleration", pool: "warm", w: 4, desc: "Install Claude Code extension for in-IDE agentic coding with full workspace awareness" },
    { id: "dev-ide-003", name: "Configure automated refactoring pipelines", cat: "dev-acceleration", pool: "warm", w: 3, desc: "Set up IDE-driven bulk refactoring for Docker configs and vector algorithms" },
    { id: "dev-ide-004", name: "Build cross-platform dev environment sync", cat: "dev-acceleration", pool: "warm", w: 3, desc: "Sync IDE settings, extensions, and configs across Linux/Windows workstations" },
    { id: "dev-ide-005", name: "Create Heady-specific code snippets library", cat: "dev-acceleration", pool: "cold", w: 2, desc: "Pre-built snippet library for common Heady patterns: Vec3, governance, bee defs" },
    { id: "dev-ide-006", name: "Set up automated PR review pipeline", cat: "dev-acceleration", pool: "warm", w: 4, desc: "Auto-review PRs against governance policies before merge" },
    { id: "dev-ide-007", name: "Configure HeadyMCP IDE integration", cat: "dev-acceleration", pool: "warm", w: 4, desc: "Wire HeadyMCP tools into IDE for in-editor spatial queries and agent management" },
    { id: "dev-ide-008", name: "Build test harness generator", cat: "dev-acceleration", pool: "warm", w: 3, desc: "Auto-generate node:test scaffolding for new service files" },
    { id: "dev-ide-009", name: "Create deployment shortcut commands", cat: "dev-acceleration", pool: "cold", w: 2, desc: "One-command deployment to Cloud Run from IDE terminal" },
    { id: "dev-ide-010", name: "Monitor dev velocity metrics", cat: "dev-acceleration", pool: "cold", w: 2, desc: "Track commits/day, files changed, services deployed for productivity insights" },

    // ═══ SUBSCRIPTION STACK OPTIMIZATION (15) ═══════════════════════════════
    { id: "sub-opt-001", name: "Route training to Colab Pro+ exclusively", cat: "subscription-optimization", pool: "warm", w: 4, desc: "Ensure ALL heavy ML tasks (vectorization, training) run on Colab Pro+, not GCP" },
    { id: "sub-opt-002", name: "Segregate live trading from training compute", cat: "subscription-optimization", pool: "hot", w: 5, desc: "Absolute isolation: GCP Chicago for live trading, Colab for ML — never mix" },
    { id: "sub-opt-003", name: "Optimize Cloudflare Zero Trust routing", cat: "subscription-optimization", pool: "warm", w: 4, desc: "Use Cloudflare Zero Trust for inter-node security instead of custom mTLS" },
    { id: "sub-opt-004", name: "Monitor monthly infrastructure burn rate", cat: "subscription-optimization", pool: "warm", w: 4, desc: "Track actual spend across GCP, Cloudflare, API keys vs $750/mo budget" },
    { id: "sub-opt-005", name: "Deploy GCP instances near Chicago exchange", cat: "subscription-optimization", pool: "hot", w: 5, desc: "Host live trading containers in us-central1 (closest to CME) for sub-ms latency" },
    { id: "sub-opt-006", name: "Route LLMs to end-of-day analysis only", cat: "subscription-optimization", pool: "warm", w: 4, desc: "Keep Claude/OpenAI/Perplexity OUT of live trading path — EOD analysis only" },
    { id: "sub-opt-007", name: "Use Perplexity for morning macro scan", cat: "subscription-optimization", pool: "warm", w: 3, desc: "Daily 6AM Perplexity API call for CPI/FOMC/macro no-trade zone detection" },
    { id: "sub-opt-008", name: "Optimize HuggingFace token rotation", cat: "subscription-optimization", pool: "warm", w: 3, desc: "Implement 3-token round-robin rotation per v9.0 blueprint for HF inference" },
    { id: "sub-opt-009", name: "Track API cost per trade execution", cat: "subscription-optimization", pool: "warm", w: 3, desc: "Calculate exact infrastructure cost per trade to verify profitability margin" },
    { id: "sub-opt-010", name: "Self-sustaining infrastructure validation", cat: "subscription-optimization", pool: "warm", w: 4, desc: "Verify trading revenue covers ALL infrastructure costs (self-sustaining check)" },
    { id: "sub-opt-011", name: "Monitor Upstash Redis memory utilization", cat: "subscription-optimization", pool: "warm", w: 3, desc: "Track Upstash memory usage and optimize for working memory efficiency" },
    { id: "sub-opt-012", name: "Optimize Neon Postgres query patterns", cat: "subscription-optimization", pool: "warm", w: 3, desc: "Analyze and optimize pgvector queries for cost-effective compute units" },
    { id: "sub-opt-013", name: "Track Sentry event quota utilization", cat: "subscription-optimization", pool: "cold", w: 2, desc: "Monitor Sentry event consumption against plan limits" },
    { id: "sub-opt-014", name: "Audit unused API key subscriptions", cat: "subscription-optimization", pool: "cold", w: 2, desc: "Identify and cancel unused or underutilized API subscriptions" },
    { id: "sub-opt-015", name: "Calculate infrastructure ROI per angle", cat: "subscription-optimization", pool: "warm", w: 4, desc: "ROI analysis per strategic angle: trading, IaaS, licensing, consulting" },

    // ─── ARCHITECTURE FIX TASKS (from merged architecture-fix-tasks.json) ──────
    { id: "arch-fix-001", name: "Resolve heady-conductor import gaps", cat: "architecture-fix", pool: "hot", w: 5, desc: "Fix missing module imports in heady-conductor.js discovered during ecosystem audit" },
    { id: "arch-fix-002", name: "Wire engine-wiring.js bootstrap sequence", cat: "architecture-fix", pool: "hot", w: 5, desc: "Ensure engine-wiring.js initializes all engines in correct dependency order" },
    { id: "arch-fix-003", name: "Validate pipeline stage DAG integrity", cat: "architecture-fix", pool: "hot", w: 5, desc: "Run DAG cycle detection on all HCFullPipeline stage dependencies" },
    { id: "arch-fix-004", name: "Fix orphaned event listeners", cat: "architecture-fix", pool: "warm", w: 4, desc: "Detect and clean up event listeners without matching emitters" },
    { id: "arch-fix-005", name: "Resolve circular require() chains", cat: "architecture-fix", pool: "hot", w: 5, desc: "Break circular dependency loops in orchestration/ modules" },
    { id: "arch-fix-006", name: "Standardize error propagation patterns", cat: "architecture-fix", pool: "warm", w: 4, desc: "Ensure all modules use consistent error wrapping with HeadyError" },
    { id: "arch-fix-007", name: "Audit dead code in orchestration/", cat: "architecture-fix", pool: "warm", w: 3, desc: "Identify and remove unreachable code paths across orchestration modules" },
    { id: "arch-fix-008", name: "Validate all module.exports signatures", cat: "architecture-fix", pool: "warm", w: 3, desc: "Check all exports match their documented API surface" },
    { id: "arch-fix-009", name: "Fix stale singleton references", cat: "architecture-fix", pool: "warm", w: 4, desc: "Replace stale singleton references with fresh-init patterns" },
    { id: "arch-fix-010", name: "Harden graceful shutdown hooks", cat: "architecture-fix", pool: "hot", w: 5, desc: "Ensure all new modules register SIGTERM/SIGINT handlers for clean shutdown" },

    // ─── AUTOCONTEXT INTEGRATION (from merged autocontext-integration-tasks.json) ─
    { id: "autoctx-001", name: "Bootstrap autocontext event listeners", cat: "autocontext-integration", pool: "hot", w: 5, desc: "Register autocontext pipeline events on global.eventBus" },
    { id: "autoctx-002", name: "Wire vector-memory.js to pg-vector-adapter", cat: "autocontext-integration", pool: "hot", w: 5, desc: "Connect in-memory vector store to persistent pgvector backend" },
    { id: "autoctx-003", name: "Implement context window rotation", cat: "autocontext-integration", pool: "warm", w: 4, desc: "Auto-rotate context windows based on token budget from budgetMonitor" },
    { id: "autoctx-004", name: "Register CSL benchmark hooks", cat: "autocontext-integration", pool: "warm", w: 4, desc: "Wire cslBenchmark.js into pipeline telemetry for quality tracking" },
    { id: "autoctx-005", name: "Connect change classifier to deploy pipeline", cat: "autocontext-integration", pool: "warm", w: 4, desc: "Feed changeClassifier.js output to auto-commit-deploy.js decisions" },
    { id: "autoctx-006", name: "Wire patent tracker to IP governance", cat: "autocontext-integration", pool: "warm", w: 3, desc: "Connect patentTracker.js claims to governance engine IP checks" },
    { id: "autoctx-007", name: "Register hallucination watchdog monitors", cat: "autocontext-integration", pool: "hot", w: 5, desc: "Activate heady-hallucination-watchdog.js on all LLM response paths" },
    { id: "autoctx-008", name: "Wire webhook dispatcher to event bus", cat: "autocontext-integration", pool: "warm", w: 4, desc: "Connect heady-webhook-dispatcher.js to global event bus for outbound notifications" },
    { id: "autoctx-009", name: "Connect budget monitor to governance engine", cat: "autocontext-integration", pool: "hot", w: 5, desc: "Wire budgetMonitor.js alerts to GovernanceEngine budget policy enforcement" },
    { id: "autoctx-010", name: "Register competitive intel data feeds", cat: "autocontext-integration", pool: "warm", w: 3, desc: "Connect competitive-intelligence-engine.js to scheduled data ingestion" },

    // ─── AUTONOMY ENHANCEMENT (from merged autonomy-enhancement-tasks.json) ──────
    { id: "autonomy-001", name: "Enable self-healing pipeline restarts", cat: "autonomy-enhancement", pool: "hot", w: 5, desc: "Auto-restart failed pipeline stages with exponential backoff" },
    { id: "autonomy-002", name: "Implement autonomous task generation", cat: "autonomy-enhancement", pool: "hot", w: 5, desc: "Generate new tasks from cslBenchmark gaps without human intervention" },
    { id: "autonomy-003", name: "Deploy auto-commit-deploy.js in CI", cat: "autonomy-enhancement", pool: "warm", w: 4, desc: "Enable automatic commit+deploy for passing pipeline runs" },
    { id: "autonomy-004", name: "Wire MAPE-K feedback loop", cat: "autonomy-enhancement", pool: "hot", w: 5, desc: "Connect mape-k.js Monitor-Analyze-Plan-Execute-Knowledge cycle" },
    { id: "autonomy-005", name: "Enable argus-v2 autonomous monitoring", cat: "autonomy-enhancement", pool: "warm", w: 4, desc: "Activate argus-v2.js for continuous system observation" },
    { id: "autonomy-006", name: "Enable hermes-v2 inter-agent messaging", cat: "autonomy-enhancement", pool: "warm", w: 4, desc: "Activate hermes-v2.js for cross-agent communication routing" },
    { id: "autonomy-007", name: "Enable kronos-v2 temporal scheduling", cat: "autonomy-enhancement", pool: "warm", w: 4, desc: "Activate kronos-v2.js for time-aware task scheduling" },
    { id: "autonomy-008", name: "Implement self-correction loop triggers", cat: "autonomy-enhancement", pool: "hot", w: 5, desc: "Wire self-correction-loop.js to auto-detect and fix regressions" },
    { id: "autonomy-009", name: "Enable autonomous dependency updates", cat: "autonomy-enhancement", pool: "warm", w: 3, desc: "Auto-merge safe dependabot PRs after CI passes" },
    { id: "autonomy-010", name: "Deploy sacred geometry topology health", cat: "autonomy-enhancement", pool: "warm", w: 3, desc: "Monitor SG topology node health and auto-rebalance" },

    // ─── BENEFICIAL BUNDLE (from merged beneficial-bundle-tasks.json) ─────────────
    { id: "bundle-001", name: "Bundle watchdog + hallucination detector", cat: "beneficial-bundle", pool: "hot", w: 5, desc: "Package watchdog + hallucination detector as standalone quality module" },
    { id: "bundle-002", name: "Bundle vector adapter + memory layer", cat: "beneficial-bundle", pool: "warm", w: 4, desc: "Package pg-vector-adapter + vector-memory as portable memory module" },
    { id: "bundle-003", name: "Bundle event bus + bridge as messaging kit", cat: "beneficial-bundle", pool: "warm", w: 4, desc: "Package heady-event-bus + hcfp-event-bridge as standalone messaging layer" },
    { id: "bundle-004", name: "Bundle budget + governance as compliance kit", cat: "beneficial-bundle", pool: "warm", w: 4, desc: "Package budgetMonitor + governance-engine as enterprise compliance module" },
    { id: "bundle-005", name: "Bundle CI engine + patent tracker as IP kit", cat: "beneficial-bundle", pool: "warm", w: 3, desc: "Package competitive-intelligence + patentTracker for IP management" },
    { id: "bundle-006", name: "Bundle agents (argus+hermes+kronos) as swarm kit", cat: "beneficial-bundle", pool: "warm", w: 4, desc: "Package v2 agents as deployable multi-agent swarm module" },
    { id: "bundle-007", name: "Bundle CSL + benchmark as quality SDK", cat: "beneficial-bundle", pool: "warm", w: 3, desc: "Package cslBenchmark + changeClassifier as quality assurance SDK" },
    { id: "bundle-008", name: "Generate npm package.json per bundle", cat: "beneficial-bundle", pool: "warm", w: 3, desc: "Create scoped @heady/ package manifests for each bundle" },
    { id: "bundle-009", name: "Generate bundle documentation", cat: "beneficial-bundle", pool: "cold", w: 2, desc: "Auto-generate README + API docs for each module bundle" },
    { id: "bundle-010", name: "Validate bundle cross-dependency isolation", cat: "beneficial-bundle", pool: "warm", w: 4, desc: "Ensure bundles can be deployed independently without leaking deps" },

    // ─── UNIMPLEMENTED ARCHITECTURE (from merged unimplemented-arch-tasks.json) ───
    { id: "unimpl-001", name: "Implement real WebSocket transport layer", cat: "unimplemented-arch", pool: "hot", w: 5, desc: "Replace stub WS connections with real socket.io/ws transport" },
    { id: "unimpl-002", name: "Implement persistent task queue", cat: "unimplemented-arch", pool: "hot", w: 5, desc: "Replace in-memory task queues with Redis/BullMQ persistence" },
    { id: "unimpl-003", name: "Implement real metrics collection", cat: "unimplemented-arch", pool: "warm", w: 4, desc: "Wire OpenTelemetry metrics to actual collector endpoint" },
    { id: "unimpl-004", name: "Implement distributed lock manager", cat: "unimplemented-arch", pool: "hot", w: 5, desc: "Add Redis-backed distributed locks for multi-instance safety" },
    { id: "unimpl-005", name: "Implement real secret rotation", cat: "unimplemented-arch", pool: "hot", w: 5, desc: "Connect to GCP Secret Manager for automatic credential rotation" },
    { id: "unimpl-006", name: "Implement circuit breaker for external APIs", cat: "unimplemented-arch", pool: "warm", w: 4, desc: "Add circuit breaker pattern to all external API calls (LLM, trading, etc.)" },
    { id: "unimpl-007", name: "Implement real-time dashboard WebSocket feed", cat: "unimplemented-arch", pool: "warm", w: 4, desc: "Live dashboard data via WebSocket instead of polling" },
    { id: "unimpl-008", name: "Implement multi-region failover", cat: "unimplemented-arch", pool: "cold", w: 3, desc: "Active-passive failover between us-east1 and us-central1" },
    { id: "unimpl-009", name: "Implement audit log immutable storage", cat: "unimplemented-arch", pool: "warm", w: 4, desc: "Store governance audit trail in append-only immutable storage" },
    { id: "unimpl-010", name: "Implement canary deployment pipeline", cat: "unimplemented-arch", pool: "warm", w: 3, desc: "Gradual traffic shifting for new Cloud Run revisions" },

    // ─── NEW MODULE HEALTH CHECKS ────────────────────────────────────────────────
    { id: "mod-health-001", name: "Health check: pg-vector-adapter", cat: "module-health", pool: "hot", w: 5, desc: "Validate pg-vector-adapter.js connects to Neon and responds to vector queries" },
    { id: "mod-health-002", name: "Health check: hallucination-watchdog", cat: "module-health", pool: "hot", w: 5, desc: "Validate heady-hallucination-watchdog.js detects test hallucinations" },
    { id: "mod-health-003", name: "Health check: webhook-dispatcher", cat: "module-health", pool: "warm", w: 4, desc: "Validate heady-webhook-dispatcher.js sends and confirms webhooks" },
    { id: "mod-health-004", name: "Health check: budget-monitor", cat: "module-health", pool: "warm", w: 4, desc: "Validate budgetMonitor.js tracks spend and fires alerts at thresholds" },
    { id: "mod-health-005", name: "Health check: competitive-intel", cat: "module-health", pool: "warm", w: 3, desc: "Validate competitive-intelligence-engine.js loads and parses market data" },
    { id: "mod-health-006", name: "Health check: patent-tracker", cat: "module-health", pool: "cold", w: 2, desc: "Validate patentTracker.js claim registry loads and persists" },
    { id: "mod-health-007", name: "Health check: argus-v2 agent", cat: "module-health", pool: "warm", w: 4, desc: "Validate argus-v2.js initializes, observes, and reports correctly" },
    { id: "mod-health-008", name: "Health check: hermes-v2 agent", cat: "module-health", pool: "warm", w: 4, desc: "Validate hermes-v2.js inter-agent message routing works" },
    { id: "mod-health-009", name: "Health check: kronos-v2 agent", cat: "module-health", pool: "warm", w: 4, desc: "Validate kronos-v2.js temporal scheduling is accurate" },
    { id: "mod-health-010", name: "Health check: change-classifier", cat: "module-health", pool: "warm", w: 3, desc: "Validate changeClassifier.js categorizes diffs correctly" },
    { id: "mod-health-011", name: "Health check: csl-benchmark", cat: "module-health", pool: "warm", w: 3, desc: "Validate cslBenchmark.js runs and produces valid quality reports" },
    { id: "mod-health-012", name: "Health check: auto-commit-deploy", cat: "module-health", pool: "hot", w: 5, desc: "Validate auto-commit-deploy.js dry-run commit + deploy sequence" },
    { id: "mod-health-013", name: "Health check: heady-event-bus", cat: "module-health", pool: "hot", w: 5, desc: "Validate heady-event-bus.js pub/sub, wildcard, and replay work" },
    { id: "mod-health-014", name: "Health check: hcfp-event-bridge", cat: "module-health", pool: "hot", w: 5, desc: "Validate hcfp-event-bridge.js connects HCFPRunner events to global bus" },
    { id: "mod-health-015", name: "Health check: engine-wiring bootstrap", cat: "module-health", pool: "hot", w: 5, desc: "Validate engine-wiring.js initializes all engines without errors" },

    // ─── EVENT BUS + PIPELINE BRIDGE ─────────────────────────────────────────────
    { id: "evt-pipe-001", name: "Boot heady-event-bus on startup", cat: "event-bus-pipeline", pool: "hot", w: 5, desc: "Initialize global.eventBus from heady-event-bus.js in bootstrap" },
    { id: "evt-pipe-002", name: "Activate HCFP event bridge", cat: "event-bus-pipeline", pool: "hot", w: 5, desc: "Wire hcfp-event-bridge.js so HCFPRunner events flow to global bus" },
    { id: "evt-pipe-003", name: "Register all pipeline stages with event bus", cat: "event-bus-pipeline", pool: "hot", w: 5, desc: "Emit stage:start/stage:complete events for all 8 pipeline stages" },
    { id: "evt-pipe-004", name: "Connect auto-success to pipeline completions", cat: "event-bus-pipeline", pool: "hot", w: 5, desc: "Auto-success triggers on pipeline:completed events via bridge" },
    { id: "evt-pipe-005", name: "Implement event replay for missed completions", cat: "event-bus-pipeline", pool: "warm", w: 4, desc: "Replay missed pipeline events to auto-success on reconnect" },
    { id: "evt-pipe-006", name: "Wire governance decisions to event bus", cat: "event-bus-pipeline", pool: "warm", w: 4, desc: "Emit governance:allow/deny/escalate events for audit dashboard" },
    { id: "evt-pipe-007", name: "Wire kill-switch events to webhook dispatcher", cat: "event-bus-pipeline", pool: "hot", w: 5, desc: "Trading kill-switch fires webhooks to Slack/Discord/PagerDuty" },
    { id: "evt-pipe-008", name: "Implement event bus health heartbeat", cat: "event-bus-pipeline", pool: "warm", w: 3, desc: "60s heartbeat pulse on event bus to verify liveness" },

    // ─── COMPETITIVE INTELLIGENCE ────────────────────────────────────────────────
    { id: "ci-001", name: "Activate competitor tracking feeds", cat: "competitive-intel", pool: "warm", w: 4, desc: "Enable scheduled competitor data ingestion in CI engine" },
    { id: "ci-002", name: "Build market position heatmap", cat: "competitive-intel", pool: "warm", w: 3, desc: "Generate visual market position map from CI engine data" },
    { id: "ci-003", name: "Track AI agent framework releases", cat: "competitive-intel", pool: "warm", w: 3, desc: "Monitor releases of LangChain, AutoGen, CrewAI, etc." },
    { id: "ci-004", name: "Analyze competitor pricing models", cat: "competitive-intel", pool: "warm", w: 3, desc: "Track SaaS pricing of competing AI platforms" },
    { id: "ci-005", name: "Benchmark Heady vs competitors on latency", cat: "competitive-intel", pool: "warm", w: 4, desc: "Run latency benchmarks against OpenAI, Anthropic API gateways" },
    { id: "ci-006", name: "Generate weekly competitive digest", cat: "competitive-intel", pool: "cold", w: 2, desc: "Auto-generate weekly competitor intelligence summary" },
    { id: "ci-007", name: "Alert on competitive threat signals", cat: "competitive-intel", pool: "hot", w: 5, desc: "Fire alerts when competitors announce features in Heady's domain" },
];

// ─── DYNAMIC JSON TASK LOADER ──────────────────────────────────────────────────
// Auto-imports all 254 tasks from the 5 merged JSON task files
const JSON_TASK_FILES = [
  'architecture-fix-tasks.json',
  'autocontext-integration-tasks.json',
  'autonomy-enhancement-tasks.json',
  'beneficial-bundle-tasks.json',
  'unimplemented-arch-tasks.json',
];

let JSON_TASKS = [];
try {
  const path = require('path');
  for (const file of JSON_TASK_FILES) {
    const filePath = path.join(__dirname, '..', 'orchestration', file);
    try {
      const data = require(filePath);
      const tasks = Array.isArray(data) ? data : (data.tasks || data.categories || []);
      JSON_TASKS = JSON_TASKS.concat(tasks);
    } catch (e) {
      // Graceful skip if file not found (won't break catalog)
    }
  }
} catch (e) {
  // Fallback — no dynamic loading in non-Node environments
}

// ─── POOL ALLOCATION ────────────────────────────────────────────────────────
module.exports = { TASK_CATALOG, JSON_TASKS, JSON_TASK_FILES };
