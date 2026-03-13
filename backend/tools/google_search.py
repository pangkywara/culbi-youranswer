"""
tools/google_search.py
──────────────────────
Grounding with Google Search built-in tool.

Use-cases:
  • Answering questions about recent events
  • Verifying facts with diverse sources

Docs: https://ai.google.dev/gemini-api/docs/google-search

Note: tool combinations
  Google Search CAN be combined with Code Execution and URL Context.
  Google Search CANNOT be combined with File Search.
"""

from __future__ import annotations

from google.genai import types

from config import settings
from gemini_client import gemini


def build_tool() -> types.Tool:
    """Return a pre-configured Google Search tool object."""
    return types.Tool(google_search=types.GoogleSearch())


def run(
    prompt: str,
    *,
    model: str | None = None,
    system_instruction: str | None = None,
) -> dict:
    """
    Send *prompt* to Gemini with Google Search grounding enabled.

    Returns
    -------
    dict with keys:
        text            – final grounded answer
        search_queries  – list of queries Gemini issued to Search
        sources         – list of {uri, title} dicts
        raw             – the full GenerateContentResponse object
    """
    config_kwargs: dict = {
        "tools": [build_tool()],
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    response = gemini.models.generate_content(
        model=model or settings.default_model,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    candidate = response.candidates[0]
    grounding = candidate.grounding_metadata

    sources: list[dict] = []
    search_queries: list[str] = []

    if grounding:
        search_queries = list(grounding.web_search_queries or [])
        for chunk in grounding.grounding_chunks or []:
            if chunk.web:
                sources.append(
                    {"uri": chunk.web.uri, "title": chunk.web.title}
                )

    return {
        "text": response.text,
        "search_queries": search_queries,
        "sources": sources,
        "raw": response,
    }
