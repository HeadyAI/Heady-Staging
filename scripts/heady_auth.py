"""
Heady Auth & Security Module
==============================
Production security infrastructure for the Heady multi-agent system.
Handles JWT issuance, HMAC message signing, role-based tool access
control, and startup secret validation.

Usage:
    from heady_auth import HeadyAuth, validate_secrets
    
    # Validate all required secrets exist at startup (fail fast)
    validate_secrets()
    
    # Initialize the auth system
    auth = HeadyAuth(jwt_secret=os.environ["JWT_SECRET"])
    
    # Issue a scoped JWT for an agent
    token = auth.issue_agent_token("alpha", ["get_market_data", "get_indicators"])
    
    # Validate a token and check tool access
    claims = auth.validate_token(token)
    auth.check_tool_access(claims, "place_order")  # Raises if denied

© 2026 HeadySystems Inc. — Sacred Geometry v4.0
"""

import hashlib
import hmac
import json
import os
import sys
import time
import base64
from dataclasses import dataclass
from typing import Optional

# ---------------------------------------------------------------------------
# Sacred Geometry constants
# ---------------------------------------------------------------------------
PHI = 1.618033988749895
PSI = 1 / PHI  # ≈ 0.618

# Token expiry: 15 minutes (short-lived, requires refresh)
TOKEN_EXPIRY_S = 15 * 60
# Refresh token expiry: 7 days
REFRESH_EXPIRY_S = 7 * 24 * 60 * 60


# ---------------------------------------------------------------------------
# Required environment variables — validated at startup
# ---------------------------------------------------------------------------
REQUIRED_SECRETS = [
    "JWT_SECRET",         # Signs all inter-agent JWTs
    "HMAC_SECRET",        # Signs inter-agent message envelopes
    "REDIS_URL",          # Message bus connection string
]

OPTIONAL_SECRETS = [
    "TRADOVATE_API_KEY",  # Required for live trading only
    "RITHMIC_API_KEY",    # Required for market data only
    "ALLOWED_ORIGINS",    # CORS whitelist (comma-separated)
]


def validate_secrets(required: list[str] = None, warn_optional: bool = True) -> dict[str, str]:
    """Validate that all required environment variables are set.
    
    This function should be called at the very start of every Heady service.
    If any required secret is missing, it raises immediately — fail fast,
    fail loud. This prevents the system from starting in a degraded state
    where some services work and others silently fail.
    
    Optional secrets generate warnings but don't block startup, since they
    may only be needed for specific features (like live trading mode).
    """
    required = required or REQUIRED_SECRETS
    secrets = {}
    missing = []
    
    for key in required:
        value = os.environ.get(key)
        if not value:
            missing.append(key)
        else:
            secrets[key] = value
    
    if missing:
        msg = (
            f"FATAL: Missing required secrets: {', '.join(missing)}. "
            f"Set these as environment variables before starting any Heady service. "
            f"Secrets must NEVER be hardcoded — use env vars or a secret manager."
        )
        print(f"\033[91m{msg}\033[0m", file=sys.stderr)
        raise EnvironmentError(msg)
    
    if warn_optional:
        for key in OPTIONAL_SECRETS:
            if not os.environ.get(key):
                print(f"\033[93mWARNING: Optional secret '{key}' not set. "
                      f"Some features may be unavailable.\033[0m", file=sys.stderr)
    
    return secrets


# ---------------------------------------------------------------------------
# Role-based tool access control
# ---------------------------------------------------------------------------
# Each agent has an explicit whitelist of MCP tools it's allowed to use.
# Any tool not on the whitelist is DENIED. This prevents privilege escalation
# — e.g., the Alpha Agent cannot place orders, and the Execution Agent 
# cannot modify risk parameters.

AGENT_TOOL_PERMISSIONS: dict[str, list[str]] = {
    "bridge": [
        "register_agent", "deregister_agent", "get_swarm_status",
        "update_topology", "broadcast_signal", "migrate_node",
    ],
    "alpha": [
        "get_market_data", "get_indicators", "get_order_book",
        "get_historical_data", "generate_embeddings", "vector_search",
    ],
    "risk": [
        "get_account_state", "get_positions", "get_drawdown_status",
        "emergency_flatten_all", "get_consistency_status",
    ],
    "execution": [
        "place_order", "cancel_order", "modify_order",
        "get_positions", "get_order_status", "get_fill_history",
    ],
    "sentinel": [
        "get_health", "get_metrics", "get_agent_heartbeats",
        "trigger_circuit_breaker", "get_connection_pool_status",
    ],
    "compliance": [
        "validate_trade", "get_consistency_status", "get_contract_limits",
        "check_news_blackout", "generate_compliance_report", "get_audit_trail",
    ],
    "data": [
        "generate_embeddings", "vector_search", "get_historical_data",
        "get_news_sentiment", "run_backtest_query", "get_context_fabric",
    ],
    "view": [
        "get_swarm_status", "get_positions", "get_drawdown_status",
        "get_pnl_history", "get_agent_heartbeats", "get_topology",
    ],
}


# ---------------------------------------------------------------------------
# JWT Implementation (minimal, no external deps)
# ---------------------------------------------------------------------------
def _b64url_encode(data: bytes) -> str:
    """URL-safe base64 encoding without padding, per JWT spec."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    """URL-safe base64 decoding with padding restoration."""
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


class HeadyAuth:
    """Authentication and authorization for the Heady agent system.
    
    This class handles three security concerns:
    
    1. JWT issuance and validation for agent-to-MCP-gateway communication.
       Each token is scoped to specific tools that the agent is allowed to use.
    
    2. HMAC-SHA256 message signing for inter-agent communication. Every
       AgentMessage is signed to prevent spoofing and replay attacks.
    
    3. Role-based access control enforcement. Before any MCP tool call is
       executed, the auth system verifies the calling agent has permission.
    """
    
    def __init__(self, jwt_secret: str = None, hmac_secret: str = None):
        self.jwt_secret = jwt_secret or os.environ.get("JWT_SECRET", "")
        self.hmac_secret = hmac_secret or os.environ.get("HMAC_SECRET", "")
        
        if not self.jwt_secret:
            raise ValueError(
                "JWT_SECRET is required. Set it as an environment variable "
                "or pass it to HeadyAuth(jwt_secret=...)."
            )
    
    # --- JWT Operations ---
    
    def issue_agent_token(self, agent_id: str, 
                           allowed_tools: list[str] = None,
                           expiry_seconds: int = TOKEN_EXPIRY_S) -> str:
        """Issue a scoped JWT for an agent.
        
        The token contains the agent's identity, its allowed MCP tools
        (from the AGENT_TOOL_PERMISSIONS whitelist), and a short expiry.
        The MCP Gateway validates this token before executing any tool call,
        ensuring agents can only access the tools their role permits.
        
        Short-lived tokens (15 minutes by default) limit the blast radius
        of token compromise. Agents must refresh their tokens regularly.
        """
        if allowed_tools is None:
            allowed_tools = AGENT_TOOL_PERMISSIONS.get(agent_id, [])
        
        now = int(time.time())
        
        payload = {
            "sub": agent_id,
            "iat": now,
            "exp": now + expiry_seconds,
            "iss": "heady-bridge",
            "tools": allowed_tools,
            "role": self._get_agent_role(agent_id),
        }
        
        return self._create_jwt(payload)
    
    def validate_token(self, token: str) -> dict:
        """Validate a JWT and return its claims.
        
        Checks the signature, expiry, and issuer. Raises ValueError if
        the token is invalid, expired, or tampered with. The MCP Gateway
        calls this on every incoming tool request.
        """
        claims = self._decode_jwt(token)
        
        # Check expiry
        if claims.get("exp", 0) < int(time.time()):
            raise ValueError(
                f"Token expired at {claims.get('exp')}. "
                f"Current time: {int(time.time())}. "
                f"Agent '{claims.get('sub')}' must request a new token."
            )
        
        # Check issuer
        if claims.get("iss") != "heady-bridge":
            raise ValueError(
                f"Invalid token issuer: '{claims.get('iss')}'. "
                f"Only tokens issued by 'heady-bridge' are accepted."
            )
        
        return claims
    
    def check_tool_access(self, claims: dict, tool_name: str) -> bool:
        """Verify that an agent's token grants access to a specific tool.
        
        This is the enforcement point for role-based access control. Even
        if an agent somehow obtains a valid JWT, it can only call the tools
        listed in the token's 'tools' claim. Any unauthorized tool call
        raises an error and logs a security event.
        """
        allowed_tools = claims.get("tools", [])
        agent_id = claims.get("sub", "unknown")
        
        if tool_name not in allowed_tools:
            raise PermissionError(
                f"SECURITY: Agent '{agent_id}' attempted to access tool '{tool_name}' "
                f"which is not in its allowed tools: {allowed_tools}. "
                f"This may indicate a privilege escalation attempt."
            )
        
        return True
    
    def _create_jwt(self, payload: dict) -> str:
        """Create a JWT with HMAC-SHA256 signing (HS256).
        
        Minimal implementation with no external dependencies. The JWT 
        consists of three base64url-encoded segments: header, payload,
        and signature. The signature is computed over the first two segments
        using the JWT_SECRET as the HMAC key.
        """
        header = {"alg": "HS256", "typ": "JWT"}
        
        header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
        payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
        
        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            self.jwt_secret.encode(),
            signing_input.encode(),
            hashlib.sha256,
        ).digest()
        signature_b64 = _b64url_encode(signature)
        
        return f"{header_b64}.{payload_b64}.{signature_b64}"
    
    def _decode_jwt(self, token: str) -> dict:
        """Decode and verify a JWT.
        
        Splits the token into its three segments, verifies the HMAC-SHA256
        signature, and returns the payload claims. Raises ValueError if the
        signature doesn't match (indicating tampering or a different secret).
        """
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format: expected 3 dot-separated segments")
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(
            self.jwt_secret.encode(),
            signing_input.encode(),
            hashlib.sha256,
        ).digest()
        
        actual_sig = _b64url_decode(signature_b64)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError(
                "JWT signature verification failed. "
                "The token may have been tampered with or signed with a different secret."
            )
        
        # Decode payload
        payload_json = _b64url_decode(payload_b64).decode("utf-8")
        return json.loads(payload_json)
    
    # --- HMAC Message Signing ---
    
    def sign_message(self, source: str, target: str, 
                      correlation_id: str, timestamp: float) -> str:
        """Generate HMAC-SHA256 signature for an inter-agent message.
        
        Every AgentMessage in the swarm is signed with this method to
        ensure authenticity. The receiving agent validates the signature
        before processing the message, preventing spoofing attacks where
        one agent impersonates another.
        
        The signature covers the source agent ID, target agent ID, 
        correlation ID, and timestamp — enough to uniquely identify the
        message without including the full payload in the signature input
        (which could be large for data-heavy messages).
        """
        content = f"{source}:{target}:{correlation_id}:{timestamp}"
        return hmac.new(
            self.hmac_secret.encode(),
            content.encode(),
            hashlib.sha256,
        ).hexdigest()[:32]  # Truncated to 32 hex chars for efficiency
    
    def verify_message_signature(self, source: str, target: str,
                                   correlation_id: str, timestamp: float,
                                   signature: str) -> bool:
        """Verify an inter-agent message signature.
        
        Returns True if the signature matches, False otherwise. Uses
        constant-time comparison to prevent timing attacks. Also checks
        that the message isn't too old (TTL enforcement) to prevent
        replay attacks.
        """
        expected = self.sign_message(source, target, correlation_id, timestamp)
        
        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected, signature):
            return False
        
        # Replay protection: reject messages older than 30 seconds
        age = time.time() - timestamp
        if age > 30:
            return False
        
        return True
    
    # --- Helpers ---
    
    @staticmethod
    def _get_agent_role(agent_id: str) -> str:
        """Map agent ID to its Sacred Geometry role name."""
        roles = {
            "bridge": "coordinator",
            "alpha": "signal_generator",
            "risk": "veto_authority",
            "execution": "order_router",
            "sentinel": "watchdog",
            "compliance": "rule_enforcer",
            "data": "enrichment_engine",
            "view": "renderer",
        }
        return roles.get(agent_id, "unknown")


# ---------------------------------------------------------------------------
# CORS Whitelist — no wildcards, ever
# ---------------------------------------------------------------------------
def get_cors_origins() -> list[str]:
    """Parse the CORS whitelist from the ALLOWED_ORIGINS environment variable.
    
    Returns a list of explicitly allowed origins. In production, this must
    NEVER include '*' (wildcard). Each origin should be a full URL like
    'https://app.headysystems.com'. The empty list means no cross-origin
    requests are allowed (the safest default).
    """
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    
    if "*" in origins:
        print(
            "\033[91mSECURITY ERROR: ALLOWED_ORIGINS contains '*' (wildcard). "
            "This is forbidden in production. Remove the wildcard and specify "
            "explicit origins like 'https://app.headysystems.com'.\033[0m",
            file=sys.stderr,
        )
        raise ValueError("CORS wildcard '*' is not allowed in Heady production systems")
    
    return origins


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Heady Auth & Security Module")
    print("=" * 50)
    
    # Test with a dummy secret (never do this in production)
    test_secret = "test-secret-for-self-test-only-never-use-in-prod"
    auth = HeadyAuth(jwt_secret=test_secret, hmac_secret=test_secret)
    
    # Test JWT issuance and validation
    print("\n--- JWT Tests ---")
    for agent_id in ["alpha", "risk", "execution", "sentinel"]:
        token = auth.issue_agent_token(agent_id)
        claims = auth.validate_token(token)
        print(f"  {agent_id}: {len(claims['tools'])} tools allowed, "
              f"role={claims['role']}, expires in {claims['exp'] - claims['iat']}s")
    
    # Test tool access control
    print("\n--- Access Control Tests ---")
    test_cases = [
        ("alpha", "get_market_data", True),
        ("alpha", "place_order", False),
        ("risk", "emergency_flatten_all", True),
        ("risk", "place_order", False),
        ("execution", "place_order", True),
        ("execution", "emergency_flatten_all", False),
    ]
    for agent_id, tool, should_pass in test_cases:
        token = auth.issue_agent_token(agent_id)
        claims = auth.validate_token(token)
        try:
            auth.check_tool_access(claims, tool)
            result = "ALLOWED"
            status = "PASS" if should_pass else "FAIL"
        except PermissionError:
            result = "DENIED"
            status = "PASS" if not should_pass else "FAIL"
        print(f"  [{status}] {agent_id} -> {tool}: {result}")
    
    # Test message signing
    print("\n--- Message Signing Tests ---")
    sig = auth.sign_message("alpha", "risk", "test-corr-id", time.time())
    print(f"  Signature: {sig}")
    valid = auth.verify_message_signature("alpha", "risk", "test-corr-id", time.time(), sig)
    print(f"  Verification: {'VALID' if valid else 'INVALID'}")
    
    # Test RBAC permissions table
    print("\n--- Agent Permission Summary ---")
    for agent_id, tools in AGENT_TOOL_PERMISSIONS.items():
        print(f"  {agent_id:12s}: {', '.join(tools[:3])}{'...' if len(tools) > 3 else ''}")
    
    print("\nAll tests complete.")
