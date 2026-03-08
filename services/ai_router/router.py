"""
AI Router - Unified Multi-Provider AI Service
Aligns with Provisional #3 (Logic Engine) and #7 (Integration Protocol)

Provides a single interface to route requests to Jules, Perplexity, or Gemini
based on task requirements and configuration.
"""
import json
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class AIProvider(Enum):
    """Available AI providers"""
    JULES = "jules"
    PERPLEXITY = "perplexity"
    GEMINI = "gemini"


@dataclass
class AIResponse:
    """Unified response from any AI provider"""
    content: str
    provider: AIProvider
    model: str
    citations: List[str] = field(default_factory=list)
    tokens_used: int = 0
    cached: bool = False
    latency_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "provider": self.provider.value,
            "model": self.model,
            "citations": self.citations,
            "tokens_used": self.tokens_used,
            "cached": self.cached,
            "latency_ms": self.latency_ms,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }


class AIRouter:
    """
    Unified AI Router supporting multiple providers with automatic fallback.
    
    Usage:
        router = AIRouter(primary_provider=AIProvider.PERPLEXITY)
        response = await router.ask("What is the weather?")
        response = await router.research("AI trends 2026", depth="deep")
        response = await router.analyze_health(health_data)
    """
    
    # Task-to-provider mapping based on capabilities
    CAPABILITY_MAP = {
        "research": AIProvider.PERPLEXITY,
        "citations": AIProvider.PERPLEXITY,
        "real_time": AIProvider.PERPLEXITY,
        "reasoning": AIProvider.GEMINI,
        "thinking": AIProvider.GEMINI,
        "multimodal": AIProvider.GEMINI,
        "fast": AIProvider.GEMINI,
        "analysis": AIProvider.JULES,
        "incident": AIProvider.JULES,
        "code_review": AIProvider.JULES,
    }
    
    def __init__(
        self,
        primary_provider: AIProvider = AIProvider.PERPLEXITY,
        fallback_chain: List[AIProvider] = None,
        config_path: Path = None
    ):
        self.primary_provider = primary_provider
        self.fallback_chain = fallback_chain or [
            AIProvider.GEMINI,
            AIProvider.JULES
        ]
        self._services: Dict[AIProvider, Any] = {}
        self._initialized = False
        self._config = self._load_config(config_path)
        
    def _load_config(self, config_path: Path = None) -> Dict[str, Any]:
        """Load AI workflow config from hive_config.json"""
        if config_path is None:
            config_path = Path(__file__).resolve().parents[2] / "shared" / "config" / "hive_config.json"
        
        if not config_path.exists():
            # Try alternate location
            config_path = Path(__file__).resolve().parents[3] / "shared" / "config" / "hive_config.json"
        
        if config_path.exists():
            try:
                data = json.loads(config_path.read_text(encoding="utf-8"))
                return data.get("ai_workflow", {})
            except Exception:
                pass
        return {}
    
    def _get_service(self, provider: AIProvider):
        """Lazy-load and cache service instances"""
        if provider not in self._services:
            try:
                if provider == AIProvider.JULES:
                    from ..jules_mcp.logic import JulesService
                    self._services[provider] = JulesService()
                elif provider == AIProvider.PERPLEXITY:
                    from ..perplexity_mcp.logic import PerplexityService
                    self._services[provider] = PerplexityService()
                elif provider == AIProvider.GEMINI:
                    from ..google_mcp.logic import GeminiService
                    self._services[provider] = GeminiService()
            except Exception as e:
                print(f"Failed to initialize {provider.value}: {e}")
                return None
        return self._services.get(provider)
    
    def _select_provider(self, capability: str = None) -> AIProvider:
        """Select best provider for capability, or use primary"""
        if capability and capability in self.CAPABILITY_MAP:
            preferred = self.CAPABILITY_MAP[capability]
            if self._get_service(preferred):
                return preferred
        return self.primary_provider
    
    async def _call_with_fallback(
        self,
        method_name: str,
        args: tuple,
        kwargs: dict,
        preferred_provider: AIProvider = None
    ) -> AIResponse:
        """Call method with automatic fallback on failure"""
        providers = [preferred_provider or self.primary_provider] + [
            p for p in self.fallback_chain 
            if p != (preferred_provider or self.primary_provider)
        ]
        
        last_error = None
        for provider in providers:
            service = self._get_service(provider)
            if not service:
                continue
                
            try:
                method = getattr(service, method_name, None)
                if method is None:
                    # Try alternate method names
                    if method_name == "ask":
                        method = getattr(service, "ask_structured", None)
                    continue
                
                if asyncio.iscoroutinefunction(method):
                    result = await method(*args, **kwargs)
                else:
                    result = method(*args, **kwargs)
                
                # Normalize response
                return self._normalize_response(result, provider)
                
            except Exception as e:
                last_error = e
                continue
        
        # All providers failed
        return AIResponse(
            content=f"All AI providers failed. Last error: {last_error}",
            provider=self.primary_provider,
            model="error"
        )
    
    def _normalize_response(self, result: Any, provider: AIProvider) -> AIResponse:
        """Convert provider-specific response to unified AIResponse"""
        if isinstance(result, AIResponse):
            return result
        
        if isinstance(result, str):
            return AIResponse(
                content=result,
                provider=provider,
                model="unknown"
            )
        
        # Handle dataclass responses from services
        content = getattr(result, 'content', str(result))
        model = getattr(result, 'model', 'unknown')
        citations = getattr(result, 'citations', [])
        cached = getattr(result, 'cached', False)
        latency = getattr(result, 'latency_ms', 0.0)
        
        # Get tokens
        tokens = getattr(result, 'tokens_used', 0)
        if not tokens:
            tokens = getattr(result, 'prompt_tokens', 0) + getattr(result, 'completion_tokens', 0)
        if not tokens:
            usage = getattr(result, 'usage', {})
            tokens = usage.get('total_tokens', 0) if isinstance(usage, dict) else 0
        
        return AIResponse(
            content=content,
            provider=provider,
            model=model,
            citations=citations,
            tokens_used=tokens,
            cached=cached,
            latency_ms=latency
        )
    
    async def ask(
        self,
        prompt: str,
        capability: str = None,
        provider: AIProvider = None,
        **kwargs
    ) -> AIResponse:
        """General-purpose query to any AI provider"""
        selected = provider or self._select_provider(capability)
        return await self._call_with_fallback(
            "ask",
            (prompt,),
            kwargs,
            selected
        )
    
    async def research(
        self,
        topic: str,
        depth: str = "standard",
        **kwargs
    ) -> AIResponse:
        """Research query - prefers Perplexity for citations"""
        service = self._get_service(AIProvider.PERPLEXITY)
        if service and hasattr(service, 'research'):
            try:
                result = await service.research(topic, depth=depth)
                return self._normalize_response(result, AIProvider.PERPLEXITY)
            except Exception:
                pass
        
        # Fallback to general ask
        return await self._call_with_fallback(
            "ask",
            (f"Research the following topic thoroughly: {topic}",),
            kwargs,
            AIProvider.PERPLEXITY
        )
    
    async def reason(self, problem: str, **kwargs) -> AIResponse:
        """Complex reasoning - prefers Gemini thinking model"""
        service = self._get_service(AIProvider.GEMINI)
        if service and hasattr(service, 'think'):
            try:
                result = service.think(problem)
                return self._normalize_response(result, AIProvider.GEMINI)
            except Exception:
                pass
        
        # Fallback to Perplexity reasoning
        service = self._get_service(AIProvider.PERPLEXITY)
        if service and hasattr(service, 'reason'):
            try:
                result = await service.reason(problem)
                return self._normalize_response(result, AIProvider.PERPLEXITY)
            except Exception:
                pass
        
        return await self.ask(problem, capability="reasoning")
    
    async def analyze_health(self, health_data: Dict[str, Any]) -> AIResponse:
        """System health analysis - prefers Jules"""
        service = self._get_service(AIProvider.JULES)
        if service and hasattr(service, 'analyze_system_health'):
            try:
                result = await service.analyze_system_health(health_data)
                return self._normalize_response(result, AIProvider.JULES)
            except Exception:
                pass
        
        # Fallback to formatted prompt
        prompt = f"""Analyze this system health data and provide:
1. Overall status (healthy/degraded/critical)
2. Key issues identified
3. Recommended actions

Health Data:
{json.dumps(health_data, indent=2)}"""
        
        return await self.ask(prompt, capability="analysis")
    
    async def generate_incident_report(self, incident_data: Dict[str, Any]) -> AIResponse:
        """Generate incident report - prefers Jules"""
        service = self._get_service(AIProvider.JULES)
        if service and hasattr(service, 'generate_incident_report'):
            try:
                result = await service.generate_incident_report(incident_data)
                return self._normalize_response(result, AIProvider.JULES)
            except Exception:
                pass
        
        prompt = f"""Generate an incident report with:
- Incident ID and timestamp
- Severity level (P1-P5)
- Affected services
- Root cause analysis
- Resolution steps
- Prevention recommendations

Incident Data:
{json.dumps(incident_data, indent=2)}"""
        
        return await self.ask(prompt, capability="incident")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics from all initialized providers"""
        stats = {}
        for provider, service in self._services.items():
            if hasattr(service, 'stats'):
                stats[provider.value] = service.stats
            elif hasattr(service, 'get_stats'):
                stats[provider.value] = service.get_stats()
        return {
            "primary_provider": self.primary_provider.value,
            "fallback_chain": [p.value for p in self.fallback_chain],
            "providers": stats
        }
    
    def clear_caches(self):
        """Clear caches for all providers"""
        for service in self._services.values():
            if hasattr(service, 'clear_cache'):
                service.clear_cache()
