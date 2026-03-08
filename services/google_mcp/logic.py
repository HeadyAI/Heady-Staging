import json
import os
import sys
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Import Vault
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../secret_gateway")))
from vault_secrets import OnePasswordHandler

REGISTRY_PATH = Path(__file__).resolve().parents[2] / "config" / "secrets_registry.json"
GOOGLE_SECRET_KEY = "google_api_key"


class GeminiModel(Enum):
    """Available Gemini models - updated Jan 2026"""
    FLASH = "gemini-2.0-flash"  # Fast, cost-effective
    FLASH_LITE = "gemini-2.0-flash-lite"  # Ultra-fast, lowest cost
    PRO = "gemini-2.0-pro"  # Best quality
    FLASH_THINKING = "gemini-2.0-flash-thinking-exp"  # Enhanced reasoning


@dataclass
class GeminiResponse:
    """Structured response from Gemini API"""
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cached: bool = False
    latency_ms: float = 0.0
    safety_ratings: List[Dict[str, str]] = field(default_factory=list)


def get_reference_from_registry(key: str) -> str:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError(f"Registry file missing at {REGISTRY_PATH}")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8-sig"))
    reference = registry.get(key)

    if not reference:
        raise KeyError(f"Registry entry '{key}' not found. Update secrets_registry.json.")

    return reference


class ResponseCache:
    """Simple in-memory cache with TTL"""
    def __init__(self, ttl_seconds: int = 300, max_size: int = 100):
        self._cache: Dict[str, tuple] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size
    
    def _hash_key(self, prompt: str, model: str, system: str) -> str:
        content = f"{prompt}|{model}|{system}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def get(self, prompt: str, model: str, system: str) -> Optional[GeminiResponse]:
        key = self._hash_key(prompt, model, system)
        if key in self._cache:
            response, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                response.cached = True
                return response
            del self._cache[key]
        return None
    
    def set(self, prompt: str, model: str, system: str, response: GeminiResponse):
        if len(self._cache) >= self._max_size:
            oldest = min(self._cache, key=lambda k: self._cache[k][1])
            del self._cache[oldest]
        key = self._hash_key(prompt, model, system)
        self._cache[key] = (response, time.time())
    
    def clear(self):
        self._cache.clear()


class GeminiService:
    """Enhanced Gemini API service with caching, retry logic, and model selection"""
    
    DEFAULT_MODEL = GeminiModel.FLASH
    MAX_RETRIES = 3
    RETRY_DELAYS = [1.0, 2.0, 4.0]
    
    # Default safety settings - balanced
    DEFAULT_SAFETY = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    }
    
    def __init__(self, cache_ttl: int = 300, enable_cache: bool = True):
        self.vault = OnePasswordHandler()
        reference = get_reference_from_registry(GOOGLE_SECRET_KEY)
        self.api_key = self.vault.get_secret(reference)
        genai.configure(api_key=self.api_key)
        self._cache = ResponseCache(ttl_seconds=cache_ttl) if enable_cache else None
        self._request_count = 0
        self._error_count = 0
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Return service statistics"""
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
    
    def ask(self, prompt: str, model_name: str = None) -> str:
        """Simple ask interface - backward compatible"""
        response = self.ask_structured(prompt, model_name=model_name)
        return response.content
    
    def ask_structured(
        self,
        prompt: str,
        model_name: str = None,
        system_instruction: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        skip_cache: bool = False
    ) -> GeminiResponse:
        """Query Gemini with structured response"""
        self._request_count += 1
        model_name = model_name or self.DEFAULT_MODEL.value
        system_instruction = system_instruction or ""
        
        # Check cache
        if self._cache and not skip_cache:
            cached = self._cache.get(prompt, model_name, system_instruction)
            if cached:
                return cached
        
        start_time = time.time()
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_instruction if system_instruction else None,
                    safety_settings=self.DEFAULT_SAFETY,
                    generation_config=genai.GenerationConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens
                    )
                )
                
                response = model.generate_content(prompt)
                latency = (time.time() - start_time) * 1000
                
                # Extract usage metadata if available
                prompt_tokens = 0
                completion_tokens = 0
                if hasattr(response, 'usage_metadata'):
                    prompt_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
                    completion_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
                
                # Extract safety ratings
                safety_ratings = []
                if response.candidates and response.candidates[0].safety_ratings:
                    for rating in response.candidates[0].safety_ratings:
                        safety_ratings.append({
                            "category": str(rating.category),
                            "probability": str(rating.probability)
                        })
                
                result = GeminiResponse(
                    content=response.text,
                    model=model_name,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    cached=False,
                    latency_ms=latency,
                    safety_ratings=safety_ratings
                )
                
                if self._cache:
                    self._cache.set(prompt, model_name, system_instruction, result)
                
                return result
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                # Retry on transient errors
                if any(x in error_str for x in ['rate', 'quota', '503', '500', 'timeout']):
                    if attempt < self.MAX_RETRIES - 1:
                        time.sleep(self.RETRY_DELAYS[attempt])
                        continue
                break
        
        self._error_count += 1
        return GeminiResponse(
            content=f"Gemini Error: {str(last_error)}",
            model=model_name,
            latency_ms=(time.time() - start_time) * 1000
        )
    
    def think(self, problem: str) -> GeminiResponse:
        """Use thinking model for complex reasoning"""
        return self.ask_structured(
            prompt=problem,
            model_name=GeminiModel.FLASH_THINKING.value,
            temperature=0.2,
            skip_cache=True
        )
    
    def fast(self, prompt: str) -> GeminiResponse:
        """Use fastest model for quick responses"""
        return self.ask_structured(
            prompt=prompt,
            model_name=GeminiModel.FLASH_LITE.value,
            temperature=0.5
        )
    
    def quality(self, prompt: str) -> GeminiResponse:
        """Use best quality model"""
        return self.ask_structured(
            prompt=prompt,
            model_name=GeminiModel.PRO.value,
            temperature=0.3
        )
