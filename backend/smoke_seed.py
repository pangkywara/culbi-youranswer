"""Quick smoke test for seed_landmarks.py — tests 2 places only."""
import os, json, time, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

GKEY = os.getenv("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_PLACES_API_KEY", "")
SURL = os.getenv("EXPO_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SKEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SERVICE_ROLE_KEY", "")
GEMI = os.getenv("GEMINI_API_KEY", "")

print("=== Key Check ===")
for k, v in [("GOOGLE_PLACES", GKEY), ("SUPABASE_URL", SURL), ("SERVICE_KEY", SKEY), ("GEMINI", GEMI)]:
    print(f"  {k}: {'OK (' + v[:12] + '...)' if v else 'MISSING'}")

# Google Places
print("\n=== Google Places Test ===")
r = requests.get(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
    params={"query": "Angkor Wat Cambodia", "key": GKEY}, timeout=10
).json()
result = r.get("results", [{}])[0]
print(f"  status  : {r.get('status')}")
print(f"  name    : {result.get('name')}")
print(f"  place_id: {result.get('place_id')}")
print(f"  rating  : {result.get('rating')}")
print(f"  types   : {result.get('types', [])[:4]}")

# Supabase connection
print("\n=== Supabase Test ===")
from supabase import create_client
sb = create_client(SURL, SKEY)
check = sb.table("landmarks").select("id, name").limit(3).execute()
print(f"  existing rows: {[r['name'] for r in check.data]}")

# Gemini
print("\n=== Gemini Test ===")
from google import genai
client = genai.Client(api_key=GEMI)
resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents='Reply with just: {"status":"ok"}'
)
print(f"  response: {resp.text.strip()[:80]}")
print("\n✓ All systems go — ready to run: python seed_landmarks.py")
