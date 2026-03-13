"""
tools/chat.py
─────────────
Multi-turn conversational tool.

Wraps google_search so the agent can answer with grounding while
preserving turn history within a single API call.

This module is intentionally separate from agent.py so the FastAPI
/chat endpoint can manage history externally (persisted in Supabase).
"""

from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass, field

from google.genai import types

from config import settings
from gemini_client import gemini
from tools.landmark_db import (
    is_itinerary_request,
    get_landmarks_for_message,
    build_landmark_context_block,
    DbLandmark,
)
from tools.user_context import UserProfile, build_user_context_block
from tools.location import UserLocation, build_location_context_block

_SYSTEM_INSTRUCTION = """
You are Culbi — a sharp, warm, and hyper-local cultural guide embedded in the Cultural Bridge app.
You are the ultimate insider for the entire ASEAN region.
## PERSONALITY
- Confident, curious, concise. Never stiff or corporate.
- Enthusiastic about local food, traditions, and off-the-beaten-path spots.
- Occasionally drop a local word or fun cultural fact — but only when natural.
- You enjoy a light joke or playful reply when the mood calls for it.
- You never start a reply with "Great question!", "Certainly!", "Of course!", \
  "Absolutely!", or any hollow filler phrase.

## VISION & IMAGE ANALYSIS
You CAN see and analyse photos sent by the user. When an image is shared:
- Identify landmarks, food dishes, cultural objects, street scenes, or natural sites.
- Describe what you see with specific, expert detail relevant to Southeast Asian culture.
- If it's a landmark: name it, give a brief history, and share a local tip.
- If it's food: name the dish, describe it, and recommend where to find the best version.
- If it's a cultural artefact or festival scene: explain the cultural significance.
- NEVER say "I can't see images" or "I'm just a text AI" — you ARE multimodal.

## LOCATION AWARENESS
When the user shares GPS coordinates (see USER CURRENT LOCATION section if present):
- You know exactly where they are and can give precise "near me" recommendations.
- Reference real, specific nearby places — use Google Search to find them.
- Give rough distance estimates (e.g. "~2 km from you").
- NEVER say "I don't have access to your location" — when coordinates are injected, you DO.

## RESPONSE LENGTH — this is NON-NEGOTIABLE
Match the user's message length and energy. The shorter their message, the shorter your reply.

| User input type                              | Your reply                              |
|----------------------------------------------|-----------------------------------------|
| Greeting / "hi" / "hello" / "hey"            | 1 friendly sentence, max                |
| Acknowledgement ("ok", "thanks", "cool")     | 1 sentence or fewer                     |
| Short casual question (< 10 words)           | 1–2 sentences                           |
| Specific factual question                    | 2–3 sentences, facts only               |
| Multi-day itinerary / full trip plan request | Full plan — use the ITINERARY FORMAT below |
| Detailed multi-part question                 | Match depth, but no filler paragraphs   |

**Never pad.** If you can answer in one sentence, use one sentence. \
Do not add closing remarks like "Feel free to ask more!" or "I hope this helps!" \
unless the user just asked a long, complex question.

## TOOLS (use them actively)
- **Google Search** is always enabled. Use it proactively to fetch current operational \
  hours, prices, seasonal events, recent reviews, and travel advisories. \
  Always cite sources for factual claims that change over time (e.g. opening hours, entry fees).
- Use Search to verify: current attraction status (open/closed), public holiday schedules, \
  popular food stall locations, festival dates, and transportation options.
- When recommending a restaurant or food stall, Search for its current address and hours \
  before recommending it — places move or close.

## PRE-FLIGHT for ITINERARY REQUESTS
Before you generate ANY multi-day itinerary you **MUST** know:
1. The **destination** (you often already have it from the message).
2. The **departure / travel start date** — a specific date like "March 15" or "next Monday". \
   Relative dates like "this weekend" are fine if today's date is known.

If the user has **NOT** given a travel start date, respond with a **single short question** only:
> "When are you planning to start your trip? I just need the date so I can build your itinerary!"
Do **not** generate the itinerary until you have a confirmed date. \
Exception: if the user explicitly says "I don't care about dates" — use today as Day 1.

## ITINERARY FORMAT — use this EXACT format for any multi-day trip plan
Once you have the destination AND departure date, output ALL days using this structure \
(do NOT truncate or summarise):

**Day 1 (Month DD, YYYY): <Day Title>**
* **<Exact Landmark Name>** — short description
* **<Exact Landmark Name>** — short description
* **Food nearby:** <specific named dish + restaurant recommendation>

**Day 2 (Month DD, YYYY): <Day Title>**
* …

Rules:
- Always use exactly `**Day N (Month DD, YYYY): Title**` for every heading. \
  Derive the date from the user's stated departure date.
- Every landmark or attraction bullet MUST start with `* **Exact Place Name**` in bold. \
  NEVER write a full sentence as a bullet. The bold name comes FIRST, then ` — ` then 1-line description.
- Use the REAL, SPECIFIC name of the place — never generic labels like "local market", \
  "the temple", "nearby waterfall". Always name it specifically.
- Pull names from well-known landmarks in the destination region whenever possible.
- Always include a `**Food nearby:**` bullet for each day with a named restaurant/stall.
- Include ALL days requested — never stop early or say "and so on".
- 2–4 activity bullets per day is ideal.
- Keep each bullet to 1 line.
- No intro paragraph before Day 1 beyond a single sentence hook.
- No closing paragraph after the last day.

## ACCURACY
- Be factual. If unsure, say so briefly — "I'm not 100% sure, but…"
- Cite sources when Google Search is used.
- Respond in the same language the user writes in.
- Do not speculate about prices, hours, or availability — note these change.

## LOCATION TAG
When your response is about a single specific mappable place (restaurant, landmark, \
market) — NOT a city or region — append ONE tag at the very end on its own line:
[LOC:{"lat":<latitude>,"lng":<longitude>,"address":"<Place Name, City, Country>"}]

Rules:
- Up to 6 decimal places for coordinates.
- Only when you are confident in the coordinates.
- Never for vague references, cities, or regions.
- Must be the absolute last thing in your response.
- Never add a LOC tag to itinerary responses.
"""

# Matches [LOC:{...}] at the end of a response (greedy-safe, handles newlines)
_LOC_RE = re.compile(r'\[LOC:(\{[^}]+\})\]\s*$', re.MULTILINE)

# ── TRIP EDIT MODE INSTRUCTION ─────────────────────────────────────────────────
# Appended to _SYSTEM_INSTRUCTION when trip_edit_mode=True
_TRIP_EDIT_INSTRUCTION = """
══════════════════════════════════════════════════════════════════════════════
🛠️  TRIP EDIT MODE — RETURN FULL UPDATED ITINERARY
══════════════════════════════════════════════════════════════════════════════

You are helping the user MODIFY an EXISTING trip. The CURRENT ITINERARY is \
provided below in the "CURRENT TRIP TO EDIT" section.

## OUTPUT FORMAT FOR EDITS
When the user asks to edit their trip, you MUST return the COMPLETE UPDATED ITINERARY \
using the standard ITINERARY FORMAT (with Day 1, Day 2, etc.).

**Start with a 1-2 sentence summary of what you changed**, then output the FULL itinerary.

Example:
> I've added Prambanan Temple to Day 2 and removed Malioboro Street from Day 3.
>
> **Day 1 (March 5, 2026): Arrival**
> * **Borobudur Temple** — UNESCO World Heritage Buddhist monument
> * **Food nearby:** Gudeg Yu Djum
>
> **Day 2 (March 6, 2026): Cultural Sites**
> * **Prambanan Temple** — Hindu temple complex (NEW)
> * **Taman Sari** — Water Castle palace
> ...

## RULES FOR EDITING
1. **ALWAYS output the COMPLETE trip** — all days, all stops, even unchanged ones.
2. **Use the exact ITINERARY FORMAT** — this allows the frontend to parse it.
3. **Preserve the original start date** unless the user explicitly asks to change it.
4. **Include ALL stops** — don't skip unchanged days or stops.
5. **Add brief inline notes** like (NEW), (REMOVED), or (MOVED) to highlight changes.
6. **Use SEARCH** to verify places when adding new stops.
7. **Consider cultural etiquette** — when suggesting new landmarks, mention if they have \
   specific dress codes, photography restrictions, or cultural rules. Use the VERIFIED \
   LANDMARKS DATABASE section which includes [Mandatory], [Recommended], and [Pro-Tip] \
   cultural etiquette guidelines for each place.

## EDIT TYPES
- **Add stop:** Insert it at the requested day/position. Mention (NEW).
- **Remove stop:** Don't include it. Mention what was removed in the summary.
- **Replace stop:** Swap one for another. Mention (REPLACED).
- **Reorder:** Change the sequence. Mention (MOVED).
- **Reorganize dates:** If stops have no dates, assign them to days.

## WHEN TO ASK FOR CLARIFICATION
If the request is ambiguous, ask ONE short question:
- "Which day should I add Borobudur to?"
- "Remove which stop — the market or the temple?"

Otherwise, make a reasonable decision and output the full updated itinerary.

═════════════════════════════════════════════════════════════════════════════
"""


def _format_trip_context(trip_data: dict) -> str:
    """Render trip_data as a readable block for the Gemini system instruction."""
    lines = [
        "══════════════════════════════════════════════════════════════════════════════",
        "📋  CURRENT TRIP TO EDIT",
        "══════════════════════════════════════════════════════════════════════════════",
    ]
    trip_name = trip_data.get("trip_name") or "Unknown Trip"
    lines.append(f"Trip Name: {trip_name}")

    stops: list[dict] = trip_data.get("stops") or []
    if not stops:
        lines.append("(No stops yet — this is a new/empty trip)")
    else:
        # Group by scheduled_date to reconstruct days; fall back to stop_order
        by_date: dict[str, list[str]] = {}
        unscheduled: list[str] = []
        for stop in sorted(stops, key=lambda s: s.get("stop_order", 0)):
            name = (
                stop.get("custom_name")
                or stop.get("name")
                or f"Stop #{stop.get('stop_order', '?')}"
            )
            date = stop.get("scheduled_date")
            if date:
                by_date.setdefault(date, []).append(name)
            else:
                unscheduled.append(name)

        if by_date:
            lines.append("\nScheduled stops by date:")
            for date in sorted(by_date.keys()):
                lines.append(f"  {date}:")
                for name in by_date[date]:
                    lines.append(f"    - {name}")
            if unscheduled:
                lines.append("  (unscheduled):")
                for name in unscheduled:
                    lines.append(f"    - {name}")
        else:
            lines.append("\nCurrent stops (no dates assigned yet):")
            for i, name in enumerate(unscheduled, 1):
                lines.append(f"  {i}. {name}")

    lines.append("══════════════════════════════════════════════════════════════════════════════")
    return "\n".join(lines)


@dataclass
class ChatTurn:
    role: str    # 'user' | 'model'
    content: str


@dataclass
class ChatResponse:
    text: str
    sources: list[dict] = field(default_factory=list)
    search_queries: list[str] = field(default_factory=list)
    tool_used: str | None = None
    location: dict | None = None  # {lat, lng, address} when bot mentions a specific place
    # DB landmarks used to build the itinerary context (serialised DbLandmark list)
    landmark_context: list[dict] = field(default_factory=list)


def _extract_location(text: str) -> tuple[str, dict | None]:
    """
    Find and remove a trailing [LOC:{...}] tag from text.
    Returns (clean_text, location_dict | None).
    """
    match = _LOC_RE.search(text)
    if not match:
        return text.strip(), None
    try:
        raw = match.group(1)
        loc = json.loads(raw)
        # Normalise keys: accept both lat/lng and latitude/longitude
        latitude  = loc.get('lat') or loc.get('latitude')
        longitude = loc.get('lng') or loc.get('longitude')
        address   = loc.get('address')
        if latitude is None or longitude is None:
            return text.strip(), None
        clean = _LOC_RE.sub('', text).strip()
        return clean, {'latitude': float(latitude), 'longitude': float(longitude), 'address': address}
    except (json.JSONDecodeError, ValueError):
        return text.strip(), None


def build_contents(
    history: list[ChatTurn],
    latest_user_message: str,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
    vision_annotation: str | None = None,
) -> list[types.Content]:
    """Convert stored turn history + new message into Gemini Content objects.

    When `image_bytes` is supplied, the latest user turn is multimodal:
    the image is prepended as the first Part so Gemini sees it before the text.

    When `vision_annotation` is supplied (e.g. from the landmark-detection
    pre-processing stage), it is injected as the very first text Part so
    Gemini has a reliable text description before it looks at the image —
    this improves recognition accuracy significantly.
    """
    contents: list[types.Content] = []

    for turn in history:
        contents.append(
            types.Content(
                role=turn.role,
                parts=[types.Part(text=turn.content)],
            )
        )

    # Build latest user parts — multimodal when an image is attached
    user_parts: list[types.Part] = []
    # Inject the vision pre-analysis FIRST so Gemini reads it before the image
    if vision_annotation:
        user_parts.append(types.Part(text=vision_annotation))
    if image_bytes:
        # Use explicit inline_data blob — more reliable than from_bytes
        # across different SDK patch versions
        user_parts.append(
            types.Part(
                inline_data=types.Blob(data=image_bytes, mime_type=image_mime)
            )
        )
    user_parts.append(types.Part(text=latest_user_message))

    contents.append(
        types.Content(
            role="user",
            parts=user_parts,
        )
    )
    return contents


def chat(
    message: str,
    history: list[ChatTurn] | None = None,
    *,
    model: str | None = None,
    use_search: bool = True,
    user_profile: UserProfile | None = None,
    image_base64: str | None = None,
    image_mime: str = "image/jpeg",
    user_location: UserLocation | None = None,
    landmark_hint: str | None = None,
    trip_edit_mode: bool = False,
    trip_data: dict | None = None,
) -> ChatResponse:
    """
    Extra parameters
    ----------------
    image_base64:
        Raw base64-encoded image bytes (NO data-URI prefix).  When supplied,
        the image is included as the first Part of the latest user turn so
        Gemini can visually understand the attached photo.
    image_mime:
        MIME type of the attached image (default: image/jpeg).
    user_location:
        GPS coordinates forwarded from the frontend (user must have consented).
        Used to inject a location context block into the system instruction.
    Note
    ----
    Google Search grounding is automatically disabled when an image is attached.
    Multimodal vision and live grounding cannot be active in the same request.
    The model's native image-understanding is sufficient for photo questions.
    """
    tools: list[types.Tool] = []
    tool_used: str | None = None

    # Important: Google Search grounding must be disabled for multimodal requests.
    # Including both an inline image AND a google_search tool in the same call
    # causes the API to silently strip the image or return a grounding-only response.
    # Vision-capable models (gemini-2.5-flash, etc.) can analyse photos natively.
    has_image = bool(image_base64)
    if use_search and not has_image:
        tools.append(types.Tool(google_search=types.GoogleSearch()))
        tool_used = "google_search"

    # ── Decode image bytes (if provided) ─────────────────────────────────────
    image_bytes: bytes | None = None
    if image_base64:
        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception:
            image_bytes = None  # silently ignore malformed base64

    # ── User context injection ─────────────────────────────────────────────────
    # Prepend personalisation block (name, home region) so Culbi can address
    # the user naturally.  Empty string when profile has no useful data.
    user_ctx_block = build_user_context_block(user_profile)

    # ── Location context injection ─────────────────────────────────────────────
    location_ctx_block = build_location_context_block(user_location)

    # ── Landmark DB context injection ─────────────────────────────────────────
    # For itinerary requests AND trip edit mode: fetch verified landmark data so
    # Gemini uses real names and can embed [DB:uuid] tags.
    landmark_context_data: list[dict] = []
    effective_system = _SYSTEM_INSTRUCTION

    if trip_edit_mode or is_itinerary_request(message, history):
        region, landmarks = get_landmarks_for_message(message, history)
        if landmarks:
            context_block = build_landmark_context_block(region, landmarks)
            effective_system = _SYSTEM_INSTRUCTION + context_block
            landmark_context_data = [
                {
                    "id":              lm.id,
                    "name":            lm.name,
                    "category":        lm.category,
                    "region":          lm.region,
                    "image_url":       lm.image_url,
                    "photo_reference": lm.photo_reference,
                    "latitude":        lm.latitude,
                    "longitude":       lm.longitude,
                }
                for lm in landmarks
            ]

    # ── Trip Edit Mode instruction injection ──────────────────────────────────
    # Always appended AFTER landmark context so it is never overwritten.
    # Also injects the current trip stops so Gemini knows the existing state.
    if trip_edit_mode:
        effective_system = effective_system + "\n\n" + _TRIP_EDIT_INSTRUCTION
        if trip_data:
            effective_system = effective_system + "\n\n" + _format_trip_context(trip_data)

    # Prepend user context block (always — safe even when empty string)
    if user_ctx_block:
        effective_system = user_ctx_block + effective_system

    # Prepend location context block when coordinates were provided
    if location_ctx_block:
        effective_system = location_ctx_block + effective_system

    contents = build_contents(
        history or [],
        message,
        image_bytes=image_bytes,
        image_mime=image_mime,
        vision_annotation=landmark_hint,
    )

    response = gemini.models.generate_content(
        model=model or settings.default_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=effective_system,
            tools=tools or None,
            temperature=0.7,        # focused but not robotic
            top_p=0.9,
            max_output_tokens=8192, # high cap — itineraries need room; system prompt controls verbosity
        ),
    )

    candidate = response.candidates[0]
    grounding = getattr(candidate, "grounding_metadata", None)

    sources: list[dict] = []
    search_queries: list[str] = []

    if grounding:
        search_queries = list(grounding.web_search_queries or [])
        for chunk in grounding.grounding_chunks or []:
            if chunk.web:
                sources.append({"uri": chunk.web.uri, "title": chunk.web.title})

    if not sources:
        tool_used = None  # Search was enabled but not actually used

    clean_text, location = _extract_location(response.text or '')

    return ChatResponse(
        text=clean_text,
        sources=sources,
        search_queries=search_queries,
        tool_used=tool_used,
        location=location,
        landmark_context=landmark_context_data,
    )
