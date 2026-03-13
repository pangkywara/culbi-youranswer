"""
tools/url_context.py
─────────────────────
URL Context built-in tool.

Use-cases:
  • Answering questions based on specific URLs or documents
  • Retrieving and comparing information across web pages
  • Analysing GitHub repos / technical documentation

Docs: https://ai.google.dev/gemini-api/docs/url-context

Limits:
  • Up to 20 URLs per request
  • Max content size per URL: 34 MB
  • URLs must be publicly accessible

Tool combinations:
  URL Context CAN be combined with Google Search.
  URL Context CANNOT be combined with File Search or Function Calling.
"""

from __future__ import annotations

from dataclasses import dataclass

from google.genai import types

from config import settings
from gemini_client import gemini


def build_tool() -> types.Tool:
    """Return a pre-configured URL Context tool object."""
    return types.Tool(url_context=types.UrlContext())


@dataclass
class UrlContextResult:
    text: str
    url_statuses: list[dict]  # [{url, status}]
    raw: object               # GenerateContentResponse


def run(
    prompt: str,
    urls: list[str] | None = None,
    *,
    also_use_search: bool = False,
    model: str | None = None,
    system_instruction: str | None = None,
) -> UrlContextResult:
    """
    Send *prompt* to Gemini with URL Context enabled.

    Parameters
    ----------
    prompt:
        The user query. Embed the URLs directly in the prompt text
        (e.g. "Summarise https://example.com") OR pass them via *urls*.
        When *urls* is provided they are appended to the prompt automatically.
    urls:
        Optional list of URLs to append to the prompt. Max 20.
    also_use_search:
        When True, Google Search is added alongside URL Context so the
        model can search broadly and read specific pages in one call.

    Returns
    -------
    UrlContextResult
    """
    if urls:
        if len(urls) > 20:
            raise ValueError("URL Context supports at most 20 URLs per request.")
        url_list = "\n".join(urls)
        prompt = f"{prompt}\n\nURLs:\n{url_list}"

    active_tools: list[types.Tool] = [build_tool()]
    if also_use_search:
        active_tools.append(types.Tool(google_search=types.GoogleSearch()))

    config_kwargs: dict = {"tools": active_tools}
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    response = gemini.models.generate_content(
        model=model or settings.default_model,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    candidate = response.candidates[0]
    url_statuses: list[dict] = []

    url_meta = getattr(candidate, "url_context_metadata", None)
    if url_meta:
        for entry in getattr(url_meta, "url_metadata", []):
            url_statuses.append(
                {
                    "url": entry.retrieved_url,
                    "status": entry.url_retrieval_status,
                }
            )

    return UrlContextResult(
        text=response.text,
        url_statuses=url_statuses,
        raw=response,
    )
