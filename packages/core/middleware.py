from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings
from core.identity import DIDValidationError, resolve_allowed_dids, verify_did_signature
from core.nonce import nonce_manager

HEALTH_PATHS = {"/health", "/docs", "/openapi.json", "/api/auth/nonce"}


def _json_unauthorized(detail: str = "Sovereign Identity Required") -> JSONResponse:
    return JSONResponse(status_code=401, content={"detail": detail})


class SovereignAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._manifest = settings.manifest or {}
        self._identity_cfg = self._manifest.get("identity", {})
        self._allowed_dids = resolve_allowed_dids(self._manifest)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in HEALTH_PATHS:
            return await call_next(request)

        identity_mode = (self._identity_cfg.get("auth_mode") or "bearer-dev").lower()
        allow_bearer = self._identity_cfg.get("allow_bearer_fallback", identity_mode == "bearer-dev")

        if identity_mode in {"did-key"}:
            did_result = self._attempt_did_auth(request)
            if did_result is True:
                return await call_next(request)

            if did_result is not None and allow_bearer is False:
                return _json_unauthorized(did_result)

        bearer_result = self._attempt_bearer_auth(request)
        if bearer_result is True:
            return await call_next(request)

        if settings.auth_token:
            # Token configured but request missing/invalid → reject
            return _json_unauthorized("Bearer credential invalid")

        # Dev mode without token/DID
        return await call_next(request)

    def _attempt_bearer_auth(self, request: Request) -> bool:
        token = request.headers.get("Authorization")
        if not (token and settings.auth_token):
            return False
        expected = f"Bearer {settings.auth_token}"
        return token == expected

    def _attempt_did_auth(self, request: Request) -> bool | str | None:
        did = request.headers.get("X-Sovereign-DID")
        nonce = request.headers.get("X-Sovereign-Nonce")
        signature = request.headers.get("X-Sovereign-Signature")

        if not did:
            return "Missing X-Sovereign-DID header"
        if not nonce:
            return "Missing X-Sovereign-Nonce header"
        if not signature:
            return "Missing X-Sovereign-Signature header"

        if self._allowed_dids and did not in self._allowed_dids:
            return "DID not authorized for this node"

        nonce_error = nonce_manager.validate(did, nonce)
        if nonce_error:
            return nonce_error

        try:
            verify_did_signature(
                did=did,
                nonce=nonce,
                method=request.method,
                path=request.url.path,
                signature_b64=signature,
            )
        except DIDValidationError as exc:
            return str(exc)

        consume_error = nonce_manager.consume(did, nonce)
        if consume_error:
            return consume_error

        return True
