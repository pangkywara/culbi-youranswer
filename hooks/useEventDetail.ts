/**
 * hooks/useEventDetail.ts
 * ───────────────────────
 * Fetches a single ASEAN event from Supabase public.events by phq_id.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AseanEvent } from './useEvents';

export function useEventDetail(id: string) {
  const [event,   setEvent]   = useState<AseanEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await supabase
          .from('events')
          .select(
            'phq_id, title, description, category, labels, start_dt, end_dt, ' +
            'timezone, country, country_name, city, state, venue_name, venue_address, ' +
            'scope, rank, phq_attendance, image_url'
          )
          .eq('phq_id', id)
          .single();

        if (cancelled) return;

        if (err) throw err;

        const row = data as any;
        if (row) {
          setEvent({
            id:             row.phq_id,
            title:          row.title ?? '',
            description:    row.description ?? null,
            category:       row.category ?? '',
            labels:         Array.isArray(row.labels) ? row.labels : [],
            start_dt:       row.start_dt,
            end_dt:         row.end_dt ?? null,
            timezone:       row.timezone ?? null,
            country:        row.country ?? '',
            country_name:   row.country_name ?? '',
            city:           row.city ?? null,
            state:          row.state ?? null,
            venue_name:     row.venue_name ?? null,
            venue_address:  row.venue_address ?? null,
            scope:          row.scope ?? null,
            rank:           row.rank ?? null,
            phq_attendance: row.phq_attendance ?? null,
            image_url:      row.image_url ?? null,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvent();
    return () => { cancelled = true; };
  }, [id]);

  return { event, loading, error };
}
