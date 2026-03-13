/**
 * hooks/useExploreSearch.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Encapsulates all search, map-animation, and landmark-fetch logic for the
 * ExploreScreen. Uses only real Supabase data — no mock data, no hardcoded
 * destination coordinates.
 *
 * Search strategy:
 *  • destination is "Nearby" or "Top nearest"
 *    → request GPS → landmarks_near(gpsCoords, 50 km)
 *  • explicit GPS coords passed alongside a "nearby" destination
 *    → landmarks_near(coords, 50 km)
 *  • everything else (country names, city names, landmark text)
 *    → landmarks_search(query_text) — ILIKE on region + name
 *
 * Public API:
 *   experiences      – current CulturalExperience[] shown in the sheet
 *   loading          – true while a fetch is in flight
 *   activeFilter     – destination name string while a filter is active, else null
 *   initialFetch     – call once on mount; fetches nearest landmarks via GPS
 *   handleSearch     – animates map, fetches matching landmarks
 *   handleReset      – clears filter, restores nearest landmarks
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useState } from 'react';
import type { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { buildPhotoUrl } from '@/lib/places';
import type { CulturalExperience } from '@/types';
import type { LandmarkNear } from '@/types/database';

// Fallback region used ONLY for map animation when GPS is unavailable.
// Never used to filter search queries.
const FALLBACK_REGION: Region = {
  latitude:      4.2105,
  longitude:     108.9758,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

// Wide-world region used to animate the map before text-search results arrive.
const WORLD_REGION: Region = {
  latitude:      10,
  longitude:     100,
  latitudeDelta: 60,
  longitudeDelta: 80,
};

// "Near me" labels — the ONLY case where we do a proximity search.
const NEARBY_LABELS = new Set(['Nearby', 'Top nearest']);

// ─── Row → CulturalExperience mapper ─────────────────────────────────────────

function mapCategory(cat: string): string {
  switch (cat) {
    case 'Food':   return 'Culinary';
    case 'Nature': return 'Community';
    default:       return 'Traditions';
  }
}

function mapRow(row: LandmarkNear): CulturalExperience {
  const coords = row.coords_json
    ? { latitude: row.coords_json.coordinates[1], longitude: row.coords_json.coordinates[0] }
    : undefined;

  // buildPhotoUrl handles all formats: new resource names, legacy refs, and full https URLs.
  const primaryUrl  = row.primary_photo ? buildPhotoUrl(row.primary_photo, { maxWidth: 600 }) : '';
  const allUrls     = (row.all_photos ?? []).map(ref => buildPhotoUrl(ref, { maxWidth: 600 })).filter(Boolean);
  const rawPhotoRef = row.primary_photo && !row.primary_photo.startsWith('http')
    ? row.primary_photo : undefined;

  const regionParts = row.region.split(',');
  const country = regionParts[regionParts.length - 1].trim();

  const distanceStr = row.distance_m > 0
    ? `${row.distance_m >= 1000
        ? `${(row.distance_m / 1000).toFixed(1)} km`
        : `${Math.round(row.distance_m)} m`} · ${row.region}`
    : row.region;

  return {
    id:           row.place_id ?? row.id,
    title:        row.name,
    imageUrl:     primaryUrl,
    rawPhotoRef,
    distance:     distanceStr,
    bridgeRating: row.avg_rating ?? 0,
    category:     mapCategory(row.category),
    location:     coords ?? { latitude: 0, longitude: 0 },
    country,
    distance_m:   row.distance_m,
    photos:       allUrls.length > 0 ? allUrls : (primaryUrl ? [primaryUrl] : []),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseExploreSearchReturn {
  experiences: CulturalExperience[];
  loading: boolean;
  activeFilter: string | null;
  initialFetch: () => Promise<void>;
  /**
   * @param mapRef      – ref to the MapView for camera animation
   * @param destination – display name / search query string
   * @param coords      – user's GPS coords. Only used when destination is a nearby
   *                      label ("Nearby", "Top nearest"). For text destinations
   *                      (country names, etc.) coords are intentionally ignored so
   *                      the text search always runs correctly.
   */
  handleSearch: (
    mapRef: React.RefObject<any>,
    destination: string,
    coords?: { latitude: number; longitude: number },
  ) => Promise<void>;
  handleReset: (mapRef: React.RefObject<any>) => Promise<void>;
}

export function useExploreSearch(): UseExploreSearchReturn {
  const [experiences,  setExperiences]  = useState<CulturalExperience[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ── Low-level fetch helpers ────────────────────────────────────────────────

  /** Proximity search: returns landmarks sorted by distance from (lat, lng). */
  const fetchByCoords = useCallback(async (
    lat: number,
    lng: number,
    radiusM = 50_000,
  ): Promise<CulturalExperience[]> => {
    const { data, error } = await supabase.rpc('landmarks_near', {
      user_lat:    lat,
      user_lng:    lng,
      radius_m:    radiusM,
      max_results: 60,
    });
    if (error || !data) return [];
    return (data as LandmarkNear[]).map(mapRow);
  }, []);

  /** Text search: ILIKE match on landmark name + region (country / city names). */
  const fetchByText = useCallback(async (query: string): Promise<CulturalExperience[]> => {
    const { data, error } = await (supabase as any).rpc('landmarks_search', {
      query_text:  query,
      max_results: 60,
    });
    if (error || !data) return [];
    return (data as LandmarkNear[]).map(mapRow);
  }, []);

  // ── GPS helper ─────────────────────────────────────────────────────────────

  const getGpsCoords = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return null;
    }
  }, []);

  // ── Initial fetch (on mount) ───────────────────────────────────────────────

  const initialFetch = useCallback(async () => {
    setLoading(true);
    try {
      const gps = await getGpsCoords();
      const lat = gps?.latitude  ?? FALLBACK_REGION.latitude;
      const lng = gps?.longitude ?? FALLBACK_REGION.longitude;
      // Global radius → sorted closest-first regardless of locale
      const results = await fetchByCoords(lat, lng, 20_000_000);
      setExperiences(results);
    } finally {
      setLoading(false);
    }
  }, [fetchByCoords, getGpsCoords]);

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (
    mapRef: React.RefObject<any>,
    destination: string,
    coords?: { latitude: number; longitude: number },
  ) => {
    setActiveFilter(destination);
    setLoading(true);

    if (NEARBY_LABELS.has(destination)) {
      // ── Proximity search: user wants things physically near them ─────────
      // Use explicitly-passed coords first; otherwise request GPS now.
      const gps = coords ?? (await getGpsCoords());
      const center = gps ?? { latitude: FALLBACK_REGION.latitude, longitude: FALLBACK_REGION.longitude };

      mapRef.current?.animateToRegion(
        { ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        800,
      );

      try {
        const results = await fetchByCoords(center.latitude, center.longitude, 50_000);
        setExperiences(results);
      } finally {
        setLoading(false);
      }
    } else {
      // ── Text search: country ("Japan"), city, landmark name ──────────────
      // coords are the USER's location, NOT the destination — never use them
      // for filtering here, otherwise Japan returns 0 results when searched
      // from Malaysia.
      mapRef.current?.animateToRegion(WORLD_REGION, 600);

      try {
        const results = await fetchByText(destination);
        setExperiences(results);

        // Fly map to the first result's location once data arrives
        if (results.length > 0) {
          const first = results[0];
          if (first.location.latitude !== 0 || first.location.longitude !== 0) {
            mapRef.current?.animateToRegion(
              {
                latitude:       first.location.latitude,
                longitude:      first.location.longitude,
                latitudeDelta:  10,
                longitudeDelta: 10,
              },
              800,
            );
          }
        }
      } finally {
        setLoading(false);
      }
    }
  }, [fetchByCoords, fetchByText, getGpsCoords]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = useCallback(async (mapRef: React.RefObject<any>) => {
    setActiveFilter(null);
    setLoading(true);
    try {
      const gps = await getGpsCoords();
      const lat = gps?.latitude  ?? FALLBACK_REGION.latitude;
      const lng = gps?.longitude ?? FALLBACK_REGION.longitude;
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.1, longitudeDelta: 0.1 },
        600,
      );
      const results = await fetchByCoords(lat, lng, 20_000_000);
      setExperiences(results);
    } finally {
      setLoading(false);
    }
  }, [fetchByCoords, getGpsCoords]);

  return { experiences, loading, activeFilter, initialFetch, handleSearch, handleReset };
}
