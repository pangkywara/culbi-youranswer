import type { Rarity } from "@/components/Collections/Cards/constants";

// ─── Haversine Distance (km) ──────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Weighted-random rarity tables ────────────────────────────────────────────
// Each row: [Common, Rare, Epic, Legends, Mythic, Secret] cumulative weights.
// Farther distances shift probability toward rarer tiers.

const RARITY_ORDER: Rarity[] = [
  "Common",
  "Rare",
  "Epic",
  "Legends",
  "Mythic",
  "Secret",
];

type WeightRow = [number, number, number, number, number, number];

const TABLES: { maxKm: number; weights: WeightRow }[] = [
  { maxKm: 10, weights: [60, 25, 10, 4, 0.8, 0.2] },
  { maxKm: 100, weights: [35, 30, 20, 10, 4, 1] },
  { maxKm: 1000, weights: [15, 25, 30, 20, 8, 2] },
  { maxKm: Infinity, weights: [5, 15, 25, 30, 20, 5] },
];

const FALLBACK_WEIGHTS: WeightRow = [40, 30, 18, 8, 3, 1];

function pickRarity(weights: WeightRow): Rarity {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITY_ORDER[i];
  }
  return "Common";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function determineRarity(
  userLat: number | null | undefined,
  userLon: number | null | undefined,
  landmarkLat: number | null | undefined,
  landmarkLon: number | null | undefined,
): Rarity {
  if (
    userLat == null ||
    userLon == null ||
    landmarkLat == null ||
    landmarkLon == null
  ) {
    return pickRarity(FALLBACK_WEIGHTS);
  }

  const km = haversineKm(userLat, userLon, landmarkLat, landmarkLon);
  const table = TABLES.find((t) => km <= t.maxKm) ?? TABLES[TABLES.length - 1];
  return pickRarity(table.weights);
}
