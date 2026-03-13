import { useState, useCallback, useRef } from 'react';
import { Region } from 'react-native-maps';
import { PlaceLandmark } from '../types';
import { fetchNearbyAttractions } from '../lib/places';
import { MAX_SEARCH_RADIUS_M, MIN_SEARCH_RADIUS_M } from '../constants/config';

// 1 degree of latitude ≈ 111 km
const DEG_TO_METERS = 111_000;

/**
 * Minimum fraction of the fetch radius the map center must move before
 * a new API request is issued. Prevents re-fetching on tiny pans / scroll
 * overshoots / the automatic onRegionChangeComplete that fires right after
 * the mount-time animateToRegion.
 */
const MOVE_THRESHOLD_FRACTION = 0.30;

/**
 * Minimum fractional change in radius before a re-fetch is triggered
 * when the user zooms in/out without panning meaningfully.
 */
const RADIUS_CHANGE_THRESHOLD = 0.40;

interface UsePlacesSearchReturn {
  landmarks: PlaceLandmark[];
  loading: boolean;
  error: string | null;
  fetchPlaces: (region: Region) => Promise<void>;
  /** Clears all fetched landmarks immediately (e.g. when POI filter is disabled) */
  clearLandmarks: () => void;
}

/**
 * Fetches tourist attractions from the Google Places Nearby Search API
 * for the given map region.  Automatically cancels in-flight requests
 * when a new one starts (via AbortController).
 *
 * Each returned PlaceLandmark now includes:
 *   - heroPhoto  → first photo_reference from Google (use buildPhotoUrl() to render)
 *   - photos     → all photo_references for a full gallery
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [landmarks, setLandmarks] = useState<PlaceLandmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current AbortController so we can cancel stale requests
  const abortRef = useRef<AbortController | null>(null);

  // Track the last successfully-initiated fetch so we can skip redundant requests
  // when the map hasn't moved beyond the movement threshold.
  const lastFetchRef = useRef<{ lat: number; lng: number; radiusM: number } | null>(null);

  const fetchPlaces = useCallback(async (region: Region) => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

    // Convert the smaller map-delta to a radius in metres
    const rawRadius = Math.min(latitudeDelta, longitudeDelta) * 0.5 * DEG_TO_METERS;
    const radius = Math.round(
      Math.min(Math.max(rawRadius, MIN_SEARCH_RADIUS_M), MAX_SEARCH_RADIUS_M)
    );

    // ── Movement threshold guard ────────────────────────────────────────────────
    // Skip the API call if the center hasn't moved significantly relative to
    // the previous fetch.  This eliminates:
    //  • The duplicate onRegionChangeComplete that fires after animateToRegion
    //  • Fetches triggered by small scroll overshoots or rubber-band bounce
    const last = lastFetchRef.current;
    if (last) {
      const metersPerLng = DEG_TO_METERS * Math.cos(latitude * (Math.PI / 180));
      const dLat = Math.abs(latitude  - last.lat) * DEG_TO_METERS;
      const dLng = Math.abs(longitude - last.lng) * metersPerLng;
      const distanceMoved = Math.sqrt(dLat * dLat + dLng * dLng);
      const radiusChanged = Math.abs(radius - last.radiusM) / last.radiusM;
      if (
        distanceMoved < last.radiusM * MOVE_THRESHOLD_FRACTION &&
        radiusChanged   < RADIUS_CHANGE_THRESHOLD
      ) {
        return; // Region hasn't changed enough — skip the billable API call
      }
    }
    lastFetchRef.current = { lat: latitude, lng: longitude, radiusM: radius };
    // ─────────────────────────────────────────────────────────

    try {
      setLoading(true);
      setError(null);

      const places = await fetchNearbyAttractions(
        latitude,
        longitude,
        radius,
        controller.signal,
      );

      // Map NearbyPlace → PlaceLandmark (which extends Landmark used by the map).
      // Variable named mappedLandmarks to avoid shadowing the state `landmarks`.
      const mappedLandmarks: PlaceLandmark[] = places.map(p => ({
        id:               p.placeId,
        name:             p.name,
        snippet:          p.vicinity,
        coords:           p.coords,
        hasCulturalTip:   false,          // enriched separately by useCulturalTips
        rating:           p.rating,
        userRatingsTotal: p.userRatingsTotal,
        priceLevel:       p.priceLevel,
        openNow:          p.openNow,
        businessStatus:   p.businessStatus,
        types:            p.types,
        heroPhoto:        p.heroPhoto,    // first photo_reference for card thumbnails
        photos:           p.photos,       // all photo_references for gallery
      }));

      setLandmarks(mappedLandmarks);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLandmarks = useCallback(() => {
    // Also cancel any in-flight request and reset the dedup ref so the next
    // fetch after re-enabling POI always fires regardless of last position.
    abortRef.current?.abort();
    lastFetchRef.current = null;
    setLandmarks([]);
  }, []);

  return { landmarks, loading, error, fetchPlaces, clearLandmarks };
}
