"""
run.py
──────
CLI entry point for the PredictHQ → Supabase ASEAN event scraper.

Examples
────────
    # Full scrape using .env defaults
    python run.py

    # Only Singapore and Malaysia, current year
    python run.py --countries SG,MY --start 2026-01-01 --end 2026-12-31

    # Specific categories only
    python run.py --categories concerts,festivals,sports

    # Dry run — fetch & transform but never write to Supabase
    python run.py --dry-run

    # Verbose logging
    python run.py --verbose

    # Combine
    python run.py --countries ID --start 2026-06-01 --end 2026-08-31 --dry-run -v
"""

from __future__ import annotations

import logging
import sys
from datetime import date

import click
from dateutil.parser import parse as _parse_date

from config import ASEAN_COUNTRIES, PREDICTHQ_CATEGORIES, settings
from scraper import run as _run

# ── Logging ───────────────────────────────────────────────────────────────────

_LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format=_LOG_FORMAT,
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Silence noisy third-party loggers unless verbose
    if not verbose:
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        logging.getLogger("urllib3").setLevel(logging.WARNING)


# ── CLI ───────────────────────────────────────────────────────────────────────

@click.command()
@click.option(
    "--countries", "-c",
    default=None,
    help=(
        "Comma-separated ISO alpha-2 country codes to scrape.  "
        "Default: ALL ASEAN countries (BN,KH,ID,LA,MY,MM,PH,SG,TH,TL,VN). "
        f"Available: {','.join(ASEAN_COUNTRIES.keys())}"
    ),
)
@click.option(
    "--categories",
    default=None,
    help=(
        "Comma-separated PredictHQ category slugs.  Default: all categories. "
        f"Available: {','.join(PREDICTHQ_CATEGORIES)}"
    ),
)
@click.option(
    "--start",
    default=None,
    help="Start date (YYYY-MM-DD).  Defaults to SCRAPE_START_DATE env var.",
)
@click.option(
    "--end",
    default=None,
    help="End date (YYYY-MM-DD).  Defaults to SCRAPE_END_DATE env var.",
)
@click.option(
    "--dry-run",
    is_flag=True,
    default=False,
    help="Fetch and transform events but do NOT write to Supabase.",
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    default=False,
    help="Enable debug-level logging.",
)
def main(
    countries: str | None,
    categories: str | None,
    start: str | None,
    end: str | None,
    dry_run: bool,
    verbose: bool,
) -> None:
    """
    PredictHQ → Supabase ASEAN event scraper.

    Fetches all events from the PredictHQ API for the configured ASEAN
    countries and date range, then upserts them into the Supabase
    ``public.events`` table.  Re-running is idempotent (upsert on phq_id).
    """
    _setup_logging(verbose)
    logger = logging.getLogger("run")

    # ── Resolve countries ──────────────────────────────────────────────────
    if countries:
        codes = {c.strip().upper() for c in countries.split(",") if c.strip()}
        invalid = codes - set(ASEAN_COUNTRIES.keys())
        if invalid:
            click.echo(
                f"[ERROR] Unknown country code(s): {', '.join(sorted(invalid))}\n"
                f"        Valid codes: {', '.join(ASEAN_COUNTRIES.keys())}",
                err=True,
            )
            sys.exit(1)
        resolved_countries = {k: v for k, v in ASEAN_COUNTRIES.items() if k in codes}
    else:
        resolved_countries = settings.active_countries()

    # ── Resolve categories ─────────────────────────────────────────────────
    if categories:
        resolved_categories = [c.strip() for c in categories.split(",") if c.strip()]
    else:
        resolved_categories = settings.active_categories()

    # ── Resolve dates ──────────────────────────────────────────────────────
    try:
        resolved_start: date | None = _parse_date(start).date() if start else None
        resolved_end:   date | None = _parse_date(end).date()   if end   else None
    except ValueError as exc:
        click.echo(f"[ERROR] Invalid date: {exc}", err=True)
        sys.exit(1)

    # ── Summary ────────────────────────────────────────────────────────────
    logger.info("═" * 60)
    logger.info("PredictHQ ASEAN Event Scraper")
    logger.info("  Countries  : %s", ", ".join(resolved_countries.keys()))
    logger.info("  Categories : %s", ", ".join(resolved_categories))
    logger.info("  Start date : %s", resolved_start or settings.scrape_start_date)
    logger.info("  End date   : %s", resolved_end or settings.scrape_end_date)
    logger.info("  Dry run    : %s", dry_run)
    logger.info("  Supabase   : %s", settings.supabase_url)
    logger.info("═" * 60)

    # ── Run ────────────────────────────────────────────────────────────────
    result = _run(
        countries=resolved_countries,
        categories=resolved_categories,
        start_date=resolved_start,
        end_date=resolved_end,
        dry_run=dry_run,
    )

    # ── Final report ───────────────────────────────────────────────────────
    click.echo("")
    click.echo("╔═══════════════════════════════════════════════════════════╗")
    click.echo("║                  SCRAPE COMPLETE                         ║")
    click.echo("╠═══════════════════════════════════════════════════════════╣")

    col_w = 10
    click.echo(
        f"║ {'Country':<6}  {'Fetched':>{col_w}}  {'Upserted':>{col_w}}  "
        f"{'Skipped':>{col_w}}  {'Errors':>{col_w}} ║"
    )
    click.echo("╠═══════════════════════════════════════════════════════════╣")

    for cr in result.country_results:
        click.echo(
            f"║ {cr.country:<6}  {cr.fetched:>{col_w},}  {cr.upserted:>{col_w},}  "
            f"{cr.skipped:>{col_w},}  {cr.errors:>{col_w},} ║"
        )

    click.echo("╠═══════════════════════════════════════════════════════════╣")
    click.echo(
        f"║ {'TOTAL':<6}  {result.total_fetched:>{col_w},}  {result.total_upserted:>{col_w},}  "
        f"{result.total_skipped:>{col_w},}  {result.total_errors:>{col_w},} ║"
    )
    click.echo("╚═══════════════════════════════════════════════════════════╝")

    if dry_run:
        click.echo("  ⚠  DRY RUN — no data written to Supabase.")

    sys.exit(1 if result.total_errors else 0)


if __name__ == "__main__":
    main()
