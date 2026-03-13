// ─── App-wide constants ───────────────────────────────────────────────────────

/** Primary brand color used for Cultural Bridge indicators */
export const CULTURAL_BRIDGE_BLUE = '#213448';

// ─── Google Places API ───────────────────────────────────────────────────────

export { GOOGLE_PLACES_API_KEY } from './env';

export const PLACES_SEARCH_TYPE = 'tourist_attraction';
export const REGION_FETCH_DEBOUNCE_MS = 1200;
export const MAX_SEARCH_RADIUS_M = 10_000;  // 10 km — keeps result count low and prevents OOM from too many markers
export const MIN_SEARCH_RADIUS_M = 500;