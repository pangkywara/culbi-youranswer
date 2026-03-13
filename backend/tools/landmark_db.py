"""
tools/landmark_db.py
────────────────────
Fetches verified landmark data from the Supabase `landmarks` table and
injects it into Gemini's system instruction so the AI produces itineraries
that reference real DB records by exact name and UUID.

Flow
────
1. `is_itinerary_request(message)` — quick heuristic to skip the DB hit for
   casual queries (greetings, factual questions, etc.).
2. `get_landmarks_for_message(message, history)` — detects the destination
   region from keywords in the message (or recent history), then queries
   Supabase via the service-role key (bypasses RLS).
3. `build_landmark_context_block(region, landmarks)` — formats the results
   as a structured Markdown block that is appended to the system instruction.
   Each entry carries `[DB:{uuid}]` so Gemini can annotate its bullets.

The frontend (parseItinerary) strips `[DB:{uuid}]` tags from display text and
stores the UUID in `ItineraryStop.landmark_id` for persistence in trip_stops.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache

from supabase import create_client, Client

from config import settings


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class DbLandmark:
    id: str
    name: str
    category: str
    region: str
    image_url: str | None
    photo_reference: str | None = None  # legacy Google Places photo_reference from landmark_photos
    latitude: float | None = None      # extracted from PostGIS coords column
    longitude: float | None = None     # extracted from PostGIS coords column
    cultural_rules: tuple[tuple[str, str], ...] = ()  # (title, severity) pairs


# ─── Region keyword map ───────────────────────────────────────────────────────
# Maps lowercase tokens that may appear in user messages → DB `region` value.
# Longest-match wins so "kota kinabalu" beats "kinabalu".

_REGION_KEYWORDS: dict[str, str] = {
    # Sarawak / Kuching
    "sarawak":          "Sarawak",
    "kuching":          "Sarawak",
    "mulu":             "Sarawak",
    "bako":             "Sarawak",
    "semenggoh":        "Sarawak",
    "batang ai":        "Sarawak",
    "sibu":             "Sarawak",
    "miri":             "Sarawak",
    "damai":            "Sarawak",
    "annah rais":       "Sarawak",
    # Sabah
    "sabah":            "Sabah",
    "kota kinabalu":    "Sabah",
    "kinabalu":         "Sabah",
    "sandakan":         "Sabah",
    "semporna":         "Sabah",
    "tawau":            "Sabah",
    "lahad datu":       "Sabah",
    # West Kalimantan
    "pontianak":        "West Kalimantan",
    "west kalimantan":  "West Kalimantan",
    "kalimantan barat": "West Kalimantan",
    "kalbar":           "West Kalimantan",
    # East Kalimantan
    "east kalimantan":  "East Kalimantan",
    "kalimantan timur": "East Kalimantan",
    # Singapore
    "singapore":        "Singapore",
    "sentosa":          "Singapore",
    "marina bay":       "Singapore",
    "chinatown":        "Singapore",
    "little india":     "Singapore",
    # Bali
    "bali":             "Bali",
    "ubud":             "Bali",
    "seminyak":         "Bali",
    "kuta":             "Bali",
    "tanah lot":        "Bali",
    # Lombok
    "lombok":           "Lombok",
    # Java / Yogyakarta
    "java":             "Java",
    "yogyakarta":       "Java",
    "jogja":            "Java",
    "borobudur":        "Java",
    # Thailand (general)
    "thailand":         "Thailand",
    # Bangkok
    "bangkok":          "Bangkok",
    "grand palace":     "Bangkok",
    # Chiang Mai
    "chiang mai":       "Chiang Mai",
    # Phuket
    "phuket":           "Phuket",
    # Cambodia
    "cambodia":         "Cambodia",
    "siem reap":        "Cambodia",
    "phnom penh":       "Cambodia",
    "angkor":           "Cambodia",
    "angkor wat":       "Cambodia",
    # Vietnam
    "vietnam":          "Vietnam",
    "ho chi minh":      "Vietnam",
    "hanoi":            "Vietnam",
    "hoi an":           "Vietnam",
    "hue":              "Vietnam",
    "da nang":          "Vietnam",
    "halong":           "Vietnam",
    "ha long":          "Vietnam",
    # Philippines
    "philippines":      "Philippines",
    "manila":           "Philippines",
    "boracay":          "Philippines",
    "palawan":          "Philippines",
    # Malaysia (general / peninsular)
    "malaysia":         "Malaysia",
    "penang":           "Penang",
    "melaka":           "Melaka",
    "malacca":          "Melaka",
    "langkawi":         "Langkawi",
    "kuala lumpur":     "Kuala Lumpur",
    " kl ":             "Kuala Lumpur",
    # Myanmar
    "myanmar":          "Myanmar",
    "bagan":            "Myanmar",
    "yangon":           "Myanmar",
    "mandalay":         "Myanmar",
    # Laos
    "laos":             "Laos",
    "luang prabang":    "Laos",
    "vientiane":        "Laos",
    # Brunei
    "brunei":           "Brunei",
    "bandar seri":      "Brunei",
}

# Keywords that indicate the user wants a multi-day trip plan / itinerary
_ITINERARY_PATTERNS = re.compile(
    r'\b(?:'
    r'itinerary|trip\s*plans?|travel\s+plan|day[\s-]+by[\s-]+day'
    r'|(\d+)\s*days?\s+(?:in|to|at|around)'
    r'|plan\s+(?:a|my|our|the)?\s*trips?'
    r'|trips?\s+plan(?:ning)?'
    r'|make\s+(?:a|my|me)?\s*(?:a\s+)?(?:plan|trips?|itinerary)'
    r'|recommend\s+places|visit\s+(?:for|over)\s+\d+'
    r'|schedule\s+(?:for|my|a)'
    r'|what\s+to\s+do\s+(?:for|in)\s+\d+'
    r')\b',
    re.IGNORECASE,
)

# Detects a follow-up that supplies the departure date after the bot asked for it.
_DATE_REPLY_PATTERN = re.compile(
    r'\b(?:start(?:ing)?|depart|from|begin|going)\b.*\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/\d{1,2}|\d{4})\b',
    re.IGNORECASE,
)

# Bot's typical "when are you starting?" reply text
_BOT_ASKED_FOR_DATE = re.compile(
    r'when\s+are\s+you\s+(?:planning|going)|date\s+so\s+I\s+can\s+build|what\s+date|departure\s+date',
    re.IGNORECASE,
)


# ─── Public helpers ────────────────────────────────────────────────────────────

def is_itinerary_request(message: str, history: list | None = None) -> bool:
    """Return True when the message looks like a trip-planning request.

    Also returns True when the user is replying to the bot's "when are you
    starting?" question with a date — this is still part of the itinerary
    flow and we need landmark context injected for the generation turn.
    """
    if _ITINERARY_PATTERNS.search(message):
        return True
    # Also catch: bare "N days" anywhere in the message
    if re.search(r'\b\d+\s*-?\s*days?\b', message, re.IGNORECASE):
        return True
    # If history shows the bot just asked for a date and this message contains
    # date-like tokens, treat it as the itinerary trigger turn.
    if history and len(history) >= 2:
        last_bot = None
        for turn in reversed(history[-4:]):
            content = getattr(turn, 'content', '') or ''
            role = getattr(turn, 'role', '') or ''
            if role == 'model':
                last_bot = content
                break
        if last_bot and _BOT_ASKED_FOR_DATE.search(last_bot):
            if _DATE_REPLY_PATTERN.search(message):
                return True
            # Even if the date format is unusual, check if any earlier turn
            # in history was an itinerary request — the user is still in that flow.
            for turn in reversed(history[-6:]):
                content = getattr(turn, 'content', '') or ''
                role = getattr(turn, 'role', '') or ''
                if role == 'user' and _ITINERARY_PATTERNS.search(content):
                    return True
    return False


def _detect_region(text: str) -> str | None:
    """Longest-match keyword search → DB region string."""
    lower = text.lower()
    best: tuple[int, str] | None = None
    for keyword, region in _REGION_KEYWORDS.items():
        if keyword in lower:
            if best is None or len(keyword) > best[0]:
                best = (len(keyword), region)
    return best[1] if best else None


def get_landmarks_for_message(
    message: str,
    history: list | None = None,
) -> tuple[str | None, list[DbLandmark]]:
    """
    Detect destination region from the message (or recent history) and fetch
    matching DB landmarks via the Supabase service-role key.

    Returns (region, landmarks).  Both are empty / None when the destination
    is unknown or the Supabase creds are not configured.
    """
    region = _detect_region(message)

    # If current message has no region keyword, scan last 8 history turns
    if region is None and history:
        for turn in reversed(history[-8:]):
            content = getattr(turn, "content", "") or ""
            region = _detect_region(content)
            if region:
                break

    if not region:
        return None, []

    landmarks = _fetch_by_region(region)
    return region, list(landmarks)


@lru_cache(maxsize=32)
def _fetch_by_region(region: str) -> tuple[DbLandmark, ...]:
    """Cached Supabase query — returns a frozen tuple so lru_cache works."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return ()

    client: Client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

    # Join landmark_photos to get the primary Google photo reference.
    # image_url on the landmark table is the same ref (populated by migration),
    # but we also fetch from landmark_photos directly as a fallback.
    # Also fetch landmark_rules for cultural etiquette.
    rows = (
        client.table("landmarks")
        .select("id, name, category, region, image_url, coords, landmark_photos(url_or_ref, is_primary), landmark_rules(title, severity)")
        .ilike("region", f"%{region}%")
        .order("name")
        .execute()
        .data
    ) or []

    def _parse_coords(raw) -> tuple[float | None, float | None]:
        """Extract (latitude, longitude) from PostgREST GeoJSON geometry value.

        PostgREST returns geography/geometry columns as a GeoJSON dict:
          {"type": "Point", "coordinates": [longitude, latitude]}
        """
        if not raw:
            return None, None
        try:
            if isinstance(raw, str):
                import json as _json
                raw = _json.loads(raw)
            coords_list = raw.get("coordinates")
            if coords_list and len(coords_list) >= 2:
                return float(coords_list[1]), float(coords_list[0])  # lat, lng
        except Exception:
            pass
        return None, None

    def _primary_photo(photos: list | None) -> str | None:
        if not photos:
            return None
        for p in photos:
            if p.get("is_primary"):
                return p.get("url_or_ref")
        return photos[0].get("url_or_ref") if photos else None

    def _extract_rules(rules: list | None) -> tuple[tuple[str, str], ...]:
        """Extract (title, severity) pairs from landmark_rules."""
        if not rules:
            return ()
        return tuple(
            (r["title"], r["severity"]) 
            for r in rules[:3]  # Limit to top 3 rules
            if r.get("title") and r.get("severity")
        )

    return tuple(
        DbLandmark(
            id=r["id"],
            name=r["name"],
            category=str(r.get("category") or "Landmark"),
            region=str(r.get("region") or region),
            image_url=r.get("image_url"),
            photo_reference=_primary_photo(r.get("landmark_photos")) or r.get("image_url"),
            latitude=_parse_coords(r.get("coords"))[0],
            longitude=_parse_coords(r.get("coords"))[1],
            cultural_rules=_extract_rules(r.get("landmark_rules")),
        )
        for r in rows
    )


# ─── Detection-time DB lookup ─────────────────────────────────────────────────

@dataclass(frozen=True)
class DbLandmarkMatch:
    """Result of a post-detection DB lookup — landmark + curated fun facts."""

    id: str
    name: str
    category: str
    region: str
    image_url: str | None
    latitude: float | None
    longitude: float | None
    fun_facts: tuple[str, ...]   # from landmark_facts.fact_content
    match_source: str            # "name" | "coords" | "none"


def lookup_detected_landmark(
    name: str,
    latitude: float | None,
    longitude: float | None,
    *,
    coord_radius_km: float = 0.5,
) -> DbLandmarkMatch | None:
    """
    Attempt to match a Gemini-detected landmark against the ``landmarks`` table.

    Strategy (most → least specific):
      1. Exact name match (case-insensitive).
      2. Trigram similarity via ``pg_trgm`` (threshold ≥ 0.35).
      3. Name substring search (both directions).
      4. Coordinate proximity within *coord_radius_km* (requires lat/lon).

    If a match is found, also fetches up to 5 ``landmark_facts`` rows and returns
    them as plain strings.  Returns ``None`` when no match is found or when
    Supabase is not configured.

    Parameters
    ----------
    name:
        Detected landmark name from Gemini (may differ slightly from DB spelling).
    latitude / longitude:
        Coordinates returned by Gemini (may be ``None``).
    coord_radius_km:
        Fallback search radius when name matching fails (default 0.5 km).
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None

    client: Client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

    matched_row: dict | None = None
    match_source = "none"

    # ── Strategy 1: exact name (case-insensitive) ─────────────────────────────
    rows = (
        client.table("landmarks")
        .select("id, name, category, region, image_url, coords")
        .ilike("name", name.strip())
        .limit(1)
        .execute()
        .data
    ) or []
    if rows:
        matched_row = rows[0]
        match_source = "name"

    # ── Strategy 2: trigram similarity ───────────────────────────────────────
    if matched_row is None:
        try:
            # pg_trgm extension must be enabled (standard on Supabase)
            resp = client.rpc(
                "search_landmarks_by_name",
                {"search_term": name.strip(), "similarity_threshold": 0.35},
            ).execute()
            sim_rows = resp.data or []
            if sim_rows:
                matched_row = sim_rows[0]
                match_source = "name"
        except Exception:
            # Fallback if RPC not available — use ILIKE wildcard
            rows = (
                client.table("landmarks")
                .select("id, name, category, region, image_url, coords")
                .ilike("name", f"%{name.strip()}%")
                .limit(1)
                .execute()
                .data
            ) or []
            if rows:
                matched_row = rows[0]
                match_source = "name"

    # ── Strategy 3: reverse substring (DB name contains part of detected name) ─
    if matched_row is None:
        # Split detected name into tokens and try each token
        tokens = [t for t in name.split() if len(t) >= 4]
        for token in tokens:
            rows = (
                client.table("landmarks")
                .select("id, name, category, region, image_url, coords")
                .ilike("name", f"%{token}%")
                .limit(1)
                .execute()
                .data
            ) or []
            if rows:
                matched_row = rows[0]
                match_source = "name"
                break

    # ── Strategy 4: coordinate proximity (PostGIS ST_DWithin) ────────────────
    if matched_row is None and latitude is not None and longitude is not None:
        try:
            radius_metres = coord_radius_km * 1000
            resp = client.rpc(
                "find_landmark_near",
                {
                    "lat": latitude,
                    "lon": longitude,
                    "radius_m": radius_metres,
                },
            ).execute()
            geo_rows = resp.data or []
            if geo_rows:
                matched_row = geo_rows[0]
                match_source = "coords"
        except Exception:
            pass

    if matched_row is None:
        return None

    # ── Fetch fun facts ───────────────────────────────────────────────────────
    facts_rows = (
        client.table("landmark_facts")
        .select("fact_content")
        .eq("landmark_id", matched_row["id"])
        .limit(5)
        .execute()
        .data
    ) or []
    fun_facts = tuple(r["fact_content"] for r in facts_rows if r.get("fact_content"))

    # ── Parse coords ──────────────────────────────────────────────────────────
    lat: float | None = None
    lon: float | None = None
    raw_coords = matched_row.get("coords")
    if raw_coords:
        try:
            import json as _json
            if isinstance(raw_coords, str):
                raw_coords = _json.loads(raw_coords)
            c = raw_coords.get("coordinates")
            if c and len(c) >= 2:
                lon, lat = float(c[0]), float(c[1])
        except Exception:
            pass

    return DbLandmarkMatch(
        id=matched_row["id"],
        name=matched_row["name"],
        category=str(matched_row.get("category") or "Landmark"),
        region=str(matched_row.get("region") or ""),
        image_url=matched_row.get("image_url"),
        latitude=lat,
        longitude=lon,
        fun_facts=fun_facts,
        match_source=match_source,
    )


def build_landmark_context_block(region: str, landmarks: list[DbLandmark]) -> str:
    """
    Build a Markdown block appended to the Gemini system instruction.

    Each landmark line ends with `[DB:{uuid}]`.  The system instruction
    tells the AI to copy that tag verbatim to the end of any bullet that
    references this landmark, so the mobile app can extract the DB ID.
    
    Also includes cultural etiquette rules where available.
    """
    if not landmarks:
        return ""

    by_category: dict[str, list[DbLandmark]] = {}
    for lm in landmarks:
        by_category.setdefault(lm.category, []).append(lm)

    lines: list[str] = [
        "",
        f"## VERIFIED LANDMARKS DATABASE — {region}",
        "IMPORTANT: When building an itinerary for this destination you MUST:",
        "  1. Use ONLY landmark names from the list below (exact spelling).",
        "  2. At the END of every bullet that references one of these landmarks,",
        "     append the tag `[DB:{id}]` exactly as shown — do NOT alter the UUID.",
        "  3. Do NOT invent new landmark names for this region.",
        "     If a requested activity has no match here, describe it without a [DB:] tag.",
        "  4. When discussing these places, mention relevant cultural etiquette if available.",
        "",
    ]

    for cat in sorted(by_category):
        lines.append(f"### {cat}")
        for lm in by_category[cat]:
            lines.append(f"- {lm.name} [DB:{lm.id}]")
            # Add cultural etiquette rules if available
            if lm.cultural_rules:
                lines.append("  Cultural etiquette:")
                for rule_title, severity in lm.cultural_rules:
                    lines.append(f"    • [{severity}] {rule_title}")
        lines.append("")

    return "\n".join(lines)
