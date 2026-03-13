/**
 * hooks/useEvents.ts
 * ─────────────────
 * Fetches ASEAN events from Supabase public.events.
 * Supports optional category and country filtering.
 * Data is read-only; uses the anonymous (public) key — RLS SELECT policy allows it.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Event shape returned from the DB ─────────────────────────────────────────

export interface AseanEvent {
  id: string;          // phq_id used as the unique key
  title: string;
  description: string | null;
  category: string;
  labels: string[];
  start_dt: string;    // ISO 8601
  end_dt: string | null;
  timezone: string | null;
  country: string;     // ISO alpha-2, e.g. "ID"
  country_name: string;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  venue_address: string | null;
  scope: string | null;
  rank: number | null;
  phq_attendance: number | null;
  image_url: string | null;
}

// ── Human-visible category display names ─────────────────────────────────────

export const EVENT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all',              label: 'All'           },
  { id: 'festivals',        label: 'Festivals'     },
  { id: 'sports',           label: 'Sports'        },
  { id: 'concerts',         label: 'Concerts'      },
  { id: 'expos',            label: 'Expos'         },
  { id: 'observances',      label: 'Observances'   },
  { id: 'conferences',      label: 'Conferences'   },
  { id: 'community',        label: 'Community'     },
  { id: 'performing-arts',  label: 'Performing Arts'},
];

// ── DB row → AseanEvent ───────────────────────────────────────────────────────

function toEvent(row: Record<string, any>): AseanEvent {
  return {
    id:            row.phq_id,
    title:         row.title ?? '',
    description:   row.description ?? null,
    category:      row.category ?? '',
    labels:        Array.isArray(row.labels) ? row.labels : [],
    start_dt:      row.start_dt,
    end_dt:        row.end_dt ?? null,
    timezone:      row.timezone ?? null,
    country:       row.country ?? '',
    country_name:  row.country_name ?? '',
    city:          row.city ?? null,
    state:         row.state ?? null,
    venue_name:    row.venue_name ?? null,
    venue_address: row.venue_address ?? null,
    scope:         row.scope ?? null,
    rank:          row.rank ?? null,
    phq_attendance: row.phq_attendance ?? null,
    image_url:     row.image_url ?? null,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseEventsOptions {
  /** 'all' or a specific category like 'festivals' */
  category?: string;
  /** ISO alpha-2 country code filter, e.g. "SG" */
  country?: string;
  limit?: number;
}

export function useEvents(options: UseEventsOptions = {}) {
  const { category = 'all', country, limit = 100 } = options;

  const [events,  setEvents]  = useState<AseanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('events')
        .select(
          'phq_id, title, description, category, labels, start_dt, end_dt, ' +
          'timezone, country, country_name, city, state, venue_name, venue_address, ' +
          'scope, rank, phq_attendance, image_url'
        )
        .order('start_dt', { ascending: true })
        .limit(limit);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error: sbError } = await query;

      if (sbError) throw new Error(sbError.message);
      setEvents((data ?? []).map(toEvent));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [category, country, limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns "Fri, 13 Apr 2026" */
export function formatEventDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day:     'numeric',
      month:   'short',
      year:    'numeric',
    });
  } catch {
    return isoDate;
  }
}

/** Returns "13 Apr – 17 Apr" or "13 Apr 2026" for single-day events */
export function formatEventDateRange(start: string, end?: string | null): string {
  try {
    const s = new Date(start);
    const sStr = s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (!end) return sStr;

    const eDate = new Date(end);
    // Same day
    if (s.toDateString() === eDate.toDateString()) {
      return s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const eStr = eDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${sStr} – ${eStr}`;
  } catch {
    return start;
  }
}

/** "MMM YYYY" for section headers, e.g. "Apr 2026" */
export function monthHeader(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}
