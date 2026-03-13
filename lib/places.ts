/**
 * lib/places.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed Google Places API (New) client for Culbi.
 * Uses the v1 Places API (New) — NOT the legacy /maps/api/place endpoints.
 *
 * Three public surfaces:
 *   fetchNearbyAttractions(lat, lng, radiusM?)   → NearbyPlace[]
 *   buildPhotoUrl(photoReference, options?)       → string  (CDN-ready URL)
 *   fetchPlaceDetails(placeId)                   → PlaceDetail
 *
 * API base: https://places.googleapis.com/v1
 * Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview
 *
 * All network calls accept an optional AbortSignal so callers can cancel
 * stale in-flight requests (see usePlacesSearch.ts).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { GOOGLE_PLACES_API_KEY } from '../constants/config';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Internal Places API (New) response shapes
//    (only the fields we actually consume – keeps bundle lean)
// ─────────────────────────────────────────────────────────────────────────────

interface NewPhoto {
  /** Full resource name: "places/{id}/photos/{ref}" — used directly in media URL */
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{ displayName?: string; uri?: string }>;
}

interface NewDisplayName {
  text: string;
  languageCode?: string;
}

interface NewOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

interface NewEditorialSummary {
  text?: string;
  languageCode?: string;
}

interface NewReview {
  name?: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
}

/** Shared shape returned by both Nearby Search and Place Details (New) */
interface NewPlace {
  id: string;
  displayName?: NewDisplayName;
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;         // e.g. "PRICE_LEVEL_MODERATE"
  businessStatus?: string;     // e.g. "OPERATIONAL"
  currentOpeningHours?: NewOpeningHours;
  photos?: NewPhoto[];
  // Place Details-only fields
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  editorialSummary?: NewEditorialSummary;
  reviews?: NewReview[];
}

interface NewNearbySearchResponse {
  places?: NewPlace[];
  error?: { code: number; message: string; status: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Public types (re-exported so the rest of the app stays loosely coupled)
// ─────────────────────────────────────────────────────────────────────────────

/** A single photo reference as returned by Nearby Search / Details (New) */
export interface PlacePhoto {
  /**
   * Full resource name from Places API (New), e.g.:
   *   "places/ChIJN.../photos/AUc7tX..."
   * Pass directly to buildPhotoUrl().
   */
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
}

/** Normalised nearby-search result – what usePlacesSearch exposes */
export interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;
  coords: { latitude: number; longitude: number };
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  openNow?: boolean;
  businessStatus?: string;
  /** Hero photo (first element from Google's photos array) */
  heroPhoto: PlacePhoto | null;
  /** All photos returned by the API (up to 10 per Nearby Search result) */
  photos: PlacePhoto[];
}

/** Enriched result from Place Details – superset of NearbyPlace */
export interface PlaceDetail extends NearbyPlace {
  formattedAddress?: string;
  phoneNumber?: string;
  website?: string;
  googleMapsUrl?: string;
  overview?: string;
  weekdayText?: string[];
  reviews?: Array<{
    authorName: string;
    rating: number;
    text: string;
    relativeTime: string;
  }>;
}

export interface BuildPhotoUrlOptions {
  /** Max width in pixels (1–4800). Defaults to 800. */
  maxWidth?: number;
  /** Max height in pixels (1–4800). Omit to let Google decide. */
  maxHeight?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://places.googleapis.com/v1';

/** Common error guard */
function assertNoError(body: { error?: { message?: string; status?: string } }): void {
  if (body.error) {
    throw new Error(`Places API error [${body.error.status ?? 'UNKNOWN'}]: ${body.error.message ?? ''}`);
  }
}

/** Convert the new NewPhoto array to PlacePhoto[] */
function mapPhotos(raw?: NewPhoto[]): PlacePhoto[] {
  if (!raw?.length) return [];
  return raw.map(p => ({
    photoReference: p.name,        // full resource name used in media URL
    width: p.widthPx,
    height: p.heightPx,
    htmlAttributions: p.authorAttributions?.map(a => a.displayName ?? '').filter(Boolean) ?? [],
  }));
}

/** Parse legacy numeric price level from the new string enum */
function parsePriceLevel(raw?: string): number | undefined {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return raw ? map[raw] : undefined;
}

/** Normalise a NewPlace into NearbyPlace */
function toNearbyPlace(p: NewPlace): NearbyPlace {
  const photos = mapPhotos(p.photos);
  return {
    placeId: p.id,
    name: p.displayName?.text ?? '',
    vicinity: p.shortFormattedAddress ?? p.formattedAddress ?? '',
    coords: {
      latitude: p.location?.latitude ?? 0,
      longitude: p.location?.longitude ?? 0,
    },
    types: p.types ?? [],
    rating: p.rating,
    userRatingsTotal: p.userRatingCount,
    priceLevel: parsePriceLevel(p.priceLevel),
    openNow: p.currentOpeningHours?.openNow,
    businessStatus: p.businessStatus,
    heroPhoto: photos[0] ?? null,
    photos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search for a single place by text name and optional region hint.
 * Uses Places API (New) — POST /places:searchText
 *
 * Returns the first hit's photo reference and coordinates, or null when
 * no result is found.  Used by TripPlanBubble to enrich AI-generated stops
 * that aren't in the local landmark DB.
 */
export async function searchPlaceByName(
  name: string,
  regionHint?: string,
  signal?: AbortSignal,
): Promise<{ placeId: string | null; photoReference: string | null; latitude: number; longitude: number } | null> {
  const query = regionHint ? `${name}, ${regionHint}` : name;
  const fieldMask = [
    'places.id',
    'places.location',
    'places.photos',
  ].join(',');

  try {
    const res = await fetch(`${BASE}/places:searchText?key=${GOOGLE_PLACES_API_KEY}`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });

    if (!res.ok) return null;

    const json: NewNearbySearchResponse = await res.json();
    const place = json.places?.[0];
    if (!place) return null;

    const placeId = place.id ?? null;
    const photoRef = place.photos?.[0]?.name ?? null; // Places API (New) resource name
    const lat = place.location?.latitude ?? 0;
    const lng = place.location?.longitude ?? 0;

    return { placeId, photoReference: photoRef, latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}

/**
 * Fetches tourist attractions near the given coordinates.
 * Uses Places API (New) — POST /places:searchNearby
 *
 * @param latitude   - Center latitude
 * @param longitude  - Center longitude
 * @param radiusM    - Search radius in metres (default 5 000, max 50 000)
 * @param signal     - Optional AbortSignal for cancellation
 * @returns          Sorted array of NearbyPlace (by rating desc)
 */
export async function fetchNearbyAttractions(
  latitude: number,
  longitude: number,
  radiusM = 5_000,
  signal?: AbortSignal,
): Promise<NearbyPlace[]> {
  const clampedRadius = Math.min(Math.max(Math.round(radiusM), 500), 50_000);

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.shortFormattedAddress',
    'places.location',
    'places.types',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
    'places.currentOpeningHours',
    'places.businessStatus',
    'places.photos',
  ].join(',');

  const res = await fetch(`${BASE}/places:searchNearby?key=${GOOGLE_PLACES_API_KEY}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: clampedRadius,
        },
      },
      includedTypes: ['tourist_attraction'],
      maxResultCount: 20,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from Places Nearby Search`);

  const json: NewNearbySearchResponse = await res.json();
  assertNoError(json);

  const places = (json.places ?? [])
    .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map(toNearbyPlace);

  places.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return places;
}

/**
 * Builds a ready-to-use photo URL, handling all three reference formats:
 *
 * 1. Already a full URL (https://…) — returned as-is.
 * 2. Places API (New) resource name (starts with "places/") — uses the v1 media endpoint.
 * 3. Legacy opaque photo_reference — falls back to the legacy Photos endpoint.
 *
 * @param photoReference  Resource name, opaque ref, or direct URL
 * @param options         maxWidth / maxHeight in pixels
 * @returns               CDN URL safe for use in <Image source={{ uri }} />
 *
 * @example
 * // New resource name from Places API (New)
 * buildPhotoUrl('places/ChIJN.../photos/AUc7tX...', { maxWidth: 400 })
 * // Legacy ref stored in DB
 * buildPhotoUrl('AUc7tXoCFwulAQ...', { maxWidth: 600 })
 */
export function buildPhotoUrl(
  photoReference: string,
  { maxWidth = 800, maxHeight }: BuildPhotoUrlOptions = {},
): string {
  // Case 1: Already a resolved https/http URL — pass through unchanged.
  if (photoReference.startsWith('http://') || photoReference.startsWith('https://')) {
    return photoReference;
  }

  // Case 2: Places API (New) resource name — do NOT encode slashes, they are path delimiters.
  if (photoReference.startsWith('places/')) {
    let url =
      `${BASE}/${photoReference}/media` +
      `?maxWidthPx=${maxWidth}` +
      `&key=${GOOGLE_PLACES_API_KEY}`;
    if (maxHeight !== undefined) url += `&maxHeightPx=${maxHeight}`;
    return url;
  }

  // Case 3: Legacy opaque photo_reference (seeded from the old Places API).
  // The legacy Photos endpoint is used as a best-effort fallback; it requires
  // the "Places API" (legacy) to be enabled on the project.
  let url =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${maxWidth}` +
    `&photo_reference=${encodeURIComponent(photoReference)}` +
    `&key=${GOOGLE_PLACES_API_KEY}`;
  if (maxHeight !== undefined) url += `&maxheight=${maxHeight}`;
  return url;
}

/**
 * Fetches full details for a single place by its place_id.
 * Uses Places API (New) — GET /places/{placeId}
 *
 * @param placeId  - Google Places place_id
 * @param signal   - Optional AbortSignal for cancellation
 */
export async function fetchPlaceDetails(
  placeId: string,
  signal?: AbortSignal,
): Promise<PlaceDetail> {
  const fieldMask = [
    'id',
    'displayName',
    'shortFormattedAddress',
    'formattedAddress',
    'location',
    'types',
    'rating',
    'userRatingCount',
    'priceLevel',
    'currentOpeningHours',
    'businessStatus',
    'photos',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'googleMapsUri',
    'editorialSummary',
    'reviews',
  ].join(',');

  const res = await fetch(
    `${BASE}/places/${encodeURIComponent(placeId)}?key=${GOOGLE_PLACES_API_KEY}`,
    {
      signal,
      headers: {
        'X-Goog-FieldMask': fieldMask,
      },
    },
  );

  if (!res.ok) throw new Error(`HTTP ${res.status} from Places Details`);

  const json: NewPlace & { error?: { code: number; message: string; status: string } } = await res.json();
  assertNoError(json);

  const base = toNearbyPlace(json);

  return {
    ...base,
    formattedAddress: json.formattedAddress ?? json.shortFormattedAddress,
    phoneNumber: json.internationalPhoneNumber ?? json.nationalPhoneNumber,
    website: json.websiteUri,
    googleMapsUrl: json.googleMapsUri,
    overview: json.editorialSummary?.text,
    weekdayText: json.currentOpeningHours?.weekdayDescriptions,
    reviews: json.reviews?.map(rv => ({
      authorName: rv.authorAttribution?.displayName ?? 'Anonymous',
      rating: rv.rating ?? 0,
      text: rv.text?.text ?? '',
      relativeTime: rv.relativePublishTimeDescription ?? '',
    })),
  };
}
