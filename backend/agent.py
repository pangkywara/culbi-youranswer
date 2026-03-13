"""
agent.py
────────
GeminiAgent – routes each user request to the right built-in tool(s)
based on the `tool` parameter and returns a normalised response dict.

This keeps all tool-selection logic in one place so the FastAPI layer
stays thin and each tool module stays independently testable.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from tools import (
    google_search_tool,
    google_maps_tool,
    code_execution_tool,
    url_context_tool,
    file_search_tool,
)
import tools.google_search as _search_mod
import tools.google_maps as _maps_mod
import tools.code_execution as _code_mod
import tools.url_context as _url_mod
import tools.file_search as _file_mod
from config import settings


class ToolName(str, Enum):
    google_search     = "google_search"
    google_maps       = "google_maps"
    code_execution    = "code_execution"
    url_context       = "url_context"
    file_search       = "file_search"
    # Combine Search + URL Context in one call
    search_and_url    = "search_and_url"
    # Multimodal landmark detection — handled directly in main.py
    landmark_detection = "landmark_detection"


class GeminiAgent:
    """
    Thin orchestration layer on top of the individual tool modules.

    Usage
    -----
    agent = GeminiAgent()
    result = agent.run(tool=ToolName.google_search, prompt="Latest AI news")
    """

    # ── Public entry-point ────────────────────────────────────────────────────

    def run(
        self,
        tool: ToolName | str,
        prompt: str,
        **kwargs: Any,
    ) -> dict:
        """
        Dispatch *prompt* to the appropriate Gemini tool.

        Parameters
        ----------
        tool:
            Which built-in tool (or combination) to use.
        prompt:
            The user's question or instruction.
        **kwargs:
            Tool-specific parameters forwarded to the underlying module:

            google_maps:
                latitude, longitude, enable_widget
            url_context:
                urls (list[str]), also_use_search (bool)
            file_search:
                store_names (list[str]), metadata_filter (str)
            all tools:
                model (str), system_instruction (str)

        Returns
        -------
        dict – always contains at least {"tool", "prompt", "text"}.
        """
        tool = ToolName(tool)

        dispatch = {
            ToolName.google_search:  self._run_google_search,
            ToolName.google_maps:    self._run_google_maps,
            ToolName.code_execution: self._run_code_execution,
            ToolName.url_context:    self._run_url_context,
            ToolName.file_search:    self._run_file_search,
            ToolName.search_and_url: self._run_search_and_url,
        }

        handler = dispatch[tool]
        raw_result = handler(prompt, **kwargs)

        return self._wrap(tool, prompt, raw_result)

    # ── Private handlers ──────────────────────────────────────────────────────

    def _run_google_search(self, prompt: str, **kwargs) -> dict:
        return _search_mod.run(prompt, **kwargs)

    def _run_google_maps(self, prompt: str, **kwargs) -> dict:
        return _maps_mod.run(prompt, **kwargs)

    def _run_code_execution(self, prompt: str, **kwargs) -> _code_mod.CodeExecutionResult:
        return _code_mod.run(prompt, **kwargs)

    def _run_url_context(self, prompt: str, **kwargs) -> _url_mod.UrlContextResult:
        return _url_mod.run(prompt, **kwargs)

    def _run_file_search(self, prompt: str, **kwargs) -> _file_mod.FileSearchResult:
        return _file_mod.run(prompt, **kwargs)

    def _run_search_and_url(self, prompt: str, **kwargs) -> _url_mod.UrlContextResult:
        """Google Search + URL Context combined."""
        kwargs["also_use_search"] = True
        return _url_mod.run(prompt, **kwargs)

    # ── Normalise output ──────────────────────────────────────────────────────

    @staticmethod
    def _wrap(tool: ToolName, prompt: str, result: Any) -> dict:
        """Convert any tool result to a uniform dict."""
        base: dict = {"tool": tool.value, "prompt": prompt}

        if isinstance(result, dict):
            base.update(result)
        elif isinstance(result, _code_mod.CodeExecutionResult):
            base["text"]              = result.text
            base["code_blocks"]       = result.code_blocks
            base["execution_outputs"] = result.execution_outputs
        elif isinstance(result, _url_mod.UrlContextResult):
            base["text"]         = result.text
            base["url_statuses"] = result.url_statuses
        elif isinstance(result, _file_mod.FileSearchResult):
            base["text"] = result.text
        else:
            base["text"] = str(result)

        # Always drop the raw response object before returning to API layer
        base.pop("raw", None)
        return base


# Module-level singleton for convenience
agent = GeminiAgent()
