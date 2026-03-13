"""
scraper.py
──────────
Orchestration engine — ties predicthq_client, transformer, and db together.

Responsibilities
────────────────
- Iterates over configured ASEAN countries (and categories / date ranges)
- Accumulates transformed rows into memory-efficient batches
- Flushes each batch to Supabase via db.upsert_events()
- Emits structured progress/stats logs
- Returns a ScrapeResult summary for the CLI to display

This module owns no I/O itself — all network and DB calls are delegated to
predicthq_client and db, keeping this layer purely orchestration logic.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from config import settings
from db import upsert_events
from predicthq_client import fetch_events
from transformer import transform

logger = logging.getLogger(__name__)


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class CountryResult:
    country: str
    fetched: int = 0
    transformed: int = 0
    upserted: int = 0
    skipped: int = 0
    errors: int = 0


@dataclass
class ScrapeResult:
    country_results: list[CountryResult] = field(default_factory=list)
    dry_run: bool = False

    @property
    def total_fetched(self) -> int:
        return sum(r.fetched for r in self.country_results)

    @property
    def total_upserted(self) -> int:
        return sum(r.upserted for r in self.country_results)

    @property
    def total_skipped(self) -> int:
        return sum(r.skipped for r in self.country_results)

    @property
    def total_errors(self) -> int:
        return sum(r.errors for r in self.country_results)


# ── Per-country scraper ───────────────────────────────────────────────────────

def _scrape_country(
    country_code: str,
    country_name: str,
    *,
    categories: list[str] | None,
    start_date: date | None,
    end_date: date | None,
    dry_run: bool,
) -> CountryResult:
    """Fetch, transform, and upsert all events for one country."""

    result = CountryResult(country=country_code)
    batch: list[dict[str, Any]] = []
    batch_size = settings.upsert_batch_size

    def _flush() -> None:
        if not batch:
            return
        try:
            n = upsert_events(batch, dry_run=dry_run)
            result.upserted += n if not dry_run else len(batch)
        except Exception as exc:
            logger.error("[%s] Upsert failed: %s", country_code, exc)
            result.errors += len(batch)
        batch.clear()

    for raw_event in fetch_events(
        country_code,
        categories=categories,
        start_date=start_date,
        end_date=end_date,
    ):
        result.fetched += 1

        row = transform(raw_event, country_code)
        if row is None:
            result.skipped += 1
            continue

        result.transformed += 1
        batch.append(row)

        if len(batch) >= batch_size:
            _flush()

    _flush()  # last partial batch

    logger.info(
        "[%s] %s — fetched=%d  transformed=%d  upserted=%d  skipped=%d  errors=%d",
        country_code, country_name,
        result.fetched, result.transformed, result.upserted,
        result.skipped, result.errors,
    )

    return result


# ── Public entry point ────────────────────────────────────────────────────────

def run(
    *,
    countries: dict[str, str] | None = None,
    categories: list[str] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    dry_run: bool = False,
) -> ScrapeResult:
    """
    Run the full ASEAN event scrape.

    Parameters
    ----------
    countries:
        ``{code: name}`` dict.  Defaults to ``settings.active_countries()``.
    categories:
        PredictHQ category slugs.  Defaults to ``settings.active_categories()``.
    start_date / end_date:
        Date range override.  Defaults to settings values.
    dry_run:
        Fetch and transform but do NOT write to Supabase.
    """
    resolved_countries = countries or settings.active_countries()
    resolved_categories = categories or settings.active_categories()

    logger.info(
        "Starting ASEAN event scrape | countries=%d  categories=%d  dry_run=%s",
        len(resolved_countries),
        len(resolved_categories),
        dry_run,
    )

    scrape_result = ScrapeResult(dry_run=dry_run)

    for code, name in resolved_countries.items():
        try:
            cr = _scrape_country(
                code, name,
                categories=resolved_categories,
                start_date=start_date,
                end_date=end_date,
                dry_run=dry_run,
            )
        except Exception as exc:
            logger.exception("Unexpected error scraping %s (%s): %s", code, name, exc)
            cr = CountryResult(country=code, errors=1)

        scrape_result.country_results.append(cr)

    logger.info(
        "Scrape complete | total_fetched=%d  total_upserted=%d  "
        "total_skipped=%d  total_errors=%d",
        scrape_result.total_fetched,
        scrape_result.total_upserted,
        scrape_result.total_skipped,
        scrape_result.total_errors,
    )

    return scrape_result
