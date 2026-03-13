"""
config.py
─────────
Centralised configuration loaded from .env.
All other modules import from here — never call os.environ directly.

Setup:
    cp .env.example .env
    # fill in PREDICTHQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

_ENV_FILE = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=False)


def _require(key: str) -> str:
    """Return env var *key*, or exit with a helpful message if missing."""
    value = os.getenv(key)
    if not value:
        print(
            f"\n[ERROR] Required environment variable '{key}' is not set.\n"
            f"        Copy .env.example → .env and fill in the value.\n",
            file=sys.stderr,
        )
        sys.exit(1)
    return value


def _optional(key: str, default: str = "") -> str:
    return os.getenv(key, default)


# ── ASEAN country codes (ISO alpha-2) ─────────────────────────────────────────

ASEAN_COUNTRIES: dict[str, str] = {
    "BN": "Brunei",
    "KH": "Cambodia",
    "ID": "Indonesia",
    "LA": "Laos",
    "MY": "Malaysia",
    "MM": "Myanmar",
    "PH": "Philippines",
    "SG": "Singapore",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "VN": "Vietnam",
}

# ── PredictHQ event categories ────────────────────────────────────────────────
# https://docs.predicthq.com/resources/events#categories

PREDICTHQ_CATEGORIES: list[str] = [
    "academic",
    "air-shows",
    "community",
    "concerts",
    "conferences",
    "expos",
    "festivals",
    "observances",
    "performing-arts",
    "public-holidays",
    "school-holidays",
    "sports",
    "terror",
]


@dataclass(frozen=True)
class Settings:
    # ── Required ──────────────────────────────────────────────────────────────
    predicthq_api_key: str = field(
        default_factory=lambda: _require("PREDICTHQ_API_KEY")
    )
    supabase_url: str = field(
        default_factory=lambda: _require("SUPABASE_URL")
    )
    supabase_service_role_key: str = field(
        default_factory=lambda: _require("SUPABASE_SERVICE_ROLE_KEY")
    )

    # ── Optional tunables ─────────────────────────────────────────────────────
    # Date range to scrape (ISO 8601 dates)
    scrape_start_date: str = field(
        default_factory=lambda: _optional("SCRAPE_START_DATE", "2025-01-01")
    )
    scrape_end_date: str = field(
        default_factory=lambda: _optional("SCRAPE_END_DATE", "2027-12-31")
    )

    # Countries to scrape — comma-separated ISO codes, or "ALL" for all ASEAN
    scrape_countries: str = field(
        default_factory=lambda: _optional("SCRAPE_COUNTRIES", "ALL")
    )

    # Comma-separated PredictHQ categories, or "ALL"
    scrape_categories: str = field(
        default_factory=lambda: _optional("SCRAPE_CATEGORIES", "ALL")
    )

    # PredictHQ API page size (max 200 per their docs)
    page_size: int = field(
        default_factory=lambda: int(_optional("PAGE_SIZE", "200"))
    )

    # Minimum PHQ rank — skip very minor events (0–100)
    min_rank: int = field(
        default_factory=lambda: int(_optional("MIN_RANK", "0"))
    )

    # How many events to upsert per Supabase batch call
    upsert_batch_size: int = field(
        default_factory=lambda: int(_optional("UPSERT_BATCH_SIZE", "500"))
    )

    # Date chunk size in days — prevents hitting 10 k offset limit per query
    date_chunk_days: int = field(
        default_factory=lambda: int(_optional("DATE_CHUNK_DAYS", "90"))
    )

    # Retry settings for HTTP errors
    max_retries: int = field(
        default_factory=lambda: int(_optional("MAX_RETRIES", "5"))
    )
    retry_wait_seconds: float = field(
        default_factory=lambda: float(_optional("RETRY_WAIT_SECONDS", "2.0"))
    )

    def active_countries(self) -> dict[str, str]:
        """Return the subset of ASEAN_COUNTRIES to scrape."""
        if self.scrape_countries.upper() == "ALL":
            return ASEAN_COUNTRIES
        codes = {c.strip().upper() for c in self.scrape_countries.split(",") if c.strip()}
        return {k: v for k, v in ASEAN_COUNTRIES.items() if k in codes}

    def active_categories(self) -> list[str]:
        """Return the list of PredictHQ categories to scrape."""
        if self.scrape_categories.upper() == "ALL":
            return PREDICTHQ_CATEGORIES
        return [c.strip() for c in self.scrape_categories.split(",") if c.strip()]


# Module-level singleton — import this elsewhere
settings = Settings()
