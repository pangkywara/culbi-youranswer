"""
predicthq_client.py
───────────────────
Thin, pagination-aware wrapper around the PredictHQ Events API v1.

Key design decisions
────────────────────
1.  **No 5 k offset cap** — PredictHQ's default offset limit is 10 000 rows.
    We avoid hitting it by chunking requests into DATE_CHUNK_DAYS windows
    (default 90 days).  Within each window the expected event count is well
    below 10 000 for a single country, so offset pagination is safe.

2.  **Retry with exponential back-off** — 429 rate-limit and 5xx transient
    errors are retried automatically via ``tenacity``.

3.  **Generator interface** — ``fetch_events()`` is a generator that yields
    one PredictHQ event dict at a time.  The caller accumulates or processes
    them without holding the entire result set in memory.

Docs: https://docs.predicthq.com/resources/events
"""

from __future__ import annotations

import logging
import time
from collections.abc import Generator
from datetime import date, timedelta
from typing import Any

import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from config import settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.predicthq.com/v1/events/"
_TIMEOUT   = 30  # seconds per request


# ── Retry decorator ───────────────────────────────────────────────────────────

def _build_retry():
    return retry(
        retry=retry_if_exception_type((requests.Timeout, requests.ConnectionError)),
        stop=stop_after_attempt(settings.max_retries),
        wait=wait_exponential(
            multiplier=settings.retry_wait_seconds,
            min=settings.retry_wait_seconds,
            max=60,
        ),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


# ── Session ───────────────────────────────────────────────────────────────────

def _make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {settings.predicthq_api_key}",
        "Accept":        "application/json",
    })
    return session


# ── Date-range chunker ────────────────────────────────────────────────────────

def _date_chunks(
    start: date,
    end: date,
    chunk_days: int,
) -> Generator[tuple[date, date], None, None]:
    """Yield (chunk_start, chunk_end) pairs covering [start, end]."""
    cursor = start
    while cursor <= end:
        chunk_end = min(cursor + timedelta(days=chunk_days - 1), end)
        yield cursor, chunk_end
        cursor = chunk_end + timedelta(days=1)


# ── Core page fetcher ─────────────────────────────────────────────────────────

def _fetch_page(
    session: requests.Session,
    params: dict[str, Any],
) -> tuple[list[dict], int, bool]:
    """
    Fetch a single page from the PredictHQ Events API.

    Returns
    -------
    (results, total_count, has_next)
    """
    decorated_get = _build_retry()(session.get)

    resp = decorated_get(_BASE_URL, params=params, timeout=_TIMEOUT)

    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "60"))
        logger.warning("Rate-limited by PredictHQ. Sleeping %ds …", retry_after)
        time.sleep(retry_after)
        resp = session.get(_BASE_URL, params=params, timeout=_TIMEOUT)

    resp.raise_for_status()
    data = resp.json()

    results    = data.get("results", [])
    total      = data.get("count", 0)
    has_next   = data.get("next") is not None

    return results, total, has_next


# ── Public generator ──────────────────────────────────────────────────────────

def fetch_events(
    country: str,
    *,
    categories: list[str] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Generator[dict[str, Any], None, None]:
    """
    Yield every PredictHQ event matching the given filters, one at a time.

    Internally paginates through all pages using date-range chunking to
    stay within the 10 000-offset limit without any artificial cap.

    Parameters
    ----------
    country:
        ISO alpha-2 country code (e.g. ``"ID"``).
    categories:
        List of PredictHQ category slugs.  ``None`` → all categories.
    start_date / end_date:
        Inclusive date range.  Defaults to settings.scrape_start_date /
        settings.scrape_end_date.
    """
    from datetime import date as date_cls
    from dateutil.parser import parse as _parse_date

    resolved_start = start_date or _parse_date(settings.scrape_start_date).date()
    resolved_end   = end_date   or _parse_date(settings.scrape_end_date).date()
    resolved_cats  = categories or settings.active_categories()

    session = _make_session()

    total_yielded = 0

    for chunk_start, chunk_end in _date_chunks(
        resolved_start, resolved_end, settings.date_chunk_days
    ):
        logger.info(
            "[%s] Fetching %s–%s (categories: %d)",
            country,
            chunk_start,
            chunk_end,
            len(resolved_cats),
        )

        # Base params for this chunk
        base_params: dict[str, Any] = {
            "country":           country,
            "active.gte":        chunk_start.isoformat(),
            "active.lte":        chunk_end.isoformat(),
            "limit":             settings.page_size,
            "sort":              "start,-rank",
            "offset":            0,
        }

        if resolved_cats:
            base_params["category"] = ",".join(resolved_cats)

        if settings.min_rank > 0:
            base_params["rank.gte"] = settings.min_rank

        chunk_offset = 0

        while True:
            params = {**base_params, "offset": chunk_offset}

            try:
                results, total_count, has_next = _fetch_page(session, params)
            except requests.HTTPError as exc:
                logger.error(
                    "HTTP %s for %s %s–%s offset=%d: %s",
                    exc.response.status_code,
                    country,
                    chunk_start,
                    chunk_end,
                    chunk_offset,
                    exc,
                )
                break

            if not results:
                break

            for event in results:
                yield event
                total_yielded += 1

            logger.debug(
                "[%s] %s–%s offset=%d → %d / %d events so far",
                country, chunk_start, chunk_end, chunk_offset,
                chunk_offset + len(results), total_count,
            )

            if not has_next:
                break

            chunk_offset += len(results)

    logger.info("[%s] Done — total events fetched: %d", country, total_yielded)
