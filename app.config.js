/**
 * app.config.js — Dynamic Expo config
 */
require('dotenv').config();

module.exports = ({ config }) => ({
  ...config,

  // ── Plugins ─────────────────────────────────────────────────────────────
  // Add the expo-video plugin here
  plugins: [
    ...(config.plugins || []), // Keep any existing plugins from app.json
    "expo-asset",
    [
      "expo-video",
      {
        "supportsBackgroundPlayback": true,
        "supportsPictureInPicture": true
      }
    ],
  ],

  // ── iOS ─────────────────────────────────────────────────────────────────
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    },
  },

  // ── Android ─────────────────────────────────────────────────────────────
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
});