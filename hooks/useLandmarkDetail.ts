/**
 * hooks/useLandmarkDetail.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Production Architecture — three-layer data fetch for a single destination:
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │  Layer 1 · SUPABASE  (Source of Truth)                                  │
 *  │  Query: landmarks WHERE place_id = :id                                  │
 *  │  Returns: cultural rules, facts, category, region                       │
 *  │  Decision: isBridgeEnabled = (landmark !== null)                        │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │  Layer 2 · GOOGLE PLACES  (Media Provider)                              │
 *  │  Query: fetchPlaceDetails(placeId)                                      │
 *  │  Returns: photos, live rating, address, hours, reviews                  │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │  Layer 3 · GEMINI  (Intelligence Layer)                                 │
 *  │  Delivered via: landmark_rules (Supabase) presented in ThingsToKnow     │
 *  │  & deep-linked to the Culbi AI chatbot for live cultural questions       │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * Both Layer 1 + 2 fetches run in parallel via Promise.allSettled so a
 * failure in one never blocks the other.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchPlaceDetails } from '@/lib/places';
import type { LandmarkFull } from '@/types/database';
import type { PlaceDetail } from '@/lib/places';

// ── Module-level Place Details cache ────────────────────────────────────────────────
// Persists across component re-mounts within the session. Places Details is
// the most expensive Google Places SKU; opening the same destination N times
// should only bill once.
// Cap at MAX_CACHE_SIZE entries (FIFO eviction) to bound memory usage.
const MAX_CACHE_SIZE = 50;
const detailCache = new Map<string, PlaceDetail>();

function cacheDetail(placeId: string, value: PlaceDetail): void {
  if (detailCache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest entry (Map iteration order = insertion order)
    detailCache.delete(detailCache.keys().next().value!);
  }
  detailCache.set(placeId, value);
}
// ─────────────────────────────────────────────────────────────────────────

// ─── Public return type ───────────────────────────────────────────────────────

export interface LandmarkDetail {
  isLoading: boolean;
  error:     string | null;
  /**
   * TRUE when a record exists in `landmarks` with this place_id.
   * This is the Supabase "Source of Truth" gate — only show Bridge features
   * when this is true.
   */
  isBridgeEnabled: boolean;
  /**
   * Supabase data — cultural rules, facts, category, region.
   * null → place is not in our landmarks database.
   */
  landmark: LandmarkFull | null;
  /**
   * Google Places data — photos, live rating, address, reviews, opening hours.
   * null → Google API unavailable or key not configured.
   */
  detail: PlaceDetail | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLandmarkDetail(placeId: string): LandmarkDetail {
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [landmark,  setLandmark]  = useState<LandmarkFull | null>(null);
  // Seed from cache immediately so above-fold content renders before network round-trip
  const [detail,    setDetail]    = useState<PlaceDetail | null>(
    () => detailCache.get(placeId) ?? null
  );

  useEffect(() => {
    if (!placeId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);

      // Check module-level cache before hitting Google
      const cached = detailCache.get(placeId);

      // ── Both layers run in parallel ──────────────────────────────────────
      const [supabaseResult, googleResult] = await Promise.allSettled([
        // Layer 1: Supabase — cultural truth (rules, facts, photos, db reviews)
        supabase
          .from('landmarks')
          .select('*, landmark_rules(*), landmark_facts(*), landmark_photos(*), landmark_reviews(*)')
          .eq('place_id', placeId)
          .maybeSingle(),

        // Layer 2: Google — serve from cache when available; zero billable calls on repeat visits
        cached
          ? Promise.resolve(cached)
          : fetchPlaceDetails(placeId, controller.signal),
      ]);

      if (cancelled) return;

      // ── Process Layer 1 ──────────────────────────────────────────────────
      if (
        supabaseResult.status === 'fulfilled' &&
        !supabaseResult.value.error
      ) {
        const rawLandmark = supabaseResult.value.data as LandmarkFull | null;
        // Normalise bare Google photo refs to full resource names so every
        // downstream caller (Photos.tsx, HeroHeader, destinations/[id]) can
        // pass them straight to buildPhotoUrl without knowing place_id.
        if (rawLandmark?.landmark_photos) {
          rawLandmark.landmark_photos = rawLandmark.landmark_photos.map(p => ({
            ...p,
            url_or_ref:
              p.source === 'google' &&
              !p.url_or_ref.startsWith('http') &&
              !p.url_or_ref.startsWith('places/')
                ? `places/${placeId}/photos/${p.url_or_ref}`
                : p.url_or_ref,
          }));
        }
        setLandmark(rawLandmark ?? null);
      } else if (supabaseResult.status === 'rejected') {
        console.warn('[useLandmarkDetail] Supabase fetch failed:', supabaseResult.reason);
      }

      // ── Process Layer 2 ──────────────────────────────────────────────────
      if (googleResult.status === 'fulfilled') {        // Persist to cache so subsequent opens of the same destination are free
        if (!cached) cacheDetail(placeId, googleResult.value);        setDetail(googleResult.value);
      } else {
        // Non-fatal — app still works without Google data
        console.warn('[useLandmarkDetail] Google Places fetch failed:', googleResult.reason);
      }

      if (!cancelled) setIsLoading(false);
    }

    load().catch(e => {
      if (!cancelled) {
        setError(e?.message ?? 'Failed to load destination');
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [placeId]);

  return {
    isLoading,
    error,
    isBridgeEnabled: landmark !== null,
    landmark,
    detail,
  };
}
