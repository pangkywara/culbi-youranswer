"""
tools/location.py
─────────────────
Builds a GPS-location context block that is injected into Culbi's system
instruction when the user has consented to share their phone location.

The frontend (React Native / expo-location) requests system-level permission
from the user, then sends the coordinates with each /chat request.  This
module converts those coordinates into a concise Markdown block so Culbi can
answer "what's near me?" style questions with precision.

Privacy
───────
• Coordinates are only ever used within the scope of a single request —
  they are NOT stored by this backend.
• The caller must ensure the user has granted location permission before
  forwarding coordinates.

Usage
─────
    from tools.location import UserLocation, build_location_context_block

    loc   = UserLocation(latitude=0.9619, longitude=109.4222, city="Pontianak")
    block = build_location_context_block(loc)
    system_instruction = block + BASE_SYSTEM_INSTRUCTION
"""

from __future__ import annotations

from dataclasses import dataclass


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class UserLocation:
    """GPS coordinates forwarded by the frontend (with user consent)."""
    latitude:     float
    longitude:    float
    city:         str | None = None   # Optional city hint from device reverse-geocode
    captured_at:  str | None = None   # ISO 8601 timestamp of when the GPS fix was taken


# ─── Public context builder ───────────────────────────────────────────────────

def build_location_context_block(location: UserLocation | None) -> str:
    """
    Return a Markdown block to inject into Culbi's system instruction.

    Returns an empty string when location is None (user denied permission
    or the frontend did not include coordinates) so the caller can always
    safely concatenate without branching.
    """
    if not location:
        return ""

    # Sanity-check coordinate ranges
    if not (-90.0 <= location.latitude <= 90.0):
        return ""
    if not (-180.0 <= location.longitude <= 180.0):
        return ""

    lines: list[str] = [
        "",
        "## USER CURRENT LOCATION",
        "The user has **consented** to share their GPS location for this request.",
        "Use this context to give hyper-local recommendations and distance estimates.",
        "",
        f"- **Latitude / Longitude**: {location.latitude:.6f}, {location.longitude:.6f}",
    ]

    if location.city and location.city.strip():
        lines.append(
            f"- **City (device hint)**: {location.city.strip()}"
            " — use this as a starting point, but verify with Google Search if needed."
        )

    # Inject timestamp so Culbi can reason about freshness / movement
    if location.captured_at and location.captured_at.strip():
        lines.append(f"- **Location captured at**: {location.captured_at.strip()} (device local time, ISO 8601)")
        lines += [
            "",
            "Timing notes:",
            "- If this timestamp is less than ~5 minutes old, treat the location as current.",
            "- If it is older (5–30 min), the user may have moved; add a brief caveat like",
            "  'based on your location a short while ago'.",
            "- If older than 30 minutes, gently suggest they refresh their location for",
            "  the most accurate 'near me' recommendations.",
            "- You can infer the user might be on the move if they are asking transit or",
            "  navigation questions alongside a recent timestamp.",
        ]

    lines += [
        "",
        "Behaviour rules when location is available:",
        "1. When the user asks 'near me', 'nearby', 'around here', or 'what's close',",
        "   use the coordinates above with Google Search to find relevant places.",
        "2. You may silently reverse-geocode the coordinates via Search to identify the",
        "   exact neighbourhood, city, or region before answering.",
        "3. Include rough distance estimates when recommending places (e.g. '~3 km away').",
        "4. Never expose the raw coordinates directly in your reply unless the user asks.",
        "5. If you are uncertain about a place's distance, say 'roughly X km' rather than",
        "   giving a precise figure — precision is less important than honesty.",
    ]

    return "\n".join(lines)
