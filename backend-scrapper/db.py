"""
db.py
─────
Supabase client wrapper.

Uses the service-role key so it can bypass RLS and write to the events table.
The service-role key must NEVER be exposed to untrusted clients — this module
is backend-only.
"""

from __future__ import annotations

import logging
from typing import Any

from supabase import create_client, Client

from config import settings

logger = logging.getLogger(__name__)

# ── Module-level singleton ────────────────────────────────────────────────────

_client: Client | None = None


def get_client() -> Client:
    """Return (or lazily create) the Supabase service-role client."""
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.debug("Supabase client initialised for %s", settings.supabase_url)
    return _client


# ── Upsert helper ─────────────────────────────────────────────────────────────

def upsert_events(rows: list[dict[str, Any]], *, dry_run: bool = False) -> int:
    """
    Upsert a batch of event rows into public.events.

    Conflict resolution is on ``phq_id`` — re-running the scraper
    updates existing rows rather than creating duplicates.

    Parameters
    ----------
    rows:
        List of dicts conforming to the events table schema (see transformer.py).
    dry_run:
        If True, log what would be upserted but do not hit Supabase.

    Returns
    -------
    int
        Number of rows actually upserted (0 when dry_run=True).
    """
    if not rows:
        return 0

    if dry_run:
        logger.info("[DRY-RUN] Would upsert %d events (skipping Supabase)", len(rows))
        return 0

    client = get_client()
    batch_size = settings.upsert_batch_size
    total = 0

    for i in range(0, len(rows), batch_size):
        chunk = rows[i : i + batch_size]
        try:
            client.table("events").upsert(
                chunk,
                on_conflict="phq_id",    # UPDATE when phq_id already exists
                returning="minimal",      # don't send all columns back (faster)
            ).execute()
            total += len(chunk)
            logger.debug("Upserted batch %d–%d (%d rows)", i, i + len(chunk), len(chunk))
        except Exception as exc:
            logger.error("Supabase upsert failed for batch %d–%d: %s", i, i + len(chunk), exc)
            raise

    return total
