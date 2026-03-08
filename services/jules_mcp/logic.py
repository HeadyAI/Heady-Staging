import json
import os
import sys
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import hashlib

import httpx

# Import Vault
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../secret_gateway")))
from vault_secrets import OnePasswordHandler

REGISTRY_PATH = Path(__file__).resolve().parents[2] / "config" / "secrets_registry.json"
JULES_SECRET_KEY = "jules"

# Cache configuration
CACHE_TTL_SECONDS = 300  # 5 minutes
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0


@dataclass
class CacheEntry:
    """Cache entry with TTL support"""
    value: str
    created_at: datetime
    ttl_seconds: int = CACHE_TTL_SECONDS
    
    @property
    def is_expired(self) -> bool:
        return datetime.now() > self.created_at + timedelta(seconds=self.ttl_seconds)


@dataclass
class JulesResponse:
    """Structured response from Jules AI"""
    content: str
    model: str
    tokens_used: int = 0
    cached: bool = False
    latency_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)


def get_reference_from_registry(key: str) -> str:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(f"Registry file missing at {REGISTRY_PATH}")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8-sig"))
    reference = registry.get(key)

    if not reference:
        raise KeyError(f"Registry entry '{key}' not found. Update secrets_registry.json.")

    return reference


class JulesService:
    """Enhanced Jules AI Service with caching, retry logic, and structured responses"""
    
    def __init__(self, enable_cache: bool = True):
        self.vault = OnePasswordHandler()
        reference = get_reference_from_registry(JULES_SECRET_KEY)
        self.api_key = self.vault.get_secret(reference)
        self.api_url = "https://api.jules.ai/v1/chat/completions"
        self.enable_cache = enable_cache
        self._cache: Dict[str, CacheEntry] = {}
        self._request_count = 0
        self._error_count = 0
    
    def _cache_key(self, prompt: str, model: str) -> str:
        """Generate cache key from prompt and model"""
        content = f"{model}:{prompt}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _get_cached(self, key: str) -> Optional[str]:
        """Get cached response if valid"""
        if not self.enable_cache:
            return None
        entry = self._cache.get(key)
        if entry and not entry.is_expired:
            return entry.value
        if entry:
            del self._cache[key]
        return None
    
    def _set_cached(self, key: str, value: str) -> None:
        """Store response in cache"""
        if self.enable_cache:
            self._cache[key] = CacheEntry(value=value, created_at=datetime.now())
    
    async def ask(self, prompt: str, model: str = "jules-v1") -> str:
        """Simple ask interface returning string (backward compatible)"""
        response = await self.ask_structured(prompt, model)
        return response.content
    
    async def ask_structured(
        self, 
        prompt: str, 
        model: str = "jules-v1",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> JulesResponse:
        """Enhanced ask with structured response and retry logic"""
        start_time = datetime.now()
        cache_key = self._cache_key(prompt, model)
        
        # Check cache
        cached_value = self._get_cached(cache_key)
        if cached_value:
            return JulesResponse(
                content=cached_value,
                model=model,
                cached=True,
                latency_ms=0.0
            )
        
        self._request_count += 1
        
        # Build messages
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        # Retry loop
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        self.api_url,
                        json=payload,
                        headers=headers,
                        timeout=60.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    content = data["choices"][0]["message"]["content"]
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    
                    # Cache successful response
                    self._set_cached(cache_key, content)
                    
                    latency = (datetime.now() - start_time).total_seconds() * 1000
                    return JulesResponse(
                        content=content,
                        model=model,
                        tokens_used=tokens,
                        cached=False,
                        latency_ms=latency
                    )
                    
            except httpx.HTTPStatusError as e:
                last_error = e
                self._error_count += 1
                if e.response.status_code >= 500:
                    await asyncio.sleep(RETRY_DELAY_SECONDS * (attempt + 1))
                    continue
                break
            except Exception as e:
                last_error = e
                self._error_count += 1
                await asyncio.sleep(RETRY_DELAY_SECONDS * (attempt + 1))
        
        # All retries failed
        return JulesResponse(
            content=f"Jules Error: {str(last_error)}",
            model=model,
            latency_ms=(datetime.now() - start_time).total_seconds() * 1000
        )
    
    async def analyze_system_health(self, health_data: Dict[str, Any]) -> JulesResponse:
        """AI-assisted system health analysis"""
        system_prompt = """You are a system health analyst for HeadySystems. 
Analyze the provided health data and provide:
1. Overall system status (healthy/degraded/critical)
2. Key issues identified
3. Recommended actions
Be concise and actionable."""
        
        prompt = f"Analyze this system health data:\n{json.dumps(health_data, indent=2)}"
        return await self.ask_structured(prompt, system_prompt=system_prompt)
    
    async def generate_incident_report(self, incident_data: Dict[str, Any]) -> JulesResponse:
        """Generate incident report from raw data"""
        system_prompt = """You are an incident report generator for HeadySystems.
Create a structured incident report with:
- Incident ID and timestamp
- Severity level
- Affected services
- Root cause analysis
- Resolution steps
- Prevention recommendations"""
        
        prompt = f"Generate incident report for:\n{json.dumps(incident_data, indent=2)}"
        return await self.ask_structured(prompt, system_prompt=system_prompt, max_tokens=4096)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return {
            "total_requests": self._request_count,
            "error_count": self._error_count,
            "cache_size": len(self._cache),
            "error_rate": self._error_count / max(1, self._request_count)
        }
