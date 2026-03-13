"""
tools/landmark_detection.py
────────────────────────────
Gemini multimodal landmark detection with Google Search grounding.

Capabilities
────────────
  • Identifies landmarks in a base64-encoded image via Gemini vision
  • Grounds the identification with Google Search to verify + enrich
  • Returns structured output as a LandmarkDetectionResult dataclass

Why this is better than Google Cloud Vision LANDMARK_DETECTION
───────────────────────────────────────────────────────────────
  Cloud Vision queries a fixed internal database of famous landmarks.
  Regional landmarks (e.g. Monas – Jakarta, Rumah Radakng – Pontianak,
  Taman Sari – Yogyakarta) are often absent or underrepresented.

  This approach uses Gemini's multimodal reasoning *combined* with live
  Google Search grounding, so it can:
    1. Visually reason about architecture, style, and cultural cues
    2. Search the web to verify and enrich the identification in real-time
    3. Return accurate coordinates, descriptions, and historical context

Docs
────
  https://ai.google.dev/gemini-api/docs/tools
  https://ai.google.dev/gemini-api/docs/google-search
  https://ai.google.dev/gemini-api/docs/image-understanding
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from google.genai import types

from config import settings
from gemini_client import gemini
from tools.google_search import build_tool as _search_tool

# ─── System instruction ───────────────────────────────────────────────────────

_SYSTEM_INSTRUCTION = """\
You are an expert landmark and location recognition system with deep regional
knowledge across:
  • World-famous monuments, buildings, and natural features
  • Southeast Asian heritage sites (Indonesia, Malaysia, Brunei, Singapore,
    Vietnam, Thailand, Philippines, etc.)
  • Local cultural landmarks that may not appear in standard databases

Rules
─────
1. Always use Google Search to verify your visual identification and retrieve
   accurate GPS coordinates, official name, and historical context.
2. Respond ONLY with a single valid JSON object — NO markdown code fences,
   NO prose before or after the JSON.
3. Never return null for landmark_name; use "Unknown Location" if unidentifiable.
4. confidence_score: 0.0 (no idea) → 1.0 (certain). Be honest, not optimistic.
5. For SE Asian landmarks that may be less globally known, lean on Search heavily.
6. THE IMAGE IS THE SOLE PRIMARY EVIDENCE. Identify the landmark from what you
   visually observe: architecture, signage, natural features, surroundings, style.
7. If a GPS location hint is provided, it is the user's CURRENT DEVICE LOCATION,
   NOT necessarily where the photo was taken. NEVER let GPS override what you
   clearly see in the image. Use GPS only as a very weak tiebreaker if two
   visually indistinguishable candidates exist.
"""

# ─── Detection prompt ─────────────────────────────────────────────────────────

_DETECTION_PROMPT = """\
Analyse this image and identify the landmark or notable location shown.

Use Google Search to verify your visual identification and retrieve accurate
GPS coordinates, official name, and historical facts.

Respond with exactly this JSON structure — no extra keys, no markdown:

{
  "landmark_name": "Full official name of the landmark",
  "local_name": "Local language name if different, else null",
  "confidence_score": 0.85,
  "category": "monument|building|natural|religious|cultural|unknown",
  "country": "Country name or null",
  "city": "City / region name or null",
  "latitude": 12.345678,
  "longitude": 98.765432,
  "short_description": "1–2 sentence description of the landmark.",
  "historical_note": "Brief historical or cultural significance.",
  "recognition_cues": "Visual features that led to this identification.",
  "search_verified": true
}
"""

# ─── JSON extraction helpers ──────────────────────────────────────────────────

# Strip optional markdown code fences that some model versions still emit
_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)

_FALLBACK_INFO: dict[str, Any] = {
    "landmark_name": "Unknown Location",
    "local_name": None,
    "confidence_score": 0.0,
    "category": "unknown",
    "country": None,
    "city": None,
    "latitude": None,
    "longitude": None,
    "short_description": None,
    "historical_note": None,
    "recognition_cues": None,
    "search_verified": False,
}


def _parse_json(raw: str) -> dict[str, Any]:
    """
    Robustly extract a JSON object from *raw*.

    Strategy:
      1. Try to parse whole string directly.
      2. Strip markdown fences and retry.
      3. Extract first {...} block with regex and retry.
      4. Return the fallback dict on total failure.
    """
    text = raw.strip()

    # Attempt 1 – direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Attempt 2 – strip markdown fences
    fence_match = _FENCE_RE.search(text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Attempt 3 – extract first curly-brace block
    obj_match = _OBJECT_RE.search(text)
    if obj_match:
        try:
            return json.loads(obj_match.group(0))
        except json.JSONDecodeError:
            pass

    return dict(_FALLBACK_INFO)


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class LandmarkInfo:
    """Structured information about a detected landmark."""

    landmark_name: str
    local_name: str | None
    confidence_score: float
    category: str
    country: str | None
    city: str | None
    latitude: float | None
    longitude: float | None
    short_description: str | None
    historical_note: str | None
    recognition_cues: str | None
    search_verified: bool

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "LandmarkInfo":
        """Construct from a parsed JSON dict, tolerating missing keys."""
        def _float(v: Any) -> float | None:
            try:
                return float(v) if v is not None else None
            except (TypeError, ValueError):
                return None

        return cls(
            landmark_name=data.get("landmark_name") or "Unknown Location",
            local_name=data.get("local_name"),
            confidence_score=float(data.get("confidence_score") or 0.0),
            category=data.get("category") or "unknown",
            country=data.get("country"),
            city=data.get("city"),
            latitude=_float(data.get("latitude")),
            longitude=_float(data.get("longitude")),
            short_description=data.get("short_description"),
            historical_note=data.get("historical_note"),
            recognition_cues=data.get("recognition_cues"),
            search_verified=bool(data.get("search_verified", False)),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "landmark_name": self.landmark_name,
            "local_name": self.local_name,
            "confidence_score": self.confidence_score,
            "category": self.category,
            "country": self.country,
            "city": self.city,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "short_description": self.short_description,
            "historical_note": self.historical_note,
            "recognition_cues": self.recognition_cues,
            "search_verified": self.search_verified,
        }


@dataclass
class LandmarkDetectionResult:
    """Full response returned by :func:`run`."""

    landmark: LandmarkInfo
    sources: list[dict] = field(default_factory=list)
    search_queries: list[str] = field(default_factory=list)
    model_used: str = ""
    raw_text: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "landmark": self.landmark.to_dict(),
            "sources": self.sources,
            "search_queries": self.search_queries,
            "model_used": self.model_used,
            "raw_text": self.raw_text,
        }


# ─── Public API ───────────────────────────────────────────────────────────────

def run(
    base64_image: str,
    *,
    mime_type: str = "image/jpeg",
    model: str | None = None,
    extra_context: str | None = None,
) -> LandmarkDetectionResult:
    """
    Detect the landmark in *base64_image* using Gemini vision + Search.

    Parameters
    ----------
    base64_image:
        Raw base64-encoded image bytes (no ``data:image/...;base64,`` prefix).
    mime_type:
        MIME type of the image (default ``image/jpeg``).
        Supported: ``image/jpeg``, ``image/png``, ``image/webp``, ``image/heic``.
    model:
        Override the Gemini model to use.  Defaults to ``settings.default_model``.
    extra_context:
        Optional free-text hint injected into the user message, e.g.
        ``"This photo was taken in Pontianak, West Kalimantan, Indonesia."``.

    Returns
    -------
    LandmarkDetectionResult
        Structured detection result with landmark info, sources, and raw text.
    """
    resolved_model = model or settings.default_model

    # ── Build the multimodal message ──────────────────────────────────────────
    user_parts: list[types.Part] = []

    # Inject the GPS hint AFTER the detection prompt so the model first parses
    # the image visually, then uses location as a soft verification signal only.
    # The hint deliberately says this is the USER'S current location — NOT the
    # photo's location — to prevent false regional bias for gallery images.
    if extra_context:
        user_parts.append(
            types.Part(
                text=(
                    f"SOFT LOCATION CONTEXT (weak signal): {extra_context}\n"
                    "IMPORTANT: This is the user's current device location — it may"
                    " NOT be where the photo was taken (e.g. gallery photos from past"
                    " trips). Identify the landmark from what you VISUALLY see in the"
                    " image first. Use this location hint ONLY as a very weak"
                    " tiebreaker when two candidate landmarks look nearly identical."
                )
            )
        )

    user_parts.append(types.Part(text=_DETECTION_PROMPT))

    user_parts.append(
        types.Part(
            inline_data=types.Blob(
                mime_type=mime_type,
                data=base64_image,
            )
        )
    )

    contents = [
        types.Content(role="user", parts=user_parts),
    ]

    # ── Config: vision + Google Search grounding ──────────────────────────────
    config = types.GenerateContentConfig(
        system_instruction=_SYSTEM_INSTRUCTION,
        tools=[_search_tool()],    # Built-in Google Search grounding
        temperature=0.1,           # Low temperature: factual, deterministic
        max_output_tokens=1024,
    )

    # ── Call the API ──────────────────────────────────────────────────────────
    response = gemini.models.generate_content(
        model=resolved_model,
        contents=contents,
        config=config,
    )

    raw_text = response.text or ""

    # ── Extract grounding metadata ────────────────────────────────────────────
    candidate = response.candidates[0] if response.candidates else None
    grounding = candidate.grounding_metadata if candidate else None

    sources: list[dict] = []
    search_queries: list[str] = []

    if grounding:
        search_queries = list(grounding.web_search_queries or [])
        for chunk in grounding.grounding_chunks or []:
            if chunk.web:
                sources.append({"uri": chunk.web.uri, "title": chunk.web.title})

    # ── Parse structured JSON from model output ───────────────────────────────
    parsed = _parse_json(raw_text)
    landmark_info = LandmarkInfo.from_dict(parsed)

    return LandmarkDetectionResult(
        landmark=landmark_info,
        sources=sources,
        search_queries=search_queries,
        model_used=resolved_model,
        raw_text=raw_text,
    )
