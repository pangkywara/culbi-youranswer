import Constants from 'expo-constants';

// EXPO_PUBLIC_* vars are inlined by Metro at build time.
// The Constants.expoConfig.extra path is kept as a secondary fallback
// for when the key is injected via app.json "extra" (e.g. EAS Build).
export const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
  Constants.expoConfig?.extra?.GOOGLE_PLACES_API_KEY ??
  '';

/** Base URL of the Python Gemini backend (no trailing slash) */
export const GEMINI_BACKEND_URL: string =
  process.env.EXPO_PUBLIC_GEMINI_BACKEND_URL ??
  (Constants.expoConfig?.extra?.GEMINI_BACKEND_URL as string) ??
  'http://localhost:8000';

/** Shared API key sent as X-API-Key on every backend request */
export const BACKEND_API_KEY: string =
  process.env.EXPO_PUBLIC_BACKEND_API_KEY ??
  (Constants.expoConfig?.extra?.BACKEND_API_KEY as string) ??
  '';

/** Google Cloud Vision API key — used for landmark detection */
export const GOOGLE_CLOUD_VISION_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY ??
  Constants.expoConfig?.extra?.GOOGLE_CLOUD_VISION_API_KEY ??
  '';