export type MapThemeKey = 'culbi' | 'dark' | 'minimal' | 'natural' | 'standard';

// Preview colour swatches used in the settings panel UI
export const MAP_THEME_PREVIEWS: Record<MapThemeKey, {
  label: string;
  colors: [string, string, string]; // [bg, road, water]
}> = {
  standard: { label: 'Standard',  colors: ['#E8E0D8', '#FFFFFF', '#9DC3D4'] },
  culbi:   { label: 'culbi',    colors: ['#EEEBE4', '#FFFFFF', '#E8F4F8'] },
  minimal:  { label: 'Minimal',   colors: ['#F5F5F5', '#EBEBEB', '#D8EDF5'] },
  dark:     { label: 'Dark',      colors: ['#242F3E', '#38414E', '#17263C'] },
  natural:  { label: 'Natural',   colors: ['#E5EDD4', '#F5F1E6', '#C8DFF0'] },
};

// ─── Dark Theme ───────────────────────────────────────────────────────────────
export const DARK_MAP_STYLE = [
  { featureType: 'all',      elementType: 'geometry',          stylers: [{ color: '#242F3E' }] },
  { featureType: 'all',      elementType: 'labels.text.fill',  stylers: [{ color: '#746855' }] },
  { featureType: 'all',      elementType: 'labels.text.stroke',stylers: [{ color: '#242F3E' }] },
  { featureType: 'water',    elementType: 'geometry',          stylers: [{ color: '#17263C' }] },
  { featureType: 'water',    elementType: 'labels.text.fill',  stylers: [{ color: '#515C6D' }] },
  { featureType: 'landscape',elementType: 'geometry',          stylers: [{ color: '#2A3545' }] },
  { featureType: 'road',               elementType: 'geometry',        stylers: [{ color: '#38414E' }] },
  { featureType: 'road',               elementType: 'geometry.stroke', stylers: [{ color: '#212A37' }] },
  { featureType: 'road',               elementType: 'labels.text.fill',stylers: [{ color: '#9CA5B3' }] },
  { featureType: 'road.highway',       elementType: 'geometry',        stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway',       elementType: 'geometry.stroke', stylers: [{ color: '#1F2835' }] },
  { featureType: 'road.highway',       elementType: 'labels.text.fill',stylers: [{ color: '#F3D19C' }] },
  { featureType: 'poi',      elementType: 'geometry',          stylers: [{ color: '#263040' }] },
  { featureType: 'poi',      elementType: 'labels.text.fill',  stylers: [{ color: '#D59563' }] },
  { featureType: 'poi.park', elementType: 'geometry',          stylers: [{ color: '#263C3F' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill',  stylers: [{ color: '#6B9A76' }] },
  { featureType: 'transit',  elementType: 'geometry',          stylers: [{ color: '#2F3948' }] },
  { featureType: 'transit.station',    elementType: 'labels.text.fill',stylers: [{ color: '#D59563' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#D59563' }] },
];

// ─── Minimal / Ultra-clean Theme ─────────────────────────────────────────────
export const MINIMAL_MAP_STYLE = [
  { featureType: 'all',      elementType: 'geometry',          stylers: [{ color: '#F5F5F5' }] },
  { featureType: 'water',    elementType: 'geometry',          stylers: [{ color: '#D8EDF5' }] },
  { featureType: 'landscape',elementType: 'geometry',          stylers: [{ color: '#EFEFEF' }] },
  { featureType: 'road',     elementType: 'geometry',          stylers: [{ color: '#EBEBEB' }] },
  { featureType: 'road',     elementType: 'geometry.stroke',   stylers: [{ color: '#E0E0E0' }, { weight: 0.5 }] },
  { featureType: 'road',     elementType: 'labels',            stylers: [{ visibility: 'off' }] },
  { featureType: 'poi',      elementType: 'all',               stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',  elementType: 'all',               stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#AAAAAA' }] },
];

// ─── Natural / Green Theme ────────────────────────────────────────────────────
export const NATURAL_MAP_STYLE = [
  { featureType: 'all',      elementType: 'geometry',          stylers: [{ color: '#E5EDD4' }] },
  { featureType: 'water',    elementType: 'geometry',          stylers: [{ color: '#C8DFF0' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#D4E6B5' }] },
  { featureType: 'landscape.man_made',elementType: 'geometry', stylers: [{ color: '#EAE4D4' }] },
  { featureType: 'road',     elementType: 'geometry',          stylers: [{ color: '#F5F1E6' }] },
  { featureType: 'road',     elementType: 'geometry.stroke',   stylers: [{ color: '#D6CDB8' }] },
  { featureType: 'road',     elementType: 'labels.text.fill',  stylers: [{ color: '#5A6A40' }] },
  { featureType: 'poi.park', elementType: 'geometry',          stylers: [{ color: '#B8D99C' }] },
  { featureType: 'poi',      elementType: 'labels.icon',       stylers: [{ saturation: -20 }, { lightness: 10 }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#4A6040' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#7A8F6A' }] },
];

// ─── Standard (default Google Maps) ─────────────────────────────────────────
export const STANDARD_MAP_STYLE: any[] = [];

export function getMapStyle(theme: MapThemeKey): any[] {
  switch (theme) {
    case 'dark':     return DARK_MAP_STYLE;
    case 'minimal':  return MINIMAL_MAP_STYLE;
    case 'natural':  return NATURAL_MAP_STYLE;
    case 'standard': return STANDARD_MAP_STYLE;
    case 'culbi':
    default:         return CULBI_MAP_STYLE;
  }
}

/**
 * - Light/Minimal geometry
 * - POIs and Transit VISIBLE (Muted saturation)
 * - Road names VISIBLE on all street levels
 */
export const CULBI_MAP_STYLE = [
  // 1. GLOBAL GEOMETRY - Base Background
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#FEFEFE' }],
  },
  // 2. WATER - Light Blue
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#E8F4F8' }],
  },
  // 3. LANDSCAPE - Very light beige
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#EEEBE4' }],
  },
  // 4. ROADS - White with subtle borders
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E6DECC' }, { weight: 0.5 }],
  },
  // 5. ROAD LABELS - VISIBLE (Crucial for navigation)
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#686868' }], // Soft grey for legibility
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }, { weight: 2 }],
  },
  // 6. POI (Points of Interest) - VISIBLE
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }], // Switched back to ON
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ saturation: -40 }, { lightness: 20 }], // Muted to stay on-brand
  },
  // 7. TRANSIT - VISIBLE
  {
    featureType: 'transit.station',
    elementType: 'all',
    stylers: [{ visibility: 'on' }], // Switched back to ON
  },
  // 8. ADMINISTRATIVE - Neighborhoods and Localities
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4A4A4A' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8F8F8F' }],
  },
];