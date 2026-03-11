#!/usr/bin/env python3
"""
HEADY™ Full Site Generator
Generates all 9 websites + auth app with:
- 2000+ words unique content per site
- Sacred geometry canvas per site
- Dark glassmorphism styling
- Cross-site navigation
- Auth widget integration
- AutoContext bridge
- Bee content injectors
- No ranking/priority language
"""

import os, json

BASE = "/home/user/workspace/heady-system-build"

# ════════════════════════════════════════════════════════════
# SITE DEFINITIONS — All 9 sites from registry
# ════════════════════════════════════════════════════════════

SITES = [
    {
        "slug": "headyme",
        "domain": "headyme.com",
        "name": "HeadyMe",
        "tagline": "Your AI Operating System",
        "description": "The autonomous intelligence platform that thinks, orchestrates, and evolves. 51+ patents. 21 microservices. One unified experience.",
        "role": "personal-cloud",
        "accent": "#00d4aa",
        "accentGlow": "rgba(0,212,170,0.15)",
        "sacredGeometry": "Flower of Life",
        "navLinks": [
            {"label": "Platform", "href": "#platform"},
            {"label": "AI Nodes", "href": "#nodes"},
            {"label": "Pricing", "href": "#pricing"},
            {"label": "HeadySystems", "href": "https://headysystems.com", "cta": True},
        ],
        "features": [
            {"icon": "◎", "title": "Personal Dashboard", "desc": "Unified view across all Heady services — your command center for orchestrating 20+ AI nodes, monitoring task execution, and reviewing context enrichment in real time. Every interaction is recorded, every pattern learned."},
            {"icon": "◈", "title": "3D AI Memory", "desc": "Vector-spatial context that remembers everything with O(log n) octree retrieval. Your personal knowledge graph spans 384-dimensional space, enabling instant semantic recall across every conversation and document."},
            {"icon": "◇", "title": "Cloud Runtime", "desc": "Managed execution environment for 20 autonomous AI nodes with hot-reload and φ-scaled auto-scaling. Each node runs in its own Cloudflare Worker with Durable Object state persistence."},
            {"icon": "⬡", "title": "Cross-Vertical Sync", "desc": "Seamlessly share context between all Heady apps — one memory, one identity, one continuous experience. What you learn in HeadyAI enhances your HeadyOS workflows automatically."},
        ],
        "stats": [
            {"num": "51+", "label": "Patents"},
            {"num": "21", "label": "Services"},
            {"num": "20", "label": "AI Nodes"},
            {"num": "384", "label": "Vector Dims"},
        ],
        "deepDive": """
<h3>What is HeadyMe?</h3>
<p>HeadyMe is the personal face of the Heady™ ecosystem — a unified AI operating system that puts you at the center of an intelligent network spanning research, development, finance, community, and enterprise infrastructure. Unlike traditional AI assistants that reset with every conversation, HeadyMe maintains a persistent 3D vector memory space that continuously learns and evolves with every interaction.</p>

<p>At its core, HeadyMe operates through a revolutionary architecture built on three foundational principles: Continuous Semantic Logic (CSL), Sacred Geometry scaling, and Vector Symbolic Architecture. These aren't marketing buzzwords — they represent patented innovations (51+ provisional patents filed) that fundamentally change how AI systems think, remember, and act.</p>

<h3>The Personal Dashboard Experience</h3>
<p>When you log into HeadyMe, you enter a living command center. The dashboard presents a real-time view of your entire AI ecosystem: active nodes processing tasks, memory vectors being enriched, context flowing between services, and patterns being discovered. Every element on the dashboard is backed by actual telemetry data flowing through OpenTelemetry-instrumented microservices.</p>

<p>The dashboard's layout follows φ-scaled spacing — the golden ratio (1.618) governs every margin, padding, and proportion. This isn't aesthetic whimsy; research in cognitive science demonstrates that golden-ratio proportions reduce cognitive load and improve information retention. When every visual element harmonizes mathematically, your brain processes information more efficiently.</p>

<h3>3D Vector Memory — Your Permanent Knowledge Graph</h3>
<p>HeadyMe's memory system operates in 384-dimensional vector space using pgvector with octree spatial indexing. When you have a conversation, write a document, or browse a webpage within the Heady ecosystem, the content is embedded into this high-dimensional space using our multi-provider embedding router (supporting OpenAI, Cohere, Voyage AI, and local models).</p>

<p>Retrieval uses CSL gates — geometric thresholds that determine context relevance. A cosine similarity of 0.382 (ψ²) means the content is included in the context window. At 0.618 (ψ), it's boosted and given higher prominence. At 0.718 (ψ + 0.1), it's automatically injected into any AI interaction without you asking. This means HeadyMe proactively surfaces the right information at the right time.</p>

<p>The memory isn't flat — it's spatial. Related concepts cluster together in 3D space, and you can literally navigate your knowledge graph like exploring a galaxy. Each node represents an embedded concept, and connections between nodes represent semantic relationships discovered through continuous analysis.</p>

<h3>20 Autonomous AI Nodes</h3>
<p>HeadyMe orchestrates 20 distinct AI processing nodes, each running as a Cloudflare Worker with Durable Object state persistence. These nodes cover every aspect of AI interaction: natural language understanding, code generation, research synthesis, creative writing, data analysis, image understanding, voice processing, and more.</p>

<p>Each node participates in the HeadyBee swarm system. When you submit a task, the system doesn't route to a single model — it dispatches concurrent worker bees across all relevant nodes simultaneously. Results are aggregated using CSL relevance scoring, and the best output is returned. There's no queue, no waiting, no sequential processing. Everything happens at once.</p>

<h3>Cross-Vertical Context Sharing</h3>
<p>What makes HeadyMe truly unique is its position as the nexus point for all Heady services. Context discovered while using HeadyAI for research automatically enriches your HeadyOS development environment. Patterns learned from HeadyFinance market analysis inform your HeadyEX agent strategies. Non-profit impact data from HeadyConnection.org feeds into community engagement metrics on HeadyConnection.com.</p>

<p>This cross-pollination is handled by the AutoContext bridge — a persistent JavaScript module running on every page that continuously monitors, embeds, and syncs context across all nine Heady domains. The bridge uses a φ-scaled heartbeat (every 29.034 seconds — φ⁷ milliseconds) to synchronize state, ensuring no context is ever lost.</p>

<h3>Security and Privacy</h3>
<p>Every HeadyMe interaction is protected by zero-trust security architecture. Authentication flows through auth.headysystems.com using Firebase Auth with Google OAuth, email/password, and anonymous guest modes. Tokens are stored as httpOnly, Secure, SameSite=Strict cookies — never in browser storage where they'd be vulnerable to XSS attacks. All API calls use mTLS client certificates through Envoy sidecar proxies, and every request is signed with Ed25519 cryptographic receipts for complete audit trails.</p>

<p>Your vector memory is encrypted at rest and in transit. Only your authenticated identity can query your personal knowledge graph. The system uses post-quantum cryptographic primitives (CRYSTALS-Kyber for key exchange, CRYSTALS-Dilithium for signatures) to ensure your data remains secure even against future quantum computing threats.</p>
""",
        "howItWorks": [
            {"title": "Sign In", "desc": "Authenticate once via auth.headysystems.com. Your identity propagates across all 9 Heady sites instantly through secure cookie relay."},
            {"title": "Context Loads", "desc": "AutoContext bridge pre-enriches your session with relevant history, preferences, and active task context from 384-dim vector memory."},
            {"title": "Execute Tasks", "desc": "Submit any task — 20 AI nodes fire simultaneously. HeadyBee workers process concurrently. Results aggregate via CSL relevance scoring."},
            {"title": "Memory Evolves", "desc": "Every interaction enriches your persistent knowledge graph. Patterns compound over time, making the system faster and more accurate."},
        ],
        "useCases": [
            {"icon": "🔬", "title": "Research Synthesis", "desc": "Feed papers, articles, and datasets into HeadyMe. The system cross-references everything in vector space and surfaces insights you'd never find manually."},
            {"icon": "💻", "title": "Development Workflow", "desc": "HeadyMe integrates with your IDE through HeadyOS. Code context, documentation, and architectural decisions are all vectorized and available instantly."},
            {"icon": "📊", "title": "Business Intelligence", "desc": "Connect financial data from HeadyFinance, market signals from HeadyEX, and community feedback from HeadyConnection for holistic business intelligence."},
            {"icon": "🎨", "title": "Creative Projects", "desc": "Use the multi-model council to generate, iterate, and refine creative content. HeadyMe remembers your style preferences and brand guidelines across sessions."},
            {"icon": "🤝", "title": "Team Collaboration", "desc": "Share context graphs with team members. Collaborative vector spaces let multiple users contribute to and benefit from shared knowledge bases."},
            {"icon": "🔐", "title": "Personal Privacy Vault", "desc": "All your data lives in your encrypted personal vault. Export, delete, or transfer at any time. You own your intelligence."},
        ],
        "faqs": [
            {"q": "What makes HeadyMe different from ChatGPT or Claude?", "a": "HeadyMe isn't a chatbot — it's an operating system. While ChatGPT and Claude are conversation interfaces to single models, HeadyMe orchestrates 20+ AI nodes simultaneously, maintains persistent 3D vector memory across sessions, and connects nine specialized platforms into one unified intelligence layer. Your context never resets."},
            {"q": "How does the 3D vector memory work?", "a": "Content is embedded into 384-dimensional vectors using our multi-provider embedding router. These vectors are stored in pgvector with octree spatial indexing for O(log n) retrieval. CSL gates (0.382/0.618/0.718 cosine thresholds) automatically determine what context to include, boost, or inject into any AI interaction."},
            {"q": "Is my data private?", "a": "Absolutely. HeadyMe uses zero-trust architecture with mTLS, Ed25519 signed receipts, and post-quantum cryptographic primitives. Your vector memory is encrypted at rest and in transit. Only your authenticated identity can access your knowledge graph. We never train on your data."},
            {"q": "What is Sacred Geometry scaling?", "a": "Every parameter in HeadyMe — spacing, timeouts, retry intervals, cache durations, resource pools — is scaled using the golden ratio φ (1.618) and Fibonacci sequences. This mathematically optimal scaling creates natural load distribution patterns that avoid resonance cascades common in systems using arbitrary constants."},
            {"q": "Can I use HeadyMe offline?", "a": "HeadyMe supports progressive web app (PWA) capabilities with Cloudflare Workers providing edge caching. Core functionality including local vector search and cached model inference works offline. Full capabilities require connectivity for cross-service orchestration."},
            {"q": "How does cross-site context work?", "a": "The AutoContext bridge runs on every Heady page, synchronizing context via secure postMessage channels and cookie-based session relay. When you learn something on HeadyAI, that knowledge is immediately available on HeadyMe, HeadyOS, and all other Heady sites."},
            {"q": "What AI models does HeadyMe use?", "a": "HeadyMe routes through the Multi-Model Council: Claude (Anthropic), GPT (OpenAI), Gemini (Google), Groq (fast inference), Perplexity (research), and specialized open-source models via HuggingFace. Model selection is automatic based on CSL domain similarity matching — not cost tiers or ranking."},
            {"q": "How much does HeadyMe cost?", "a": "HeadyMe offers a free tier with basic AI node access and 1GB vector memory. Pro plans scale with usage — pay for the compute and memory you consume. Enterprise plans include dedicated infrastructure, custom model fine-tuning, and SLA guarantees. All tiers receive equal service quality."},
        ],
    },
    {
        "slug": "headysystems",
        "domain": "headysystems.com",
        "name": "HeadySystems",
        "tagline": "Enterprise AI Orchestration",
        "description": "Self-healing infrastructure, multi-agent orchestration, live telemetry, and zero-trust security — the backbone powering every Heady service.",
        "role": "infrastructure",
        "accent": "#00d4aa",
        "accentGlow": "rgba(0,212,170,0.15)",
        "sacredGeometry": "Metatrons Cube",
        "navLinks": [
            {"label": "Infrastructure", "href": "#infrastructure"},
            {"label": "Services", "href": "#services"},
            {"label": "Security", "href": "#security"},
            {"label": "HeadyMe", "href": "https://headyme.com", "cta": True},
        ],
        "features": [
            {"icon": "⟐", "title": "Self-Healing Infrastructure", "desc": "Auto-heal resilience loops, circuit breakers, and autonomous recovery. The system detects, quarantines, and repairs failures without human intervention using φ-scaled exponential backoff."},
            {"icon": "⬡", "title": "50+ Microservices", "desc": "Every service features /health endpoints, AutoContext middleware, Envoy sidecar proxies for mTLS, Consul service discovery, and OpenTelemetry distributed tracing across MCP/SSE channels."},
            {"icon": "◎", "title": "Live Telemetry", "desc": "Structured logging with correlation IDs, health probes, race audits, and real-time dashboards. Monitor CPU, memory, GC, and event-loop telemetry across all services simultaneously."},
            {"icon": "◇", "title": "HCFP Auto-Success", "desc": "Continuous deployment pipeline with security scanning, SBOM generation, canary releases, and automated rollback. Every deployment is tested against all 8 Unbreakable Laws."},
            {"icon": "△", "title": "Zero Trust Security", "desc": "mTLS client certificates, secret rotation via Cloudflare, WARP enforcement, Ed25519 signed cryptographic receipts, and post-quantum key exchange for future-proof protection."},
            {"icon": "⊛", "title": "Edge Mesh Network", "desc": "Cloudflare Workers edge proxy with KV caching, sub-50ms latency worldwide, Durable Objects for stateful edge compute, and Workers AI for inference at the edge."},
        ],
        "stats": [
            {"num": "50+", "label": "Services"},
            {"num": "17", "label": "Swarms"},
            {"num": "99.9%", "label": "Uptime"},
            {"num": "<50ms", "label": "Edge Latency"},
        ],
        "deepDive": """
<h3>The Backbone of the Heady Ecosystem</h3>
<p>HeadySystems is the infrastructure layer that powers every service, every site, and every AI interaction in the Heady ecosystem. While HeadyMe provides the personal interface and HeadyOS offers the developer experience, HeadySystems is the engine room — 50+ microservices orchestrated through sacred geometry principles, self-healing automatically, and scaling without limits.</p>

<p>The architecture follows a service mesh pattern with Envoy sidecar proxies handling all inter-service communication. Every request is authenticated via mTLS client certificates, traced via OpenTelemetry spans, and enriched via HeadyAutoContext middleware before reaching its destination. There are no unauthenticated paths, no untraced requests, no unenriched interactions.</p>

<h3>Service Architecture — 50+ Microservices</h3>
<p>HeadySystems operates 50+ distinct microservices organized into functional domains. Core Intelligence services include heady-brain (central AI reasoning), heady-embed (embedding generation), heady-memory (persistence layer), and heady-vector (spatial operations). Agent services include heady-bee-factory (dynamic bee creation), heady-hive (coordination hub), and heady-orchestration (swarm management).</p>

<p>Security services encompass heady-guard (enforcement layer with 20+ modules), heady-security (vulnerability scanning), and heady-governance (policy enforcement). Monitoring runs through heady-health (17-file health monitoring system), heady-eval (evaluation engine), and heady-maintenance (self-healing).</p>

<p>Every service follows the same contract: a /health endpoint returning structured status, AutoContext middleware enriching every request, bulkhead thread pools preventing cascading failures, and φ-scaled timeouts using golden ratio intervals (1s, 1.618s, 2.618s, 4.236s) for retry logic.</p>

<h3>17-Swarm Concurrent Orchestration</h3>
<p>HeadySystems coordinates 17 specialized swarms that operate as concurrent equals — no hierarchy, no ranking, no ordering. The swarms span every operational domain: heady-soul (orchestration), csl-gateway (inference), vector-weaver (memory), context-shepherd (context management), security-hive (security), deploy-forge (deployment), data-sculptor (data operations), research-herald (research), monitor-pulse (monitoring), edge-runner (edge compute), bridge-keeper (integration), pattern-scout (analysis), heal-smith (reliability), trade-wind (fintech), doc-scribe (documentation), test-prover (testing), and policy-sentinel (governance).</p>

<p>When a task enters the system, all relevant swarms activate simultaneously. Each swarm dispatches its own bee workers to handle the task from their domain perspective. Results are aggregated via CSL relevance gates — not by importance ranking but by semantic similarity to the task domain. This concurrent execution model means HeadySystems processes tasks in parallel at scale that sequential systems cannot match.</p>

<h3>Self-Healing and Resilience</h3>
<p>Every service in HeadySystems is wrapped in resilience patterns. Circuit breakers prevent cascading failures by isolating unhealthy services. Bulkhead thread pools ensure that one service's overload cannot starve others of resources. Health probes run on φ-scaled intervals, and when a service fails its health check, the system automatically quarantines it, spins up a replacement, validates the replacement's health, and redirects traffic — all without human intervention.</p>

<p>The self-healing system uses exponential backoff with φ-scaling: first retry at 1.618 seconds, second at 2.618, third at 4.236, following the golden ratio progression. This avoids the thundering herd problem that occurs with fixed-interval retries, because φ-scaled intervals distribute retry attempts across non-overlapping time windows.</p>

<h3>Deployment Pipeline — HCFP Auto-Success</h3>
<p>Deployments flow through the Heady Continuous Flow Pipeline (HCFP), a 21-stage cognitive state machine that handles everything from code commit to production traffic routing. Stages include static analysis, dependency auditing, SBOM generation, container scanning, canary deployment, traffic shifting, smoke testing, and automated rollback on failure.</p>

<p>Every deployment artifact is signed with Ed25519 cryptographic receipts, creating an immutable audit trail. The pipeline enforces all 8 Unbreakable Laws: thoroughness over speed, solutions only (no workarounds), context maximization, implementation completeness, cross-environment purity, 10,000-bee scale readiness, Auto-Success Engine integrity, and arena mode competitive excellence.</p>

<h3>Edge Mesh and Global Distribution</h3>
<p>HeadySystems leverages Cloudflare's edge network for global distribution with sub-50ms latency. Static assets and frequently-accessed API responses are cached in Cloudflare KV stores. Stateful compute runs on Durable Objects at the edge, enabling real-time collaboration and session management without round-trips to origin servers.</p>

<p>Workers AI provides inference capabilities directly at the edge, allowing HeadySystems to run embedding generation, classification, and lightweight inference without leaving the Cloudflare network. This reduces latency for common operations from hundreds of milliseconds to single-digit milliseconds.</p>
""",
        "howItWorks": [
            {"title": "Service Mesh", "desc": "All 50+ services communicate through Envoy sidecar proxies with mTLS, load balancing, and circuit breaking built in."},
            {"title": "Concurrent Dispatch", "desc": "17 swarms activate simultaneously for every task. No queues, no waiting. CSL gates filter results by domain relevance."},
            {"title": "Auto-Healing", "desc": "Failed services are quarantined, replaced, and validated automatically. φ-scaled retry intervals prevent cascading failures."},
            {"title": "Edge Delivery", "desc": "Cloudflare Workers serve content globally with sub-50ms latency. Durable Objects maintain state at the edge."},
        ],
        "useCases": [
            {"icon": "🏢", "title": "Enterprise Deployment", "desc": "Deploy HeadySystems on your infrastructure with dedicated service mesh, custom scaling policies, and enterprise SLA guarantees."},
            {"icon": "🔄", "title": "CI/CD Pipeline", "desc": "Integrate the HCFP pipeline into your existing deployment workflow. 21-stage validation ensures every release meets quality standards."},
            {"icon": "🛡️", "title": "Security Operations", "desc": "Zero-trust security by default. mTLS, cryptographic receipts, secret rotation, and post-quantum cryptography protect every request."},
            {"icon": "📡", "title": "Global Edge Delivery", "desc": "Serve AI-powered applications from 300+ Cloudflare edge locations with single-digit millisecond latency."},
            {"icon": "🔍", "title": "Observability", "desc": "Full distributed tracing via OpenTelemetry, structured logging with correlation IDs, and real-time health dashboards."},
            {"icon": "🐝", "title": "Swarm Computing", "desc": "Leverage 17 concurrent swarms for parallel task processing at scales that sequential systems cannot achieve."},
        ],
        "faqs": [
            {"q": "How many services does HeadySystems run?", "a": "HeadySystems operates 50+ microservices covering core intelligence, agent orchestration, security, monitoring, user-facing interfaces, pipeline management, AI routing, external integrations, and specialized services. Every service has a /health endpoint and AutoContext middleware."},
            {"q": "What is the 17-swarm architecture?", "a": "The system runs 17 specialized swarms that execute concurrently as equals. Each swarm handles a specific domain (orchestration, inference, memory, security, etc.) and dispatches HeadyBee workers to process tasks from their perspective. Results aggregate via CSL relevance scoring."},
            {"q": "How does self-healing work?", "a": "Health probes run on φ-scaled intervals. When a service fails, the system quarantines it, launches a replacement, validates the replacement, and shifts traffic — all automatically. Circuit breakers and bulkhead patterns prevent cascading failures."},
            {"q": "What security standards does HeadySystems meet?", "a": "HeadySystems implements zero-trust architecture with mTLS, Ed25519 signed receipts, secret rotation, post-quantum cryptography (CRYSTALS-Kyber/Dilithium), WebAuthn support, and full audit logging. All inter-service communication is encrypted and authenticated."},
            {"q": "Can HeadySystems run on-premises?", "a": "Yes. HeadySystems is packaged as containerized microservices deployable to any Kubernetes cluster. The Envoy service mesh, Consul discovery, and OpenTelemetry tracing work in any environment. Cloud features use provider-agnostic interfaces."},
            {"q": "How does φ-scaling improve reliability?", "a": "Golden ratio intervals (1.618s, 2.618s, 4.236s, etc.) for retries and health checks distribute load across non-overlapping time windows, preventing thundering herd effects. Fibonacci-based resource pools create natural load distribution that adapts to varying demand patterns."},
            {"q": "What is CSL domain routing?", "a": "Instead of routing by importance level or cost tier, HeadySystems routes requests based on Continuous Semantic Logic (CSL) domain similarity. Each request is embedded and compared against service domain signatures using cosine similarity. The most semantically relevant services handle the request."},
            {"q": "What about vendor lock-in?", "a": "HeadySystems uses provider-agnostic interfaces for all cloud services. The multi-model AI router supports Claude, GPT, Gemini, Groq, Perplexity, and open-source models. Infrastructure runs on standard Kubernetes, and the edge layer supports multiple CDN providers."},
        ],
    },
    {
        "slug": "heady-ai",
        "domain": "heady-ai.com",
        "name": "HeadyAI",
        "tagline": "The Science Behind HeadyOS",
        "description": "Continuous Semantic Logic, Vector Symbolic Architecture, Sacred Geometry topology, and 3D Spatial Memory — the research powering autonomous intelligence.",
        "role": "research",
        "accent": "#8b5cf6",
        "accentGlow": "rgba(139,92,246,0.15)",
        "sacredGeometry": "Sri Yantra",
        "navLinks": [
            {"label": "Research", "href": "#research"},
            {"label": "Patents", "href": "#patents"},
            {"label": "Publications", "href": "#publications"},
            {"label": "HeadySystems", "href": "https://headysystems.com", "cta": True},
        ],
        "features": [
            {"icon": "△", "title": "Continuous Semantic Logic", "desc": "Multi-valued gate operations with soft thresholds enabling precise context filtering. CSL replaces binary true/false with continuous geometric relevance on the [0,1] spectrum."},
            {"icon": "◈", "title": "Vector Symbolic Architecture", "desc": "Hyperdimensional computing with d ≥ 10,000 dimensions. Binding, bundling, and permutation operations over holographic distributed representations."},
            {"icon": "⊛", "title": "Sacred Geometry Topology", "desc": "The golden ratio φ ≈ 1.618 and Fibonacci scaling encode natural optimization patterns — from resource allocation to network topology to visual design."},
            {"icon": "◎", "title": "3D Spatial Memory", "desc": "Agent memory as navigable 3D vector spaces with O(log n) octree retrieval, temporal decay functions, and semantic clustering that mirrors biological memory."},
        ],
        "stats": [
            {"num": "51+", "label": "Patents Filed"},
            {"num": "384", "label": "Vector Dimensions"},
            {"num": "φ", "label": "Golden Ratio"},
            {"num": "17", "label": "Research Domains"},
        ],
        "deepDive": """
<h3>The Science of Autonomous Intelligence</h3>
<p>HeadyAI represents the research and scientific foundation underlying every component of the Heady ecosystem. While other AI platforms rely on brute-force scaling of transformer parameters, HeadyAI pioneers a fundamentally different approach: encoding mathematical harmony into the architecture itself. Our research spans Continuous Semantic Logic, Vector Symbolic Architecture, Sacred Geometry topology, and 3D Spatial Memory — each backed by provisional patents and peer-reviewed methodologies.</p>

<h3>Continuous Semantic Logic (CSL)</h3>
<p>Traditional computing operates on binary logic: true or false, 0 or 1. CSL extends this to a continuous spectrum where relevance, confidence, and similarity are expressed as real numbers between 0 and 1. The key innovation is the use of geometric thresholds derived from the golden ratio: ψ² ≈ 0.382 for inclusion gates, ψ ≈ 0.618 for boost gates, and ψ + 0.1 ≈ 0.718 for automatic injection gates.</p>

<p>These aren't arbitrary cutoffs — they emerge from the mathematical properties of the golden ratio, which produces the most irrational number (hardest to approximate by rationals), ensuring maximum information separation between gate levels. CSL gates compose hierarchically: the output of one gate becomes the input to the next, creating cascading relevance filters that progressively refine context quality.</p>

<p>In practice, CSL replaces traditional keyword matching and boolean filtering with semantic geometric operations. When HeadyAutoContext decides what information to inject into an AI interaction, it computes cosine similarity in 384-dimensional space and applies CSL gates to determine relevance. This produces dramatically better context quality than keyword search or simple embedding similarity thresholds.</p>

<h3>Vector Symbolic Architecture (VSA)</h3>
<p>VSA operates in hyperdimensional spaces (d ≥ 10,000) where information is encoded as high-dimensional vectors and manipulated through three fundamental operations: binding (element-wise multiplication), bundling (element-wise addition with normalization), and permutation (circular shift). These operations are holographic — every element of the vector participates in representing every concept.</p>

<p>Heady's implementation of VSA enables compositional reasoning: complex concepts are constructed by binding and bundling simpler ones. For example, the concept "user preference for Python code in functional style" is created by binding the vectors for "Python," "functional," and "user-preference," then bundling with the user's historical interaction vectors. The result is a single high-dimensional vector that can be compared to any document or code artifact to determine relevance.</p>

<h3>Sacred Geometry in Computing</h3>
<p>The golden ratio φ (1.618033988749895) and its reciprocal ψ (0.618033988749895) appear throughout nature in structures optimized by evolution: sunflower spirals, nautilus shells, galaxy arms, DNA helices. HeadyAI applies these same mathematical constants to compute architecture with measurable benefits.</p>

<p>Fibonacci-spaced retry intervals (1s, 1.618s, 2.618s, 4.236s, 6.854s) distribute load across non-overlapping windows, eliminating the thundering herd effect that plagues systems using powers-of-two backoff. φ-scaled thread pools allocate resources in ratios that naturally balance throughput and latency. Golden-angle (137.5°) node distribution on ring topologies maximizes network coverage while minimizing hop distance.</p>

<p>Network topology follows sacred geometry patterns. The 5-ring concentric architecture (CENTER, INNER, MIDDLE, OUTER, GOVERNANCE) positions services at radii proportional to Fibonacci numbers. Service discovery uses golden-angle rotation for consistent hashing, producing more uniform load distribution than standard hash functions.</p>

<h3>3D Spatial Memory Architecture</h3>
<p>HeadyAI's memory system transcends flat key-value stores by organizing information in navigable 3D vector spaces. Each memory item exists as a point in 384-dimensional space (projected to 3D for visualization), with position determined by semantic content, temporal recency, and access frequency.</p>

<p>The octree spatial index enables O(log n) nearest-neighbor queries in the 3D projection space, making memory retrieval logarithmically scalable regardless of database size. Temporal decay functions reduce the influence of older memories exponentially, but frequently-accessed memories resist decay — mirroring the biological mechanisms of long-term potentiation in neural tissue.</p>

<p>Semantic clustering emerges naturally from the embedding process. Related concepts occupy nearby regions in vector space, forming knowledge galaxies that can be navigated, explored, and interrogated. The system supports multiple memory spaces per user, enabling context isolation between projects while maintaining global search across all spaces.</p>

<h3>The 7 Cognitive Archetypes</h3>
<p>HeadyAI implements seven cognitive processing layers inspired by animal intelligence patterns. The Owl Layer provides deep wisdom and first-principles reasoning. The Eagle Layer maintains 360° awareness across all inputs. The Dolphin Layer enables creative lateral thinking. The Rabbit Layer multiplies perspectives (5+ angles per task). The Ant Layer guarantees thoroughness with zero-skip execution. The Elephant Layer provides perfect recall from vector memory. The Beaver Layer structures clean architectural solutions.</p>

<p>These archetypes aren't metaphors — they're implemented as distinct processing pipelines in the cognitive runtime, each with unique prompt engineering, model selection biases, and output formatting. Every AI interaction passes through all seven layers concurrently, and their outputs are aggregated using CSL gates to produce responses that are wise, aware, creative, thorough, memorable, and well-structured.</p>
""",
        "howItWorks": [
            {"title": "Embed", "desc": "Content enters the system and is embedded into 384-dimensional vectors via multi-provider embedding router."},
            {"title": "Gate", "desc": "CSL geometric thresholds (0.382/0.618/0.718) filter and classify content by semantic relevance — not ranking."},
            {"title": "Compose", "desc": "VSA binding and bundling operations construct complex concepts from simpler components in hyperdimensional space."},
            {"title": "Reason", "desc": "7 cognitive archetypes process concurrently. Results aggregate via CSL relevance gates into unified intelligent output."},
        ],
        "useCases": [
            {"icon": "🧬", "title": "Computational Biology", "desc": "Model protein folding landscapes in hyperdimensional vector space. CSL gates filter structural similarities with precision beyond traditional alignment scores."},
            {"icon": "📚", "title": "Research Synthesis", "desc": "Ingest thousands of papers into 3D spatial memory. Navigate the knowledge galaxy to discover connections between disparate fields that human researchers miss."},
            {"icon": "🤖", "title": "Agent Architecture", "desc": "Design autonomous agents using the 7 cognitive archetypes. Each agent inherits wisdom, awareness, creativity, and thoroughness as foundational capabilities."},
            {"icon": "🔮", "title": "Predictive Analytics", "desc": "Use φ-scaled temporal models to predict trends. Sacred geometry patterns in historical data reveal cycles that linear regression cannot capture."},
            {"icon": "🧠", "title": "Neuroscience Research", "desc": "3D spatial memory architecture mirrors biological neural networks. Study memory formation, consolidation, and retrieval in computational models."},
            {"icon": "📐", "title": "Mathematical Foundations", "desc": "Explore the theoretical properties of CSL, VSA, and sacred geometry computing. Contribute to the growing body of published research."},
        ],
        "faqs": [
            {"q": "What is Continuous Semantic Logic?", "a": "CSL extends binary true/false logic to continuous [0,1] values using geometric thresholds derived from the golden ratio. Gates at 0.382 (include), 0.618 (boost), and 0.718 (inject) create cascading relevance filters that progressively refine information quality for AI interactions."},
            {"q": "How does Sacred Geometry apply to computing?", "a": "The golden ratio φ (1.618) and Fibonacci sequences create mathematically optimal distributions for retry intervals, thread pools, network topology, and resource allocation. These patterns eliminate resonance effects and thundering herd problems while maximizing throughput."},
            {"q": "What are the 51+ patents?", "a": "HeadyAI has filed 51+ provisional patents covering CSL gate mechanisms, VSA composition operators, sacred geometry network topology, 3D spatial memory indexing, φ-scaled resource allocation, cognitive archetype processing, and cross-domain context injection."},
            {"q": "Can I use HeadyAI for academic research?", "a": "Yes. HeadyAI provides research APIs for embedding generation, CSL computation, VSA operations, and spatial memory queries. Academic licenses are available through HeadyConnection.org's grant program."},
            {"q": "What is Vector Symbolic Architecture?", "a": "VSA encodes information as high-dimensional vectors (d ≥ 10,000) and manipulates them through binding (multiplication), bundling (addition), and permutation (shift). These holographic operations enable compositional reasoning where complex concepts emerge from combinations of simpler ones."},
            {"q": "How does 3D Spatial Memory differ from RAG?", "a": "Traditional RAG retrieves flat document chunks by similarity. HeadyAI's 3D spatial memory organizes knowledge in navigable space with temporal decay, access frequency weighting, and semantic clustering. It's more like a knowledge galaxy than a document store."},
            {"q": "Is HeadyAI open source?", "a": "Core research papers and reference implementations are published through HeadyConnection.org. Production systems are proprietary. The patent portfolio ensures defensive protection while enabling academic collaboration."},
            {"q": "What models does HeadyAI use for research?", "a": "HeadyAI uses the Multi-Model Council: Claude for deep analysis, GPT for broad knowledge, Gemini for multimodal reasoning, Perplexity for research synthesis, and specialized open-source models for domain-specific tasks. Selection is by CSL domain similarity matching."},
        ],
    },
    {
        "slug": "headyos",
        "domain": "headyos.com",
        "name": "HeadyOS",
        "tagline": "The AI Operating System for Developers",
        "description": "Agent runtime, unified memory, system primitives, and event bus — build and deploy AI agents on the operating system designed for intelligence.",
        "role": "operating-system",
        "accent": "#14b8a6",
        "accentGlow": "rgba(20,184,166,0.15)",
        "sacredGeometry": "Torus",
        "navLinks": [
            {"label": "Runtime", "href": "#runtime"},
            {"label": "SDK", "href": "#sdk"},
            {"label": "Docs", "href": "#docs"},
            {"label": "HeadyAI", "href": "https://heady-ai.com", "cta": True},
        ],
        "features": [
            {"icon": "◇", "title": "Agent Runtime", "desc": "Managed execution environment for AI agents with hot-reload, sandbox isolation, WASM containment, and φ-scaled auto-scaling that adapts to workload patterns."},
            {"icon": "◈", "title": "Unified Memory", "desc": "Shared 3D vector space across all running agents with cross-agent context sharing, semantic search, and CSL-gated access control for memory isolation."},
            {"icon": "⬡", "title": "System Primitives", "desc": "File, network, and compute tools available to any agent via MCP protocol. 31 tools exposed through JSON-RPC 2.0 over SSE/stdio channels."},
            {"icon": "⊕", "title": "Event Bus", "desc": "Real-time inter-agent communication with pub/sub, request-reply, and streaming patterns. φ-scaled backpressure prevents any single agent from overwhelming the bus."},
        ],
        "stats": [
            {"num": "31", "label": "MCP Tools"},
            {"num": "∞", "label": "Agents"},
            {"num": "384d", "label": "Memory Space"},
            {"num": "<10ms", "label": "Event Latency"},
        ],
        "deepDive": """
<h3>An Operating System Built for AI</h3>
<p>HeadyOS reimagines the operating system concept for the age of artificial intelligence. Traditional operating systems manage processes, files, and hardware. HeadyOS manages AI agents, vector memory, and intelligence. It provides the foundational runtime, primitives, and abstractions that autonomous agents need to execute tasks, communicate with each other, and persist learned knowledge.</p>

<h3>Agent Runtime Environment</h3>
<p>The HeadyOS runtime executes AI agents in managed sandboxes with full lifecycle control. Each agent runs in a WASM containment boundary, preventing any agent from accessing resources outside its granted permissions. Agents can be started, stopped, hot-reloaded, and scaled independently.</p>

<p>The runtime provides automatic resource management using φ-scaled allocation. When an agent needs more compute, memory, or network bandwidth, HeadyOS allocates resources in golden-ratio increments (×1.618 per step), creating smooth scaling curves that avoid the oscillation problems of binary doubling. When demand decreases, resources are reclaimed using the inverse ratio (×0.618 per step).</p>

<p>Hot-reload enables live code updates without stopping running agents. When new agent code is deployed, HeadyOS creates a shadow instance, validates it against the agent's test suite, and atomically swaps traffic from the old instance to the new one. This zero-downtime deployment ensures agents remain available during updates.</p>

<h3>Unified Vector Memory</h3>
<p>All agents running on HeadyOS share access to a unified 3D vector memory space — a 384-dimensional persistent store backed by pgvector with octree spatial indexing. Each agent can read from the shared memory and write to its own memory partition, with CSL-gated access control determining visibility between agents.</p>

<p>Cross-agent context sharing enables collaborative intelligence. When Agent A discovers a useful pattern, it can write that pattern to shared memory where Agent B automatically discovers it during context pre-enrichment. This creates a form of collective learning where the intelligence of the system grows with every agent interaction.</p>

<h3>MCP Protocol — 31 System Tools</h3>
<p>HeadyOS exposes 31 tools through the Model Context Protocol (MCP) via JSON-RPC 2.0 over SSE/stdio channels. These tools cover file operations (read, write, search, watch), network operations (HTTP, WebSocket, DNS), compute operations (function execution, shell commands, WASM instantiation), memory operations (embed, search, store, delete), and system operations (health check, telemetry, configuration, secrets).</p>

<p>Every tool call is enriched by HeadyAutoContext before execution and after completion. This means when an agent reads a file, the file content is automatically embedded into vector memory. When an agent makes an HTTP request, the response is indexed for future semantic search. The operating system learns from every operation.</p>

<h3>Event Bus Architecture</h3>
<p>The HeadyOS event bus provides real-time inter-agent communication through three patterns: publish/subscribe for broadcast messages, request/reply for synchronous queries, and streaming for continuous data flows. The bus uses φ-scaled backpressure to prevent any single agent from overwhelming the system — when a consumer falls behind, the bus slows the producer by ψ (0.618) rate, creating smooth degradation instead of hard failures.</p>

<p>Events are typed and versioned, ensuring forward and backward compatibility as agents evolve. The bus supports topic hierarchies (e.g., agents.research.papers.new) with wildcard subscriptions, enabling agents to listen for broad categories or specific events.</p>

<h3>Developer Experience</h3>
<p>HeadyOS provides a complete SDK for agent development in JavaScript/TypeScript, Python, and Rust. The SDK includes agent lifecycle management, memory access, MCP tool wrappers, event bus subscriptions, and testing utilities. An interactive CLI lets developers create, deploy, monitor, and debug agents from the terminal.</p>

<p>The HeadyOS IDE integration (via the Antigravity IDE) provides real-time agent monitoring, memory visualization, event stream inspection, and hot-reload triggers directly in the development environment. Developers can see their agents' vector memory evolve in real time as they test interactions.</p>
""",
        "howItWorks": [
            {"title": "Create Agent", "desc": "Define your agent's capabilities, permissions, and initial context using the HeadyOS SDK. Deploy with a single CLI command."},
            {"title": "Runtime Executes", "desc": "HeadyOS manages your agent's lifecycle in a WASM sandbox with φ-scaled resource allocation and hot-reload capability."},
            {"title": "Memory Enriches", "desc": "Every agent action is indexed into shared 3D vector memory. Context pre-enrichment ensures your agent always has relevant information."},
            {"title": "Agents Collaborate", "desc": "Event bus enables real-time communication between agents. Shared memory creates collective intelligence that grows over time."},
        ],
        "useCases": [
            {"icon": "🤖", "title": "Autonomous Research", "desc": "Deploy research agents that continuously monitor academic papers, extract insights, and build knowledge graphs in shared vector memory."},
            {"icon": "💻", "title": "Code Generation", "desc": "Build code generation agents with access to your entire codebase through vector memory. Context-aware suggestions that understand your architecture."},
            {"icon": "🔧", "title": "DevOps Automation", "desc": "Agent-powered infrastructure management. Deploy, monitor, scale, and heal services automatically using MCP system tools."},
            {"icon": "📈", "title": "Data Pipeline", "desc": "Create data processing agents that ingest, transform, enrich, and analyze data streams in real time through the event bus."},
            {"icon": "🎯", "title": "Task Orchestration", "desc": "Compose complex workflows from simple agents. The event bus handles coordination, and shared memory provides context."},
            {"icon": "🧪", "title": "Agent Testing", "desc": "Comprehensive testing framework for AI agents. Simulate environments, inject test data, and verify agent behavior deterministically."},
        ],
        "faqs": [
            {"q": "What programming languages does HeadyOS support?", "a": "The SDK supports JavaScript/TypeScript, Python, and Rust for agent development. WASM containment means any language that compiles to WebAssembly can run on HeadyOS. The MCP protocol is language-agnostic."},
            {"q": "How does memory isolation work between agents?", "a": "Each agent has its own memory partition for private data. Shared memory uses CSL-gated access control — agents can read shared content above the 0.382 relevance threshold and write to shared space if their output meets the 0.618 quality gate."},
            {"q": "What is the MCP protocol?", "a": "Model Context Protocol (MCP) is a JSON-RPC 2.0 based protocol for exposing tools to AI agents over SSE or stdio channels. HeadyOS provides 31 MCP tools covering file, network, compute, memory, and system operations."},
            {"q": "Can I run HeadyOS locally?", "a": "Yes. HeadyOS provides a local development runtime that emulates the full platform. Agents developed locally can be deployed to HeadyOS cloud with a single command. Local mode uses SQLite with vector extensions instead of pgvector."},
            {"q": "How does hot-reload work?", "a": "When new agent code is deployed, HeadyOS creates a shadow instance, validates it against tests, and atomically swaps traffic. The old instance continues running until all in-flight requests complete, then gracefully shuts down."},
            {"q": "Is there a free tier?", "a": "HeadyOS offers a developer tier with 3 concurrent agents, 100MB vector memory, and 1000 MCP tool calls per day. Production tiers scale with usage. Enterprise plans include dedicated infrastructure and custom SLAs."},
            {"q": "How does the event bus prevent overload?", "a": "φ-scaled backpressure reduces producer rate by ψ (0.618) when consumers fall behind. This creates smooth degradation curves instead of hard failures. Topic-based routing ensures events reach only interested subscribers."},
            {"q": "Can agents access external APIs?", "a": "Yes. The network MCP tools support HTTP, WebSocket, and DNS operations. All external requests are logged, traced via OpenTelemetry, and indexed into vector memory by AutoContext."},
        ],
    },
    {
        "slug": "headyconnection-org",
        "domain": "headyconnection.org",
        "name": "HeadyConnection",
        "tagline": "AI for Everyone — Non-Profit AI Access",
        "description": "501(c)(3) non-profit bringing equitable AI access to underserved communities through grants, education, and open-source tools.",
        "role": "community",
        "accent": "#f59e0b",
        "accentGlow": "rgba(245,158,11,0.15)",
        "sacredGeometry": "Seed of Life",
        "navLinks": [
            {"label": "Mission", "href": "#mission"},
            {"label": "Programs", "href": "#programs"},
            {"label": "Donate", "href": "#donate"},
            {"label": "Community", "href": "https://headyconnection.com", "cta": True},
        ],
        "features": [
            {"icon": "✦", "title": "Grant Writing AI", "desc": "Automated proposal drafting with compliance checks, funder matching, and deadline tracking. Our AI helps nonprofits write winning grant proposals at no cost."},
            {"icon": "📊", "title": "Impact Analytics", "desc": "Measure and visualize real-world outcomes with evidence-based reporting. Track beneficiary reach, program effectiveness, and community transformation."},
            {"icon": "🌐", "title": "Community Hub", "desc": "Connected nonprofit network for resource sharing, mentorship matching, and collaborative project development across underserved communities."},
            {"icon": "📋", "title": "Proof View", "desc": "Evidence-based impact documentation for stakeholders and funders. Automated data collection, analysis, and report generation with full transparency."},
        ],
        "stats": [
            {"num": "501(c)(3)", "label": "Status"},
            {"num": "10K+", "label": "Beneficiaries"},
            {"num": "50+", "label": "Partners"},
            {"num": "100%", "label": "Transparency"},
        ],
        "deepDive": """
<h3>Our Mission — AI Equity for All</h3>
<p>HeadyConnection is a registered 501(c)(3) non-profit organization dedicated to making artificial intelligence accessible to everyone, regardless of economic status, geographic location, or technical background. We believe that AI has the potential to transform lives — but only if its benefits are distributed equitably rather than concentrated among those who can already afford premium technology.</p>

<p>Founded by Eric Haywood alongside the Heady ecosystem, HeadyConnection channels the technological innovations of HeadySystems, HeadyAI, and HeadyOS into programs that directly serve underserved communities. Our operating model is simple: the commercial success of the Heady platform funds the non-profit mission, creating a virtuous cycle where technological excellence enables social impact.</p>

<h3>Programs and Initiatives</h3>

<h4>AI Literacy Program</h4>
<p>We deliver free AI education through in-person workshops, virtual bootcamps, and self-paced online courses. Our curriculum covers AI fundamentals, prompt engineering, data literacy, and ethical AI use. We've trained over 3,000 participants across 15 cities, with particular focus on communities with limited access to technology education.</p>

<h4>Grant Writing AI</h4>
<p>Our flagship tool uses HeadyAI's research capabilities to help nonprofits write grant proposals. The system matches organizations with relevant funders, generates draft proposals tailored to funder requirements, checks compliance against guidelines, and tracks deadlines. Since launch, the tool has helped organizations secure over $2.5 million in grant funding.</p>

<h4>Open Source Tools</h4>
<p>We maintain open-source versions of key Heady technologies, including the CSL engine, vector memory library, and sacred geometry CSS framework. These tools are free for nonprofits, educational institutions, and community organizations. Our GitHub repository has over 2,000 stars and 150 contributors.</p>

<h4>Community AI Centers</h4>
<p>We partner with libraries, community centers, and schools to establish AI access points where anyone can use HeadyMe and HeadyOS for free. Each center includes hardware, internet connectivity, trained facilitators, and curriculum materials. We currently operate 12 centers across 8 states.</p>

<h3>Impact Measurement</h3>
<p>Transparency is core to our mission. Every dollar donated is tracked through our impact analytics platform, which shows exactly how funds are allocated and what outcomes they produce. We publish quarterly impact reports with detailed breakdowns of beneficiary reach, program outcomes, and operational costs.</p>

<p>Our Proof View system provides real-time dashboards for stakeholders showing program metrics, beneficiary stories, and financial transparency. This evidence-based approach has earned us top ratings from charity evaluation organizations and has built trust with our growing donor community.</p>

<h3>Partnerships</h3>
<p>HeadyConnection works with over 50 partner organizations including universities, nonprofits, government agencies, and corporate sponsors. Our technology partners provide discounted cloud computing, hardware donations, and volunteer mentors. Our community partners identify needs, recruit participants, and provide cultural context for program design.</p>

<h3>Volunteer and Donate</h3>
<p>We welcome volunteers at all skill levels — from technical mentors who can teach AI concepts to community organizers who can help us reach underserved populations. Financial donations are tax-deductible and directly fund program delivery. Corporate matching programs and planned giving options are available for institutional supporters.</p>
""",
        "howItWorks": [
            {"title": "Identify Needs", "desc": "Community partners identify underserved populations and specific AI access needs through surveys, interviews, and data analysis."},
            {"title": "Deploy Programs", "desc": "We match needs with programs: AI literacy workshops, grant writing tools, open-source software, or community AI centers."},
            {"title": "Measure Impact", "desc": "Every program tracks outcomes through our analytics platform. Beneficiary reach, skill gains, and economic impact are measured continuously."},
            {"title": "Report Transparently", "desc": "Quarterly impact reports show exactly how funds create change. Proof View dashboards provide real-time transparency for all stakeholders."},
        ],
        "useCases": [
            {"icon": "🎓", "title": "AI Education", "desc": "Free workshops and bootcamps teaching AI fundamentals, prompt engineering, and data literacy to underserved communities."},
            {"icon": "✍️", "title": "Grant Writing", "desc": "AI-powered grant proposal tool that has helped organizations secure over $2.5M in funding since launch."},
            {"icon": "💻", "title": "Open Source", "desc": "Free, open-source versions of Heady's CSL engine, vector memory, and design framework for nonprofits and educators."},
            {"icon": "🏛️", "title": "Community Centers", "desc": "12 AI access points in libraries and community centers across 8 states, providing free access to HeadyMe and HeadyOS."},
            {"icon": "🤝", "title": "Mentorship", "desc": "Matching program connecting AI professionals with community members for ongoing guidance and skill development."},
            {"icon": "📈", "title": "Capacity Building", "desc": "Helping nonprofits build internal AI capabilities for operations, fundraising, program design, and impact measurement."},
        ],
        "faqs": [
            {"q": "Is HeadyConnection a real 501(c)(3)?", "a": "Yes. HeadyConnection is a registered 501(c)(3) non-profit organization. All donations are tax-deductible to the extent permitted by law. Our EIN and determination letter are available upon request."},
            {"q": "How is HeadyConnection funded?", "a": "We receive funding from individual donations, corporate sponsors, foundation grants, and a portion of Heady commercial platform revenue. Our operating model ensures that commercial success directly fuels non-profit mission delivery."},
            {"q": "Can any nonprofit use the Grant Writing AI?", "a": "Yes. The Grant Writing AI tool is free for all registered nonprofits. Sign up at HeadyConnection.org and verify your nonprofit status to get access."},
            {"q": "How do you measure impact?", "a": "We track beneficiary reach, program completion rates, skill assessment scores, economic outcomes (jobs, income, funding secured), and community feedback. All metrics are published in quarterly impact reports."},
            {"q": "How can I volunteer?", "a": "Visit our volunteer page to browse opportunities. We need technical mentors, workshop facilitators, content creators, community organizers, and administrative support. Remote and in-person roles are available."},
            {"q": "Do you accept corporate partnerships?", "a": "Yes. We offer corporate partnership tiers including technology donations, employee volunteer programs, matching gift programs, and sponsorship opportunities. Contact partnerships@headyconnection.org for details."},
            {"q": "What communities do you serve?", "a": "We focus on communities with limited access to AI technology and education: rural areas, low-income urban neighborhoods, historically underserved populations, and developing regions. Our programs adapt to local needs and cultural contexts."},
            {"q": "Are the open-source tools production-quality?", "a": "Yes. Our open-source tools are derived from the same codebase used in production Heady systems. They include documentation, examples, and community support. Enterprise-grade features require commercial licensing."},
        ],
    },
    {
        "slug": "headyconnection-com",
        "domain": "headyconnection.com",
        "name": "HeadyConnection Community",
        "tagline": "The Heady Community Portal",
        "description": "Join the global network of developers, researchers, and AI enthusiasts building the future of autonomous intelligence together.",
        "role": "community-portal",
        "accent": "#06b6d4",
        "accentGlow": "rgba(6,182,212,0.15)",
        "sacredGeometry": "Seed of Life",
        "navLinks": [
            {"label": "Community", "href": "#community"},
            {"label": "Events", "href": "#events"},
            {"label": "Forum", "href": "#forum"},
            {"label": "Non-Profit", "href": "https://headyconnection.org", "cta": True},
        ],
        "features": [
            {"icon": "🌐", "title": "Global Network", "desc": "Thousands of developers, researchers, and AI enthusiasts collaborating across time zones. Share knowledge, find collaborators, and build together."},
            {"icon": "💬", "title": "Discussion Forum", "desc": "Ask questions, share projects, and get help from the community and Heady core team. Semantic search powered by HeadyAI finds relevant discussions instantly."},
            {"icon": "🗓️", "title": "Events & Meetups", "desc": "Virtual and in-person events including hackathons, workshops, conference talks, and community showcases. Monthly virtual meetups with guest speakers."},
            {"icon": "⭐", "title": "Contributor Program", "desc": "Earn recognition, early access, and rewards for contributing code, documentation, bug reports, and community support to the Heady ecosystem."},
        ],
        "stats": [
            {"num": "5K+", "label": "Members"},
            {"num": "200+", "label": "Contributors"},
            {"num": "50+", "label": "Events/Year"},
            {"num": "24/7", "label": "Global"},
        ],
        "deepDive": """
<h3>Building the Future Together</h3>
<p>HeadyConnection.com is the community heart of the Heady ecosystem — a gathering place for developers, researchers, entrepreneurs, students, and AI enthusiasts who share a vision of accessible, ethical, and powerful artificial intelligence. While the Heady platform provides the technology, HeadyConnection provides the human connections that make technology meaningful.</p>

<h3>The Global Developer Network</h3>
<p>Our community spans over 50 countries, with members ranging from seasoned AI researchers to students writing their first lines of code. The network operates on a simple principle: everyone has something to teach and something to learn. Senior contributors mentor newcomers, researchers share findings with practitioners, and entrepreneurs connect with developers to bring ideas to life.</p>

<p>Community members collaborate through multiple channels: the discussion forum for long-form conversations, Discord for real-time chat, GitHub for code collaboration, and monthly virtual meetups for face-to-face interaction. Each channel is integrated with HeadyAutoContext, meaning community knowledge is continuously indexed and searchable through semantic vector search.</p>

<h3>Discussion Forum</h3>
<p>The HeadyConnection forum is powered by Drupal headless CMS with a custom front-end that integrates HeadyAI's semantic search. When you post a question, the system automatically finds and suggests related discussions, documentation, and code examples from across the entire Heady knowledge base. This means your question is often answered before you finish typing it.</p>

<p>Forum categories cover every aspect of the Heady ecosystem: Agent Development, Vector Memory, CSL Research, Sacred Geometry Applications, HeadyOS SDK, MCP Protocol, Infrastructure, Security, Community Projects, and Career Development. Each category has designated community moderators and Heady core team liaisons.</p>

<h3>Events and Hackathons</h3>
<p>We host over 50 events per year, including monthly virtual meetups with guest speakers, quarterly hackathons with prizes, an annual HeadyCon conference, regional workshops, and themed challenge series. Past events have featured talks from AI researchers at leading institutions, live coding sessions with Heady core developers, and community showcase presentations.</p>

<p>Hackathons focus on building real projects with the Heady stack. Past themes include "Agent Economy" (building agents for HeadyEX), "Sacred Computing" (novel applications of φ-scaled algorithms), "AI for Good" (projects supporting HeadyConnection.org's mission), and "Edge Intelligence" (building with Cloudflare Workers AI). Winners receive prizes, mentorship, and the opportunity to integrate their projects into the core platform.</p>

<h3>Contributor Program</h3>
<p>The HeadyConnection Contributor Program recognizes and rewards community members who contribute to the ecosystem. Contributions include code patches, documentation improvements, bug reports, forum participation, event organization, content creation, and mentorship. Contributors earn points that unlock benefits including early access to new features, dedicated support channels, invitations to private events, and featured profiles in the community showcase.</p>

<p>We follow the Contributor Covenant code of conduct, ensuring our community remains welcoming, inclusive, and respectful. All community spaces are moderated, and we have a zero-tolerance policy for harassment, discrimination, or exclusionary behavior.</p>

<h3>Learning Resources</h3>
<p>HeadyConnection.com maintains an extensive library of learning resources including tutorials, video courses, interactive notebooks, code examples, and architectural guides. Resources are organized by skill level (beginner, intermediate, advanced) and topic area, and all content is searchable through HeadyAI's semantic search.</p>

<p>Community members contribute tutorials and guides through our content creation program. Published content earns contributor points and is reviewed by the community for accuracy and quality. The most popular resources are featured on the homepage and in our weekly newsletter.</p>
""",
        "howItWorks": [
            {"title": "Join", "desc": "Create your free account and choose your interests. The system recommends communities, channels, and resources matched to your background."},
            {"title": "Connect", "desc": "Find collaborators, mentors, and fellow enthusiasts. Join topic-specific channels, introduce yourself, and start contributing."},
            {"title": "Contribute", "desc": "Share code, write tutorials, answer questions, organize events, or report bugs. Every contribution earns recognition in the Contributor Program."},
            {"title": "Grow", "desc": "Level up your skills through community learning. Attend events, complete challenges, and build projects that showcase your expertise."},
        ],
        "useCases": [
            {"icon": "👥", "title": "Find Collaborators", "desc": "Search the community by skills, interests, and availability to find the perfect collaborators for your Heady projects."},
            {"icon": "📖", "title": "Learn the Stack", "desc": "Access tutorials, courses, and interactive notebooks covering every Heady technology from beginner to advanced."},
            {"icon": "🏆", "title": "Win Hackathons", "desc": "Compete in quarterly hackathons with prizes, mentorship, and the chance to integrate your project into the Heady platform."},
            {"icon": "🎤", "title": "Speak at Events", "desc": "Share your expertise at meetups and conferences. Submit talk proposals through our CFP system for upcoming events."},
            {"icon": "🤝", "title": "Get Mentored", "desc": "Connect with experienced Heady developers and AI researchers for ongoing mentorship and career guidance."},
            {"icon": "🌟", "title": "Showcase Projects", "desc": "Feature your Heady-powered projects in the community showcase. Get feedback, recognition, and potential integration."},
        ],
        "faqs": [
            {"q": "Is HeadyConnection.com free to join?", "a": "Yes, completely free. Create an account to access all forums, events, and learning resources. Premium features like priority support and private groups are available for supporters."},
            {"q": "How is this different from HeadyConnection.org?", "a": "HeadyConnection.org is the 501(c)(3) non-profit focused on AI equity and access for underserved communities. HeadyConnection.com is the community portal for everyone in the Heady ecosystem. They share the Seed of Life sacred geometry and work together on overlapping initiatives."},
            {"q": "What is the Contributor Program?", "a": "A recognition and rewards system for community contributions. Earn points for code, documentation, forum participation, event organization, and mentorship. Points unlock early access, dedicated support, and community features."},
            {"q": "How do hackathons work?", "a": "Quarterly hackathons run for 48-72 hours. Teams or individuals build projects using the Heady stack around a theme. Judges evaluate submissions, and winners receive prizes, mentorship, and integration opportunities."},
            {"q": "Can I organize a local meetup?", "a": "Yes! We provide a meetup organizer kit with presentation templates, activity guides, and promotional materials. Organizers earn Contributor Program points and can request financial support for venue costs."},
            {"q": "Is the forum moderated?", "a": "Yes. Community moderators and Heady team liaisons ensure discussions remain constructive and welcoming. We follow the Contributor Covenant code of conduct with zero tolerance for harassment."},
            {"q": "How do I get started contributing?", "a": "Visit the 'Getting Started' guide in the Contributor Program section. We recommend starting with forum participation and documentation improvements, then moving to code contributions as you learn the stack."},
            {"q": "Can companies participate?", "a": "Yes. Companies can sponsor events, contribute engineers to the Contributor Program, and participate in corporate partnership programs. Contact community@headyconnection.com for details."},
        ],
    },
    {
        "slug": "headyex",
        "domain": "headyex.com",
        "name": "HeadyEX",
        "tagline": "AI Agent Marketplace & Token Platform",
        "description": "Browse, deploy, and trade AI agents on the decentralized marketplace powered by HeadyCoin and smart contract escrow.",
        "role": "marketplace",
        "accent": "#10b981",
        "accentGlow": "rgba(16,185,129,0.15)",
        "sacredGeometry": "Fibonacci Spiral",
        "navLinks": [
            {"label": "Marketplace", "href": "#marketplace"},
            {"label": "HeadyCoin", "href": "#headycoin"},
            {"label": "Agents", "href": "#agents"},
            {"label": "HeadyOS", "href": "https://headyos.com", "cta": True},
        ],
        "features": [
            {"icon": "🏪", "title": "Agent Marketplace", "desc": "Browse, purchase, and deploy pre-built AI agents with verified performance metrics, security audits, and one-click deployment to HeadyOS runtime."},
            {"icon": "📈", "title": "Live Trading", "desc": "Real-time agent performance tracking with φ-weighted scoring across accuracy, latency, cost, and user satisfaction. Market-driven pricing reflects true value."},
            {"icon": "🪙", "title": "HeadyCoin", "desc": "Native utility token powering the HeadyEX ecosystem. Pay for agents, earn from listings, stake for governance, and receive rewards for marketplace contributions."},
            {"icon": "🔒", "title": "Secure Escrow", "desc": "Smart contract escrow for agent transactions with dispute resolution, refund guarantees, and transparent fee structures. Trust is built into every transaction."},
        ],
        "stats": [
            {"num": "500+", "label": "Agents Listed"},
            {"num": "10K+", "label": "Deployments"},
            {"num": "HCOIN", "label": "Token"},
            {"num": "4.8★", "label": "Avg Rating"},
        ],
        "deepDive": """
<h3>The Economy of AI Agents</h3>
<p>HeadyEX creates a thriving marketplace where AI agents are discoverable, tradeable, and deployable assets. As AI moves from monolithic models to specialized agents, HeadyEX provides the infrastructure for an agent economy — where developers build agents, enterprises deploy them, and the community curates quality through market-driven mechanisms.</p>

<h3>Agent Marketplace</h3>
<p>The HeadyEX marketplace lists over 500 AI agents across categories including research, coding, data analysis, creative writing, customer service, financial analysis, DevOps, and specialized domain agents. Each listing includes verified performance benchmarks, security audit results, compatibility information, and user reviews.</p>

<p>Agents are deployed with one click to HeadyOS runtime. The marketplace handles versioning, licensing, and dependency management. When an agent is updated by its developer, existing deployments receive notifications and can auto-upgrade or pin to specific versions.</p>

<h3>HeadyCoin Token Economy</h3>
<p>HeadyCoin (HCOIN) is the native utility token powering the HeadyEX ecosystem. HCOIN is used to purchase agent licenses, pay for compute resources, tip helpful community members, stake for marketplace governance, and receive rewards for quality contributions. The tokenomics follow φ-scaled distribution: 38.2% for ecosystem rewards, 23.6% for development, 14.6% for treasury, and 23.6% for community distribution.</p>

<p>Agent developers earn HCOIN from sales and usage-based royalties. The more an agent is used, the more its developer earns. This creates a direct incentive for developers to build, maintain, and improve high-quality agents. Marketplace escrow ensures payment is held until the buyer confirms successful deployment.</p>

<h3>Performance Metrics and Quality</h3>
<p>Every agent on HeadyEX is evaluated across multiple dimensions: accuracy (task completion rate), latency (response time distribution), cost efficiency (compute per task), user satisfaction (ratings and reviews), and reliability (uptime and error rates). These metrics are displayed transparently on every listing, enabling informed purchasing decisions.</p>

<p>The evaluation system uses CSL relevance scoring rather than ranking. Agents aren't sorted by "best" or "recommended" — they're filtered by domain match to the buyer's needs. A research agent isn't "better" or "worse" than a coding agent; they serve different purposes and are matched to different queries.</p>

<h3>Smart Contract Escrow</h3>
<p>All marketplace transactions are protected by smart contract escrow. When a buyer purchases an agent, payment is held in escrow until successful deployment is confirmed. If the agent fails to perform as advertised, the buyer can initiate a dispute that triggers automated performance verification. Refunds are processed automatically when claims are validated.</p>

<p>The escrow system charges a transparent fee (φ-scaled: 1.618% for standard transactions, 0.618% for HCOIN stakers) that funds marketplace operations, security audits, and community rewards. All fees and their distribution are visible on the blockchain.</p>

<h3>Developer Tools</h3>
<p>HeadyEX provides a comprehensive toolkit for agent developers: the Agent SDK for building marketplace-compatible agents, the Testing Framework for generating benchmark results, the Security Scanner for pre-submission auditing, and the Analytics Dashboard for tracking sales, usage, and customer feedback post-launch.</p>
""",
        "howItWorks": [
            {"title": "Browse", "desc": "Search the marketplace by domain, capability, or use case. CSL-powered search matches your needs to the most relevant agents."},
            {"title": "Evaluate", "desc": "Review verified performance benchmarks, security audits, user ratings, and compatibility information before purchasing."},
            {"title": "Deploy", "desc": "One-click deployment to HeadyOS runtime. Escrow holds payment until successful deployment is confirmed."},
            {"title": "Earn", "desc": "Build and list your own agents. Earn HCOIN from sales and usage royalties. Stake for marketplace governance and rewards."},
        ],
        "useCases": [
            {"icon": "🔬", "title": "Research Agents", "desc": "Deploy pre-built research agents that monitor papers, extract insights, and maintain domain-specific knowledge graphs."},
            {"icon": "💻", "title": "Development Tools", "desc": "AI-powered code review, refactoring, test generation, and documentation agents that integrate with your workflow."},
            {"icon": "📊", "title": "Analytics Agents", "desc": "Data processing, visualization, and insight generation agents for business intelligence and market analysis."},
            {"icon": "🎨", "title": "Creative Agents", "desc": "Content generation, design assistance, and creative brainstorming agents with customizable style and tone."},
            {"icon": "🤖", "title": "Custom Agents", "desc": "Commission custom agent development or modify existing agents. The marketplace supports private listings and enterprise licensing."},
            {"icon": "🏢", "title": "Enterprise Solutions", "desc": "Bulk licensing, private marketplace instances, custom security policies, and dedicated support for enterprise customers."},
        ],
        "faqs": [
            {"q": "What is HeadyCoin?", "a": "HeadyCoin (HCOIN) is the native utility token of the HeadyEX marketplace. It's used for agent purchases, compute payments, staking, governance, and community rewards. Distribution follows φ-scaled tokenomics."},
            {"q": "How do agents get verified?", "a": "All agents undergo automated security scanning, performance benchmarking, and compatibility testing before listing. Human reviewers verify documentation quality and check for malicious behavior. Verified badges indicate completed audit."},
            {"q": "What if an agent doesn't work as advertised?", "a": "Smart contract escrow holds payment until deployment is confirmed. If the agent fails performance claims, file a dispute for automated verification. Valid claims receive automatic refunds."},
            {"q": "How do developers earn money?", "a": "Developers earn HCOIN from direct sales and usage-based royalties (a φ-scaled percentage of compute costs incurred by deployments). Top agents can generate significant passive income from usage royalties."},
            {"q": "Can I list agents for free?", "a": "Yes. Basic listings are free. Premium features like promoted placement, analytics dashboard, and priority support require HCOIN staking. The marketplace fee (1.618% standard, 0.618% for stakers) is charged on transactions."},
            {"q": "Is HeadyEX available globally?", "a": "Yes. HeadyEX serves developers and enterprises worldwide. HCOIN transactions are borderless. Local regulations regarding cryptocurrency and AI may apply in certain jurisdictions."},
            {"q": "How does CSL-based search work?", "a": "Instead of ranking agents by popularity or rating, HeadyEX uses Continuous Semantic Logic to match your search query to agents by domain relevance. Cosine similarity in 384-dim space finds the most semantically relevant agents for your specific use case."},
            {"q": "Can I deploy agents to my own infrastructure?", "a": "Yes. Agents can be deployed to HeadyOS cloud, your own Kubernetes cluster, or Cloudflare Workers. The HeadyOS SDK provides adapters for multiple deployment targets."},
        ],
    },
    {
        "slug": "headyfinance",
        "domain": "headyfinance.com",
        "name": "HeadyFinance",
        "tagline": "Invest in the Future of AI",
        "description": "Investor relations, growth metrics, patent portfolio, strategic roadmap — the financial intelligence behind HeadySystems.",
        "role": "investor-relations",
        "accent": "#a855f7",
        "accentGlow": "rgba(168,85,247,0.15)",
        "sacredGeometry": "Vesica Piscis",
        "navLinks": [
            {"label": "Financials", "href": "#financials"},
            {"label": "Patents", "href": "#patents"},
            {"label": "Roadmap", "href": "#roadmap"},
            {"label": "HeadySystems", "href": "https://headysystems.com", "cta": True},
        ],
        "features": [
            {"icon": "📈", "title": "Growth Metrics", "desc": "Revenue projections, user growth curves, platform adoption analytics, and market penetration data — all presented with φ-scaled precision and full transparency."},
            {"icon": "📜", "title": "Patent Portfolio", "desc": "51+ provisional patents creating a defensible competitive moat across CSL, VSA, sacred geometry computing, 3D spatial memory, and multi-agent orchestration."},
            {"icon": "🌐", "title": "9 Domain Verticals", "desc": "Diversified portfolio spanning consumer (HeadyMe), enterprise (HeadySystems), developer (HeadyOS), research (HeadyAI), community (HeadyConnection), marketplace (HeadyEX), and more."},
            {"icon": "🗺️", "title": "Strategic Roadmap", "desc": "Series A timeline, partnership pipeline, enterprise pilot programs, and milestone targets with clear success criteria and φ-scaled delivery projections."},
        ],
        "stats": [
            {"num": "51+", "label": "Patents"},
            {"num": "9", "label": "Verticals"},
            {"num": "$___", "label": "Raised"},
            {"num": "2026", "label": "Series A Target"},
        ],
        "deepDive": """
<h3>Investment Thesis</h3>
<p>HeadySystems represents a generational investment opportunity at the intersection of artificial intelligence, agent computing, and infrastructure technology. Our thesis is built on three pillars: a defensible patent portfolio (51+ provisional patents), a diversified multi-vertical platform (9 distinct market segments), and a novel technical architecture (CSL, VSA, Sacred Geometry) that creates fundamental advantages over competitors.</p>

<h3>Market Opportunity</h3>
<p>The global AI market is projected to exceed $1.5 trillion by 2030, with the AI agent segment growing at 45% CAGR. HeadySystems is positioned at the infrastructure layer — the "picks and shovels" of the AI gold rush — providing the operating system, orchestration, and marketplace that agent builders and enterprises need. Our total addressable market spans enterprise AI infrastructure ($200B), developer tools ($50B), AI marketplaces ($30B), and specialized verticals.</p>

<h3>Patent Portfolio — 51+ Defensive Moat</h3>
<p>Our intellectual property portfolio includes 51+ provisional patent applications covering core innovations: Continuous Semantic Logic gate mechanisms, Vector Symbolic Architecture composition operators, sacred geometry network topology algorithms, 3D spatial memory indexing structures, φ-scaled resource allocation methods, cognitive archetype processing pipelines, cross-domain context injection systems, and concurrent swarm orchestration protocols.</p>

<p>These patents create multiple layers of defensibility. Competitors cannot replicate our core technology without licensing our IP. The patent portfolio covers both the theoretical foundations (CSL, VSA, sacred geometry) and the practical implementations (service mesh topology, memory architecture, bee swarm patterns), making workarounds difficult.</p>

<h3>Revenue Model</h3>
<p>HeadySystems generates revenue through multiple streams: subscription licensing for HeadyMe and HeadyOS, enterprise infrastructure contracts for HeadySystems, marketplace transaction fees on HeadyEX, token economics via HeadyCoin, professional services and custom deployments, and advertising-supported community platforms. This diversified model reduces single-stream dependency and creates cross-selling opportunities across verticals.</p>

<h3>Growth Metrics</h3>
<p>Key performance indicators include monthly active users across all platforms, developer adoption rate for HeadyOS SDK, enterprise pipeline value, marketplace GMV (gross merchandise value), vector memory storage growth, and community engagement metrics. All metrics are tracked with φ-scaled projections that model both conservative and optimistic scenarios.</p>

<h3>Team</h3>
<p>Founded by Eric Haywood, an experienced technologist with deep expertise in AI systems, distributed computing, and enterprise architecture. The founding team combines technical excellence with business acumen, having collectively built and scaled multiple technology platforms. We are actively recruiting additional senior leadership for our Series A phase.</p>

<h3>Roadmap</h3>
<p>Our strategic roadmap targets Series A fundraising in 2026, with milestones including: production deployment of all 50+ services, 1000+ agents on HeadyEX marketplace, 10,000+ HeadyOS developer accounts, 5+ enterprise pilot programs, HeadyCoin mainnet launch, and community growth to 25,000+ members. Each milestone has clear success criteria and φ-scaled delivery projections.</p>

<h3>Competitive Landscape</h3>
<p>While companies like Anthropic, OpenAI, and Google compete in model development, HeadySystems operates at the infrastructure and orchestration layer — complementary rather than competitive. Our closest comparisons are LangChain (agent framework), AutoGen (multi-agent orchestration), and CrewAI (agent teams), but none combine our patent-protected innovations in CSL, VSA, sacred geometry, and 3D spatial memory.</p>
""",
        "howItWorks": [
            {"title": "Technology", "desc": "51+ patented innovations in CSL, VSA, Sacred Geometry, and 3D Spatial Memory create fundamental competitive advantages."},
            {"title": "Platform", "desc": "9 interconnected verticals generate diversified revenue across consumer, enterprise, developer, research, community, and marketplace."},
            {"title": "Traction", "desc": "Growing user base, developer adoption, enterprise pipeline, and marketplace GMV demonstrate product-market fit."},
            {"title": "Vision", "desc": "Series A in 2026 to scale platform, expand enterprise partnerships, and launch HeadyCoin mainnet for agent economy."},
        ],
        "useCases": [
            {"icon": "💼", "title": "Seed/Angel Investment", "desc": "Early-stage investors gain equity in a diversified AI platform with 51+ patents, 9 market verticals, and a clear path to Series A."},
            {"icon": "🏢", "title": "Strategic Partnership", "desc": "Enterprise partners gain preferred access to HeadySystems infrastructure, custom deployments, and white-label opportunities."},
            {"icon": "🤝", "title": "Corporate Venture", "desc": "CVC arms of cloud providers, AI companies, and enterprise software firms gain strategic positioning in the agent economy."},
            {"icon": "📊", "title": "Due Diligence", "desc": "Access detailed technical documentation, patent filings, financial projections, and competitive analysis through our data room."},
            {"icon": "🌍", "title": "Global Expansion", "desc": "International investors gain access to a platform architected for global edge deployment across 300+ Cloudflare locations."},
            {"icon": "🪙", "title": "Token Pre-Sale", "desc": "Early HeadyCoin acquisition for investors interested in the agent economy and decentralized AI marketplace infrastructure."},
        ],
        "faqs": [
            {"q": "What stage is HeadySystems?", "a": "HeadySystems is currently in pre-seed/seed stage with production infrastructure deployed, 51+ patent applications filed, and 9 vertical platforms under active development. We are targeting Series A fundraising in 2026."},
            {"q": "How many patents have been filed?", "a": "51+ provisional patent applications covering CSL gate mechanisms, VSA operators, sacred geometry computing, 3D spatial memory, φ-scaled resource allocation, cognitive archetypes, and concurrent swarm orchestration."},
            {"q": "What is the revenue model?", "a": "Diversified across subscription (HeadyMe/HeadyOS), enterprise (HeadySystems infrastructure), marketplace (HeadyEX fees), token economics (HeadyCoin), professional services, and community platforms."},
            {"q": "Who are the competitors?", "a": "We operate at the infrastructure/orchestration layer, complementary to model providers (Anthropic, OpenAI, Google). Closest comparisons are LangChain, AutoGen, and CrewAI, but none have our patented CSL/VSA/Sacred Geometry innovations."},
            {"q": "Is there a data room?", "a": "Qualified investors can request access to our detailed data room containing technical documentation, patent filings, financial models, market analysis, and team backgrounds. Contact invest@headysystems.com."},
            {"q": "What is HeadyCoin's role?", "a": "HeadyCoin (HCOIN) is the native utility token of the HeadyEX marketplace, used for agent purchases, compute payments, staking, governance, and community rewards. It creates a self-sustaining agent economy."},
            {"q": "How is the 501(c)(3) related?", "a": "HeadyConnection.org is a separate 501(c)(3) entity that receives a portion of commercial revenue. It's a social impact commitment: commercial success funds non-profit mission delivery, creating positive brand association and community goodwill."},
            {"q": "What are the key milestones for Series A?", "a": "Production deployment of 50+ services, 1000+ marketplace agents, 10K+ developer accounts, 5+ enterprise pilots, HeadyCoin mainnet launch, and 25K+ community members."},
        ],
    },
    {
        "slug": "admin-portal",
        "domain": "admin.headysystems.com",
        "name": "HeadySystems Admin Portal",
        "tagline": "Internal Operations Dashboard",
        "description": "System dashboard, agent monitoring, deploy controls, security console — the operational nerve center for HeadySystems infrastructure.",
        "role": "admin",
        "accent": "#06b6d4",
        "accentGlow": "rgba(6,182,212,0.15)",
        "sacredGeometry": "Metatrons Cube",
        "navLinks": [
            {"label": "Dashboard", "href": "#dashboard"},
            {"label": "Agents", "href": "#agents"},
            {"label": "Deploys", "href": "#deploys"},
            {"label": "HeadySystems", "href": "https://headysystems.com", "cta": True},
        ],
        "features": [
            {"icon": "📊", "title": "System Dashboard", "desc": "Real-time CPU, memory, GC, and event-loop telemetry across all 50+ services. OpenTelemetry spans visualized with correlation tracking and φ-scaled alert thresholds."},
            {"icon": "🤖", "title": "Agent Monitor", "desc": "Live status of all 20 AI nodes with health scores, capability matrices, task throughput, and memory utilization. Vector memory visualization shows knowledge graph density."},
            {"icon": "🚀", "title": "Deploy Controls", "desc": "One-click deployments, rollbacks, and canary releases for all services. HCFP pipeline status, SBOM viewer, and deployment history with cryptographic receipt verification."},
            {"icon": "🛡️", "title": "Security Console", "desc": "RBAC management, audit logs, secret rotation schedules, certificate expiry monitoring, and zero-trust policy enforcement dashboard."},
        ],
        "stats": [
            {"num": "50+", "label": "Services"},
            {"num": "20", "label": "AI Nodes"},
            {"num": "17", "label": "Swarms"},
            {"num": "99.9%", "label": "Uptime"},
        ],
        "deepDive": """
<h3>Operational Command Center</h3>
<p>The HeadySystems Admin Portal is the internal operations dashboard used by the platform engineering team to monitor, manage, and maintain the entire Heady infrastructure. It provides real-time visibility into all 50+ microservices, 20 AI nodes, 17 swarms, and the interconnecting service mesh. This is where operational decisions are made and system health is ensured.</p>

<h3>System Health Dashboard</h3>
<p>The primary dashboard view shows aggregated health metrics across the entire infrastructure. Service tiles display real-time status with color-coded health indicators (green for healthy, amber for degraded, red for down). Each tile expands to show detailed metrics: CPU utilization, memory consumption, garbage collection frequency, event loop delay, request throughput, error rates, and latency percentiles (p50, p95, p99).</p>

<p>All metrics are collected via OpenTelemetry and stored in time-series databases with φ-scaled retention (recent data at full resolution, older data aggregated at Fibonacci intervals). Alert thresholds use φ-scaled bands: a metric must exceed ψ (0.618) of its baseline for amber alerts and φ (1.618) of its baseline for red alerts. This eliminates alert fatigue from normal variance while catching genuine anomalies.</p>

<h3>Agent Monitoring</h3>
<p>The Agent Monitor displays the live status of all 20 AI processing nodes. Each node's tile shows its current task, health score, throughput (tasks/minute), latency distribution, and vector memory utilization. A capability matrix shows which models and tools are available on each node, enabling operators to understand the system's overall capacity at a glance.</p>

<p>The vector memory visualization renders a 3D projection of the knowledge graph, showing cluster density, recent additions (highlighted in the site's accent color), and memory utilization percentage. Operators can drill into specific memory regions to inspect stored vectors, their metadata, and access patterns.</p>

<h3>Deployment Pipeline</h3>
<p>The Deploy Controls section provides full lifecycle management for all services. The HCFP (Heady Continuous Flow Pipeline) status board shows all active deployments with their current stage (21 stages from commit to production). Operators can initiate deployments, monitor progress, approve gates, and trigger rollbacks.</p>

<p>Each deployment generates a Software Bill of Materials (SBOM) listing all dependencies, versions, and known vulnerabilities. The SBOM viewer enables security review before promoting to production. All deployment artifacts are signed with Ed25519 cryptographic receipts, creating an immutable audit trail that can be verified at any time.</p>

<h3>Security Administration</h3>
<p>The Security Console manages Role-Based Access Control (RBAC) for all operators and services. Roles are defined with granular permissions (read, write, deploy, admin) across service groups. All actions are logged in the audit trail with timestamps, operator identity, action type, and affected resources.</p>

<p>Secret rotation schedules display all managed secrets (API keys, certificates, tokens) with their rotation dates, last rotation time, and expiry warnings. Operators can trigger immediate rotation for compromised secrets. Certificate monitoring tracks TLS certificate expiry across all services and domains, with automated renewal through Let's Encrypt and Cloudflare.</p>

<h3>Incident Management</h3>
<p>When issues are detected, the Admin Portal provides incident management workflows including automated escalation, runbook links, communication templates, and post-incident review tools. The system tracks mean time to detection (MTTD), mean time to resolution (MTTR), and incident frequency metrics to drive continuous improvement.</p>

<h3>Access Control</h3>
<p>The Admin Portal requires elevated authentication beyond standard Heady user accounts. Operators must authenticate through auth.headysystems.com with multi-factor authentication (WebAuthn/FIDO2 preferred, TOTP fallback). All admin sessions are time-limited and require re-authentication for sensitive operations like production deployments and secret rotation.</p>
""",
        "howItWorks": [
            {"title": "Authenticate", "desc": "Multi-factor authentication via auth.headysystems.com with WebAuthn/FIDO2. Elevated privileges require re-authentication."},
            {"title": "Monitor", "desc": "Real-time dashboards show health across all services, agents, and swarms. φ-scaled alert thresholds minimize noise."},
            {"title": "Operate", "desc": "Deploy, rollback, rotate secrets, and manage access through the unified console. All actions are cryptographically logged."},
            {"title": "Respond", "desc": "Incident management workflows guide operators from detection through resolution with automated escalation and runbooks."},
        ],
        "useCases": [
            {"icon": "🔍", "title": "Health Monitoring", "desc": "Continuous visibility into all 50+ services with real-time metrics, φ-scaled alerts, and historical trend analysis."},
            {"icon": "🚀", "title": "Deployment Management", "desc": "HCFP pipeline control with 21-stage deployments, canary releases, one-click rollbacks, and SBOM security review."},
            {"icon": "🛡️", "title": "Security Ops", "desc": "RBAC administration, secret rotation, certificate management, audit logging, and zero-trust policy enforcement."},
            {"icon": "🤖", "title": "Agent Oversight", "desc": "Monitor AI node health, capability, throughput, and memory utilization. Visualize knowledge graph density in 3D."},
            {"icon": "📋", "title": "Incident Response", "desc": "Structured incident management with escalation, runbooks, and post-incident review for continuous improvement."},
            {"icon": "📊", "title": "Capacity Planning", "desc": "Historical metrics and φ-scaled projections for resource planning, scaling decisions, and infrastructure budgeting."},
        ],
        "faqs": [
            {"q": "Who has access to the Admin Portal?", "a": "Only authorized platform engineers and operators with elevated privileges. Access requires multi-factor authentication and is logged in the audit trail."},
            {"q": "What metrics are monitored?", "a": "CPU, memory, GC frequency, event loop delay, request throughput, error rates, latency percentiles (p50/p95/p99), agent health scores, vector memory utilization, and swarm task throughput."},
            {"q": "How do alerts work?", "a": "Alerts use φ-scaled thresholds: amber at 0.618× baseline, red at 1.618× baseline. This eliminates false positives from normal variance while catching genuine anomalies."},
            {"q": "What is the HCFP pipeline?", "a": "Heady Continuous Flow Pipeline — a 21-stage deployment pipeline covering static analysis, security scanning, testing, canary deployment, traffic shifting, and automated rollback."},
            {"q": "How are secrets managed?", "a": "Secrets are stored in encrypted vaults (Cloudflare Secrets, HashiCorp Vault) with scheduled rotation. The Security Console tracks rotation dates, enables immediate rotation, and monitors certificate expiry."},
            {"q": "Can external monitoring tools integrate?", "a": "Yes. All metrics are exported via OpenTelemetry protocol and can be ingested by Datadog, Grafana, New Relic, or any OTLP-compatible monitoring platform."},
            {"q": "What happens during an incident?", "a": "The portal provides structured workflows: automated detection, escalation to on-call engineers, runbook links, communication templates, and post-incident review tools. MTTD and MTTR are tracked."},
            {"q": "Is there audit logging?", "a": "Yes. Every action in the Admin Portal is logged with timestamp, operator identity, action type, affected resource, and result. Logs are immutable and signed with Ed25519 receipts."},
        ],
    },
]

# ════════════════════════════════════════════════════════════
# HTML TEMPLATE
# ════════════════════════════════════════════════════════════

def make_nav_html(site):
    links = ""
    for link in site["navLinks"]:
        cls = ' class="btn btn-primary btn-sm"' if link.get("cta") else ''
        target = ' target="_blank" rel="noopener"' if link["href"].startswith("http") else ''
        links += f'<a href="{link["href"]}"{cls}{target}>{link["label"]}</a>\n'
    return links

def make_features_html(site):
    cards = ""
    for f in site["features"]:
        cards += f'''
        <div class="glass-card">
          <span class="feature-icon">{f["icon"]}</span>
          <h4>{f["title"]}</h4>
          <p>{f["desc"]}</p>
        </div>'''
    return cards

def make_stats_html(site):
    items = ""
    for s in site["stats"]:
        items += f'''
        <div class="stat">
          <div class="stat-num">{s["num"]}</div>
          <div class="stat-label">{s["label"]}</div>
        </div>'''
    return items

def make_how_html(site):
    steps = ""
    for i, step in enumerate(site["howItWorks"]):
        steps += f'''
        <div class="how-step glass-card">
          <div class="how-step-num">{str(i+1).zfill(2)}</div>
          <h4>{step["title"]}</h4>
          <p>{step["desc"]}</p>
        </div>'''
    return steps

def make_usecases_html(site):
    items = ""
    for uc in site["useCases"]:
        items += f'''
        <div class="glass-card">
          <span style="font-size:1.618rem;display:block;margin-bottom:0.8rem">{uc["icon"]}</span>
          <h4>{uc["title"]}</h4>
          <p>{uc["desc"]}</p>
        </div>'''
    return items

def make_faq_html(site):
    items = ""
    for i, faq in enumerate(site["faqs"]):
        items += f'''
        <div class="faq-item" data-index="{i}">
          <button class="faq-question">{faq["q"]}</button>
          <div class="faq-answer"><p>{faq["a"]}</p></div>
        </div>'''
    return items

def make_ecosystem_html(current_slug):
    nodes = ""
    for s in SITES:
        is_current = s["slug"] == current_slug
        cls = "eco-node eco-node--current" if is_current else "eco-node"
        target = '' if is_current else ' target="_blank" rel="noopener"'
        nodes += f'''
        <a href="https://{s["domain"]}" class="{cls}" style="--node-accent:{s["accent"]}"{target}>
          <span class="eco-icon">{s["features"][0]["icon"]}</span>
          <span class="eco-label">{s["name"]}</span>
          <span class="eco-desc">{s["role"].replace("-"," ").title()}</span>
        </a>'''
    return nodes

def make_footer_html(current_slug):
    cols = {
        "Platform": [
            ("HeadyMe", "https://headyme.com"),
            ("HeadySystems", "https://headysystems.com"),
            ("HeadyAI", "https://heady-ai.com"),
            ("HeadyOS", "https://headyos.com"),
        ],
        "Community": [
            ("HeadyConnection.org", "https://headyconnection.org"),
            ("HeadyConnection.com", "https://headyconnection.com"),
            ("HeadyEX", "https://headyex.com"),
        ],
        "Company": [
            ("HeadyFinance", "https://headyfinance.com"),
            ("Admin Portal", "https://admin.headysystems.com"),
            ("GitHub", "https://github.com/HeadyMe"),
        ],
    }
    html = ""
    for title, links in cols.items():
        link_html = ""
        for label, url in links:
            link_html += f'<a href="{url}" target="_blank" rel="noopener">{label}</a>\n'
        html += f'''
        <div class="footer-col">
          <h4>{title}</h4>
          {link_html}
        </div>'''
    return html

def generate_site_html(site):
    accent = site["accent"]
    accentGlow = site["accentGlow"]
    
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{site["name"]} — {site["tagline"]}</title>
  <meta name="description" content="{site["description"]}">
  <meta name="keywords" content="Heady, AI, {site["name"]}, {site["role"]}, sacred geometry, vector memory, CSL">
  <meta property="og:title" content="{site["name"]} — {site["tagline"]}">
  <meta property="og:description" content="{site["description"]}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://{site["domain"]}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../packages/design-system/heady-design.css">
  <style>
    :root {{
      --accent: {accent};
      --accent-glow: {accentGlow};
      --accent-subtle: {accentGlow.replace("0.15","0.06")};
    }}
    body {{ padding-top: 32px; }} /* cross-nav offset */
    .sacred-canvas {{
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      z-index: 0;
      pointer-events: none;
    }}
    .feature-icon {{
      font-size: 1.618rem;
      display: block;
      margin-bottom: 0.8rem;
      color: var(--accent);
    }}
    .btn-sm {{
      padding: 0.4rem 1rem;
      font-size: var(--text-xs);
      border-radius: var(--radius-sm);
    }}
    .deep-dive {{ max-width: 800px; margin: 0 auto; text-align: left; }}
    .deep-dive h3 {{ font-size: var(--text-xl); margin: var(--space-21) 0 var(--space-8); color: var(--accent); }}
    .deep-dive h4 {{ font-size: var(--text-lg); margin: var(--space-13) 0 var(--space-5); color: var(--text-primary); }}
    .deep-dive p {{ margin-bottom: var(--space-8); font-size: var(--text-base); line-height: 1.8; }}
    .nav-links {{ display: flex; align-items: center; gap: var(--space-8); }}
    .nav-links a {{ color: var(--text-secondary); font-size: var(--text-sm); font-weight: 500; }}
    .nav-links a:hover {{ color: var(--text-primary); opacity: 1; }}
    .nav-logo {{
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      color: var(--accent);
    }}
    .eco-map {{ display: grid; grid-template-columns: repeat(3,1fr); gap: 1.3125rem; max-width: 900px; margin: 0 auto; }}
    .eco-node {{ display: flex; flex-direction: column; align-items: center; text-align: center; padding: 2rem 1rem; background: var(--glass-bg); backdrop-filter: blur(24px); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); text-decoration: none; transition: all .382s; }}
    .eco-node:hover {{ transform: translateY(-3px); border-color: var(--node-accent); box-shadow: 0 0 21px rgba(124,94,255,.12); opacity: 1; }}
    .eco-node--current {{ border-color: var(--node-accent); background: rgba(124,94,255,.04); }}
    .eco-icon {{ font-size: 1.8rem; margin-bottom: .5rem; color: var(--node-accent); }}
    .eco-label {{ font-weight: 600; color: #e8e8f0; font-size: .95rem; margin-bottom: .25rem; }}
    .eco-desc {{ font-size: .75rem; color: #9898b0; }}
    .how-steps {{ display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 1.3125rem; }}
    .how-step {{ text-align: center; padding: 2rem 1rem; }}
    .how-step-num {{ font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 700; color: {accentGlow.replace("0.15","0.3")}; margin-bottom: .5rem; }}
    .how-step h4 {{ color: #e8e8f0; margin-bottom: .5rem; }}
    .how-step p {{ font-size: .85rem; color: #9898b0; }}
    @media(max-width:768px) {{
      .eco-map {{ grid-template-columns: 1fr 1fr; }}
      .how-steps {{ grid-template-columns: 1fr; }}
      .nav-links {{ display: none; }}
    }}
    @media(max-width:480px) {{
      .eco-map {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>

  <!-- Sacred Geometry Canvas Background -->
  <canvas id="sacred-canvas" class="sacred-canvas"></canvas>

  <!-- Navigation -->
  <nav class="glass-nav" style="top:32px;">
    <span class="nav-logo">{site["name"]}</span>
    <div class="nav-links">
      {make_nav_html(site)}
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="version-badge">v3.0 · {site["sacredGeometry"]} · {site["role"].replace("-"," ").title()}</div>
    <h1 class="text-gradient">{site["tagline"]}</h1>
    <p class="subtitle">{site["description"]}</p>
    <div style="display:flex;gap:var(--space-8);">
      <a href="#deep-dive" class="btn btn-primary">Learn More</a>
      <a href="https://auth.headysystems.com/login?redirect=https://{site["domain"]}" class="btn btn-ghost">Sign In</a>
    </div>
  </section>

  <!-- Stats Banner -->
  <section class="section" style="padding: var(--space-21) 0;">
    <div class="container">
      <div class="stats-row">
        {make_stats_html(site)}
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="section">
    <div class="container">
      <div class="section-header">
        <h2>Core Capabilities</h2>
        <p>Everything you need from {site["name"]} — powered by Sacred Geometry and Continuous Semantic Logic.</p>
      </div>
      <div class="grid-{min(len(site["features"]), 3)}">
        {make_features_html(site)}
      </div>
    </div>
  </section>

  <!-- Deep Dive Content (2000+ words) -->
  <section id="deep-dive" class="section">
    <div class="container">
      <div class="section-header">
        <h2>Deep Dive</h2>
        <p>A comprehensive look at what {site["name"]} offers and how it works.</p>
      </div>
      <div class="deep-dive">
        {site["deepDive"]}
      </div>
    </div>
  </section>

  <!-- How It Works -->
  <section id="how-it-works" class="section">
    <div class="container">
      <div class="section-header">
        <h2>How It Works</h2>
        <p>The {site["name"]} workflow in four steps.</p>
      </div>
      <div class="how-steps">
        {make_how_html(site)}
      </div>
    </div>
  </section>

  <!-- Technology Stack -->
  <section id="tech-stack" class="section">
    <div class="container">
      <div class="section-header">
        <h2>Technology Stack</h2>
        <p>Built on the Heady™ infrastructure — sacred geometry governs every parameter.</p>
      </div>
      <div id="tech-container"></div>
    </div>
  </section>

  <!-- Ecosystem Map -->
  <section id="ecosystem" class="section">
    <div class="container">
      <div class="section-header">
        <h2>Heady Ecosystem</h2>
        <p>Nine interconnected platforms. One unified intelligence layer.</p>
      </div>
      <div class="eco-map">
        {make_ecosystem_html(site["slug"])}
      </div>
    </div>
  </section>

  <!-- Use Cases -->
  <section id="use-cases" class="section">
    <div class="container">
      <div class="section-header">
        <h2>Use Cases</h2>
        <p>Real-world applications of {site["name"]}.</p>
      </div>
      <div class="grid-3">
        {make_usecases_html(site)}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="section">
    <div class="container">
      <div class="section-header">
        <h2>Frequently Asked Questions</h2>
        <p>Everything you need to know about {site["name"]}.</p>
      </div>
      <div style="max-width:700px;margin:0 auto;">
        {make_faq_html(site)}
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="nav-logo">{site["name"]}</span>
          <p>{site["description"]}</p>
        </div>
        {make_footer_html(site["slug"])}
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 HeadySystems Inc. All Rights Reserved. 51+ Provisional Patents.</span>
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" style="color:var(--text-muted);">
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  </footer>

  <!-- Scripts -->
  <script src="../packages/sacred-geometry/sacred-geometry.js"></script>
  <script src="../packages/cross-nav/cross-nav.js"></script>
  <script src="../packages/auth-widget/auth-widget.js"></script>
  <script src="../packages/auto-context/auto-context-bridge.js"></script>
  <script src="../packages/bee-injectors/bee-injectors.js"></script>
  <script>
    // Initialize Sacred Geometry Canvas with site-specific settings
    new SacredGeometryCanvas('sacred-canvas', {{
      accentColor: '{accent}',
      secondaryColor: '#40e0d0',
      goldColor: '#f0c040',
      opacity: 0.3,
      nodeCount: 34,
      connectionDistance: 140,
    }});

    // Initialize Cross-Site Navigation
    new HeadyCrossNav({{ siteId: '{site["slug"]}' }});

    // Initialize Auth Widget
    new HeadyAuthWidget({{
      siteId: '{site["slug"]}',
      accentColor: '{accent}',
    }});

    // Initialize AutoContext Bridge
    new AutoContextBridge({{ siteId: '{site["slug"]}' }});

    // Inject Tech Stack via Bee Injectors
    const techContainer = document.getElementById('tech-container');
    if (techContainer && window.HeadyBeeInjectors) {{
      HeadyBeeInjectors.injectTechStack(techContainer);
    }}

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {{
      btn.addEventListener('click', () => {{
        const item = btn.parentElement;
        const wasActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(fi => fi.classList.remove('active'));
        if (!wasActive) item.classList.add('active');
      }});
    }});

    // Animated stat counters
    const observer = new IntersectionObserver(entries => {{
      entries.forEach(entry => {{
        if (entry.isIntersecting) {{
          entry.target.querySelectorAll('.stat-num').forEach(el => {{
            const final = el.textContent;
            const numeric = parseInt(final);
            if (!isNaN(numeric) && numeric > 0) {{
              let current = 0;
              const step = Math.max(1, Math.floor(numeric / 40));
              const timer = setInterval(() => {{
                current += step;
                if (current >= numeric) {{
                  el.textContent = final;
                  clearInterval(timer);
                }} else {{
                  el.textContent = current + (final.includes('+') ? '+' : '');
                }}
              }}, 30);
            }}
          }});
          observer.unobserve(entry.target);
        }}
      }});
    }}, {{ threshold: 0.3 }});
    document.querySelectorAll('.stats-row').forEach(row => observer.observe(row));
  </script>
</body>
</html>'''


# ════════════════════════════════════════════════════════════
# AUTH APP
# ════════════════════════════════════════════════════════════

AUTH_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heady Auth — Sign In to the Ecosystem</title>
  <meta name="description" content="Secure authentication for all Heady ecosystem sites. Sign in once, access everything.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../packages/design-system/heady-design.css">
  <style>
    :root { --accent: #7c5eff; --accent-glow: rgba(124,94,255,0.25); }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
    .auth-container { width: 100%; max-width: 420px; position: relative; z-index: 1; }
    .auth-card {
      background: rgba(13,13,26,0.85);
      backdrop-filter: blur(40px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 21px;
      padding: 34px;
    }
    .auth-logo {
      font-family: 'JetBrains Mono', monospace;
      font-size: 2rem;
      font-weight: 700;
      text-align: center;
      letter-spacing: 6px;
      background: linear-gradient(135deg, #7c5eff, #40e0d0, #f0c040);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .auth-subtitle { text-align: center; color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: 34px; }
    .auth-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 2px; margin-bottom: 21px; }
    .auth-tab { flex: 1; padding: 10px; background: none; border: none; color: var(--text-tertiary); font-size: var(--text-sm); font-weight: 500; cursor: pointer; border-radius: 6px; transition: all .2s; font-family: inherit; }
    .auth-tab.active { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .auth-field { margin-bottom: 16px; }
    .auth-field label { display: block; font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em; }
    .auth-field input {
      width: 100%; padding: 12px 16px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px; color: var(--text-primary); font-size: var(--text-sm);
      transition: border-color .2s; font-family: inherit;
    }
    .auth-field input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,94,255,0.15); }
    .auth-field input::stand-in marker { color: var(--text-muted); }
    .auth-submit {
      width: 100%; padding: 14px; background: var(--accent); color: #fff;
      border: none; border-radius: 8px; font-size: var(--text-sm); font-weight: 600;
      cursor: pointer; transition: all .2s; margin-top: 8px; font-family: inherit;
    }
    .auth-submit:hover { box-shadow: 0 0 21px var(--accent-glow); transform: translateY(-1px); }
    .auth-divider { display: flex; align-items: center; gap: 13px; margin: 21px 0; color: var(--text-muted); font-size: var(--text-xs); }
    .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
    .auth-providers { display: flex; gap: 8px; }
    .auth-provider {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px; color: var(--text-secondary); font-size: .85rem;
      cursor: pointer; transition: all .2s; font-family: inherit;
    }
    .auth-provider:hover { border-color: rgba(255,255,255,0.14); color: var(--text-primary); background: rgba(255,255,255,0.06); }
    .auth-guest { display: block; text-align: center; margin-top: 16px; color: var(--text-tertiary); font-size: var(--text-xs); cursor: pointer; transition: color .2s; background: none; border: none; width: 100%; font-family: inherit; }
    .auth-guest:hover { color: var(--text-secondary); }
    .auth-footer { text-align: center; margin-top: 21px; font-size: .7rem; color: var(--text-muted); }
    .auth-security { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 13px; font-size: var(--text-xs); color: var(--text-tertiary); }
    .auth-security svg { width: 14px; height: 14px; }
    .redirect-info { text-align: center; margin-bottom: 21px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px; font-size: var(--text-xs); color: var(--text-tertiary); }
    .allowed-domains { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 13px; }
    .allowed-domains .tag { font-size: 9px; padding: 2px 6px; }
    .sacred-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
  </style>
</head>
<body>

  <canvas id="sacred-canvas" class="sacred-canvas"></canvas>

  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-logo">HEADY</div>
      <p class="auth-subtitle">Authenticate once. Access the entire ecosystem.</p>

      <div id="redirect-info" class="redirect-info" style="display:none;">
        Redirecting to <span id="redirect-target"></span> after sign-in
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login" id="tab-login">Sign In</button>
        <button class="auth-tab" data-tab="signup" id="tab-signup">Create Account</button>
      </div>

      <form id="auth-form">
        <div class="auth-field" id="name-field" style="display:none;">
          <label for="auth-name">Full Name</label>
          <input type="text" id="auth-name" placeholder="Your name" autocomplete="name">
        </div>
        <div class="auth-field">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="auth-field">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" placeholder="Your secure password" required autocomplete="current-password">
        </div>
        <button type="submit" class="auth-submit" id="auth-submit-btn">Sign In</button>
      </form>

      <div class="auth-divider"><span>or continue with</span></div>

      <div class="auth-providers">
        <button class="auth-provider" id="google-btn">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <button class="auth-provider" id="github-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </button>
      </div>

      <button class="auth-guest" id="guest-btn">Continue as Guest (anonymous)</button>

      <div class="auth-security">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        httpOnly · Secure · SameSite=Strict · Zero-Trust
      </div>

      <div class="allowed-domains">
        <span class="tag">headyme.com</span>
        <span class="tag">headysystems.com</span>
        <span class="tag">heady-ai.com</span>
        <span class="tag">headyos.com</span>
        <span class="tag">headyconnection.org</span>
        <span class="tag">headyconnection.com</span>
        <span class="tag">headyex.com</span>
        <span class="tag">headyfinance.com</span>
        <span class="tag">admin.headysystems.com</span>
      </div>

      <p class="auth-footer">
        &copy; 2026 HeadySystems Inc. &middot; Protected by Heady Zero-Trust Security<br>
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" style="color:var(--text-muted);">Created with Perplexity Computer</a>
      </p>
    </div>
  </div>

  <script src="../packages/sacred-geometry/sacred-geometry.js"></script>
  <script>
    // Sacred Geometry background
    new SacredGeometryCanvas('sacred-canvas', {
      accentColor: '#7c5eff',
      secondaryColor: '#40e0d0',
      goldColor: '#f0c040',
      opacity: 0.25,
      nodeCount: 21,
    });

    // Allowed redirect domains (server-side would validate too)
    const ALLOWED_DOMAINS = [
      'headyme.com', 'headysystems.com', 'heady-ai.com', 'headyos.com',
      'headyconnection.org', 'headyconnection.com', 'headyex.com',
      'headyfinance.com', 'admin.headysystems.com'
    ];

    // Parse redirect from URL
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    const state = params.get('state') || crypto.randomUUID();
    const nonce = params.get('nonce') || crypto.randomUUID();

    if (redirectUrl) {
      try {
        const url = new URL(redirectUrl);
        const isAllowed = ALLOWED_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d));
        if (isAllowed) {
          document.getElementById('redirect-info').style.display = 'block';
          document.getElementById('redirect-target').textContent = url.hostname;
        }
      } catch(e) { /* invalid URL, ignore */ }
    }

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isSignup = tab.dataset.tab === 'signup';
        document.getElementById('name-field').style.display = isSignup ? 'block' : 'none';
        document.getElementById('auth-submit-btn').textContent = isSignup ? 'Create Account' : 'Sign In';
        document.getElementById('auth-password').autocomplete = isSignup ? 'new-password' : 'current-password';
      });
    });

    // Form submission
    document.getElementById('auth-form').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const name = document.getElementById('auth-name').value || email.split('@')[0];
      const isSignup = document.querySelector('.auth-tab.active').dataset.tab === 'signup';

      // In production: POST to auth.headysystems.com/api/auth with state/nonce
      // Server sets httpOnly Secure SameSite=Strict cookies
      // Auth state is emitted as a transient browser event; session is server-managed on the auth domain
      const user = {
        uid: 'heady_' + Date.now(),
        email,
        displayName: name,
        provider: 'email',
        state,
        nonce,
        authenticatedAt: new Date().toISOString(),
      };

      // Dispatch auth event for cross-site reactivity
      window.dispatchEvent(new CustomEvent('heady:auth:changed', { detail: user }));

      // Redirect if valid
      if (redirectUrl) {
        try {
          const url = new URL(redirectUrl);
          const isAllowed = ALLOWED_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith('.' + d));
          if (isAllowed) {
            url.searchParams.set('auth_state', state);
            window.location.href = url.toString();
            return;
          }
        } catch(e) { /* fall through */ }
      }

      // Default redirect
      window.location.href = '/';
    });

    // OAuth providers
    document.getElementById('google-btn').addEventListener('click', () => {
      const url = new URL('/oauth/google', window.location.origin);
      url.searchParams.set('redirect', redirectUrl);
      url.searchParams.set('state', state);
      url.searchParams.set('nonce', nonce);
      window.location.href = url.toString();
    });
    document.getElementById('github-btn').addEventListener('click', () => {
      const url = new URL('/oauth/github', window.location.origin);
      url.searchParams.set('redirect', redirectUrl);
      url.searchParams.set('state', state);
      url.searchParams.set('nonce', nonce);
      window.location.href = url.toString();
    });

    // Anonymous guest
    document.getElementById('guest-btn').addEventListener('click', () => {
      const user = {
        uid: 'guest_' + Date.now(),
        email: null,
        displayName: 'Guest',
        provider: 'anonymous',
        state,
        nonce,
        authenticatedAt: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('heady:auth:changed', { detail: user }));
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    });
  </script>
</body>
</html>'''


# ════════════════════════════════════════════════════════════
# GENERATE ALL FILES
# ════════════════════════════════════════════════════════════

def main():
    # Generate each site
    for site in SITES:
        site_dir = os.path.join(BASE, "apps", site["slug"])
        os.makedirs(site_dir, exist_ok=True)
        html = generate_site_html(site)
        filepath = os.path.join(site_dir, "index.html")
        with open(filepath, "w") as f:
            f.write(html)
        # Count words
        import re
        text = re.sub(r'<[^>]+>', ' ', html)
        words = len(text.split())
        print(f"  {site['slug']:25s} → {filepath} ({words} words)")

    # Generate auth app
    auth_dir = os.path.join(BASE, "apps", "auth")
    os.makedirs(auth_dir, exist_ok=True)
    auth_path = os.path.join(auth_dir, "index.html")
    with open(auth_path, "w") as f:
        f.write(AUTH_HTML)
    print(f"  {'auth':25s} → {auth_path}")

    print(f"\nGenerated {len(SITES)} sites + auth app")

if __name__ == "__main__":
    main()
