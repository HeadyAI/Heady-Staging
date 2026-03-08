import json
import os
import sys
import hashlib
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum

import httpx

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from prompt_manager import PromptService

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../secret_gateway")))
from vault_secrets import OnePasswordHandler

REGISTRY_PATH = Path(__file__).resolve().parents[2] / "config" / "secrets_registry.json"
PERPLEXITY_SECRET_KEY = "perplexity"


class PerplexityModel(Enum):
    """Available Perplexity models - updated Jan 2026"""
    SONAR = "sonar"  # Fast, cost-effective
    SONAR_PRO = "sonar-pro"  # Enhanced accuracy
    SONAR_REASONING = "sonar-reasoning"  # Complex reasoning
    SONAR_REASONING_PRO = "sonar-reasoning-pro"  # Best reasoning
    SONAR_DEEP_RESEARCH = "sonar-deep-research"  # Comprehensive research


@dataclass
class PerplexityResponse:
    """Structured response from Perplexity API"""
    content: str
    model: str
    citations: List[str] = field(default_factory=list)
    usage: Dict[str, int] = field(default_factory=dict)
    cached: bool = False
    latency_ms: float = 0.0


def get_reference_from_registry(key: str) -> str:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(f"Registry file missing at {REGISTRY_PATH}")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8-sig"))
    reference = registry.get(key)

    if not reference:
        raise KeyError(f"Registry entry '{key}' not found. Update secrets_registry.json.")

    return reference


class ResponseCache:
    """Simple in-memory cache with TTL for API responses"""
    def __init__(self, ttl_seconds: int = 300, max_size: int = 100):
        self._cache: Dict[str, tuple] = {}  # hash -> (response, timestamp)
        self._ttl = ttl_seconds
        self._max_size = max_size
    
    def _hash_key(self, prompt: str, model: str, system_prompt: str) -> str:
        content = f"{prompt}|{model}|{system_prompt}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def get(self, prompt: str, model: str, system_prompt: str) -> Optional[PerplexityResponse]:
        key = self._hash_key(prompt, model, system_prompt)
        if key in self._cache:
            response, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                response.cached = True
                return response
            del self._cache[key]
        return None
    
    def set(self, prompt: str, model: str, system_prompt: str, response: PerplexityResponse):
        if len(self._cache) >= self._max_size:
            oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
        key = self._hash_key(prompt, model, system_prompt)
        self._cache[key] = (response, time.time())
    
    def clear(self):
        self._cache.clear()


class PerplexityService:
    """Enhanced Perplexity API service with caching, retries, and model selection"""
    
    DEFAULT_MODEL = PerplexityModel.SONAR_PRO
    MAX_RETRIES = 3
    RETRY_DELAYS = [1.0, 2.0, 4.0]  # Exponential backoff
    
    def __init__(self, cache_ttl: int = 300, enable_cache: bool = True):
        self.vault = OnePasswordHandler()
        reference = get_reference_from_registry(PERPLEXITY_SECRET_KEY)
        self.api_key = self.vault.get_secret(reference)
        self.api_url = "https://api.perplexity.ai/chat/completions"
        self.prompt_service = PromptService()
        self._cache = ResponseCache(ttl_seconds=cache_ttl) if enable_cache else None
        self._request_count = 0
        self._error_count = 0
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Return service statistics for monitoring"""
        return {
            "requests": self._request_count,
            "errors": self._error_count,
            "cache_enabled": self._cache is not None,
            "error_rate": self._error_count / max(1, self._request_count)
        }
    
    def clear_cache(self):
        """Clear the response cache"""
        if self._cache:
            self._cache.clear()

    async def ask(
        self, 
        prompt: str, 
        model: str = None,
        system_prompt_key: str = "research_scout",
        temperature: float = 0.2,
        max_tokens: int = 4096,
        return_citations: bool = True,
        skip_cache: bool = False
    ) -> str:
        """Query Perplexity API - returns content string for backward compatibility"""
        response = await self.ask_structured(
            prompt=prompt,
            model=model,
            system_prompt_key=system_prompt_key,
            temperature=temperature,
            max_tokens=max_tokens,
            return_citations=return_citations,
            skip_cache=skip_cache
        )
        return response.content
    
    async def ask_structured(
        self,
        prompt: str,
        model: str = None,
        system_prompt_key: str = "research_scout",
        temperature: float = 0.2,
        max_tokens: int = 4096,
        return_citations: bool = True,
        skip_cache: bool = False
    ) -> PerplexityResponse:
        """Query Perplexity API with structured response including citations"""
        self._request_count += 1
        model = model or self.DEFAULT_MODEL.value
        
        try:
            system_prompt = self.prompt_service.get_prompt(system_prompt_key)
        except Exception:
            system_prompt = "You are a helpful research assistant. Provide accurate, well-sourced information."
        
        # Check cache
        if self._cache and not skip_cache:
            cached = self._cache.get(prompt, model, system_prompt)
            if cached:
                return cached
        
        start_time = time.time()
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "return_citations": return_citations,
                }
                
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(self.api_url, json=payload, headers=headers)
                    
                    if response.status_code == 429:  # Rate limited
                        if attempt < self.MAX_RETRIES - 1:
                            await self._async_sleep(self.RETRY_DELAYS[attempt])
                            continue
                    
                    response.raise_for_status()
                    body = response.json()
                    
                    latency = (time.time() - start_time) * 1000
                    
                    result = PerplexityResponse(
                        content=body["choices"][0]["message"]["content"],
                        model=body.get("model", model),
                        citations=body.get("citations", []),
                        usage=body.get("usage", {}),
                        cached=False,
                        latency_ms=latency
                    )
                    
                    # Cache successful response
                    if self._cache:
                        self._cache.set(prompt, model, system_prompt, result)
                    
                    return result
                    
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code >= 500 and attempt < self.MAX_RETRIES - 1:
                    await self._async_sleep(self.RETRY_DELAYS[attempt])
                    continue
                break
            except Exception as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    await self._async_sleep(self.RETRY_DELAYS[attempt])
                    continue
                break
        
        self._error_count += 1
        return PerplexityResponse(
            content=f"Perplexity Error: {last_error}",
            model=model,
            latency_ms=(time.time() - start_time) * 1000
        )
    
    async def research(self, topic: str, depth: str = "standard") -> PerplexityResponse:
        """Perform research with appropriate model based on depth"""
        model_map = {
            "quick": PerplexityModel.SONAR.value,
            "standard": PerplexityModel.SONAR_PRO.value,
            "deep": PerplexityModel.SONAR_REASONING_PRO.value,
            "comprehensive": PerplexityModel.SONAR_DEEP_RESEARCH.value
        }
        model = model_map.get(depth, PerplexityModel.SONAR_PRO.value)
        return await self.ask_structured(
            prompt=topic,
            model=model,
            system_prompt_key="research_scout",
            skip_cache=(depth == "comprehensive")  # Don't cache deep research
        )
    
    async def reason(self, problem: str) -> PerplexityResponse:
        """Use reasoning model for complex problem solving"""
        return await self.ask_structured(
            prompt=problem,
            model=PerplexityModel.SONAR_REASONING_PRO.value,
            system_prompt_key="research_scout",
            temperature=0.1
        )
    
    async def _async_sleep(self, seconds: float):
        import asyncio
        await asyncio.sleep(seconds)
