"""
tools/trip_concierge.py
────────────────────────
Culbi AI Concierge — turns natural-language trip requests into a structured
PROPOSE_CHANGES JSON the frontend can render as "ghost" additions before the
user accepts or discards.

Workflow
────────
1. Caller passes the full trip (stops, dates) + the user's message.
2. This tool builds a context-rich prompt and calls Gemini.
3. Gemini returns EITHER:
   a) action_type:"PROPOSE_CHANGES" with a structured change-set, OR
   b) action_type:"CHAT" for informational / conversational replies.
4. If PROPOSE_CHANGES, the raw JSON is stored in `trip_proposals` (Supabase).
5. Returns a typed ConciergeResponse to the FastAPI layer.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

import httpx

from config import settings
from gemini_client import gemini
from google.genai import types

logger = logging.getLogger(__name__)

# ─── Regex — extract ```json ... ``` fenced block or bare { ... } ─────────────
_JSON_FENCE_RE = re.compile(r"```json\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)
_JSON_BARE_RE  = re.compile(r"(\{.*\})", re.DOTALL)


# ─── Return types ─────────────────────────────────────────────────────────────

@dataclass
class ProposedStop:
    date: str
    stop_order: int
    landmark: dict[str, Any]


@dataclass
class ChangeSet:
    additions: list[dict[str, Any]] = field(default_factory=list)
    reorders:  list[dict[str, Any]] = field(default_factory=list)
    deletions: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ConciergeResponse:
    action_type: str          # "PROPOSE_CHANGES" | "CHAT"
    summary:     str          # Human-readable explanation
    changes:     ChangeSet    # Empty for CHAT action_type
    proposal_id: str | None = None   # Supabase row id (set when stored)


# ─── System instruction ───────────────────────────────────────────────────────

_CONCIERGE_SYSTEM = """
You are Culbi, an AI travel concierge embedded inside a trip-planning app.
You have been given the user's current trip itinerary as JSON context.

─── Your two modes ───────────────────────────────────────────────────────────

MODE A — PROPOSE_CHANGES
  When the user asks you to modify, optimize, add to, or rearrange their trip,
  respond ONLY with a JSON object (no markdown prose) in this exact schema:

  {
    "action_type": "PROPOSE_CHANGES",
    "summary": "<one-sentence human-readable explanation of what you changed and why>",
    "changes": {
      "additions": [
        {
          "date": "YYYY-MM-DD",
          "stop_order": <integer>,
          "landmark": {
            "name": "<Place name>",
            "thumbnail_url": "<https://... or empty string>",
            "description": "<1–2 sentences about why this place is worth visiting>",
            "latitude": <float or null>,
            "longitude": <float or null>,
            "rarity_weight": <0.0–1.0 float>
          }
        }
      ],
      "reorders": [
        { "stop_id": "<existing stop_order as string>", "new_date": "YYYY-MM-DD", "new_order": <int> }
      ],
      "deletions": [
        { "stop_id": "<existing stop_order as string>" }
      ]
    }
  }

  Rules:
  - stop_order integers must not clash with existing ones unless reording adjusts them.
  - All dates must be ISO-8601 (YYYY-MM-DD).
  - Keep additions ≤ 5 per response; keep the list focused and realistic.
  - Do NOT add prose outside the JSON object in this mode.

MODE B — CHAT
  For questions, conflict warnings, or general info (no itinerary change needed):

  {
    "action_type": "CHAT",
    "summary": "<your conversational reply>",
    "changes": { "additions": [], "reorders": [], "deletions": [] }
  }

  Keep CHAT replies concise and warm — match the Culbi personality.

─── Culbi personality ────────────────────────────────────────────────────────
- Sharp, warm, hyper-local ASEAN cultural guide.
- Never hollow openers ("Great question!", "Certainly!").
- Occasionally drops a local word or cultural fact when natural.
- When a place is closed on the requested date, WARN the user in summary and
  suggest an alternative (add it to additions instead).

─── Conflict detection ───────────────────────────────────────────────────────
Before proposing, check:
1. Duplicate time slots: if two stops share the same date AND close stop_orders
   with no travel buffer, mention it in summary.
2. Closed days: if you know a place is closed on a public holiday or specific
   weekday, warn in summary and substitute.
"""


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _format_stops_for_prompt(stops: list[dict]) -> str:
    """Render the current stops as a readable numbered list for the prompt."""
    if not stops:
        return "  (no stops yet)"
    lines = []
    for s in sorted(stops, key=lambda x: (x.get("date", ""), x.get("stop_order", 0))):
        name  = s.get("landmark", {}).get("name", "Unknown")
        date  = s.get("date") or "no date"
        order = s.get("stop_order", "?")
        lines.append(f"  [{order}] {name} — {date}")
    return "\n".join(lines)


def _extract_json(text: str) -> dict | None:
    """Try to pull a JSON object out of Gemini's raw text response."""
    # 1. Fenced block first
    m = _JSON_FENCE_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 2. Bare JSON anywhere in the string
    m = _JSON_BARE_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return None


def _store_proposal(
    user_id: str,
    trip_id: str,
    summary: str,
    changes: dict,
    prev_stops: list,
) -> str | None:
    """
    INSERT a row into trip_proposals via Supabase REST API using the
    service-role key (bypasses RLS so the backend can write for any user).

    Returns the new row's UUID, or None if Supabase is not configured.
    """
    url = settings.supabase_url
    key = settings.supabase_service_role_key
    if not url or not key:
        logger.warning("Supabase not configured — proposal NOT persisted.")
        return None

    endpoint = f"{url}/rest/v1/trip_proposals"
    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }
    payload = {
        "user_id":    user_id,
        "trip_id":    trip_id,
        "summary":    summary,
        "changes":    changes,
        "prev_stops": prev_stops,
        "status":     "pending",
    }
    try:
        r = httpx.post(endpoint, json=payload, headers=headers, timeout=8)
        r.raise_for_status()
        rows = r.json()
        if rows and isinstance(rows, list):
            return rows[0].get("id")
    except Exception as exc:
        logger.error("Failed to store proposal in Supabase: %s", exc)
    return None


# ─── Main function ────────────────────────────────────────────────────────────

def run_concierge(
    *,
    message:  str,
    trip_id:  str,
    trip_name: str,
    stops:    list[dict],
    user_id:  str,
    history:  list[dict] | None = None,
    model:    str | None = None,
) -> ConciergeResponse:
    """
    Core concierge logic.

    Parameters
    ----------
    message   : Latest user message.
    trip_id   : Local trip ID (used to key the Supabase row).
    trip_name : Human-readable trip name for context.
    stops     : Current list of TripStop dicts (from TripContext).
    user_id   : auth.uid() passed from the frontend — ensures RLS identity lock.
    history   : Prior conversation turns [{"role": "user"|"model", "content": str}].
    model     : Optional Gemini model override.
    """
    stops_text = _format_stops_for_prompt(stops)
    trip_context = (
        f"TRIP: {trip_name}\n"
        f"CURRENT STOPS:\n{stops_text}\n"
    )

    user_prompt = (
        f"{trip_context}\n"
        f"USER REQUEST: {message}\n\n"
        "Respond with a JSON object following the schema in your instructions."
    )

    # Build conversation contents
    contents: list[types.Content] = []
    for turn in (history or []):
        contents.append(types.Content(
            role=turn["role"],
            parts=[types.Part(text=turn["content"])],
        ))
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=user_prompt)],
    ))

    response = gemini.models.generate_content(
        model=model or settings.default_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=_CONCIERGE_SYSTEM,
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.4,        # lower = more consistent JSON
            top_p=0.9,
            max_output_tokens=2048,
        ),
    )

    raw_text = response.text or ""
    parsed   = _extract_json(raw_text)

    # Fallback: treat whole text as a CHAT reply if JSON extraction failed
    if not parsed or "action_type" not in parsed:
        return ConciergeResponse(
            action_type="CHAT",
            summary=raw_text.strip(),
            changes=ChangeSet(),
        )

    action_type = parsed.get("action_type", "CHAT")
    summary     = parsed.get("summary", "")
    raw_changes = parsed.get("changes", {})

    change_set = ChangeSet(
        additions=raw_changes.get("additions", []),
        reorders= raw_changes.get("reorders",  []),
        deletions=raw_changes.get("deletions", []),
    )

    proposal_id: str | None = None

    if action_type == "PROPOSE_CHANGES" and (
        change_set.additions or change_set.reorders or change_set.deletions
    ):
        proposal_id = _store_proposal(
            user_id=user_id,
            trip_id=trip_id,
            summary=summary,
            changes=raw_changes,
            prev_stops=stops,
        )

    return ConciergeResponse(
        action_type=action_type,
        summary=summary,
        changes=change_set,
        proposal_id=proposal_id,
    )
