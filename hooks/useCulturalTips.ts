import { useState, useCallback } from 'react';

interface UseCulturalTipsReturn {
  /** Call this after loading a batch of places to check which ones have tips */
  fetchTips: (placeIds: string[]) => Promise<void>;
  /** Returns true if the given place_id has a Cultural Bridge tip */
  hasTip: (placeId: string) => boolean;
}

/**
 * Checks our backend for "Cultural Bridge" tips associated with a set of
 * Google place IDs.
 *
 * Currently uses a mock implementation — replace `POST_TIPS_URL` and the
 * fetch call with your real backend endpoint.
 *
 * Expected backend contract:
 *   POST /api/cultural-tips
 *   Body:   { placeIds: string[] }
 *   Returns: { tipIds: string[] }  ← place_ids that have tips
 */

// 🔗 Replace with your real backend URL
const POST_TIPS_URL = 'https://your-api.example.com/api/cultural-tips';

export function useCulturalTips(): UseCulturalTipsReturn {
  const [tipIds, setTipIds] = useState<Set<string>>(new Set());

  const fetchTips = useCallback(async (placeIds: string[]) => {
    if (placeIds.length === 0) return;

    try {
      // ── Real implementation (uncomment when backend is live) ──────────────
      // const res = await fetch(POST_TIPS_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ placeIds }),
      // });
      // const { tipIds: ids } = await res.json();
      // setTipIds(new Set<string>(ids));

      // ── Mock implementation ───────────────────────────────────────────────
      // Marks every 5th place (index 0, 5, 10 …) as having a Cultural tip
      // so the blue dot is visible for demo purposes.
      const mockIds = new Set<string>(placeIds.filter((_, i) => i % 5 === 0));
      setTipIds(mockIds);
    } catch (e) {
      console.warn('[useCulturalTips] Failed to fetch tips:', e);
    }
  }, []);

  const hasTip = useCallback(
    (placeId: string) => tipIds.has(placeId),
    [tipIds]
  );

  return { fetchTips, hasTip };
}
