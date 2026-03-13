export interface Landmark {
  id: string;
  name: string;
  snippet: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

/** A single photo reference as returned by Google Places API */
export interface PlacePhoto {
  /** Opaque reference string – pass to buildPhotoUrl() from lib/places.ts */
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
}

/** A landmark fetched from Google Places API, optionally enriched by our backend */
export interface PlaceLandmark extends Landmark {
  hasCulturalTip: boolean;  // true if our backend has a Cultural Bridge tip for this place
  rating?: number;          // Google Places rating (0-5)
  userRatingsTotal?: number;
  priceLevel?: number;      // 0-4
  openNow?: boolean;
  businessStatus?: string;  // 'OPERATIONAL' | 'CLOSED_TEMPORARILY'
  types?: string[];         // e.g. ['tourist_attraction', 'point_of_interest']
  /** Hero photo (first photo returned by Google) for card thumbnails */
  heroPhoto: PlacePhoto | null;
  /** All photos returned by the Nearby Search result (≤ 10) */
  photos: PlacePhoto[];
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  competenceLevel: number; // 0-100
}

export interface BridgeVisit {
  id: string;
  landmarkName: string;
  date: string;
  culturalInsight: string;
}

export interface CulturalExperience {
  id: string;
  title: string;
  imageUrl: string;
  /** Raw Google photo_reference (not yet passed through buildPhotoUrl). Used when
   * recording a view to recently_viewed so the DB stores the reference, not the
   * full CDN URL which embeds an API key. Optional — may be absent for records
   * sourced from the recently_viewed table itself. */
  rawPhotoRef?: string;
  distance: string;
  bridgeRating: number; // 0-5
  category: string;
  location: {
    latitude: number;
    longitude: number;
  };
  /** Country extracted from the landmark region string, e.g. "Indonesia", "Malaysia" */
  country?: string;
  /** Raw distance in metres from the user — used for sorting country sections */
  distance_m?: number;
  /** ISO 8601 timestamp of when the item was viewed — populated from the
   * `recently_viewed` table's `viewed_at` column. Used for date-group headers
   * on the full Recently Viewed screen. */
  viewedAt?: string;
  /** All renderable photo URLs for the carousel (at least [imageUrl] when available). */
  photos?: string[];
}

export interface ExploreCategory {
  id: string;
  name: string;
  icon: string;
}