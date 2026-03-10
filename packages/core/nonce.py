from __future__ import annotations

import secrets
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Dict, Optional, Tuple

from core.config import settings


class NonceManager:
    def __init__(self) -> None:
        self._lock = Lock()
        self._issued: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()

    def _config(self) -> Tuple[int, int]:
        manifest = settings.manifest or {}
        identity_cfg = manifest.get("identity", {})
        ttl_seconds = int(identity_cfg.get("nonce_ttl_seconds", 60))
        max_size = int(identity_cfg.get("replay_cache_size", 10_000))
        return max(1, ttl_seconds), max(1, max_size)

    def _prune_locked(self, now: float) -> None:
        expired = [nonce for nonce, data in self._issued.items() if float(data.get("exp", 0)) <= now]
        for nonce in expired:
            self._issued.pop(nonce, None)

    def issue(self, did: str) -> Dict[str, Any]:
        ttl_seconds, max_size = self._config()
        now = time.time()
        nonce = secrets.token_urlsafe(32)
        exp = now + ttl_seconds

        with self._lock:
            self._prune_locked(now)
            while len(self._issued) >= max_size:
                self._issued.popitem(last=False)
            self._issued[nonce] = {"did": did, "exp": exp}

        return {"did": did, "nonce": nonce, "ttl_seconds": ttl_seconds, "expires_at": exp}

    def validate(self, did: str, nonce: str) -> Optional[str]:
        now = time.time()
        with self._lock:
            self._prune_locked(now)
            data = self._issued.get(nonce)
            if not data:
                return "Nonce invalid or expired"
            if data.get("did") != did:
                return "Nonce not issued for this DID"
        return None

    def consume(self, did: str, nonce: str) -> Optional[str]:
        now = time.time()
        with self._lock:
            self._prune_locked(now)
            data = self._issued.get(nonce)
            if not data:
                return "Nonce invalid, expired, or already used"
            if data.get("did") != did:
                return "Nonce not issued for this DID"
            self._issued.pop(nonce, None)
        return None


nonce_manager = NonceManager()
