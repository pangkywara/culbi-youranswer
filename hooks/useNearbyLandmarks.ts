import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { LandmarkNear } from '@/types/database';
import { buildPhotoUrl } from '@/lib/places';
import { CulturalExperience } from '@/types';

interface UseNearbyLandmarksReturn {
  experiences: CulturalExperience[];
  loading: boolean;
  error: string | null;
  /** Fetches landmarks and returns the mapped results; also updates `experiences` state. */
  fetchNearby: (lat: number, lng: number, radiusMetres?: number) => Promise<CulturalExperience[]>;
}

/** Maps a LandmarkCategory string to the app's CulturalExperience category label. */
function mapCategory(cat: string): string {
  switch (cat) {
    case 'Food':     return 'Culinary';
    case 'Nature':   return 'Community';
    default:         return 'Traditions';
  }
}

/**
 * Fetches seeded landmarks from Supabase via the `landmarks_near` RPC.
 * Results are already sorted ascending by distance_m (closest first).
 *
 * primary_photo is a Google photo_reference — pass it through buildPhotoUrl()
 * to get a renderable image URL.
 */
export function useNearbyLandmarks(): UseNearbyLandmarksReturn {
  const [experiences, setExperiences] = useState<CulturalExperience[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetchNearby = useCallback(async (
    lat: number,
    lng: number,
    radiusMetres = 20_000_000, // 20,000 km — returns all DB landmarks sorted closest-first
  ) => {
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('landmarks_near', {
      user_lat:    lat,
      user_lng:    lng,
      radius_m:    radiusMetres,
      max_results: 60,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return [];
    }

    const rows = (data ?? []) as LandmarkNear[];

    const mapped: CulturalExperience[] = rows.map(row => {
      // coords_json is a GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
      const coords = row.coords_json
        ? {
            latitude:  row.coords_json.coordinates[1],
            longitude: row.coords_json.coordinates[0],
          }
        : null;

      // primary_photo may be a new resource name ("places/…"), a legacy
      // opaque photo_reference, or already a full https:// URL.
      // buildPhotoUrl() handles all three cases automatically.
      const imageUrl = row.primary_photo
        ? buildPhotoUrl(row.primary_photo, { maxWidth: 600 })
        : null;

      // distance label: "1.2 km" or "850 m"
      const distanceLabel = row.distance_m >= 1000
        ? `${(row.distance_m / 1000).toFixed(1)} km`
        : `${Math.round(row.distance_m)} m`;

      // Keep the raw photo_reference around so recordViewFromExperience can
      // persist it without re-encoding an already-built CDN URL.
      const rawPhotoRef = row.primary_photo && !row.primary_photo.startsWith('http')
        ? row.primary_photo
        : undefined;

      // Extract country from "City, Country" format (last comma-separated part)
      const regionParts = row.region.split(',');
      const country = regionParts[regionParts.length - 1].trim();

      return {
        id:           row.place_id ?? row.id,  // place_id = Google place_id; required by [id].tsx + useLandmarkDetail
        title:        row.name,
        imageUrl:     imageUrl ?? '',
        rawPhotoRef,
        distance:     `${distanceLabel} · ${row.region}`,
        // avg_rating from landmark_reviews (null before backfill → show 0)
        bridgeRating: row.avg_rating ?? 0,
        category:     mapCategory(row.category),
        location:     coords ?? undefined,
        country,
        distance_m:   row.distance_m,
        // Build full URLs for all photos so the carousel has real images.
        // buildPhotoUrl() handles new resource names, legacy refs, and full URLs.
        photos: (row.all_photos ?? (imageUrl ? [imageUrl] : [])).map(ref =>
          buildPhotoUrl(ref, { maxWidth: 600 })
        ),
      } as CulturalExperience;
    });

    setExperiences(mapped);
    setLoading(false);
    return mapped;
  }, []);

  return { experiences, loading, error, fetchNearby };
}
