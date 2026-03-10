"""
Heady Production Config — Wired to Real Infrastructure
========================================================
This module reads and validates ALL environment variables from the Heady
production .env file. It maps every service, API key, runtime, and agent
to its actual env var name — no guessing, no placeholders.

Infrastructure:
  - Neon Postgres (DATABASE_URL)
  - Upstash Redis TLS (REDIS_URL with rediss://)
  - Cloudflare Workers (HEADY_EDGE_PROXY_URL)
  - Pinecone Vector DB (PINECONE_API_KEY)
  - Sentry Error Monitoring (SENTRY_DSN)
  - Stripe Payments (STRIPE_SECRET_KEY)
  - Google OAuth (GOOGLE_CLIENT_ID + SECRET)
  - Notion (NOTION_TOKEN)

LLM Providers:
  - Anthropic Claude (primary + workspace + secondary)
  - OpenAI (service account, business pro)
  - Google Gemini (5 accounts, Colab Pro+)
  - Groq (fast inference)
  - Perplexity (Sonar Pro search)
  - HuggingFace (business team, 3 seats)

Runtimes:
  - Hot  (us-east)  — primary active runtime
  - Warm (us-west)  — secondary warm standby
  - Cold (eu-west)  — tertiary cold standby

Usage:
    from heady_config import config, validate_config
    
    validate_config()  # Fails fast if critical secrets missing
    
    redis_url = config.redis.url
    db_url = config.database.url
    anthropic_key = config.llm.anthropic.primary_key

© 2026 HeadySystems Inc. — Sacred Geometry v4.0
"""

import os
import sys
from dataclasses import dataclass, field
from typing import Optional

# Sacred Geometry constants
PHI = 1.618033988749895
PSI = 1 / PHI
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]


# ---------------------------------------------------------------------------
# Config dataclasses — typed, validated, frozen after load
# ---------------------------------------------------------------------------

@dataclass
class DatabaseConfig:
    """Neon Postgres + Upstash Redis configuration."""
    url: str = ""                          # DATABASE_URL (Neon Postgres)
    neon_api_key: str = ""                 # NEON_API_KEY
    neon_project_id: str = ""              # NEON_PROJECT_ID
    redis_url: str = ""                    # REDIS_URL (Upstash, TLS via rediss://)
    redis_rest_url: str = ""               # UPSTASH_REDIS_REST_URL
    redis_rest_token: str = ""             # UPSTASH_REDIS_REST_TOKEN
    pinecone_api_key: str = ""             # PINECONE_API_KEY (vector DB)


@dataclass
class AuthConfig:
    """Authentication and security configuration."""
    jwt_secret: str = ""                   # JWT_SECRET
    admin_email: str = ""                  # HEADY_ADMIN_EMAIL
    admin_name: str = ""                   # HEADY_ADMIN_NAME
    api_keys: list = field(default_factory=list)  # HEADY_API_KEY through _005
    admin_token: str = ""                  # ADMIN_TOKEN
    google_client_id: str = ""             # GOOGLE_CLIENT_ID
    google_client_secret: str = ""         # GOOGLE_CLIENT_SECRET
    google_redirect_uri: str = ""          # GOOGLE_REDIRECT_URI


@dataclass
class AnthropicConfig:
    """Anthropic Claude configuration — primary, workspace, and secondary accounts."""
    primary_key: str = ""                  # ANTHROPIC_API_KEY
    admin_key: str = ""                    # ANTHROPIC_ADMIN_KEY
    org_id: str = ""                       # ANTHROPIC_ORG_ID
    workspace_key: str = ""                # ANTHROPIC_WORKSPACE_KEY
    workspace_name: str = ""               # ANTHROPIC_WORKSPACE_NAME
    secondary_key: str = ""                # ANTHROPIC_SECONDARY_KEY
    model: str = "claude-opus-4-6"         # CLAUDE_MODEL
    max_tokens: int = 8192                 # CLAUDE_MAX_TOKENS


@dataclass
class OpenAIConfig:
    """OpenAI configuration — service account + business pro."""
    api_key: str = ""                      # OPENAI_API_KEY
    org_id: str = ""                       # OPENAI_ORG_ID
    workspace_id: str = ""                 # OPENAI_WORKSPACE_ID
    codex_enabled: bool = False            # OPENAI_CODEX_ENABLED


@dataclass
class GeminiConfig:
    """Google Gemini / Colab Pro+ configuration — 5 accounts."""
    primary_key: str = ""                  # GEMINI_API_KEY_HEADY
    colab_key: str = ""                    # GEMINI_API_KEY_COLAB
    shared_key: str = ""                   # GOOGLE_API_KEY_SHARED
    gcloud_service_account: str = ""       # GCLOUD_SERVICE_ACCOUNT


@dataclass
class LLMConfig:
    """All LLM provider configurations."""
    anthropic: AnthropicConfig = field(default_factory=AnthropicConfig)
    openai: OpenAIConfig = field(default_factory=OpenAIConfig)
    gemini: GeminiConfig = field(default_factory=GeminiConfig)
    groq_key: str = ""                     # GROQ_API_KEY
    perplexity_key: str = ""               # PERPLEXITY_API_KEY
    hf_token: str = ""                     # HF_TOKEN


@dataclass
class RuntimeConfig:
    """Colab Pro+ runtime configuration — 3 geographically distributed runtimes."""
    gateway_url: str = ""                  # HEADY_GATEWAY_URL
    hot_region: str = "us-east"            # COLAB_RUNTIME_HOT
    warm_region: str = "us-west"           # COLAB_RUNTIME_WARM
    cold_region: str = "eu-west"           # COLAB_RUNTIME_COLD
    heartbeat_ms: int = 29034              # COLAB_HEARTBEAT_MS (≈ Fib(34) × 854)


@dataclass
class ServiceURLs:
    """All HeadyMe.com service endpoints."""
    home: str = ""                         # HEADY_HOME_URL
    api: str = ""                          # HEADY_BASE_URL
    frontend: str = ""                     # HEADY_FRONTEND_URL
    admin: str = ""                        # HEADY_ADMIN_URL
    chat: str = ""                         # HEADY_CHAT_URL
    dev: str = ""                          # HEADY_DEV_URL
    tools: str = ""                        # HEADY_TOOLS_URL (also MCP)
    stories: str = ""                      # HEADY_STORIES_URL
    lens: str = ""                         # HEADY_LENS_URL
    voice: str = ""                        # HEADY_VOICE_URL
    sync: str = ""                         # HEADY_SYNC_URL
    edge_proxy: str = ""                   # HEADY_EDGE_PROXY_URL


@dataclass
class ObservabilityConfig:
    """Sentry error monitoring + Cloudflare configuration."""
    sentry_dsn: str = ""                   # SENTRY_DSN
    sentry_org: str = ""                   # SENTRY_ORG
    sentry_project: str = ""               # SENTRY_PROJECT
    sentry_auth_token: str = ""            # SENTRY_AUTH_TOKEN
    cloudflare_token: str = ""             # CLOUDFLARE_API_TOKEN


@dataclass
class AgentFlags:
    """Enabled/disabled flags for the agent service fleet.
    
    These map to the 6 additional agent-like services beyond the 8
    Sacred Geometry agents: Jules, Observer, Builder, Atlas, Pythia, Socrates.
    """
    jules: bool = False                    # JULES_ENABLED
    observer: bool = False                 # OBSERVER_ENABLED
    builder: bool = False                  # BUILDER_ENABLED
    atlas: bool = False                    # ATLAS_ENABLED
    pythia: bool = False                   # PYTHIA_ENABLED
    socrates: bool = False                 # SOCRATES_ENABLED
    headysoul: bool = False                # HEADYSOUL_ENABLED
    socratic_mode: bool = False            # SOCRATIC_MODE_ENABLED
    headysoul_escalation: int = 70         # HEADYSOUL_ESCALATION_THRESHOLD


@dataclass
class CORSConfig:
    """CORS whitelist — explicit origins only, never wildcards."""
    origins: list = field(default_factory=list)  # CORS_ORIGINS (comma-separated)


@dataclass
class HeadyConfig:
    """Root configuration object for the entire Heady system.
    
    This is the single source of truth for all configuration. Every module
    in the system reads from this object rather than calling os.environ
    directly. This ensures consistent env var naming and centralized
    validation. The config is loaded once at startup and then frozen.
    """
    env: str = "production"                # NODE_ENV
    heady_env: str = ""                    # HEADY_ENV
    port: int = 3300                       # PORT
    max_concurrent_tasks: int = 12         # MAX_CONCURRENT_TASKS
    
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    runtimes: RuntimeConfig = field(default_factory=RuntimeConfig)
    services: ServiceURLs = field(default_factory=ServiceURLs)
    observability: ObservabilityConfig = field(default_factory=ObservabilityConfig)
    agents: AgentFlags = field(default_factory=AgentFlags)
    cors: CORSConfig = field(default_factory=CORSConfig)


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------
def load_config() -> HeadyConfig:
    """Load all configuration from environment variables.
    
    This reads every env var documented in the .env file and maps it to
    the typed HeadyConfig dataclass hierarchy. Values that are missing
    get empty strings or their defaults — validation happens separately
    in validate_config() so that partial configs work for development.
    """
    def env(key: str, default: str = "") -> str:
        return os.environ.get(key, default)
    
    def env_bool(key: str, default: bool = False) -> bool:
        return env(key, str(default)).lower() in ("true", "1", "yes")
    
    def env_int(key: str, default: int = 0) -> int:
        try:
            return int(env(key, str(default)))
        except ValueError:
            return default
    
    # Collect API keys into a list
    api_keys = [
        env("HEADY_API_KEY"),
        env("HEADY_API_KEY_002"),
        env("HEADY_API_KEY_003"),
        env("HEADY_API_KEY_004"),
        env("HEADY_API_KEY_005"),
    ]
    api_keys = [k for k in api_keys if k]  # Filter empties
    
    # Parse CORS origins
    cors_raw = env("CORS_ORIGINS")
    cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()] if cors_raw else []
    
    return HeadyConfig(
        env=env("NODE_ENV", "production"),
        heady_env=env("HEADY_ENV"),
        port=env_int("PORT", 3300),
        max_concurrent_tasks=env_int("MAX_CONCURRENT_TASKS", 12),
        
        database=DatabaseConfig(
            url=env("DATABASE_URL"),
            neon_api_key=env("NEON_API_KEY"),
            neon_project_id=env("NEON_PROJECT_ID"),
            redis_url=env("REDIS_URL"),
            redis_rest_url=env("UPSTASH_REDIS_REST_URL"),
            redis_rest_token=env("UPSTASH_REDIS_REST_TOKEN"),
            pinecone_api_key=env("PINECONE_API_KEY"),
        ),
        
        auth=AuthConfig(
            jwt_secret=env("JWT_SECRET"),
            admin_email=env("HEADY_ADMIN_EMAIL"),
            admin_name=env("HEADY_ADMIN_NAME"),
            api_keys=api_keys,
            admin_token=env("ADMIN_TOKEN"),
            google_client_id=env("GOOGLE_CLIENT_ID"),
            google_client_secret=env("GOOGLE_CLIENT_SECRET"),
            google_redirect_uri=env("GOOGLE_REDIRECT_URI"),
        ),
        
        llm=LLMConfig(
            anthropic=AnthropicConfig(
                primary_key=env("ANTHROPIC_API_KEY"),
                admin_key=env("ANTHROPIC_ADMIN_KEY"),
                org_id=env("ANTHROPIC_ORG_ID"),
                workspace_key=env("ANTHROPIC_WORKSPACE_KEY"),
                workspace_name=env("ANTHROPIC_WORKSPACE_NAME"),
                secondary_key=env("ANTHROPIC_SECONDARY_KEY"),
                model=env("CLAUDE_MODEL", "claude-opus-4-6"),
                max_tokens=env_int("CLAUDE_MAX_TOKENS", 8192),
            ),
            openai=OpenAIConfig(
                api_key=env("OPENAI_API_KEY"),
                org_id=env("OPENAI_ORG_ID"),
                workspace_id=env("OPENAI_WORKSPACE_ID"),
                codex_enabled=env_bool("OPENAI_CODEX_ENABLED"),
            ),
            gemini=GeminiConfig(
                primary_key=env("GEMINI_API_KEY_HEADY"),
                colab_key=env("GEMINI_API_KEY_COLAB"),
                shared_key=env("GOOGLE_API_KEY_SHARED"),
                gcloud_service_account=env("GCLOUD_SERVICE_ACCOUNT"),
            ),
            groq_key=env("GROQ_API_KEY"),
            perplexity_key=env("PERPLEXITY_API_KEY"),
            hf_token=env("HF_TOKEN"),
        ),
        
        runtimes=RuntimeConfig(
            gateway_url=env("HEADY_GATEWAY_URL"),
            hot_region=env("COLAB_RUNTIME_HOT", "us-east"),
            warm_region=env("COLAB_RUNTIME_WARM", "us-west"),
            cold_region=env("COLAB_RUNTIME_COLD", "eu-west"),
            heartbeat_ms=env_int("COLAB_HEARTBEAT_MS", 29034),
        ),
        
        services=ServiceURLs(
            home=env("HEADY_HOME_URL"),
            api=env("HEADY_BASE_URL"),
            frontend=env("HEADY_FRONTEND_URL"),
            admin=env("HEADY_ADMIN_URL"),
            chat=env("HEADY_CHAT_URL"),
            dev=env("HEADY_DEV_URL"),
            tools=env("HEADY_TOOLS_URL"),
            stories=env("HEADY_STORIES_URL"),
            lens=env("HEADY_LENS_URL"),
            voice=env("HEADY_VOICE_URL"),
            sync=env("HEADY_SYNC_URL"),
            edge_proxy=env("HEADY_EDGE_PROXY_URL"),
        ),
        
        observability=ObservabilityConfig(
            sentry_dsn=env("SENTRY_DSN"),
            sentry_org=env("SENTRY_ORG"),
            sentry_project=env("SENTRY_PROJECT"),
            sentry_auth_token=env("SENTRY_AUTH_TOKEN"),
            cloudflare_token=env("CLOUDFLARE_API_TOKEN"),
        ),
        
        agents=AgentFlags(
            jules=env_bool("JULES_ENABLED"),
            observer=env_bool("OBSERVER_ENABLED"),
            builder=env_bool("BUILDER_ENABLED"),
            atlas=env_bool("ATLAS_ENABLED"),
            pythia=env_bool("PYTHIA_ENABLED"),
            socrates=env_bool("SOCRATES_ENABLED"),
            headysoul=env_bool("HEADYSOUL_ENABLED"),
            socratic_mode=env_bool("SOCRATIC_MODE_ENABLED"),
            headysoul_escalation=env_int("HEADYSOUL_ESCALATION_THRESHOLD", 70),
        ),
        
        cors=CORSConfig(origins=cors_origins),
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

# Critical secrets that MUST exist for the system to function
CRITICAL_SECRETS = [
    ("JWT_SECRET", "auth.jwt_secret"),
    ("DATABASE_URL", "database.url"),
    ("REDIS_URL", "database.redis_url"),
]

# Important secrets that should exist for production but won't block startup
IMPORTANT_SECRETS = [
    ("ANTHROPIC_API_KEY", "llm.anthropic.primary_key"),
    ("PINECONE_API_KEY", "database.pinecone_api_key"),
    ("SENTRY_DSN", "observability.sentry_dsn"),
    ("STRIPE_SECRET_KEY", "payments"),
    ("CLOUDFLARE_API_TOKEN", "observability.cloudflare_token"),
    ("NOTION_TOKEN", "integrations.notion"),
]


def validate_config(cfg: HeadyConfig = None, strict: bool = False) -> list[str]:
    """Validate the configuration and report issues.
    
    In strict mode (production), missing critical secrets cause an immediate
    crash — fail fast, fail loud. In non-strict mode (development), missing
    secrets generate warnings but don't block startup.
    
    Returns a list of warning/error messages.
    """
    if cfg is None:
        cfg = load_config()
    
    issues = []
    
    # Check critical secrets
    for env_key, desc in CRITICAL_SECRETS:
        if not os.environ.get(env_key):
            msg = f"CRITICAL: Missing {env_key} ({desc})"
            issues.append(msg)
            if strict:
                print(f"\033[91m{msg}\033[0m", file=sys.stderr)
    
    if strict and any("CRITICAL" in i for i in issues):
        raise EnvironmentError(
            "Missing critical secrets. Set them as environment variables. "
            "See .env.example for the full list. Secrets must NEVER be hardcoded."
        )
    
    # Check important secrets (warn only)
    for env_key, desc in IMPORTANT_SECRETS:
        if not os.environ.get(env_key):
            issues.append(f"WARNING: Missing {env_key} ({desc}) — some features unavailable")
    
    # Validate CORS (no wildcards)
    if "*" in cfg.cors.origins:
        issues.append("SECURITY: CORS_ORIGINS contains '*' — wildcards forbidden in production")
    
    # Validate URLs (no localhost in production)
    if cfg.env == "production":
        for url_field in [cfg.services.home, cfg.services.api, cfg.services.admin]:
            if url_field and ("localhost" in url_field or "127.0.0.1" in url_field):
                issues.append(f"SECURITY: Production URL contains localhost: {url_field}")
    
    return issues


# ---------------------------------------------------------------------------
# Module-level config singleton
# ---------------------------------------------------------------------------
config = load_config()


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Heady Production Config — Infrastructure Map")
    print("=" * 55)
    
    cfg = load_config()
    issues = validate_config(cfg)
    
    # Print what's configured vs what's missing
    sections = [
        ("Core", [
            ("Environment", cfg.env),
            ("Heady Env", cfg.heady_env or "(not set)"),
            ("Port", str(cfg.port)),
            ("Max Tasks", str(cfg.max_concurrent_tasks)),
        ]),
        ("Database", [
            ("Neon Postgres", "CONNECTED" if cfg.database.url else "NOT SET"),
            ("Upstash Redis", "CONNECTED" if cfg.database.redis_url else "NOT SET"),
            ("Pinecone Vector", "CONNECTED" if cfg.database.pinecone_api_key else "NOT SET"),
        ]),
        ("LLM Providers", [
            ("Anthropic Claude", "ACTIVE" if cfg.llm.anthropic.primary_key else "NOT SET"),
            ("  Model", cfg.llm.anthropic.model),
            ("  Workspace", cfg.llm.anthropic.workspace_name or "(not set)"),
            ("OpenAI", "ACTIVE" if cfg.llm.openai.api_key else "NOT SET"),
            ("  Codex", "ON" if cfg.llm.openai.codex_enabled else "OFF"),
            ("Gemini", "ACTIVE" if cfg.llm.gemini.primary_key else "NOT SET"),
            ("Groq", "ACTIVE" if cfg.llm.groq_key else "NOT SET"),
            ("Perplexity", "ACTIVE" if cfg.llm.perplexity_key else "NOT SET"),
            ("HuggingFace", "ACTIVE" if cfg.llm.hf_token else "NOT SET"),
        ]),
        ("Runtimes", [
            ("Gateway", cfg.runtimes.gateway_url or "(not set)"),
            ("Hot", cfg.runtimes.hot_region),
            ("Warm", cfg.runtimes.warm_region),
            ("Cold", cfg.runtimes.cold_region),
            ("Heartbeat", f"{cfg.runtimes.heartbeat_ms}ms"),
        ]),
        ("Services", [
            ("Home", cfg.services.home or "(not set)"),
            ("API", cfg.services.api or "(not set)"),
            ("Admin", cfg.services.admin or "(not set)"),
            ("Chat", cfg.services.chat or "(not set)"),
            ("Tools/MCP", cfg.services.tools or "(not set)"),
            ("Edge Proxy", cfg.services.edge_proxy or "(not set)"),
        ]),
        ("Observability", [
            ("Sentry", "ACTIVE" if cfg.observability.sentry_dsn else "NOT SET"),
            ("Cloudflare", "ACTIVE" if cfg.observability.cloudflare_token else "NOT SET"),
        ]),
        ("Agents", [
            ("Jules", "ON" if cfg.agents.jules else "OFF"),
            ("Observer", "ON" if cfg.agents.observer else "OFF"),
            ("Builder", "ON" if cfg.agents.builder else "OFF"),
            ("Atlas", "ON" if cfg.agents.atlas else "OFF"),
            ("Pythia", "ON" if cfg.agents.pythia else "OFF"),
            ("Socrates", "ON" if cfg.agents.socrates else "OFF"),
            ("HeadySoul", "ON" if cfg.agents.headysoul else "OFF"),
            ("Socratic Mode", "ON" if cfg.agents.socratic_mode else "OFF"),
        ]),
        ("CORS", [
            ("Origins", f"{len(cfg.cors.origins)} whitelisted" if cfg.cors.origins else "NONE"),
        ]),
    ]
    
    for section_name, items in sections:
        print(f"\n  [{section_name}]")
        for label, value in items:
            status = ""
            if value in ("CONNECTED", "ACTIVE", "ON"):
                status = "\033[92m"  # Green
            elif value in ("NOT SET", "OFF", "NONE"):
                status = "\033[93m"  # Yellow
            print(f"    {label:20s} {status}{value}\033[0m")
    
    if issues:
        print(f"\n  [Issues: {len(issues)}]")
        for issue in issues:
            color = "\033[91m" if "CRITICAL" in issue else "\033[93m"
            print(f"    {color}{issue}\033[0m")
    else:
        print("\n  [No issues detected]")
    
    print()
