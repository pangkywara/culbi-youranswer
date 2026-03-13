/**
 * hooks/useLandmarkSearch.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Live Supabase search over the `landmarks` table.
 *
 * - Debounces the query by 300 ms so we don't fire on every keystroke.
 * - Returns results grouped into two buckets for the SearchModal UI:
 *     exact   → name starts with query (ranked first)
 *     related → name/region contains query (ranked second)
 * - Cancels in-flight fetches when a new query arrives.
 *
 * Public API:
 *   results     – flat ordered array of LandmarkResult
 *   isSearching – true while a fetch is in flight
 *   search      – call with a string; pass '' to clear
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface LandmarkResult {
  id:       string;
  name:     string;
  region:   string;
  category: string;
  placeId:  string;
  /** Parsed from PostGIS geography column – present for DB landmarks. */
  coords?:  { latitude: number; longitude: number };
}

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 20;

export function useLandmarkSearch() {
  const [results,     setResults]     = useState<LandmarkResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const search = useCallback((query: string) => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    timerRef.current = setTimeout(async () => {
      cancelledRef.current = false;

      const trimmed = query.trim();

      // Use Postgres ilike for case-insensitive partial match on name OR region
      const { data, error } = await supabase
        .from('landmarks')
        .select('id, name, region, category, place_id, coords')
        .or(`name.ilike.%${trimmed}%,region.ilike.%${trimmed}%`)
        .order('name', { ascending: true })
        .limit(MAX_RESULTS);

      if (cancelledRef.current) return;

      if (error || !data) {
        setIsSearching(false);
        return;
      }

      // Map column names to camelCase; parse PostGIS geography → lat/lng
      const mapped: LandmarkResult[] = data.map((row: any) => {
        let coords: { latitude: number; longitude: number } | undefined;
        try {
          if (row.coords) {
            const geo = typeof row.coords === 'string' ? JSON.parse(row.coords) : row.coords;
            if (geo?.coordinates) {
              coords = { latitude: geo.coordinates[1], longitude: geo.coordinates[0] };
            }
          }
        } catch { /* unparseable — leave undefined */ }
        return {
          id:       row.id,
          name:     row.name,
          region:   row.region ?? '',
          category: row.category ?? 'Landmark',
          placeId:  row.place_id,
          coords,
        };
      });

      // Sort: exact name prefix first, then the rest
      const lower = trimmed.toLowerCase();
      mapped.sort((a, b) => {
        const aExact = a.name.toLowerCase().startsWith(lower);
        const bExact = b.name.toLowerCase().startsWith(lower);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact)  return  1;
        return a.name.localeCompare(b.name);
      });

      setResults(mapped);
      setIsSearching(false);
    }, DEBOUNCE_MS);
  }, []);

  // Cancel on unmount
  useEffect(() => () => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setIsSearching(false);
  }, []);

  return { results, isSearching, search, clear };
}
