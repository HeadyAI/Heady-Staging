from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional


class DataScope(Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    SECRET = "secret"


class DataLifetime(Enum):
    EPHEMERAL = "ephemeral"
    PERSISTENT = "persistent"


@dataclass(frozen=True)
class DataAddress:
    data_type: str
    key: str
    scope: DataScope = DataScope.PRIVATE
    lifetime: DataLifetime = DataLifetime.PERSISTENT
    namespace: str = "heady"

    def canonical_key(self) -> str:
        return f"{self.namespace}:{self.scope.value}:{self.data_type}:{self.key}"


@dataclass(frozen=True)
class DataPaths:
    project_root: Path
    public_state_dir: Path
    private_state_dir: Path
    secrets_dir: Path
    data_dir: Path
    infrastructure_dir: Path

    @classmethod
    def from_env(cls, project_root: Optional[Path] = None) -> "DataPaths":
        root = (project_root or Path(__file__).resolve().parents[1]).resolve()

        def _resolve(name: str, default_rel: str) -> Path:
            value = os.environ.get(name)
            if value:
                return Path(value).expanduser().resolve()
            
            # Check if default_rel exists in root
            path = (root / default_rel).resolve()
            if path.exists():
                return path
                
            # Check if exists in parent (Workspace root)
            parent_path = (root.parent / default_rel).resolve()
            if parent_path.exists():
                return parent_path
                
            return path

        return cls(
            project_root=root,
            public_state_dir=_resolve("HEADY_PUBLIC_STATE_DIR", "shared/state"),
            private_state_dir=_resolve("HEADY_PRIVATE_STATE_DIR", "shared/private_state"),
            secrets_dir=_resolve("HEADY_SECRETS_DIR", "shared/secrets"),
            data_dir=_resolve("HEADY_DATA_DIR", "data"),
            infrastructure_dir=_resolve("HEADY_INFRA_DIR", "infrastructure"),
        )

    def ensure_directories(self) -> None:
        self.public_state_dir.mkdir(parents=True, exist_ok=True)
        self.private_state_dir.mkdir(parents=True, exist_ok=True)
        self.secrets_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.infrastructure_dir.mkdir(parents=True, exist_ok=True)
