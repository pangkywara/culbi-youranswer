"""
backfill_reviews.py
───────────────────────────────────────────────────────────────────────────────
One-off script: for every landmark in the DB that has a place_id but no
rows in landmark_reviews, fetch up to 5 Google Place reviews via the Places
Details API and insert them into landmark_reviews.

Google Places Details free tier returns at most 5 reviews per place.

Run:
  cd backend
  venv/bin/python3 backfill_reviews.py
───────────────────────────────────────────────────────────────────────────────
"""

import os, sys, time, requests
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Env ───────────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GOOGLE_API_KEY   = os.getenv("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY", "")
SUPABASE_URL     = os.getenv("EXPO_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE = (
    os.getenv("SERVICE_ROLE_KEY") or
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
)

if not all([GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE]):
    print("[ERROR] Missing env vars — check .env files", file=sys.stderr)
    sys.exit(1)

PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
MAX_REVIEWS        = 5   # Google free tier limit
DELAY_SECS         = 0.3 # Polite rate-limiting between requests


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_reviews(place_id: str) -> list[dict]:
    """
    Returns up to 5 Google reviews for a place.

    Each dict has keys:
      author_name, author_photo_url, rating, text, relative_time_description, language
    """
    resp = requests.get(
        PLACES_DETAILS_URL,
        params={
            "place_id": place_id,
            "fields":   "reviews",
            "key":      GOOGLE_API_KEY,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    status = data.get("status")
    if status not in ("OK", "ZERO_RESULTS"):
        raise RuntimeError(f"Places API returned {status}: {data.get('error_message', '')}")

    return data.get("result", {}).get("reviews", [])


def backfill(sb: Client) -> None:
    # 1. All landmarks with a place_id
    lm_rows = (
        sb.table("landmarks")
          .select("id, place_id, name")
          .not_.is_("place_id", "null")
          .execute()
          .data
    )
    print(f"Total landmarks with place_id: {len(lm_rows)}")

    # 2. Which already have reviews?
    already_done: set[str] = set(
        row["landmark_id"]
        for row in sb.table("landmark_reviews")
                     .select("landmark_id")
                     .execute()
                     .data
    )
    print(f"Already have reviews:          {len(already_done)}")

    todo = [r for r in lm_rows if r["id"] not in already_done]
    print(f"Need backfill:                 {len(todo)}\n")

    inserted = 0
    skipped  = 0
    failed   = 0

    for idx, row in enumerate(todo, start=1):
        lm_id    = row["id"]
        place_id = row["place_id"]
        name     = row["name"]

        print(f"[{idx:3d}/{len(todo)}] {name[:50]}")

        try:
            raw_reviews = get_reviews(place_id)
        except Exception as exc:
            print(f"         ✗ Google API error: {exc}")
            failed += 1
            time.sleep(DELAY_SECS)
            continue

        if not raw_reviews:
            print(f"         — no reviews on Google, skipping")
            skipped += 1
            time.sleep(DELAY_SECS)
            continue

        rows_to_insert = []
        for rv in raw_reviews[:MAX_REVIEWS]:
            rating_raw = rv.get("rating")
            if rating_raw is None:
                continue
            rating = max(1, min(5, int(rating_raw)))   # clamp to SMALLINT CHECK
            rows_to_insert.append({
                "landmark_id":      lm_id,
                "author_name":      rv.get("author_name", "Anonymous"),
                "author_photo_url": rv.get("profile_photo_url"),
                "rating":           rating,
                "text":             rv.get("text", ""),
                "relative_time":    rv.get("relative_time_description", ""),
                "language":         rv.get("language", "en"),
                "source":           "google",
            })

        if not rows_to_insert:
            skipped += 1
            time.sleep(DELAY_SECS)
            continue

        try:
            sb.table("landmark_reviews").insert(rows_to_insert).execute()
            inserted += len(rows_to_insert)
            print(f"         ✓ inserted {len(rows_to_insert)} review(s)")
        except Exception as exc:
            print(f"         ✗ DB insert error: {exc}")
            failed += 1

        time.sleep(DELAY_SECS)

    print(f"\n─── Done ───────────────────────────────────────────")
    print(f"  Review rows inserted : {inserted}")
    print(f"  Landmarks skipped    : {skipped}  (no Google reviews)")
    print(f"  Failures             : {failed}")


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE)
    backfill(sb)
