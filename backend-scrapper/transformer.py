"""
transformer.py
──────────────
Maps a raw PredictHQ event dict → a Supabase ``events`` table row dict.

PredictHQ event schema reference:
    https://docs.predicthq.com/resources/events#event-object

Supabase ``events`` table schema (see migration create_events_table):
    id, phq_id, title, description, category, labels,
    start_dt, end_dt, timezone,
    coords (geography Point WKT),
    country, country_name, state, city, venue_name, venue_address,
    scope, rank, local_rank, aviation_rank,
    phq_attendance, predicted_spend, currency,
    entities, raw_data,
    scraped_at, created_at, updated_at
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone as tz
from typing import Any

from config import ASEAN_COUNTRIES

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _wkt_point(lng: float, lat: float) -> str:
    """Return a PostGIS WKT string for ST_GeogFromText()."""
    return f"POINT({lng} {lat})"


def _iso_to_utc(val: str | None) -> str | None:
    """Parse an ISO 8601 datetime string and ensure it is UTC."""
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(val.rstrip("Z") + "+00:00" if val.endswith("Z") else val)
        return dt.astimezone(tz.utc).isoformat()
    except ValueError:
        return val  # pass through as-is if unparseable


def _extract_venue(entities: list[dict]) -> tuple[str | None, str | None]:
    """Return (venue_name, venue_address) from the entities list."""
    for ent in entities:
        if ent.get("type") == "venue":
            return ent.get("name"), ent.get("formatted_address")
    return None, None


def _extract_city(entities: list[dict], geo: dict | None) -> str | None:
    """
    Best-effort city extraction.
    Prefers geo.address.city, falls back to venue address first line.
    """
    if geo:
        address = geo.get("address", {})
        city = address.get("city") or address.get("district") or address.get("county")
        if city:
            return city

    # fall back to venue entity name if it looks like a city-level entry
    for ent in entities:
        if ent.get("type") in ("city", "locality"):
            return ent.get("name")

    return None


# ── Main transformer ──────────────────────────────────────────────────────────

def transform(
    raw: dict[str, Any],
    country_code: str,
) -> dict[str, Any] | None:
    """
    Convert one raw PredictHQ event dict to a Supabase ``events`` row.

    Returns ``None`` and logs a warning if the event is missing required
    fields (title, start date).

    Parameters
    ----------
    raw:
        Full PredictHQ event object from the API.
    country_code:
        ISO alpha-2 code (used to fill ``country_name`` from the ASEAN map).
    """
    phq_id = raw.get("id")
    title  = raw.get("title")
    start  = raw.get("start")

    if not phq_id or not title or not start:
        logger.warning("Skipping event — missing id/title/start: %s", phq_id)
        return None

    # ── Spatial ───────────────────────────────────────────────────────────────
    location = raw.get("location")   # [lng, lat]  (PredictHQ uses GeoJSON order)
    coords_wkt: str | None = None
    if isinstance(location, list) and len(location) == 2:
        try:
            lng, lat = float(location[0]), float(location[1])
            coords_wkt = _wkt_point(lng, lat)
        except (TypeError, ValueError):
            pass

    # ── Entities ──────────────────────────────────────────────────────────────
    entities: list[dict] = raw.get("entities") or []
    venue_name, venue_address = _extract_venue(entities)

    # ── Geo / address ─────────────────────────────────────────────────────────
    geo = raw.get("geo") or {}
    city = _extract_city(entities, geo)

    geo_address = geo.get("address") or {}
    state = (
        geo_address.get("county_region")
        or geo_address.get("region")
        or raw.get("state")
        or None
    )

    # ── Predicted spend ───────────────────────────────────────────────────────
    spend_obj = raw.get("predicted_event_spend_industries") or {}
    # Sum all industry spends if present; fall back to top-level field
    if spend_obj:
        predicted_spend = sum(
            v.get("spend", 0) for v in spend_obj.values() if isinstance(v, dict)
        )
    else:
        predicted_spend = raw.get("predicted_event_spend") or None

    # ── Serialisable entities for JSONB ───────────────────────────────────────
    clean_entities = [
        {
            "entity_id":         e.get("entity_id"),
            "name":              e.get("name"),
            "type":              e.get("type"),
            "formatted_address": e.get("formatted_address"),
        }
        for e in entities
    ]

    return {
        # Identity
        "phq_id":          phq_id,

        # Core
        "title":           title,
        "description":     raw.get("description") or None,
        "category":        raw.get("category", "unknown"),
        "labels":          raw.get("labels") or [],

        # Temporal
        "start_dt":        _iso_to_utc(start),
        "end_dt":          _iso_to_utc(raw.get("end")),
        "timezone":        raw.get("timezone") or None,

        # Spatial — PostgREST expects WKT for geography columns
        "coords":          coords_wkt,

        # Location strings
        "country":         country_code,
        "country_name":    ASEAN_COUNTRIES.get(country_code, country_code),
        "state":           state,
        "city":            city,
        "venue_name":      venue_name,
        "venue_address":   venue_address,

        # PHQ signals
        "scope":           raw.get("scope") or None,
        "rank":            raw.get("rank") or None,
        "local_rank":      raw.get("local_rank") or None,
        "aviation_rank":   raw.get("aviation_rank") or None,
        "phq_attendance":  raw.get("phq_attendance") or None,
        "predicted_spend": float(predicted_spend) if predicted_spend is not None else None,
        "currency":        raw.get("currency") or None,

        # JSONB
        "entities":        clean_entities,
        "raw_data":        raw,  # full payload — useful for debugging / future columns
    }
