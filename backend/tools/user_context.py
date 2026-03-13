"""
tools/user_context.py
─────────────────────
Builds a personalised user-context block that is prepended to the Gemini
system instruction so Culbi can address the user by name, tailor local tips
to their home region, and surface relevant cultural context.

This module is intentionally side-effect-free: it only builds strings from
data that the caller (chat.py) provides — no Supabase or network calls happen
here.  All external data is fetched by the caller (main.py → ChatRequest) and
forwarded as a `UserProfile` dataclass.

Hierarchy
─────────
  main.py  (parent – FastAPI routes)
  └── tools/chat.py        (orchestrates one chat turn)
       ├── tools/user_context.py  ← you are here
       └── tools/landmark_db.py
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class UserProfile:
    """Lightweight user context forwarded by the frontend on every request."""
    user_id: str | None = None
    name:    str | None = None
    region:  str | None = None


# ─── Public builder ───────────────────────────────────────────────────────────

def build_user_context_block(profile: UserProfile | None) -> str:
    """
    Return a Markdown block to prepend to the Gemini system instruction.

    The block is empty when `profile` is None or has no useful fields,
    so the caller can always safely concatenate it without branching.

    The injected block tells Culbi:
    - The user's display name (use first name naturally, not every turn)
    - The user's home region (use for comparisons / local tips when relevant)
    """
    if not profile:
        return ""

    has_name   = bool(profile.name   and profile.name.strip())
    has_region = bool(profile.region and profile.region.strip())

    if not has_name and not has_region:
        return ""

    lines: list[str] = [
        "",
        "## USER PROFILE",
        "This is private context about the person you are talking to.",
        "Use it subtly to personalise your replies — never expose raw field names.",
        "",
    ]

    if has_name:
        first_name = profile.name.strip().split()[0]  # type: ignore[union-attr]
        lines.append(
            f"- **Name**: {profile.name.strip()}"
            f" — you may address them as '{first_name}' once in a while when it feels natural,"
            f" but do NOT open every reply with their name."
        )

    if has_region:
        lines.append(
            f"- **Home region**: {profile.region.strip()}"
            " — reference their home region when making comparisons or giving tips"
            " (e.g. 'compared to Kuala Lumpur, Kuching is …')."
            " Skip this if irrelevant to the question."
        )

    lines.append(
        "- Never mention that you were given a 'user profile' or 'context block'."
        "  Simply use the information as if you already knew it."
    )
    lines.append("")

    return "\n".join(lines)
