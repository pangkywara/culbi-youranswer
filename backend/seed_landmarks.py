"""
seed_landmarks.py
─────────────────────────────────────────────────────────────────────────────
Pipeline: Google Places → Gemini 2.5 Flash → Supabase

Focused on ASEAN countries — with deep coverage of Borneo
(Sarawak, Sabah, West/East/South/Central Kalimantan, Brunei).
~15-20 Borneo entries + 5 per remaining ASEAN country.

Usage:
    cd backend
    source venv/bin/activate
    python seed_landmarks.py

Required env vars (add to backend/.env):
    GEMINI_API_KEY
    GOOGLE_PLACES_API_KEY
    SUPABASE_URL              (= EXPO_PUBLIC_SUPABASE_URL)
    SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for admin inserts)
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Env ──────────────────────────────────────────────────────────────────────

_ENV = Path(__file__).parent / ".env"
_ROOT_ENV = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_ENV, override=False)
load_dotenv(dotenv_path=_ROOT_ENV, override=False)

GEMINI_API_KEY         = os.getenv("GEMINI_API_KEY", "")
GOOGLE_PLACES_API_KEY  = (
    os.getenv("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY") or
    os.getenv("GOOGLE_PLACES_API_KEY") or ""
)
SUPABASE_URL           = (
    os.getenv("EXPO_PUBLIC_SUPABASE_URL") or
    os.getenv("SUPABASE_URL") or ""
)
SUPABASE_SERVICE_KEY   = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or
    os.getenv("SERVICE_ROLE_KEY") or ""
)

for name, val in [
    ("GEMINI_API_KEY", GEMINI_API_KEY),
    ("GOOGLE_PLACES_API_KEY / EXPO_PUBLIC_GOOGLE_PLACES_API_KEY", GOOGLE_PLACES_API_KEY),
    ("SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL", SUPABASE_URL),
    ("SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_KEY),
]:
    if not val:
        print(f"[ERROR] {name} is not set. Add it to backend/.env", file=sys.stderr)
        sys.exit(1)

# ── Curated Landmark Catalogue ───────────────────────────────────────────────
# Format: (search_query_for_google_places, country, city_area)
# ASEAN-only. Borneo (Sarawak + Sabah + Kalimantan + Brunei) gets deep coverage.

LANDMARKS: list[tuple[str, str, str]] = [

    # ══════════════════════════════════════════════════════════════════════
    #  BORNEO — SARAWAK, MALAYSIA  (~10 places)
    # ══════════════════════════════════════════════════════════════════════
    ("Gunung Mulu National Park Sarawak Malaysia",         "Malaysia", "Sarawak"),
    ("Niah Caves National Park Sarawak Malaysia",          "Malaysia", "Sarawak"),
    ("Kuching Old Waterfront Sarawak Malaysia",            "Malaysia", "Sarawak"),
    ("Bako National Park Sarawak Malaysia",                "Malaysia", "Sarawak"),
    ("Semengoh Wildlife Centre Kuching Sarawak",           "Malaysia", "Sarawak"),
    ("Annah Rais Bidayuh Longhouse Sarawak Malaysia",      "Malaysia", "Sarawak"),
    ("Sarawak Museum Kuching Malaysia",                    "Malaysia", "Sarawak"),
    ("Fairy Cave Bau Sarawak Malaysia",                    "Malaysia", "Sarawak"),
    ("Wind Cave Miri Sarawak Malaysia",                    "Malaysia", "Sarawak"),
    ("Damai Beach Santubong Kuching Sarawak",              "Malaysia", "Sarawak"),

    # ══════════════════════════════════════════════════════════════════════
    #  BORNEO — SABAH, MALAYSIA  (~5 places)
    # ══════════════════════════════════════════════════════════════════════
    ("Kinabalu Park Ranau Sabah Malaysia",                 "Malaysia", "Sabah"),
    ("Sepilok Orangutan Rehabilitation Centre Sandakan Sabah", "Malaysia", "Sabah"),
    ("Tunku Abdul Rahman Marine Park Kota Kinabalu Sabah", "Malaysia", "Sabah"),
    ("Mari Mari Cultural Village Kota Kinabalu Sabah",     "Malaysia", "Sabah"),
    ("Sandakan Memorial Park Sabah Malaysia",              "Malaysia", "Sabah"),
    ("Danum Valley Field Centre Sabah Malaysia",           "Malaysia", "Sabah"),

    # ══════════════════════════════════════════════════════════════════════
    #  BORNEO — KALIMANTAN, INDONESIA  (~8 places)
    # ══════════════════════════════════════════════════════════════════════
    ("Istana Kadriah Pontianak West Kalimantan Indonesia",          "Indonesia", "West Kalimantan"),
    ("Tugu Khatulistiwa Equator Monument Pontianak Indonesia",      "Indonesia", "West Kalimantan"),
    ("Tanjung Puting National Park Central Kalimantan Indonesia",   "Indonesia", "Central Kalimantan"),
    ("Lok Baintan Floating Market Banjarmasin South Kalimantan",    "Indonesia", "South Kalimantan"),
    ("Martapura Diamond Market South Kalimantan Indonesia",         "Indonesia", "South Kalimantan"),
    ("Pulau Derawan Archipelago East Kalimantan Indonesia",         "Indonesia", "East Kalimantan"),
    ("Balikpapan Mangrove Nature Reserve East Kalimantan Indonesia","Indonesia", "East Kalimantan"),
    ("Museum Mulawarman Tenggarong East Kalimantan Indonesia",      "Indonesia", "East Kalimantan"),

    # ══════════════════════════════════════════════════════════════════════
    #  BORNEO — BRUNEI  (5 places — Brunei is entirely on Borneo)
    # ══════════════════════════════════════════════════════════════════════
    ("Sultan Omar Ali Saifuddien Mosque Bandar Seri Begawan Brunei","Brunei", "Bandar Seri Begawan"),
    ("Kampong Ayer Water Village Brunei",                           "Brunei", "Bandar Seri Begawan"),
    ("Ulu Temburong National Park Brunei",                          "Brunei", "Temburong"),
    ("Royal Regalia Museum Bandar Seri Begawan Brunei",             "Brunei", "Bandar Seri Begawan"),
    ("Jame Asr Hassanil Bolkiah Mosque Gadong Brunei",              "Brunei", "Bandar Seri Begawan"),

    # ══════════════════════════════════════════════════════════════════════
    #  MALAYSIA — Peninsular & non-Borneo
    # ══════════════════════════════════════════════════════════════════════
    ("Petronas Twin Towers Kuala Lumpur Malaysia",        "Malaysia", "Kuala Lumpur"),
    ("Georgetown Heritage City Penang Malaysia",          "Malaysia", "Penang"),
    ("Batu Caves Selangor Malaysia",                      "Malaysia", "Selangor"),
    ("A Famosa Fort Malacca Malaysia",                    "Malaysia", "Malacca"),
    ("Cameron Highlands Tea Plantation Malaysia",         "Malaysia", "Pahang"),

    # ══════════════════════════════════════════════════════════════════════
    #  INDONESIA — Non-Borneo
    # ══════════════════════════════════════════════════════════════════════
    ("Borobudur Temple Magelang Central Java Indonesia",  "Indonesia", "Central Java"),
    ("Prambanan Temple Yogyakarta Indonesia",             "Indonesia", "Yogyakarta"),
    ("Tegallalang Rice Terraces Ubud Bali Indonesia",     "Indonesia", "Bali"),
    ("Mount Bromo Tengger Semeru National Park Indonesia","Indonesia", "East Java"),
    ("Komodo National Park Flores Indonesia",             "Indonesia", "East Nusa Tenggara"),
    ("Tanah Lot Temple Bali Indonesia",                   "Indonesia", "Bali"),
    ("Uluwatu Temple Bali Indonesia",                     "Indonesia", "Bali"),

    # ══════════════════════════════════════════════════════════════════════
    #  THAILAND
    # ══════════════════════════════════════════════════════════════════════
    ("Wat Phra Kaew Grand Palace Bangkok Thailand",       "Thailand", "Bangkok"),
    ("Doi Suthep Temple Chiang Mai Thailand",             "Thailand", "Chiang Mai"),
    ("Ayutthaya Historical Park Phra Nakhon Si Thailand", "Thailand", "Ayutthaya"),
    ("Sukhothai Historical Park Thailand",                "Thailand", "Sukhothai"),
    ("Wat Rong Khun White Temple Chiang Rai Thailand",    "Thailand", "Chiang Rai"),

    # ══════════════════════════════════════════════════════════════════════
    #  VIETNAM
    # ══════════════════════════════════════════════════════════════════════
    ("Ha Long Bay Quang Ninh Vietnam",                    "Vietnam", "Ha Long"),
    ("Hoi An Ancient Town Quang Nam Vietnam",             "Vietnam", "Hoi An"),
    ("My Son Sanctuary Duy Xuyen Vietnam",                "Vietnam", "Quang Nam"),
    ("Hue Imperial Citadel Thua Thien Vietnam",           "Vietnam", "Hue"),
    ("Phong Nha Cave Quang Binh Vietnam",                 "Vietnam", "Quang Binh"),

    # ══════════════════════════════════════════════════════════════════════
    #  CAMBODIA
    # ══════════════════════════════════════════════════════════════════════
    ("Angkor Wat Siem Reap Cambodia",                     "Cambodia", "Siem Reap"),
    ("Ta Prohm Temple Angkor Cambodia",                   "Cambodia", "Siem Reap"),
    ("Bayon Temple Angkor Thom Cambodia",                 "Cambodia", "Siem Reap"),
    ("Royal Palace Phnom Penh Cambodia",                  "Cambodia", "Phnom Penh"),
    ("Banteay Srei Temple Angkor Cambodia",               "Cambodia", "Siem Reap"),

    # ══════════════════════════════════════════════════════════════════════
    #  MYANMAR
    # ══════════════════════════════════════════════════════════════════════
    ("Bagan Archaeological Zone Myanmar",                 "Myanmar", "Bagan"),
    ("Shwedagon Pagoda Yangon Myanmar",                   "Myanmar", "Yangon"),
    ("Inle Lake Nyaungshwe Myanmar",                      "Myanmar", "Shan State"),
    ("U Bein Bridge Amarapura Mandalay Myanmar",          "Myanmar", "Mandalay"),
    ("Mandalay Palace Myanmar",                           "Myanmar", "Mandalay"),

    # ══════════════════════════════════════════════════════════════════════
    #  LAOS
    # ══════════════════════════════════════════════════════════════════════
    ("Luang Prabang Old Town Laos",                       "Laos", "Luang Prabang"),
    ("Pha That Luang Vientiane Laos",                     "Laos", "Vientiane"),
    ("Kuang Si Waterfall Luang Prabang Laos",             "Laos", "Luang Prabang"),
    ("Wat Xieng Thong Temple Luang Prabang Laos",         "Laos", "Luang Prabang"),
    ("Plain of Jars Phonsavan Laos",                      "Laos", "Phonsavan"),

    # ══════════════════════════════════════════════════════════════════════
    #  PHILIPPINES
    # ══════════════════════════════════════════════════════════════════════
    ("Chocolate Hills Carmen Bohol Philippines",          "Philippines", "Bohol"),
    ("Intramuros Walled City Manila Philippines",         "Philippines", "Manila"),
    ("Vigan Heritage City Ilocos Sur Philippines",        "Philippines", "Vigan"),
    ("El Nido Palawan Philippines",                       "Philippines", "Palawan"),
    ("Banaue Rice Terraces Ifugao Philippines",           "Philippines", "Ifugao"),

    # ══════════════════════════════════════════════════════════════════════
    #  SINGAPORE
    # ══════════════════════════════════════════════════════════════════════
    ("Gardens by the Bay Singapore",                      "Singapore", "Singapore"),
    ("Chinatown Heritage Centre Singapore",               "Singapore", "Singapore"),
    ("Little India Singapore",                            "Singapore", "Singapore"),
    ("Fort Canning Park Singapore",                       "Singapore", "Singapore"),
    ("Buddha Tooth Relic Temple Singapore",               "Singapore", "Singapore"),

    # ══════════════════════════════════════════════════════════════════════
    #  TIMOR-LESTE
    # ══════════════════════════════════════════════════════════════════════
    ("Cristo Rei Statue Dili Timor-Leste",                "Timor-Leste", "Dili"),
    ("Resistance Museum Dili Timor-Leste",                "Timor-Leste", "Dili"),
    ("Atauro Island Timor-Leste",                         "Timor-Leste", "Dili"),
    ("Tais Market Dili Timor-Leste",                      "Timor-Leste", "Dili"),
    ("Nino Konis Santana National Park Timor-Leste",      "Timor-Leste", "Lospalos"),
]

# ── Category Mapping ─────────────────────────────────────────────────────────

GOOGLE_TYPE_TO_CATEGORY: dict[str, str] = {
    "hindu_temple":     "Religion",
    "church":           "Religion",
    "mosque":           "Religion",
    "synagogue":        "Religion",
    "place_of_worship": "Religion",
    "museum":           "Culture",
    "art_gallery":      "Culture",
    "library":          "Culture",
    "ruins":            "Heritage",
    "cemetery":         "Heritage",
    "natural_feature":  "Nature",
    "park":             "Nature",
    "national_park":    "Nature",
    "zoo":              "Nature",
    "food":             "Food",
    "restaurant":       "Food",
    "cafe":             "Food",
    "tourist_attraction": "Landmark",
    "point_of_interest":  "Landmark",
    "establishment":      "Landmark",
}

VALID_CATEGORIES = {
    "Culture", "Nature", "Food", "History", "Heritage", "Religion", "Landmark"
}


def infer_category(place_types: list[str]) -> str:
    """Map Google Place types → LandmarkCategory."""
    priority = ["Religion", "Heritage", "Culture", "Nature", "Food", "Landmark", "History"]
    found: set[str] = set()
    for t in place_types:
        cat = GOOGLE_TYPE_TO_CATEGORY.get(t)
        if cat:
            found.add(cat)
    for p in priority:
        if p in found:
            return p
    # Heuristic fallback from name keywords
    return "Landmark"


# ── Google Places API ────────────────────────────────────────────────────────

PLACES_TEXTSEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS_URL    = "https://maps.googleapis.com/maps/api/place/details/json"


def fetch_place(query: str) -> dict | None:
    """Text search + details fetch for a query string."""
    # Step 1: Text search
    resp = requests.get(
        PLACES_TEXTSEARCH_URL,
        params={
            "query":  query,
            "key":    GOOGLE_PLACES_API_KEY,
            "fields": "place_id,name,geometry,types,rating,user_ratings_total,formatted_address,photos",
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        print(f"  [WARN] No results for: {query!r} (status={data.get('status')})")
        return None

    result = data["results"][0]
    place_id = result.get("place_id")
    if not place_id:
        return None

    # Step 2: Place Details for photo_reference
    det_resp = requests.get(
        PLACES_DETAILS_URL,
        params={
            "place_id": place_id,
            "fields":   "place_id,name,formatted_address,geometry,types,rating,user_ratings_total,photos",
            "key":      GOOGLE_PLACES_API_KEY,
        },
        timeout=10,
    )
    det_resp.raise_for_status()
    det_data = det_resp.json()
    detail = det_data.get("result", {})

    loc = result.get("geometry", {}).get("location", {})
    photos = detail.get("photos", result.get("photos", []))
    photo_ref = photos[0].get("photo_reference") if photos else None

    return {
        "place_id":          place_id,
        "name":              detail.get("name") or result.get("name"),
        "lat":               loc.get("lat"),
        "lng":               loc.get("lng"),
        "types":             detail.get("types") or result.get("types", []),
        "rating":            detail.get("rating") or result.get("rating"),
        "formatted_address": detail.get("formatted_address") or result.get("formatted_address"),
        "photo_reference":   photo_ref,                       # primary (first)
        # All photo_references, up to 10 — inserted into landmark_photos
        "all_photos":        [p["photo_reference"] for p in photos[:10] if p.get("photo_reference")],
    }


# ── Gemini Content Generation ─────────────────────────────────────────────────

try:
    from google import genai as google_genai
    _GEMINI_CLIENT = google_genai.Client(api_key=GEMINI_API_KEY)
    _GEMINI_MODEL  = "gemini-2.5-flash"
except Exception as exc:
    print(f"[ERROR] Could not initialise Gemini client: {exc}", file=sys.stderr)
    sys.exit(1)


_CONTENT_PROMPT = """\
You are a cultural expert writing for a travel app focused on authentic Asian experiences.

Generate cultural content for this landmark:

Place: {name}
Country: {country}
Address: {address}

Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:
{{
  "facts": [
    "Fact 1 — interesting historical or cultural detail.",
    "Fact 2 — another historical or cultural insight.",
    "Fact 3 — a fascinating or lesser-known cultural fact."
  ],
  "rules": [
    {{
      "title": "Short rule title (max 6 words)",
      "description": "Clear explanation of what to do or avoid.",
      "severity": "Mandatory"
    }},
    {{
      "title": "Short rule title (max 6 words)",
      "description": "Clear explanation of what to do or avoid.",
      "severity": "Recommended"
    }},
    {{
      "title": "Short rule title (max 6 words)",
      "description": "Local tip or cultural insight for a richer visit.",
      "severity": "Pro-Tip"
    }}
  ]
}}

Rules for facts:
- Each fact must be 1–2 sentences.
- Focus on cultural significance, history, or traditions.
- Do NOT include tourist logistics (opening hours, prices, etc.).

Rules for rules:
- severity must be exactly one of: "Mandatory", "Recommended", "Pro-Tip"
- Mandatory = legally required or sacred obligations (remove shoes, cover shoulders, etc.)
- Recommended = strong cultural expectations (no flash photography, queue properly, etc.)
- Pro-Tip = insider knowledge that enhances the experience
"""


def generate_content(name: str, country: str, address: str) -> dict | None:
    """Call Gemini and return parsed JSON with facts + rules."""
    prompt = _CONTENT_PROMPT.format(name=name, country=country, address=address)
    try:
        response = _GEMINI_CLIENT.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt,
        )
        raw = response.text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except (json.JSONDecodeError, Exception) as exc:
        print(f"  [WARN] Gemini error for {name!r}: {exc}")
        return None


# ── Supabase ──────────────────────────────────────────────────────────────────

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def place_exists(sb: Client, place_id: str) -> bool:
    """Return True if the place_id is already in the landmarks table."""
    res = sb.table("landmarks").select("id").eq("place_id", place_id).limit(1).execute()
    return bool(res.data)


def insert_landmark_full(
    sb: Client,
    place: dict,
    country: str,
    city: str,
    content: dict,
) -> str | None:
    """Insert landmark + facts + rules + photos. Returns landmark UUID or None."""
    # Build POINT geometry WKT for PostGIS
    lat, lng = place["lat"], place["lng"]
    coords_wkt = f"SRID=4326;POINT({lng} {lat})" if lat and lng else None

    category = infer_category(place["types"])
    region   = f"{city}, {country}" if city else country

    # ── landmarks ────────────────────────────────────────────────────────
    landmark_payload = {
        "place_id":  place["place_id"],
        "name":      place["name"],
        "coords":    coords_wkt,
        "category":  category,
        "region":    region,
    }
    lm_res = sb.table("landmarks").insert(landmark_payload).execute()
    if not lm_res.data:
        print(f"  [ERROR] Failed to insert landmark: {lm_res}")
        return None
    landmark_id = lm_res.data[0]["id"]

    # ── landmark_photos ──────────────────────────────────────────────────
    all_photos: list[str] = place.get("all_photos", [])
    if not all_photos and place.get("photo_reference"):
        all_photos = [place["photo_reference"]]
    if all_photos:
        photo_rows = [
            {
                "landmark_id": landmark_id,
                "url_or_ref":  ref,
                "is_primary":  (i == 0),    # first photo is the cover image
                "source":      "google",
                "sort_order":  i,
            }
            for i, ref in enumerate(all_photos)
        ]
        sb.table("landmark_photos").insert(photo_rows).execute()

    # ── landmark_facts ───────────────────────────────────────────────────
    facts = content.get("facts", [])
    if facts:
        fact_rows = [
            {"landmark_id": landmark_id, "fact_content": f}
            for f in facts if isinstance(f, str) and f.strip()
        ]
        if fact_rows:
            sb.table("landmark_facts").insert(fact_rows).execute()

    # ── landmark_rules ───────────────────────────────────────────────────
    rules = content.get("rules", [])
    if rules:
        rule_rows = []
        for r in rules:
            if not isinstance(r, dict):
                continue
            severity = r.get("severity", "Pro-Tip")
            if severity not in ("Mandatory", "Recommended", "Pro-Tip"):
                severity = "Pro-Tip"
            rule_rows.append({
                "landmark_id": landmark_id,
                "title":       str(r.get("title", "Cultural tip"))[:100],
                "description": str(r.get("description", ""))[:500],
                "severity":    severity,
            })
        if rule_rows:
            sb.table("landmark_rules").insert(rule_rows).execute()

    return landmark_id


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    sb = get_supabase()
    total  = len(LANDMARKS)
    done   = 0
    skipped = 0
    failed = 0

    print(f"\n{'='*60}")
    print(f" Culbi Landmark Seeder — {total} places across Asia")
    print(f"{'='*60}\n")

    for idx, (query, country, city) in enumerate(LANDMARKS, start=1):
        label = f"[{idx:>3}/{total}]"

        # ── 1. Google Places ────────────────────────────────────────────
        print(f"{label} Fetching: {query!r}")
        place = fetch_place(query)
        if not place:
            print(f"       ↳ SKIP (not found in Places API)")
            failed += 1
            time.sleep(0.5)
            continue

        # ── 2. Deduplication ────────────────────────────────────────────
        if place_exists(sb, place["place_id"]):
            print(f"       ↳ SKIP — already in DB ({place['name']!r})")
            skipped += 1
            time.sleep(0.2)
            continue

        # ── 3. Gemini content ───────────────────────────────────────────
        print(f"       ↳ Generating content for {place['name']!r} …")
        content = generate_content(place["name"], country, place["formatted_address"])
        if not content:
            content = {"facts": [], "rules": []}

        # ── 4. Supabase insert ──────────────────────────────────────────
        landmark_id = insert_landmark_full(sb, place, country, city, content)
        if landmark_id:
            facts_n  = len(content.get("facts", []))
            rules_n  = len(content.get("rules", []))
            photos_n = len(place.get("all_photos", [place["photo_reference"]] if place.get("photo_reference") else []))
            print(f"       ↳ ✓  Inserted (id={landmark_id[:8]}…, {facts_n} facts, {rules_n} rules, {photos_n} photos)")
            done += 1
        else:
            print(f"       ↳ FAIL — Supabase insert error")
            failed += 1

        # Rate limit: ~1-2 req/s to stay well within quotas
        time.sleep(1.2)

    print(f"\n{'='*60}")
    print(f" Done — {done} inserted, {skipped} skipped, {failed} failed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
