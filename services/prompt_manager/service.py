from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from jinja2 import Template, UndefinedError

logger = logging.getLogger(__name__)


class PromptMetadata:
    """Metadata container for prompt files"""
    def __init__(self, data: Dict[str, Any]):
        self.name = data.get("name", "unknown")
        self.version = data.get("version", "1.0")
        self.description = data.get("description", "")
        self.variables = data.get("variables", [])
        self.model = data.get("model", "hybrid")
        self.tags = data.get("tags", [])


class PromptService:
    """
    Dynamic prompt loading service for the Heady Sovereign Stack.
    Loads prompts from YAML/JSON/TXT files and renders them with Jinja2 templating.
    
    Usage:
        service = PromptService()
        rendered = service.get_prompt("node_master", {"context_id": "123", "persona": "citizen"})
    """
    
    def __init__(self, base_path: Optional[str | Path] = None):
        self.base_path = Path(base_path or Path(__file__).resolve().parents[2] / "data" / "prompts")
        self._cache: Dict[str, Tuple[str, PromptMetadata]] = {}
        self._cache_enabled = True
        
    def _resolve_file(self, prompt_name: str) -> Optional[Path]:
        """Resolve prompt file by name, checking multiple extensions"""
        for extension in (".yaml", ".yml", ".json", ".txt"):
            candidate = self.base_path / f"{prompt_name}{extension}"
            if candidate.exists():
                return candidate
        return None

    def _load_raw(self, file_path: Path) -> Tuple[str, Dict[str, Any]]:
        """Load raw content and metadata from file"""
        if file_path.suffix in {".yaml", ".yml"}:
            data = yaml.safe_load(file_path.read_text(encoding="utf-8")) or {}
            return data.get("content", ""), data
        if file_path.suffix == ".json":
            data = json.loads(file_path.read_text(encoding="utf-8")) or {}
            return data.get("content", ""), data
        # Plain text files have no metadata
        content = file_path.read_text(encoding="utf-8")
        return content, {"name": file_path.stem, "version": "1.0", "content": content}

    def _load_content(self, file_path: Path) -> str:
        """Load just the content from a prompt file"""
        content, _ = self._load_raw(file_path)
        return content

    def _render_template(self, content: str, variables: Optional[Dict[str, Any]] = None) -> str:
        """Render Jinja2 template with provided variables"""
        template = Template(content)
        return template.render(**(variables or {}))

    def get_prompt(self, prompt_name: str, variables: Optional[Dict[str, Any]] = None) -> str:
        """
        Load and render a prompt by name.
        
        Args:
            prompt_name: Name of the prompt file (without extension)
            variables: Dictionary of variables to substitute in the template
            
        Returns:
            Rendered prompt string, or error message if loading fails
        """
        file_path = self._resolve_file(prompt_name)
        if not file_path:
            logger.warning(f"Prompt '{prompt_name}' not found in {self.base_path}")
            return f"[Prompt '{prompt_name}' unavailable]"

        try:
            content = self._load_content(file_path)
        except Exception as exc:
            logger.error(f"Failed to load prompt '{prompt_name}': {exc}")
            return f"[Prompt '{prompt_name}' failed to load: {exc}]"

        if not content:
            return f"[Prompt '{prompt_name}' is empty]"

        try:
            return self._render_template(content, variables)
        except UndefinedError as exc:
            logger.warning(f"Missing variable in prompt '{prompt_name}': {exc}")
            # Render with missing variables as empty strings
            safe_vars = variables.copy() if variables else {}
            return self._render_template(content, safe_vars)
        except Exception as exc:
            logger.error(f"Rendering error for prompt '{prompt_name}': {exc}")
            return f"[Prompt '{prompt_name}' rendering error: {exc}]"

    def get_prompt_with_metadata(self, prompt_name: str, variables: Optional[Dict[str, Any]] = None) -> Tuple[str, PromptMetadata]:
        """
        Load and render a prompt, returning both content and metadata.
        
        Args:
            prompt_name: Name of the prompt file (without extension)
            variables: Dictionary of variables to substitute in the template
            
        Returns:
            Tuple of (rendered_content, PromptMetadata)
        """
        file_path = self._resolve_file(prompt_name)
        if not file_path:
            return f"[Prompt '{prompt_name}' unavailable]", PromptMetadata({"name": prompt_name})

        try:
            content, raw_data = self._load_raw(file_path)
            metadata = PromptMetadata(raw_data)
            rendered = self._render_template(content, variables) if content else ""
            return rendered, metadata
        except Exception as exc:
            logger.error(f"Failed to load prompt with metadata '{prompt_name}': {exc}")
            return f"[Error: {exc}]", PromptMetadata({"name": prompt_name})

    def list_prompts(self) -> List[Dict[str, Any]]:
        """
        List all available prompts with their metadata.
        
        Returns:
            List of dictionaries containing prompt info
        """
        prompts = []
        for ext in (".yaml", ".yml", ".json", ".txt"):
            for file_path in self.base_path.glob(f"*{ext}"):
                try:
                    _, raw_data = self._load_raw(file_path)
                    prompts.append({
                        "name": raw_data.get("name", file_path.stem),
                        "version": raw_data.get("version", "1.0"),
                        "description": raw_data.get("description", ""),
                        "variables": raw_data.get("variables", []),
                        "file": file_path.name
                    })
                except Exception as exc:
                    logger.warning(f"Failed to read prompt {file_path}: {exc}")
                    prompts.append({
                        "name": file_path.stem,
                        "version": "unknown",
                        "description": f"Error: {exc}",
                        "variables": [],
                        "file": file_path.name
                    })
        return prompts

    def get_required_variables(self, prompt_name: str) -> List[str]:
        """
        Get the list of required variables for a prompt.
        
        Args:
            prompt_name: Name of the prompt file
            
        Returns:
            List of variable names required by the prompt
        """
        file_path = self._resolve_file(prompt_name)
        if not file_path:
            return []
        
        try:
            _, raw_data = self._load_raw(file_path)
            return raw_data.get("variables", [])
        except Exception:
            return []

    def validate_prompt(self, prompt_name: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Validate a prompt can be loaded and rendered.
        
        Args:
            prompt_name: Name of the prompt file
            variables: Variables to test with
            
        Returns:
            Validation result dictionary
        """
        result = {
            "name": prompt_name,
            "valid": False,
            "errors": [],
            "warnings": []
        }
        
        file_path = self._resolve_file(prompt_name)
        if not file_path:
            result["errors"].append(f"Prompt file not found: {prompt_name}")
            return result
            
        try:
            content, raw_data = self._load_raw(file_path)
            
            if not content:
                result["errors"].append("Prompt content is empty")
                return result
                
            # Check for required variables
            required_vars = raw_data.get("variables", [])
            provided_vars = set(variables.keys()) if variables else set()
            missing_vars = set(required_vars) - provided_vars
            
            if missing_vars:
                result["warnings"].append(f"Missing variables: {missing_vars}")
            
            # Try to render
            rendered = self._render_template(content, variables)
            
            if rendered:
                result["valid"] = True
                result["rendered_length"] = len(rendered)
                
        except Exception as exc:
            result["errors"].append(str(exc))
            
        return result
