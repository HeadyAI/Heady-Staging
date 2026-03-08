import json
import math
import os
import hashlib
from pathlib import Path


class MemoryService:
    def __init__(self, brain_path: str | None = None):
        self.brain_path = brain_path or Path(__file__).with_name("brain.json")
        self.spatial_context_path = Path(__file__).resolve().parents[2] / "data" / "spatial_context.json"

    def _load(self) -> dict:
        if not os.path.exists(self.brain_path):
            return {}
        with open(self.brain_path, "r", encoding="utf-8-sig") as file:
            return json.load(file)

    def _save(self, data: dict) -> None:
        with open(self.brain_path, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

    def read_full(self) -> dict:
        return self._load()

    def add_entry(self, entity: str, details: str, category: str = "general") -> str:
        data = self._load()
        knowledge = data.setdefault("knowledge_graph", [])
        knowledge.append(
            {
                "entity": entity,
                "details": details,
                "category": category,
                "timestamp": "Latest",
            }
        )
        self._save(data)
        return f"Saved: {entity}"

    def _load_spatial_context(self) -> list:
        if not self.spatial_context_path.exists():
            return []
        try:
            return json.loads(self.spatial_context_path.read_text(encoding="utf-8-sig")) or []
        except json.JSONDecodeError:
            return []

    @staticmethod
    def _stable_hash(value: str) -> int:
        digest = hashlib.sha256(value.encode("utf-8")).digest()
        return int.from_bytes(digest[:8], byteorder="big", signed=False)

    @staticmethod
    def _sentiment_score(text: str) -> float:
        positive = {
            "success",
            "successful",
            "ok",
            "clean",
            "good",
            "improved",
            "secure",
            "stable",
            "fast",
            "optimized",
            "active",
            "complete",
        }
        negative = {
            "error",
            "failure",
            "failed",
            "broken",
            "critical",
            "risk",
            "bug",
            "unsafe",
            "denied",
            "missing",
            "invalid",
            "corrupt",
        }

        tokens = [token.strip(".,:;!?()[]{}\"'`).-").lower() for token in text.split()]
        if not tokens:
            return 0.0

        pos = sum(1 for token in tokens if token in positive)
        neg = sum(1 for token in tokens if token in negative)
        return (pos - neg) / max(1, len(tokens))

    def _project_query_to_3d(self, query: str) -> tuple[float, float, float]:
        x = self._stable_hash("query") % 100
        y = self._stable_hash(query) % 100
        z = self._sentiment_score(query) * 100
        return float(x), float(y), float(z)

    def search_spatial_context(self, query_vector, radius: float = 10.0, limit: int = 8) -> list:
        if isinstance(query_vector, (list, tuple)) and len(query_vector) == 3:
            qx, qy, qz = (float(query_vector[0]), float(query_vector[1]), float(query_vector[2]))
        else:
            qx, qy, qz = self._project_query_to_3d(str(query_vector))

        nodes = self._load_spatial_context()
        matches = []

        for node in nodes:
            coords = node.get("coordinates") if isinstance(node, dict) else None
            if not (isinstance(coords, list) and len(coords) == 3):
                continue

            try:
                nx, ny, nz = float(coords[0]), float(coords[1]), float(coords[2])
            except (TypeError, ValueError):
                continue

            distance = math.sqrt((qx - nx) ** 2 + (qy - ny) ** 2 + (qz - nz) ** 2)
            if distance <= float(radius):
                matches.append(
                    {
                        "id": node.get("id"),
                        "distance": distance,
                        "coordinates": coords,
                        "source_path": node.get("source_path"),
                        "entity": node.get("entity"),
                        "content_summary": node.get("content_summary"),
                        "content_excerpt": node.get("content_excerpt"),
                    }
                )

        matches.sort(key=lambda item: item.get("distance", 0.0))
        return matches[: max(1, int(limit))]
