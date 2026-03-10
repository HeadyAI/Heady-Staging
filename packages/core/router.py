import json
import os
import sys
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.identity import resolve_allowed_dids
from core.nonce import nonce_manager

# Import Services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../services")))

try:
    from google_mcp.service import GeminiService
except Exception:
    GeminiService = None

try:
    from jules_mcp.service import JulesService
except Exception:
    JulesService = None

try:
    from perplexity_mcp.service import PerplexityService
except Exception:
    PerplexityService = None

try:
    from memory_mcp.service import MemoryService
except Exception:
    MemoryService = None

try:
    from prompt_manager import PromptService
except Exception:
    PromptService = None

from core.allocator import ResourceManager, ResourceTask
from core.conductor import conductor
from core.config import save_manifest, settings

SEARCH_KEYWORDS = {"search", "latest"}
CODE_KEYWORDS = {"code", "script"}
IDENTITY_HEADER = "X-Sovereign-DID"
DEFAULT_PROMPT = "agent_core"
DEFAULT_ROLE = "citizen"

router = APIRouter()


class _UnavailableGeminiService:
    def ask(self, prompt: str, model_name: str = "gemini-2.0-flash") -> str:
        return "Gemini service unavailable"


class _UnavailableAsyncService:
    async def ask(self, prompt: str) -> str:
        return "Service unavailable"


class _UnavailablePromptService:
    def get_prompt(self, prompt_name: str, variables: Optional[Dict[str, Any]] = None) -> str:
        return f"[Prompt '{prompt_name}' unavailable]"


class _UnavailableMemoryService:
    def read_full(self) -> dict:
        return {}

    def add_entry(self, entity: str, details: str, category: str = "general") -> str:
        return "Memory service unavailable"

    def search_spatial_context(self, query_vector, radius: float = 10.0, limit: int = 8) -> list:
        return []


gemini = _UnavailableGeminiService()
if GeminiService is not None:
    try:
        gemini = GeminiService()
    except Exception:
        gemini = _UnavailableGeminiService()

jules = _UnavailableAsyncService()
if JulesService is not None:
    try:
        jules = JulesService()
    except Exception:
        jules = _UnavailableAsyncService()

perplexity = _UnavailableAsyncService()
if PerplexityService is not None:
    try:
        perplexity = PerplexityService()
    except Exception:
        perplexity = _UnavailableAsyncService()

memory = _UnavailableMemoryService()
if MemoryService is not None:
    try:
        memory = MemoryService()
    except Exception:
        memory = _UnavailableMemoryService()

prompt_service = _UnavailablePromptService()
if PromptService is not None:
    try:
        prompt_service = PromptService()
    except Exception:
        prompt_service = _UnavailablePromptService()

resource_manager = ResourceManager(
    gemini_service=gemini,
    jules_service=jules,
    perplexity_service=perplexity,
    concurrency_limit=3,
)


class ContextRequest(BaseModel):
    user_id: str


class AgentRequest(BaseModel):
    query: str
    context_id: str = "default"
    sovereign_did: Optional[str] = None


class TaskItem(BaseModel):
    id: str
    kind: str
    payload: str
    priority: str = "background"
    metadata: Dict[str, Any] = {}


class TaskBatchRequest(BaseModel):
    tasks: List[TaskItem]


class SpatialSearchRequest(BaseModel):
    query: str
    radius: float = 10.0
    limit: int = 8


class ManifestPayload(BaseModel):
    manifest: Dict[str, Any]


class NonceRequest(BaseModel):
    did: str


def _manifest() -> Dict[str, Any]:
    return settings.manifest or {}


def _identity_cfg() -> Dict[str, Any]:
    return _manifest().get("identity", {})


def _intelligence_cfg() -> Dict[str, Any]:
    return _manifest().get("intelligence", {})


def _role_overrides() -> Dict[str, Any]:
    return _intelligence_cfg().get("role_overrides", {})


def _manifest_modules_for_role(role: Optional[str]) -> Set[str]:
    base_modules = _intelligence_cfg().get(
        "enabled_modules",
        ["gemini", "jules", "perplexity", "memory"],
    )
    overrides = _role_overrides().get(role or "", {})
    modules = overrides.get("enabled_modules", base_modules)
    return {module.lower() for module in modules}


def _intent_bias_for_role(role: Optional[str]) -> Dict[str, bool]:
    overrides = _role_overrides().get(role or "", {})
    return overrides.get("intent_bias", {})


def _apply_runtime_config_from_manifest() -> None:
    intelligence_cfg = _intelligence_cfg()
    concurrency_limit = intelligence_cfg.get("concurrency_limit")
    if concurrency_limit:
        resource_manager.update_concurrency_limit(concurrency_limit)

    tool_limits = intelligence_cfg.get("concurrency_limits")
    if tool_limits:
        resource_manager.update_tool_concurrency_limits(tool_limits)


_apply_runtime_config_from_manifest()


def analyze_intent(query: str, role_bias: Optional[Dict[str, bool]] = None) -> Dict[str, bool]:
    normalized = query.lower()
    needs_research = any(keyword in normalized for keyword in SEARCH_KEYWORDS)
    needs_code = any(keyword in normalized for keyword in CODE_KEYWORDS)
    intent = {
        "research": needs_research,
        "code": needs_code,
        "general": not needs_research and not needs_code,
    }

    if role_bias:
        for key, value in role_bias.items():
            if key in intent:
                intent[key] = bool(value)

    intent["general"] = role_bias.get("general", not intent["research"] and not intent["code"]) if role_bias else (
        not intent["research"] and not intent["code"]
    )

    return intent


def build_prompt(query: str, context_snapshot: Dict, context_id: str, identity_ctx: Dict[str, Optional[str]]) -> str:
    prompt_profile = _intelligence_cfg().get("prompt_profile", DEFAULT_PROMPT)
    base_prompt = prompt_service.get_prompt(
        prompt_profile,
        {
            "context_id": context_id,
            "sovereign_did": identity_ctx.get("did") or "anonymous",
            "persona": identity_ctx.get("role") or DEFAULT_ROLE,
        },
    )
    context_blob = json.dumps(context_snapshot, indent=2) if context_snapshot else "No stored memory."
    return (
        f"{base_prompt}\n\n"
        f"Context ID: {context_id}\n"
        f"Persona: {identity_ctx.get('role') or DEFAULT_ROLE}\n"
        f"Sovereign DID: {identity_ctx.get('did') or 'anonymous'}\n"
        f"Memory Snapshot:\n{context_blob}\n\n"
        f"User Query:\n{query}"
    )


def _resolve_identity(http_request: Request, payload: Optional[AgentRequest] = None) -> Dict[str, Optional[str]]:
    identity_cfg = _identity_cfg()
    override_did = payload.sovereign_did if payload else None
    header_did = http_request.headers.get(IDENTITY_HEADER)
    did = override_did or header_did

    role_map = identity_cfg.get("roles", {})
    role = role_map.get(did) or identity_cfg.get("default_role") or DEFAULT_ROLE

    return {"did": did, "role": role}


def _require_role(identity_ctx: Dict[str, Optional[str]], allowed_roles: Set[str]) -> None:
    if identity_ctx.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient privileges")


def _format_spatial_hits(hits: List[Dict[str, Any]], max_excerpt: int = 400) -> str:
    if not hits:
        return "No spatial matches."

    lines = []
    for hit in hits:
        source_path = hit.get("source_path") or "unknown"
        entity = hit.get("entity") or "unknown"
        excerpt = (hit.get("content_excerpt") or "")[:max_excerpt]
        lines.append(f"- {source_path}::{entity}\n{excerpt}")
    return "\n\n".join(lines)


@router.post("/context")
def fetch_context(request: ContextRequest):
    return {"user_id": request.user_id, "context": memory.read_full()}


@router.post("/auth/nonce")
def issue_nonce(payload: NonceRequest):
    allowed_dids = resolve_allowed_dids(_manifest())
    if allowed_dids and payload.did not in allowed_dids:
        raise HTTPException(status_code=403, detail="DID not authorized for this node")
    return nonce_manager.issue(payload.did)


@router.post("/agent")
async def agent_endpoint(payload: AgentRequest, http_request: Request):
    identity_ctx = _resolve_identity(http_request, payload)
    
    # Socratic Check (Conductor)
    socratic_result = conductor.socratic_check(payload.query, identity_ctx)
    if not socratic_result["approved"]:
        raise HTTPException(status_code=400, detail=f"Socratic Check Failed: {socratic_result.get('reason')}")

    role_bias = _intent_bias_for_role(identity_ctx.get("role"))
    brain_state = memory.read_full()
    prompt_text = build_prompt(payload.query, brain_state, payload.context_id, identity_ctx)

    # Inject Wisdom if applied
    if socratic_result.get("wisdom_applied"):
        prompt_text = f"{prompt_text}\n\n[Conductor Wisdom Applied]: {socratic_result['wisdom_applied']}"

    spatial_hits = memory.search_spatial_context(payload.query, radius=10.0, limit=3)
    if spatial_hits:
        prompt_text = f"{prompt_text}\n\nSpatial Context Hits:\n{_format_spatial_hits(spatial_hits)}"
        
    intent = analyze_intent(payload.query, role_bias)

    enabled_modules = _manifest_modules_for_role(identity_ctx.get("role"))

    responses = []
    research_output = None

    if intent["research"] and "perplexity" in enabled_modules:
        research_output = await perplexity.ask(prompt_text)
        responses.append(("Perplexity", research_output))

    if intent["code"] and "jules" in enabled_modules:
        code_prompt = prompt_text
        if research_output:
            code_prompt = f"{prompt_text}\n\nResearch Findings:\n{research_output}"
        code_output = await jules.ask(code_prompt)
        responses.append(("Jules", code_output))

    if (intent["general"] and "gemini" in enabled_modules) or not responses:
        general_output = gemini.ask(prompt_text)
        responses.append(("Gemini", general_output))

    combined = "\n\n".join(f"[{source}] {text}" for source, text in responses)

    memory.add_entry(
        entity="Interaction (Composite)",
        details=(
            f"Query: {payload.query[:80]} | DID: {identity_ctx.get('did') or 'anonymous'} | "
            f"Sources: {', '.join(source for source, _ in responses)}"
        ),
        category=payload.context_id,
    )

    return {
        "response": combined,
        "sources": [source for source, _ in responses],
        "context_id": payload.context_id,
        "persona": identity_ctx.get("role"),
    }


@router.post("/tasks")
async def run_tasks(request: TaskBatchRequest):
    if not request.tasks:
        return {"results": [], "report": "No tasks supplied."}

    resource_tasks = [
        ResourceTask(
            id=item.id,
            kind=item.kind,
            payload=item.payload,
            priority=item.priority,
            metadata=item.metadata,
        )
        for item in request.tasks
    ]

    results = await resource_manager.execute_tasks(resource_tasks)
    report = await resource_manager.compile_report(results)

    return {"results": results, "report": report}


@router.post("/spatial/search")
def spatial_search(payload: SpatialSearchRequest):
    matches = memory.search_spatial_context(payload.query, radius=payload.radius, limit=payload.limit)
    return {"matches": matches}


@router.get("/admin/node")
def get_node_manifest(http_request: Request):
    identity_ctx = _resolve_identity(http_request)
    admin_roles = set(_identity_cfg().get("admin_roles", ["governor"]))
    _require_role(identity_ctx, admin_roles)
    return {"manifest": _manifest()}


@router.put("/admin/node")
def update_node_manifest(payload: ManifestPayload, http_request: Request):
    identity_ctx = _resolve_identity(http_request)
    admin_roles = set(_identity_cfg().get("admin_roles", ["governor"]))
    _require_role(identity_ctx, admin_roles)
    save_manifest(payload.manifest)
    settings.reload_manifest()
    _apply_runtime_config_from_manifest()
    return {"manifest": _manifest()}

