"""
backfill_photos.py
──────────────────
One-off script: for every existing landmark in the DB that has a place_id
but no rows in landmark_photos, fetch up to 10 photo_references from the
Google Places Details API and insert them.

Run:
  venv/bin/python3 backfill_photos.py
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_photo_refs(place_id: str) -> list[str]:
    """Fetch up to 10 photo_references for a Google place_id."""
    resp = requests.get(
        PLACES_DETAILS_URL,
        params={
            "place_id": place_id,
            "fields":   "photos",
            "key":      GOOGLE_API_KEY,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    photos = data.get("result", {}).get("photos", [])
    return [p["photo_reference"] for p in photos[:10] if p.get("photo_reference")]


def backfill(sb: Client) -> None:
    # 1. All landmarks that have a place_id
    lm_rows = (
        sb.table("landmarks")
          .select("id, place_id, name")
          .not_.is_("place_id", "null")
          .execute()
          .data
    )
    print(f"Total landmarks with place_id: {len(lm_rows)}")

    # 2. Which ones already have photos?
    already_done: set[str] = set(
        row["landmark_id"]
        for row in sb.table("landmark_photos").select("landmark_id").execute().data
    )
    print(f"Already have photos: {len(already_done)}")

    todo = [r for r in lm_rows if r["id"] not in already_done]
    print(f"Need backfill: {len(todo)}\n")

    inserted = 0
    skipped  = 0
    failed   = 0

    for idx, row in enumerate(todo, start=1):
        lm_id    = row["id"]
        place_id = row["place_id"]
        name     = row["name"]
        label    = f"[{idx:>3}/{len(todo)}] {name!r}"

        try:
            refs = get_photo_refs(place_id)
            if not refs:
                print(f"{label}  — no photos on Google")
                skipped += 1
                time.sleep(0.3)
                continue

            photo_rows = [
                {
                    "landmark_id": lm_id,
                    "url_or_ref":  ref,
                    "is_primary":  (i == 0),
                    "source":      "google",
                    "sort_order":  i,
                }
                for i, ref in enumerate(refs)
            ]
            sb.table("landmark_photos").insert(photo_rows).execute()
            print(f"{label}  ✓ {len(refs)} photos inserted")
            inserted += 1

        except Exception as exc:
            print(f"{label}  ✗ ERROR: {exc}")
            failed += 1

        time.sleep(0.5)   # stay within Google quota

    print(f"\n{'='*60}")
    print(f" Done — {inserted} landmarks backfilled, {skipped} no-photos, {failed} failed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE)
    backfill(sb)
