/**
 * hooks/useRecentlyViewed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages each user's "Recently viewed" destination history backed by the
 * Supabase `recently_viewed` table.
 *
 * Works for both anonymous (Supabase anonymous auth) and signed-in users.
 * Anonymous → signed-in identity linking keeps the same user_id, so history
 * is automatically preserved across the sign-in transition.
 *
 * Public API:
 *   recentlyViewed   – CulturalExperience[] ordered newest first (max 20)
 *   loadingHistory   – true while initial fetch is in progress
 *   recordView(lm)   – upserts a NearbyPlace into the table (fire-and-forget)
 *   clearHistory()   – deletes all rows for the current user
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { buildPhotoUrl } from '../lib/places';
import type { PlaceLandmark, CulturalExperience } from '../types';
import type { RecentlyViewed } from '../types/database';

const MAX_HISTORY = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a Google Places types[] to the app's CulturalExperience category */
function mapCategory(types: string[] | null): string {
  const t = new Set(types ?? []);
  if (t.has('food') || t.has('restaurant') || t.has('cafe') || t.has('bakery')) return 'Culinary';
  if (t.has('museum') || t.has('art_gallery') || t.has('library'))              return 'Traditions';
  if (t.has('park')   || t.has('natural_feature') || t.has('campground'))       return 'Community';
  if (t.has('place_of_worship') || t.has('hindu_temple') || t.has('mosque'))    return 'Traditions';
  return 'Traditions';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseRecentlyViewedReturn {
  recentlyViewed: CulturalExperience[];
  loadingHistory: boolean;
  recordView: (landmark: PlaceLandmark) => void;
  /** Record a view from a CulturalExperience (seeded / DB landmark). Simpler
   * than recordView — no PlaceLandmark conversion required. */
  recordViewFromExperience: (exp: CulturalExperience) => void;
  clearHistory: () => Promise<void>;
  /** Re-fetches history from Supabase. Call on screen focus to pick up views
   * recorded by [id].tsx while the home screen stayed mounted in background. */
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRecentlyViewed(): UseRecentlyViewedReturn {
  const [recentlyViewed, setRecentlyViewed] = useState<CulturalExperience[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  // Guard against recording the same placeId multiple times in the same session
  // before the async upsert resolves (rapid taps).
  const recordingRef    = useRef<Set<string>>(new Set());
  // Prevent re-fetching history when the same session re-fires auth events.
  const loadedForRef    = useRef<string | null>(null);

  // ── Fetch helper ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('*')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(MAX_HISTORY);

    if (error) {
      console.warn('[useRecentlyViewed] fetch error:', error.message);
      return;
    }

    const rows = (data ?? []) as unknown as RecentlyViewed[];
    const experiences: CulturalExperience[] = rows.map(row => ({
      id:           row.place_id,
      title:        row.place_name,
      imageUrl:     row.photo_reference
                      ? row.photo_reference.startsWith('http')
                        ? row.photo_reference
                        : buildPhotoUrl(row.photo_reference, { maxWidth: 600 })
                      : '',
      rawPhotoRef:  row.photo_reference && !row.photo_reference.startsWith('http')
                      ? row.photo_reference
                      : undefined,
      distance:     row.vicinity ?? '',
      bridgeRating: row.rating ?? 0,
      category:     mapCategory(row.place_types),
      location:     row.coords ?? { latitude: 0, longitude: 0 },
      viewedAt:     row.viewed_at,
    }));

    // Only update state if DB returned data OR state is currently empty.
    // Protects against a race where refresh() fires before the background
    // upsert completes, and would otherwise wipe the optimistic in-memory state.
    setRecentlyViewed(prev => (experiences.length === 0 && prev.length > 0 ? prev : experiences));
  }, []);

  // ── Subscribe to auth state — re-fetch whenever a session becomes active ─
  // This fixes the timing bug where the anonymous session is created AFTER
  // the component mounts, causing getSession() to return null on first render.
  useEffect(() => {
    let cancelled = false;

    // Subscribe to auth state changes (covers cold-start, token refresh, sign-in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (!session?.user) {
          // Signed out — clear history
          setRecentlyViewed([]);
          loadedForRef.current = null;
          setLoadingHistory(false);
          return;
        }
        // Avoid duplicate fetches for the same user across multiple events
        if (loadedForRef.current === session.user.id) return;
        loadedForRef.current = session.user.id;

        setLoadingHistory(true);
        try {
          await fetchHistory(session.user.id);
        } finally {
          if (!cancelled) setLoadingHistory(false);
        }
      }
    );

    // Also try an immediate getSession() in case the session already exists
    // (covers the case where the session was persisted from a previous app open).
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || cancelled) return;
        if (loadedForRef.current === session.user.id) return;
        loadedForRef.current = session.user.id;

        setLoadingHistory(true);
        await fetchHistory(session.user.id);
      } catch { /* network error — subscription will retry on reconnect */ }
      finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchHistory]);

  // ── (removed old single-shot mount effect — replaced by auth subscription) ─

  // ── Record a view (fire-and-forget, resilient) ───────────────────────────
  const recordView = useCallback((landmark: PlaceLandmark) => {
    // PlaceLandmark.id === Google place_id; .snippet === vicinity
    if (recordingRef.current.has(landmark.id)) return;
    recordingRef.current.add(landmark.id);

    // ── Optimistic update (instant) ──────────────────────────────────────
    // Fires immediately so the item appears in the UI regardless of whether
    // the background DB write succeeds (critical for anonymous users whose
    // sessions may not have DB write permissions).
    const newExperience: CulturalExperience = {
      id:           landmark.id,
      title:        landmark.name,
      imageUrl:     landmark.heroPhoto
                      ? buildPhotoUrl(landmark.heroPhoto.photoReference, { maxWidth: 600 })
                      : '',
      distance:     landmark.snippet,
      bridgeRating: landmark.rating ?? 0,
      category:     mapCategory(landmark.types ?? null),
      location:     landmark.coords,
    };
    setRecentlyViewed(prev => {
      const filtered = prev.filter(e => e.id !== landmark.id);
      return [newExperience, ...filtered].slice(0, MAX_HISTORY);
    });

    // ── Background DB write (best-effort) ────────────────────────────────
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const row = {
          user_id:         session.user.id,
          place_id:        landmark.id,
          place_name:      landmark.name,
          photo_reference: landmark.heroPhoto?.photoReference ?? null,
          vicinity:        landmark.snippet,
          rating:          landmark.rating ?? null,
          place_types:     landmark.types ?? null,
          coords:          landmark.coords,
          viewed_at:       new Date().toISOString(),
        };

        const { error } = await (supabase
          .from('recently_viewed') as any)
          .upsert(row, { onConflict: 'user_id,place_id', ignoreDuplicates: false });

        if (error) {
          console.warn('[useRecentlyViewed] upsert error:', error.message);
        }
      } catch (e: any) {
        console.warn('[useRecentlyViewed] unexpected error:', e?.message);
      } finally {
        recordingRef.current.delete(landmark.id);
      }
    })();
  }, []);

  // ── Record a view from a CulturalExperience (seeded DB landmark) ─────────
  const recordViewFromExperience = useCallback((exp: CulturalExperience) => {
    if (recordingRef.current.has(exp.id)) return;
    recordingRef.current.add(exp.id);

    // ── Optimistic update (instant) ──────────────────────────────────────
    setRecentlyViewed(prev => {
      const filtered = prev.filter(e => e.id !== exp.id);
      return [exp, ...filtered].slice(0, MAX_HISTORY);
    });

    // ── Background DB write (best-effort) ────────────────────────────────
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const row = {
          user_id:         session.user.id,
          place_id:        exp.id,
          place_name:      exp.title,
          photo_reference: exp.rawPhotoRef ?? exp.imageUrl ?? null,
          vicinity:        exp.distance,
          rating:          exp.bridgeRating > 0 ? exp.bridgeRating : null,
          place_types:     null,
          coords:          exp.location ?? null,
          viewed_at:       new Date().toISOString(),
        };

        const { error } = await (supabase
          .from('recently_viewed') as any)
          .upsert(row, { onConflict: 'user_id,place_id', ignoreDuplicates: false });

        if (error) {
          console.warn('[useRecentlyViewed] experience upsert error:', error.message);
        }
      } catch (e: any) {
        console.warn('[useRecentlyViewed] recordViewFromExperience error:', e?.message);
      } finally {
        recordingRef.current.delete(exp.id);
      }
    })();
  }, []);

  // ── Clear all history ────────────────────────────────────────────────────
  const clearHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('recently_viewed')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        console.warn('[useRecentlyViewed] clear error:', error.message);
        return;
      }

      setRecentlyViewed([]);
    } catch (e: any) {
      console.warn('[useRecentlyViewed] clear unexpected error:', e?.message);
    }
  }, []);

  // ── Refresh history from DB (call on screen focus) ───────────────────────
  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await fetchHistory(session.user.id);
    } catch { /* silently ignore */ }
  }, [fetchHistory]);

  return { recentlyViewed, loadingHistory, recordView, recordViewFromExperience, clearHistory, refresh };
}
