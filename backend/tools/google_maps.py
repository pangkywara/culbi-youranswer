"""
tools/google_maps.py
─────────────────────
Grounding with Google Maps built-in tool.

Use-cases:
  • Planning travel itineraries with multiple stops
  • Finding local businesses based on user criteria

Docs: https://ai.google.dev/gemini-api/docs/maps-grounding

Supported models: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash
Note: NOT available with Gemini 3 models.
"""

from __future__ import annotations

from google.genai import types

from config import settings
from gemini_client import gemini

# Gemini 3 models don't support Maps; fall back to 2.5-flash
_MAPS_DEFAULT_MODEL = "gemini-2.5-flash"


def build_tool(*, enable_widget: bool = False) -> types.Tool:
    """
    Return a pre-configured Google Maps tool object.

    Parameters
    ----------
    enable_widget:
        When True the response will include a `google_maps_widget_context_token`
        that can be used to render an interactive Google Maps widget.
    """
    return types.Tool(google_maps=types.GoogleMaps(enable_widget=enable_widget))


def run(
    prompt: str,
    *,
    latitude: float | None = None,
    longitude: float | None = None,
    enable_widget: bool = False,
    model: str | None = None,
    system_instruction: str | None = None,
) -> dict:
    """
    Send *prompt* to Gemini with Google Maps grounding enabled.

    Parameters
    ----------
    prompt:
        The user query (e.g. "Best ramen restaurants near me").
    latitude / longitude:
        Optional user location for geographically relevant results.
    enable_widget:
        Include a Maps widget context token in the response.

    Returns
    -------
    dict with keys:
        text              – final grounded answer
        sources           – list of {uri, title, place_id} dicts
        widget_token      – str or None (only when enable_widget=True)
        raw               – the full GenerateContentResponse object
    """
    tool_config_kwargs: dict = {}
    if latitude is not None and longitude is not None:
        tool_config_kwargs["retrieval_config"] = types.RetrievalConfig(
            lat_lng=types.LatLng(latitude=latitude, longitude=longitude)
        )

    config_kwargs: dict = {
        "tools": [build_tool(enable_widget=enable_widget)],
    }
    if tool_config_kwargs:
        config_kwargs["tool_config"] = types.ToolConfig(**tool_config_kwargs)
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    response = gemini.models.generate_content(
        model=model or _MAPS_DEFAULT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    candidate = response.candidates[0]
    grounding = candidate.grounding_metadata

    sources: list[dict] = []
    widget_token: str | None = None

    if grounding:
        for chunk in grounding.grounding_chunks or []:
            if chunk.maps:
                sources.append(
                    {
                        "uri": chunk.maps.uri,
                        "title": chunk.maps.title,
                        "place_id": getattr(chunk.maps, "place_id", None),
                    }
                )
        widget_token = getattr(grounding, "google_maps_widget_context_token", None)

    return {
        "text": response.text,
        "sources": sources,
        "widget_token": widget_token,
        "raw": response,
    }
