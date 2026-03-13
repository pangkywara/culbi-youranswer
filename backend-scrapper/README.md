# PredictHQ → Supabase ASEAN Event Scraper

Standalone scraper that pulls ASEAN events from the [PredictHQ API](https://docs.predicthq.com/resources/events) and upserts them into the `public.events` Supabase table.

## Architecture

```
backend-scrapper/
├── config.py             # All settings from .env — import here, never os.environ
├── db.py                 # Supabase service-role client + batch upsert helper
├── predicthq_client.py   # Paginated PredictHQ API client (date-chunk strategy)
├── transformer.py        # PredictHQ JSON → Supabase events row
├── scraper.py            # Orchestration engine (country loop → batch flush)
├── run.py                # Click CLI entry point
├── requirements.txt
├── .env.example          # Copy → .env and fill in credentials
└── README.md
```

## Prerequisites

- Python 3.11+
- PredictHQ API key — generate at [control.predicthq.com](https://control.predicthq.com/clients)
- Supabase **service-role** key for project `dwtjtliumpdctqexktzg`

## Setup

```bash
cd backend-scrapper

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure credentials
cp .env.example .env
# Edit .env and fill in PREDICTHQ_API_KEY and SUPABASE_SERVICE_ROLE_KEY
```

## Running

```bash
# Full scrape — all 11 ASEAN countries, all categories, default date range
python run.py

# Specific countries only
python run.py --countries SG,MY,ID

# Specific categories
python run.py --categories concerts,festivals,sports

# Override date range
python run.py --start 2026-01-01 --end 2026-12-31

# Dry run — fetch + transform but DO NOT write to Supabase
python run.py --dry-run

# Debug logging
python run.py --verbose

# Combine
python run.py --countries SG --start 2026-06-01 --end 2026-08-31 --dry-run -v
```

## No 5 000 event limit

PredictHQ's offset limit is 10 000.  This scraper avoids it through **date-range chunking**:

- The configured date range is split into windows of `DATE_CHUNK_DAYS` (default 90 days)
- Each window × country combination is independently paginated with `offset` + `limit=200`
- A typical 90-day window per country yields far fewer than 10 000 events, so the limit is never reached
- Re-running the scraper is **idempotent** — rows are upserted on `phq_id`

## Supabase `events` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `phq_id` | text | PredictHQ event ID — unique, used for upsert conflict |
| `title` | text | Event title |
| `description` | text | Optional |
| `category` | text | PredictHQ category slug (concerts, festivals, …) |
| `labels` | text[] | Sub-labels |
| `start_dt` | timestamptz | UTC start |
| `end_dt` | timestamptz | UTC end (nullable) |
| `timezone` | text | IANA timezone |
| `coords` | geography(Point) | PostGIS point — same type as `landmarks.coords` |
| `country` | text | ISO alpha-2 |
| `country_name` | text | Full country name |
| `state` / `city` | text | Sub-national location |
| `venue_name` / `venue_address` | text | Extracted from `entities` |
| `scope` | text | locality / metro / region / country / international |
| `rank` | integer | PHQ global rank 0–100 |
| `local_rank` | integer | PHQ local rank 0–100 |
| `phq_attendance` | integer | Predicted attendance |
| `predicted_spend` | numeric | Predicted economic impact |
| `entities` | jsonb | `[{entity_id, name, type, formatted_address}]` |
| `raw_data` | jsonb | Full PredictHQ payload |
| `scraped_at` | timestamptz | When this row was last scraped |

### Security

- **RLS enabled** — public `SELECT`, service-role-only `INSERT/UPDATE/DELETE`  
- The service-role key is **never** committed to git or exposed to the frontend  
- Spatial index on `coords` mirrors the `landmarks_near` RPC pattern for fast geo queries

## Production scheduling

```cron
# Run daily at 03:00 UTC
0 3 * * * cd /path/to/backend-scrapper && venv/bin/python run.py >> /var/log/scraper.log 2>&1
```

Or use a managed scheduler (GitHub Actions, Cloud Scheduler, Render Cron, etc.).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PREDICTHQ_API_KEY` | ✅ | — | PredictHQ Bearer token |
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Service-role key (bypasses RLS) |
| `SCRAPE_START_DATE` | | `2025-01-01` | Start of date range |
| `SCRAPE_END_DATE` | | `2027-12-31` | End of date range |
| `SCRAPE_COUNTRIES` | | `ALL` | Comma-separated ISO codes or `ALL` |
| `SCRAPE_CATEGORIES` | | `ALL` | Comma-separated category slugs or `ALL` |
| `PAGE_SIZE` | | `200` | Events per API request (max 200) |
| `MIN_RANK` | | `0` | Skip events below this PHQ rank |
| `UPSERT_BATCH_SIZE` | | `500` | Rows per Supabase upsert call |
| `DATE_CHUNK_DAYS` | | `90` | Days per date window |
| `MAX_RETRIES` | | `5` | HTTP retry attempts |
| `RETRY_WAIT_SECONDS` | | `2.0` | Base retry back-off seconds |
