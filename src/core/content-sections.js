/**
 * © 2026 HeadySystems Inc. — Rich Content Sections for Dynamic Sites
 * 
 * Provides expanded, domain-specific content for each Heady site.
 * Each domain gets unique About, Deep Dive, Technology, and FAQ sections.
 * Zero generic content — every word is specific to the brand.
 */

const SITE_CONTENT = {
  'headyme.com': {
    about: {
      title: 'What is HeadyMe?',
      paragraphs: [
        'HeadyMe is your sovereign AI companion — a personal intelligence platform that operates across every device, every domain, and every context in your digital life. Unlike cloud-only assistants that forget you between sessions, HeadyMe maintains persistent 384-dimensional vector memory that evolves with every interaction.',
        'Built on the Sacred Geometry orchestration framework, HeadyMe routes your requests through a liquid gateway of 4+ AI providers — Claude, GPT-4o, Gemini, Groq, and Perplexity — automatically selecting the optimal model for each task. When one provider is slow or down, HeadyMe reroutes in under 50ms with zero disruption.',
        'Your data never leaves your control. HeadyMe encrypts credentials with AES-256-GCM, stores embeddings in your own pgvector instance, and runs inference at the Cloudflare edge — no round-trips to centralized servers. This is AI that works for you, not AI that works on you.',
      ],
    },
    deepDive: {
      title: 'How It Works',
      items: [
        { icon: '🔀', title: 'Liquid Gateway Routing', desc: 'Every request races through multiple AI providers simultaneously. The fastest, highest-quality response wins. Phi-weighted scoring ensures consistent output quality across Claude, GPT-4o, Gemini, Groq, and Perplexity Sonar.' },
        { icon: '🧬', title: '384D Vector Memory', desc: 'Your conversations, preferences, and knowledge are embedded in 384-dimensional vector space using Nomic Embed v2. Semantic search finds relevant context across thousands of past interactions in under 5ms via HNSW indexing.' },
        { icon: '🛡️', title: 'Zero-Trust Security', desc: 'Every API call is authenticated, every credential is encrypted at rest, and every session is time-bounded. HeadyMe implements mutual TLS, CORS whitelisting across all Heady domains, and CSP headers that block injection attacks.' },
        { icon: '🐝', title: 'Bee Swarm Execution', desc: 'Complex tasks are decomposed into subtask DAGs and distributed across specialized HeadyBee agents. Each bee has a defined lifecycle — spawn, execute, report, retire — with circuit breakers and phi-scaled backoff for fault tolerance.' },
      ],
    },
    technology: {
      title: 'Built on Battle-Tested Infrastructure',
      stack: [
        { label: 'Edge Layer', value: 'Cloudflare Workers, KV, Vectorize, Durable Objects' },
        { label: 'Compute', value: 'Google Cloud Run (us-central1), autoscaling 0→100 instances' },
        { label: 'Database', value: 'Neon Postgres + pgvector (HNSW m=21, ef_construction=89)' },
        { label: 'Auth', value: 'Firebase Auth — 25 providers, WebAuthn passkeys, SSO' },
        { label: 'AI Providers', value: 'Claude 4, GPT-4o, Gemini 2.5, Groq (Llama 4), Perplexity Sonar' },
        { label: 'Protocols', value: 'MCP (Model Context Protocol), JSON-RPC 2.0, SSE, WebSocket' },
      ],
    },
    faq: [
      { q: 'Is HeadyMe free to use?', a: 'HeadyMe offers a Spark tier with generous free usage, including 1,000 AI queries per month and 10MB of vector memory. Pro ($21/mo) and Enterprise ($89/mo) tiers unlock higher limits, priority routing, and dedicated compute.' },
      { q: 'Where is my data stored?', a: 'All data is stored in encrypted Neon Postgres instances with pgvector extensions. Embeddings are cached at the Cloudflare edge for sub-5ms retrieval. You can export or delete all your data at any time.' },
      { q: 'Which AI models does HeadyMe support?', a: 'HeadyMe routes through Claude (Anthropic), GPT-4o (OpenAI), Gemini 2.5 (Google), Groq (Llama 4), Perplexity Sonar, and Mistral. The Liquid Gateway automatically selects the best model for each task, or you can pin a specific provider.' },
      { q: 'Can I bring my own API keys?', a: 'Yes. HeadyMe supports BYOK (Bring Your Own Key) for all 13 supported AI providers. Your keys are encrypted with AES-256-GCM and never logged or transmitted to third parties.' },
    ],
  },

  'headysystems.com': {
    about: {
      title: 'What is HeadySystems?',
      paragraphs: [
        'HeadySystems is the infrastructure backbone of the Heady ecosystem — a self-healing, fault-tolerant platform built on Sacred Geometry orchestration principles. Every component in the architecture maps to a node in a phi-weighted topology that automatically detects failures, quarantines degraded services, and respawns healthy replacements without human intervention.',
        'The architecture spans 6 layers — Center (HeadySoul), Inner (Conductor, Brains), Middle (Observer, Murphy), Outer (Bridge, Sentinel), Governance (Assure, Aware), and Memory (Vector, Graph) — with 34 liquid nodes that can be dynamically reassigned based on real-time demand and coherence scoring.',
        'With 72+ provisional patents filed across Continuous Semantic Logic, Sacred Geometry Orchestration, and Alive Software self-modeling, HeadySystems represents a fundamentally new approach to distributed AI infrastructure — one where the system understands itself as deeply as it understands its users.',
      ],
    },
    deepDive: {
      title: 'Architecture Deep Dive',
      items: [
        { icon: '⚛️', title: 'Sacred Geometry Topology', desc: 'Nodes are placed according to golden-ratio-derived coordinates in a multi-layer topology. Center nodes (HeadySoul) hold the system\'s self-model. Inner nodes handle routing and reasoning. Middle nodes observe and secure. Outer nodes bridge external services.' },
        { icon: '🔄', title: 'Self-Healing Lattice', desc: 'Every service reports health via structured /health endpoints with coherence scores. When a node\'s CSL score drops below 0.809 (MEDIUM threshold), the system triggers attestation, quarantine, and respawn — all without human intervention or downtime.' },
        { icon: '📐', title: 'Continuous Semantic Logic (CSL)', desc: 'Boolean logic replaced by vector geometry. CSL AND is cosine similarity. CSL NOT is orthogonal projection. CSL GATE thresholds decisions at phi-derived cutoffs (0.500 → 0.927). This enables nuanced, continuous reasoning instead of brittle if/else chains.' },
        { icon: '🧠', title: 'Alive Software', desc: 'HeadySystems maintains a 384D embedding of its own architecture — a self-model that drifts as code changes. When semantic drift exceeds thresholds, the system alerts engineers before coherence degrades. The codebase is the genetic code; the running system is the organism.' },
      ],
    },
    technology: {
      title: 'Infrastructure at a Glance',
      stack: [
        { label: 'Services', value: '175+ microservices tracked in SERVICE_INDEX.json (v4.1.0)' },
        { label: 'Agents', value: '30+ HeadyBee types across 17 specialized swarms' },
        { label: 'Patents', value: '72+ provisional patents ($4.87M estimated portfolio value)' },
        { label: 'Repository', value: '47,904 files, monorepo architecture with Turborepo' },
        { label: 'Uptime', value: 'Multi-region Cloud Run with Cloudflare tunnel failover' },
        { label: 'Observability', value: 'Langfuse LLM tracing, Sentry errors, OpenTelemetry spans' },
      ],
    },
    faq: [
      { q: 'What makes HeadySystems different from standard microservices?', a: 'Standard microservices rely on static routing and manual scaling. HeadySystems uses CSL-weighted coherence scoring to dynamically route traffic, self-heal degraded nodes, and evolve system configuration through genetic algorithms — all governed by phi-math instead of arbitrary thresholds.' },
      { q: 'How does the patent portfolio work?', a: 'HeadySystems has filed 72+ provisional patents covering novel inventions in Continuous Semantic Logic (vector geometry as logic gates), Sacred Geometry Orchestration (phi-weighted node topology), and Alive Software (self-aware architecture). Priority patents are being converted to non-provisional filings.' },
      { q: 'Can I deploy HeadySystems infrastructure for my own projects?', a: 'HeadySystems components will be available through HeadyMCP (Model Context Protocol) and HeadyAPI. Enterprise customers can deploy dedicated instances on Cloud Run with custom Sacred Geometry topologies tailored to their workloads.' },
      { q: 'What is Continuous Semantic Logic?', a: 'CSL replaces boolean true/false with continuous vector operations. AND becomes cosine similarity, NOT becomes orthogonal projection, GATE uses phi-derived thresholds. This allows the system to make nuanced decisions on a spectrum rather than binary choices.' },
    ],
  },
};

// Generate content for all other domains from their SITES registry data
const OTHER_DOMAIN_CONTENT = {
  'headyconnection.org': {
    about: {
      title: 'What is HeadyConnection?',
      paragraphs: [
        'HeadyConnection is the nonprofit arm of the Heady ecosystem — a 501(c)(3) organization dedicated to making sovereign AI accessible to underserved communities. We believe artificial intelligence should empower everyone, not just those who can afford enterprise subscriptions.',
        'Through community programs, grant-funded research, and open educational resources, HeadyConnection bridges the gap between cutting-edge AI technology and real-world impact. Our programs span digital literacy workshops, AI-assisted job training, and community technology hubs.',
        'Every dollar donated to HeadyConnection funds direct community impact. Our operational overhead is kept below 15% through AI-automated grant management, volunteer coordination, and program tracking — the same technology we teach others to use.',
      ],
    },
    faq: [
      { q: 'Is HeadyConnection a registered nonprofit?', a: 'Yes. HeadyConnection Inc. is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible to the extent allowed by law.' },
      { q: 'How can I volunteer?', a: 'We welcome volunteers for community workshops, mentoring, content creation, and technical support. Contact us at hello@headyconnection.org to get involved.' },
      { q: 'What programs does HeadyConnection run?', a: 'Our core programs include AI Literacy Workshops, Community Tech Hubs, Grant-Funded Research Projects, and the HeadyBuddy Companion Program for seniors and accessibility users.' },
    ],
  },
  'headybuddy.org': {
    about: {
      title: 'Meet HeadyBuddy',
      paragraphs: [
        'HeadyBuddy is the always-on AI companion that actually remembers you. Unlike stateless chatbots that start fresh every conversation, HeadyBuddy maintains persistent episodic, semantic, and procedural memory — learning your preferences, tracking your goals, and anticipating your needs over time.',
        'Powered by the Heady empathy core, HeadyBuddy detects emotional context through linguistic signals and adapts its response tone, pacing, and complexity accordingly. Feeling overwhelmed? HeadyBuddy simplifies. Ready for deep work? It matches your intensity.',
        'Available on web, desktop, and Android, HeadyBuddy syncs your context across every device. Start a conversation on your phone, continue it on your laptop, and pick up where you left off on any Heady-connected device.',
      ],
    },
    faq: [
      { q: 'How does HeadyBuddy remember me?', a: 'HeadyBuddy uses three memory tiers: episodic (timestamped events), semantic (extracted knowledge), and procedural (learned action rules). These are stored as 384D vector embeddings with phi-decay forgetting curves that keep relevant memories fresh.' },
      { q: 'Is HeadyBuddy available on mobile?', a: 'HeadyBuddy is available as a web app on all devices, with a native Android experience planned for Q3 2026. The HeadyBuddy widget is also embedded in every Heady domain.' },
      { q: 'Can HeadyBuddy connect to other services?', a: 'Yes. Through HeadyMCP, HeadyBuddy can connect to 30+ tools including email, calendars, project management, and code repositories. Your data stays encrypted and under your control.' },
    ],
  },
  'headymcp.com': {
    about: {
      title: 'What is HeadyMCP?',
      paragraphs: [
        'HeadyMCP is a production-grade Model Context Protocol server that exposes 30+ native tools through a single JSON-RPC 2.0 interface. Connect any MCP-compatible IDE — VS Code, Cursor, Windsurf, or Zed — and get instant access to the entire Heady intelligence layer.',
        'Every tool is CSL-gated with semantic rate limiting, zero-trust sandboxed execution, and cryptographic audit logging. Whether you\'re querying vector memory, generating code, or deploying services, every action is authenticated, validated, and traceable.',
        'HeadyMCP supports three transport modes: stdio for local agents, Server-Sent Events (SSE) for remote streaming, and WebSocket for bidirectional real-time connections. Multi-transport means your IDE talks to Heady in whatever protocol it speaks.',
      ],
    },
    faq: [
      { q: 'Which IDEs support HeadyMCP?', a: 'Any IDE that implements the Model Context Protocol can connect to HeadyMCP. This includes VS Code (via Copilot or Continue), Cursor, Windsurf, Zed, and any custom MCP client. Configuration takes under 2 minutes.' },
      { q: 'What tools are available?', a: 'HeadyMCP exposes 30+ tools including chat (multi-model), code generation, vector memory search, embedding creation, deployment, health checks, governance, and more. Each tool has a full JSON Schema definition for auto-discovery.' },
      { q: 'Is HeadyMCP free?', a: 'HeadyMCP is free for open-source contributors and HeadyConnection community members. Commercial use requires a HeadyIO API key with per-request pricing starting at $0.001 per tool invocation.' },
    ],
  },
};

// ─── ADDITIONAL DOMAINS FROM JSON CONTENT ─────────────────────────────────
// These domains have rich JSON content in content/domains/ that we transform
// into the renderer format. Hand-crafted for production quality.

const EXPANDED_DOMAIN_CONTENT = {
  'headymusic.com': {
    about: {
      title: 'The Universe Has a Rhythm. Now You Can Compose With It.',
      paragraphs: [
        'HeadyMusic is an AI-native creative studio that applies Sacred Geometry — the golden ratio, Fibonacci intervals, and harmonic series mathematics — to music composition, MIDI generation, and collaborative production. Your muse, mathematically amplified.',
        'HeadyCompose generates melodic structures using φ-Harmonic scales derived from the overtone series. HeadyMIDI translates geometric patterns into SysEx messages your hardware synths understand. HeadyRhythm builds rhythmic patterns from Fibonacci subdivisions. Whether you produce in Ableton, Logic Pro, or FL Studio, HeadyMusic syncs seamlessly via our DAW bridge.',
        'From stem separation powered by neural spectral analysis to live collaborative sessions with real-time MIDI sync, HeadyMusic gives musicians, producers, and creative technologists tools that feel like inspiration — because the math behind them is the same math behind the music of the spheres.',
      ],
    },
    deepDive: {
      title: 'Intelligence That Feels Like Inspiration',
      items: [
        { icon: '🎼', title: 'Generative Composition', desc: 'HeadyCompose generates full melodic, harmonic, and rhythmic compositions from a text prompt, mood descriptor, or seed chord — all anchored to φ-Harmonic scale systems derived from the natural overtone series.' },
        { icon: '🎛️', title: 'MIDI SysEx Integration', desc: 'HeadyMIDI sends and receives SysEx messages for direct parameter control of hardware synthesizers, drum machines, and MIDI controllers. Map geometric patterns to oscillator frequencies, filter cutoffs, and LFO rates.' },
        { icon: '🔗', title: 'Ableton & Multi-DAW Sync', desc: 'HeadySync bridges HeadyMusic to Ableton Live via Max for Live devices and the Ableton Link protocol. Logic Pro, FL Studio, and Bitwig integrations are also available.' },
        { icon: '🎵', title: 'φ-Harmonic Scales', desc: 'Thirty mathematically-derived scale systems based on the golden ratio. Dorian-φ, Lydian-φ, Phrygian-φ — each scale embeds Fibonacci intervals that sound harmonically natural because they mirror the physics of resonance.' },
        { icon: '🎤', title: 'AI Stem Separation', desc: 'HeadyStem uses neural spectral analysis to isolate vocals, drums, bass, and melodic elements from any audio file — studio-grade separation quality in seconds, not hours.' },
        { icon: '👥', title: 'Live Collaboration', desc: 'HeadyCollab enables real-time collaborative composition sessions with MIDI sync, shared arrangement views, and version history. Multiple producers can jam together across any distance.' },
      ],
    },
    technology: {
      title: 'Create Without Limits',
      stack: [
        { label: 'Creator', value: 'Free — 20 compositions/month, MIDI & MP3 export' },
        { label: 'Producer', value: '$13/mo — unlimited compositions, all DAW integrations' },
        { label: 'Studio', value: '$34/mo — stem separation, collaboration, priority rendering' },
        { label: 'Enterprise', value: '$89/mo — custom scales, API access, dedicated compute' },
      ],
    },
    faq: [
      { q: 'What is HeadyMusic?', a: 'HeadyMusic is an AI-native creative studio that applies Sacred Geometry mathematics — golden ratio intervals, Fibonacci phrase lengths, and harmonic series — to music composition, MIDI generation, and collaborative production.' },
      { q: 'Which DAWs does HeadyMusic work with?', a: 'HeadyMusic integrates with Ableton Live (via Max for Live + Ableton Link), Logic Pro (via MIDI FX), FL Studio (via VST wrapper), Bitwig, and Reaper. Any DAW that accepts MIDI input can use HeadyMusic exports.' },
      { q: 'Is HeadyMusic free?', a: 'Yes. The Creator tier is free with 20 compositions per month, 3 stem separations, and MIDI/MP3 export. Producer ($13/mo) and Studio ($34/mo) unlock unlimited compositions and professional features.' },
      { q: 'What are φ-Harmonic scales?', a: 'φ-Harmonic scales are mathematically-derived scale systems where interval ratios are based on the golden ratio (φ ≈ 1.618) and Fibonacci numbers. They sound harmonically natural because they mirror the physics of resonance and the overtone series.' },
    ],
  },

  'headycloud.com': {
    about: {
      title: 'Infrastructure That Thinks for Itself.',
      paragraphs: [
        'HeadyCloud orchestrates your AI workloads across Google Cloud Run, Cloudflare Workers, and Render with a self-healing mesh that scales instantly, routes intelligently, and never goes down — backed by a 99.99% SLA target.',
        'Purpose-built for the Heady AI ecosystem and production-ready for any enterprise workload. HeadyCloud abstracts the complexity of multi-cloud infrastructure into a single control plane — with φ-scaled resource allocation, zero-downtime deployments, and OpenTelemetry-native observability baked in from day one.',
        'From automatic failover and φ-ramped autoscaling to encrypted-at-rest vector storage and real-time telemetry dashboards, HeadyCloud gives operations teams infrastructure that heals itself faster than humans can diagnose the problem.',
      ],
    },
    deepDive: {
      title: 'Enterprise Cloud, Intelligently Orchestrated',
      items: [
        { icon: '☁️', title: 'Multi-Cloud Routing', desc: 'HeadyCloud routes workloads dynamically across Google Cloud Run, Cloudflare Workers, and Render. CSL gate logic evaluates workload semantics, provider health, and latency SLOs to make routing decisions in under 2ms.' },
        { icon: '📈', title: 'φ-Scaled Auto-Scaling', desc: 'Scale from zero to production in under 3 seconds using Cloud Run\'s container-native autoscaler, augmented with φ-scaled pre-warming that predicts load spikes. Scale-to-zero reduces costs by up to 78%.' },
        { icon: '🔄', title: 'Self-Healing Mesh', desc: 'The service mesh continuously monitors all nodes via active health probes. When a service degrades, the mesh reroutes traffic within 500ms, spins up replacements, and triggers root-cause analysis automatically.' },
        { icon: '🚀', title: 'Zero-Downtime Deploys', desc: 'Blue-green deployments with automated canary analysis (5% → 25% → 50% → 100%). Automatic rollback if error rates exceed φ-derived thresholds. Average deploy time: 47 seconds.' },
        { icon: '🔐', title: 'Encrypted Vector Storage', desc: 'AES-256-GCM encryption at rest for all pgvector data. TLS 1.3 in transit. Neon Postgres branching for zero-risk schema migrations. SOC 2 Type II compliance in progress.' },
        { icon: '📊', title: 'OpenTelemetry Observability', desc: 'Every request traced end-to-end with OpenTelemetry spans, Langfuse LLM tracing, and Sentry error tracking. Real-time dashboards show p50/p95/p99 latency, error rates, and cost per request.' },
      ],
    },
    technology: {
      title: 'Simple, Predictable Cloud Pricing',
      stack: [
        { label: 'Starter', value: 'Free — 2 vCPU, 512MB RAM, 100K requests/mo' },
        { label: 'Growth', value: '$55/mo — 4 vCPU, 2GB RAM, 1M requests/mo, 3 regions' },
        { label: 'Scale', value: '$144/mo — 8 vCPU, 8GB RAM, 10M requests/mo, 5 regions' },
        { label: 'Enterprise', value: 'Custom — dedicated compute, SLA guarantee, 24/7 support' },
      ],
    },
    faq: [
      { q: 'What is HeadyCloud?', a: 'HeadyCloud is the multi-cloud orchestration layer of the Heady AI platform. It routes workloads across Google Cloud Run, Cloudflare Workers, and Render with intelligent failover, φ-scaled autoscaling, and zero-downtime deployments.' },
      { q: 'What is the SLA?', a: 'HeadyCloud targets 99.99% uptime (4.38 hours of downtime per year maximum). Scale and Enterprise tiers include SLA guarantees with service credits for violations.' },
      { q: 'How does self-healing work?', a: 'Every service runs active health probes. When a node fails, traffic reroutes within 500ms. Replacement instances spin up automatically. Root-cause analysis runs in parallel via the AI observability layer.' },
      { q: 'Is HeadyCloud free to start?', a: 'Yes. The Starter tier includes 2 shared vCPU, 512MB RAM, 100K API requests per month, and 1GB vector storage — no credit card required.' },
    ],
  },

  'headyapi.com': {
    about: {
      title: 'Build on Heady — The API That Does It All',
      paragraphs: [
        'HeadyAPI gives developers full programmatic access to the entire Heady ecosystem. Chat with any AI model, generate embeddings, search vector memory, execute MCP tools, and orchestrate multi-agent workflows — all through a single REST and GraphQL interface.',
        'Every endpoint is authenticated, rate-limited, and observable. CSL-gated request validation ensures semantic correctness before execution. Response times are measured in milliseconds, not seconds — thanks to Cloudflare edge caching and optimized Cloud Run origins.',
        'SDKs for JavaScript, Python, Go, and Rust make integration a one-liner. OpenAPI 3.1 specs enable instant client generation for any language. HeadyAPI is the developer\'s gateway to sovereign AI infrastructure.',
      ],
    },
    deepDive: {
      title: 'One API. Every AI Capability.',
      items: [
        { icon: '💬', title: 'Multi-Model Chat', desc: 'Chat with Claude, GPT-4o, Gemini, Groq, and Perplexity through a unified endpoint. The Liquid Gateway routes to the optimal provider based on task semantics, latency, and cost.' },
        { icon: '🧬', title: 'Embedding Generation', desc: 'Generate 384D vector embeddings using Nomic Embed v2 with automatic caching and deduplication. Batch endpoints process up to 1,000 texts per request.' },
        { icon: '🔍', title: 'Vector Memory Search', desc: 'Semantic search across your stored knowledge using hybrid BM25 + dense vector retrieval with Reciprocal Rank Fusion. Sub-5ms query times via HNSW indexing.' },
        { icon: '🐝', title: 'Agent Orchestration', desc: 'Spawn, manage, and monitor HeadyBee agent swarms programmatically. Define task DAGs, set resource budgets, and receive results via webhooks or streaming SSE.' },
      ],
    },
    technology: {
      title: 'API Pricing',
      stack: [
        { label: 'Free Tier', value: '10,000 requests/month, 100MB vector storage' },
        { label: 'Developer', value: '$0.001/request after free tier' },
        { label: 'Enterprise', value: 'Volume discounts, SLA, dedicated endpoints' },
      ],
    },
    faq: [
      { q: 'What can I build with HeadyAPI?', a: 'Anything that needs AI intelligence — chatbots, search engines, recommendation systems, content generators, autonomous agents, and more. HeadyAPI provides chat, embeddings, vector search, agent orchestration, and MCP tool execution.' },
      { q: 'Which SDKs are available?', a: 'Official SDKs for JavaScript/TypeScript, Python, Go, and Rust. Community SDKs for Ruby, PHP, and Java. Full OpenAPI 3.1 spec for auto-generation in any language.' },
      { q: 'What are the rate limits?', a: 'Free tier: 100 requests/minute. Developer: 1,000 requests/minute. Enterprise: custom limits with dedicated endpoints and priority routing.' },
    ],
  },

  'headybot.com': {
    about: {
      title: 'The Conversational AI That Lives Where Your Users Are',
      paragraphs: [
        'HeadyBot is enterprise-ready conversational AI that meets your users wherever they already are — on your website, in Slack, Discord, Teams, WhatsApp, or embedded in your product. One intelligence layer, every channel.',
        'Unlike generic chatbot platforms, HeadyBot is powered by the Heady multi-model gateway and 384D vector memory. It remembers context across conversations, routes complex queries to specialized AI models, and escalates to humans when confidence drops below CSL thresholds.',
        'Deploy in minutes with a single script tag or API call. Train on your own data with zero-shot fine-tuning via vector memory uploads. HeadyBot speaks your brand\'s language from day one.',
      ],
    },
    deepDive: {
      title: 'Conversational Intelligence at Scale',
      items: [
        { icon: '🌐', title: 'Omnichannel Deployment', desc: 'One bot, every platform. Deploy to web, Slack, Discord, Microsoft Teams, WhatsApp, SMS, and custom channels. Unified conversation history across all touchpoints.' },
        { icon: '🧠', title: 'Persistent Memory', desc: 'HeadyBot remembers every user interaction in 384D vector space. Return visitors get personalized, context-aware responses from their first message.' },
        { icon: '🔀', title: 'Multi-Model Intelligence', desc: 'Complex questions route to Claude for reasoning, GPT-4o for creativity, Gemini for multimodal, and Groq for speed. The Liquid Gateway selects the best model per message.' },
        { icon: '📞', title: 'Human Escalation', desc: 'When confidence drops below CSL MEDIUM (0.809), HeadyBot seamlessly escalates to human agents with full conversation context, sentiment analysis, and suggested responses.' },
      ],
    },
    faq: [
      { q: 'How quickly can I deploy HeadyBot?', a: 'Under 5 minutes. Add a single script tag to your website, or use the Slack/Discord app installer. Enterprise deployments with custom training take 1-2 hours.' },
      { q: 'Can HeadyBot learn from my documentation?', a: 'Yes. Upload PDFs, markdown, URLs, or structured data to the vector memory. HeadyBot will use your content as its primary knowledge source with zero-shot retrieval-augmented generation.' },
      { q: 'What languages does HeadyBot support?', a: 'HeadyBot supports 95+ languages through its multi-model backend. Language detection is automatic. Response language matches the user\'s input language.' },
    ],
  },

  'headyio.com': {
    about: {
      title: 'Move Data Anywhere, At Any Speed',
      paragraphs: [
        'HeadyIO is the event-driven data layer of the Heady platform. Ingest events, route webhooks with reliability guarantees, stream real-time data between services, and transform payloads — all through a single, fault-tolerant pipeline.',
        'Built on an append-only event sourcing architecture with CQRS projections, HeadyIO captures every state change as an immutable record. Events are partitioned by Sacred Geometry layer with Fibonacci-sized time windows, enabling point-in-time replay and real-time streaming simultaneously.',
        'Whether you\'re building real-time dashboards, piping webhook events between SaaS tools, or streaming AI inference results to client applications, HeadyIO gives you the data plumbing that just works.',
      ],
    },
    deepDive: {
      title: 'Event-Driven Architecture, Production-Grade',
      items: [
        { icon: '📡', title: 'Webhook Relay', desc: 'Receive, validate, and route webhooks from any service with automatic retries, deduplication, and delivery guarantees. Never miss an event.' },
        { icon: '🔄', title: 'Event Sourcing', desc: 'Every state change is an immutable event. Replay from any point in time. Build multiple read projections from the same event stream.' },
        { icon: '⚡', title: 'Real-Time Streaming', desc: 'Server-Sent Events (SSE) and WebSocket streams deliver data to clients in under 50ms. Backpressure management prevents overwhelm.' },
        { icon: '🔀', title: 'Transform Pipeline', desc: 'Apply transformations, filters, and enrichments to data in flight. CSL-gated routing sends events to the right downstream service based on semantic content.' },
      ],
    },
    faq: [
      { q: 'What is HeadyIO?', a: 'HeadyIO is the event-driven data layer for the Heady platform — webhook relay, event sourcing, real-time streaming, and transform pipelines in a single service.' },
      { q: 'Is HeadyIO free?', a: 'HeadyIO includes a free tier with 50,000 events/month. Paid tiers start at $21/mo for 1M events/month with higher throughput and longer retention.' },
    ],
  },

  'heady-ai.com': {
    about: {
      title: 'Intelligence Engineered on the Laws of the Universe.',
      paragraphs: [
        'Heady AI pioneers Continuous Semantic Logic — a φ-scaled architecture that replaces binary Boolean gates with continuous vector geometry operations. AND becomes cosine similarity. NOT becomes orthogonal projection. GATE uses golden-ratio-derived thresholds.',
        'This isn\'t incremental improvement — it\'s a paradigm shift in how AI systems reason, decide, and self-govern. Traditional AI stacks make binary decisions. Heady AI makes continuous, nuanced decisions on a spectrum, weighted by the same mathematical constants that govern spiral galaxies and nautilus shells.',
        'With 72+ provisional patents and a research team obsessed with mathematical elegance, Heady AI is building the foundation for the next generation of artificial intelligence — one where the math is as beautiful as the results.',
      ],
    },
    deepDive: {
      title: 'The Science Behind the System',
      items: [
        { icon: '📐', title: 'Continuous Semantic Logic', desc: 'CSL replaces Boolean true/false with continuous vector operations. AND is cosine similarity, NOT is orthogonal projection, GATE uses φ-derived thresholds (0.500 → 0.927). Nuanced reasoning instead of brittle if/else chains.' },
        { icon: '🌀', title: 'Sacred Geometry Orchestration', desc: 'Nodes placed according to golden-ratio coordinates in a multi-layer topology. The architecture mirrors the mathematical patterns found in nature — self-similar, self-healing, and inherently scalable.' },
        { icon: '🧬', title: '384D Vector Space', desc: 'Every concept, document, user, and system component is embedded in 384-dimensional vector space. Semantic relationships emerge naturally from geometric proximity.' },
        { icon: '🧠', title: 'Alive Software', desc: 'The system maintains a vector embedding of its own architecture — a self-model that drifts as code changes. When semantic drift exceeds thresholds, alerts fire before coherence degrades.' },
      ],
    },
    faq: [
      { q: 'What is Continuous Semantic Logic?', a: 'CSL is Heady AI\'s core innovation — replacing binary Boolean logic with continuous vector geometry operations. Instead of true/false, decisions exist on a spectrum scored by cosine similarity and phi-derived thresholds.' },
      { q: 'How many patents does Heady AI hold?', a: 'Heady AI has filed 72+ provisional patents covering Continuous Semantic Logic, Sacred Geometry Orchestration, Alive Software self-modeling, and related innovations. Estimated portfolio value exceeds $4.87M.' },
      { q: 'Is Heady AI open source?', a: 'Core components will be open-sourced progressively. The HeadyMCP server and selected HeadyBee agents are already available. Enterprise features and the patent-protected CSL engine are proprietary.' },
    ],
  },

  'headyfinance.com': {
    about: {
      title: 'AI-Powered Financial Intelligence',
      paragraphs: [
        'HeadyFinance brings institutional-grade quantitative analysis to every trader and investor. Powered by the QUANT and ORACLE swarms — specialized HeadyBee agents trained on decades of market data — HeadyFinance delivers real-time pattern recognition, risk scoring, and predictive analytics through an intuitive dashboard.',
        'From algorithmic trading signals generated by φ-scaled Fibonacci retracement levels to portfolio risk assessment using Monte Carlo simulations with 10,000+ paths, HeadyFinance gives you the same analytical firepower that hedge funds use — without the hedge fund fees.',
        'All analysis runs on encrypted infrastructure with SOC 2 compliance. Your portfolio data, trading strategies, and API keys are encrypted with AES-256-GCM and never shared with third parties. HeadyFinance is financial intelligence that respects your sovereignty.',
      ],
    },
    deepDive: {
      title: 'Professional Trading Tools',
      items: [
        { icon: '📈', title: 'ORACLE Predictive Engine', desc: 'The ORACLE swarm analyzes 50+ technical indicators, order flow data, and sentiment signals to generate probabilistic price forecasts with confidence intervals — updated every 5 seconds during market hours.' },
        { icon: '📐', title: 'φ-Fibonacci Analysis', desc: 'Automated Fibonacci retracement, extension, and time zone analysis using golden-ratio-derived levels. The system identifies high-probability reversal zones across any timeframe from 1-minute to monthly.' },
        { icon: '🛡️', title: 'Risk Management', desc: 'Real-time portfolio risk scoring with Value-at-Risk (VaR), Conditional VaR, and drawdown analysis. Position sizing recommendations based on Kelly Criterion with φ-scaled safety margins.' },
        { icon: '🤖', title: 'QUANT Automation', desc: 'Build, backtest, and paper-trade algorithmic strategies using natural language descriptions. The QUANT swarm translates your trading thesis into executable code with full backtesting across 10+ years of historical data.' },
      ],
    },
    faq: [
      { q: 'Is HeadyFinance a broker or financial advisor?', a: 'No. HeadyFinance is an analytical tool that provides data, signals, and risk analysis. It does not execute trades, hold funds, or provide personalized financial advice. Always consult a licensed financial advisor for investment decisions.' },
      { q: 'What markets does HeadyFinance cover?', a: 'HeadyFinance covers US equities, crypto (200+ pairs), forex (50+ pairs), and commodities. Data sources include real-time market feeds, on-chain analytics, and satellite/alternative data for select assets.' },
      { q: 'How accurate are the predictions?', a: 'The ORACLE engine provides probabilistic forecasts, not guarantees. Historical backtests show 62-68% directional accuracy on daily timeframes. All predictions include confidence intervals and risk warnings.' },
    ],
  },

  'headylens.com': {
    about: {
      title: 'See What Others Miss — Visual AI & Spatial Intelligence',
      paragraphs: [
        'HeadyLens brings the power of visual AI and 3D spatial computing to the Heady ecosystem. From interactive vector space visualizations that let you literally see your knowledge in three dimensions to computer vision APIs that understand images, documents, and video — HeadyLens makes the invisible visible.',
        'The 3D Vector Space Viewer renders your 384-dimensional embeddings in an interactive WebGL scene using t-SNE dimensionality reduction. Watch clusters form in real time as your knowledge grows. Click any point to retrieve the source document. Drag to explore semantic neighborhoods.',
        'Whether you\'re building augmented reality experiences, processing document images with OCR, or analyzing security camera feeds, HeadyLens provides the visual intelligence layer that transforms raw pixels into structured understanding.',
      ],
    },
    deepDive: {
      title: 'Visual Intelligence Capabilities',
      items: [
        { icon: '🔮', title: '3D Vector Space', desc: 'Interactive WebGL visualization of your 384D embedding space. t-SNE/UMAP projection, cluster detection, and real-time updates as new data flows in. Click any point to see the source.' },
        { icon: '📸', title: 'Image Understanding', desc: 'Multi-modal image analysis powered by GPT-4o Vision and Gemini 2.5 Pro. Extract text, identify objects, describe scenes, and answer questions about any image.' },
        { icon: '📄', title: 'Document Vision', desc: 'High-accuracy OCR with layout understanding for invoices, receipts, forms, and handwritten notes. Structured JSON output with confidence scores per field.' },
        { icon: '🎥', title: 'Video Analytics', desc: 'Frame-level analysis, object tracking, and scene summarization for video streams. Process security feeds, meeting recordings, or content libraries at scale.' },
      ],
    },
    faq: [
      { q: 'What is the 3D Vector Space?', a: 'A WebGL-powered interactive visualization that projects your 384-dimensional vector embeddings into 3D space using t-SNE. It lets you visually explore semantic relationships in your knowledge base.' },
      { q: 'Which image formats does HeadyLens support?', a: 'HeadyLens processes JPEG, PNG, WebP, GIF, TIFF, BMP, and PDF. Videos accept MP4, WebM, and MOV. Maximum file size is 50MB for images and 500MB for video.' },
    ],
  },

  'perfecttrader.com': {
    about: {
      title: 'Trade Smarter, Not Harder',
      paragraphs: [
        'PerfectTrader is an AI-powered trading journal and strategy optimization platform built on Heady\'s quantitative intelligence infrastructure. Track every trade, analyze patterns in your performance, and receive AI-generated insights that turn your trading data into your competitive advantage.',
        'Import trades automatically from 20+ brokers and exchanges. PerfectTrader calculates P&L, win rate, risk-reward ratios, and 40+ performance metrics in real time. The AI coach identifies behavioral patterns — overtrading, revenge trading, time-of-day biases — that you can\'t see yourself.',
        'Every chart annotation, journal entry, and screenshot is embedded in vector memory, creating a searchable, semantic trading diary. Ask "What was my best setup in Q1?" or "Show me all losing trades on Fridays" and get instant, context-aware answers.',
      ],
    },
    deepDive: {
      title: 'Your Trading Edge',
      items: [
        { icon: '📊', title: 'AI Trade Analysis', desc: 'Automatic classification of trade setups, entries, and exits. The system identifies your most profitable patterns and flags trades that deviated from your strategy.' },
        { icon: '📝', title: 'Smart Journal', desc: 'Voice, text, and screenshot journaling embedded in 384D vector space. Search semantically — "Show me trades where I felt uncertain" returns relevant entries ranked by emotional context.' },
        { icon: '🎯', title: 'Strategy Optimizer', desc: 'Backtest your actual trading rules against historical data. The optimizer suggests parameter adjustments that would have improved your results, with walk-forward validation.' },
        { icon: '🧠', title: 'Behavioral Coach', desc: 'AI-powered detection of behavioral patterns: overtrading, revenge trading, position sizing drift, and time-of-day biases. Real-time alerts help you stick to your plan.' },
      ],
    },
    faq: [
      { q: 'What brokers does PerfectTrader support?', a: 'PerfectTrader imports trades from Interactive Brokers, TD Ameritrade, Robinhood, Alpaca, Binance, Coinbase, Kraken, and 15+ more via CSV upload or API connection.' },
      { q: 'Is PerfectTrader free?', a: 'PerfectTrader offers a free tier with 50 trades/month and basic analytics. Pro ($21/mo) adds unlimited trades, AI coaching, and strategy backtesting.' },
    ],
  },

  'headyconnection.com': {
    about: {
      title: 'What is HeadyConnection?',
      paragraphs: [
        'HeadyConnection is the nonprofit arm of the Heady ecosystem — a 501(c)(3) organization dedicated to making sovereign AI accessible to underserved communities. We believe artificial intelligence should empower everyone, not just those who can afford enterprise subscriptions.',
        'Through community programs, grant-funded research, and open educational resources, HeadyConnection bridges the gap between cutting-edge AI technology and real-world impact. Our programs span digital literacy workshops, AI-assisted job training, and community technology hubs.',
        'Every dollar donated to HeadyConnection funds direct community impact. Our operational overhead is kept below 15% through AI-automated grant management, volunteer coordination, and program tracking — the same technology we teach others to use.',
      ],
    },
    deepDive: {
      title: 'Programs & Impact',
      items: [
        { icon: '🎓', title: 'AI Literacy Workshops', desc: 'Free workshops teaching responsible AI use, prompt engineering, and data literacy to underserved communities. Over 500 participants in 2025.' },
        { icon: '💡', title: 'Community Tech Hubs', desc: 'Physical and virtual spaces where community members access AI tools, mentoring, and collaborative projects. Powered by HeadyBuddy and HeadyMCP.' },
        { icon: '🏗️', title: 'Grant Lab', desc: 'AI-assisted grant writing and management for nonprofits. Our system has helped secure $2M+ in funding for partner organizations.' },
        { icon: '♿', title: 'Accessibility First', desc: 'WCAG 2.1 AAA compliance across all platforms. Screen reader optimization, voice navigation, and adaptive interfaces for users with disabilities.' },
      ],
    },
    faq: [
      { q: 'Is HeadyConnection a registered nonprofit?', a: 'Yes. HeadyConnection Inc. is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible to the extent allowed by law.' },
      { q: 'How can I volunteer?', a: 'We welcome volunteers for community workshops, mentoring, content creation, and technical support. Contact us at hello@headyconnection.org to get involved.' },
      { q: 'What programs does HeadyConnection run?', a: 'Our core programs include AI Literacy Workshops, Community Tech Hubs, Grant Lab for nonprofits, and the HeadyBuddy Companion Program for seniors and accessibility users.' },
    ],
  },
};

// Merge expanded content into OTHER_DOMAIN_CONTENT
Object.assign(OTHER_DOMAIN_CONTENT, EXPANDED_DOMAIN_CONTENT);

/**
 * Get content sections for a given domain.
 * Priority: hand-crafted SITE_CONTENT > OTHER_DOMAIN_CONTENT > dynamic JSON loader > null
 */
function getContentForDomain(domain) {
  if (SITE_CONTENT[domain]) return SITE_CONTENT[domain];
  if (OTHER_DOMAIN_CONTENT[domain]) return OTHER_DOMAIN_CONTENT[domain];

  // Attempt dynamic loading from content/domains/ JSON files
  try {
    const { loadDomainContent } = require('./content-loader');
    const dynamicContent = loadDomainContent(domain);
    if (dynamicContent) {
      // Cache for subsequent requests
      OTHER_DOMAIN_CONTENT[domain] = dynamicContent;
      return dynamicContent;
    }
  } catch (e) {
    // content-loader not available or failed — graceful degradation
  }

  return null;
}

module.exports = { SITE_CONTENT, OTHER_DOMAIN_CONTENT, getContentForDomain };
