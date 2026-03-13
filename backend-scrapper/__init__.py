"""
backend-scrapper
────────────────
PredictHQ → Supabase event scraper for ASEAN countries.

Usage
─────
    # Install dependencies
    cd backend-scrapper
    python -m venv venv && source venv/bin/activate
    pip install -r requirements.txt

    # Copy and fill in credentials
    cp .env.example .env

    # Run the scraper
    python run.py

    # Or with options
    python run.py --countries ID,SG,MY --start 2025-01-01 --end 2026-12-31
    python run.py --dry-run           # fetch but don't write to Supabase
    python run.py --country SG --categories concerts,festivals

Scheduling (production)
───────────────────────
    # cron: run daily at 03:00 UTC
    0 3 * * * cd /path/to/backend-scrapper && venv/bin/python run.py >> /var/log/scraper.log 2>&1
"""
