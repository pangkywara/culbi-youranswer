/**
 * hooks/useLeaderboard.ts
 *
 * Fetches the global XP leaderboard via the `get_xp_leaderboard` SECURITY
 * DEFINER RPC and resolves the calling user's own rank entry.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LeaderboardEntry } from '@/types/database';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseLeaderboardResult {
  leaders:  LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  loading:  boolean;
  error:    string | null;
  refetch:  () => Promise<void>;
}

export function useLeaderboard(limit = 20): UseLeaderboardResult {
  const [leaders,  setLeaders]  = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Run both calls in parallel for speed
      const [authResult, lbResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('get_xp_leaderboard', { p_limit: limit }),
      ]);

      if (lbResult.error) throw lbResult.error;

      const list: LeaderboardEntry[] = (lbResult.data ?? []).map((row: any) => ({
        rank:       Number(row.rank),
        user_id:    row.user_id,
        full_name:  row.full_name,
        avatar_url: row.avatar_url,
        region:     row.region,
        total_xp:   row.total_xp,
        level:      row.level,
      }));

      setLeaders(list);

      const user = authResult.data?.user;
      if (user) {
        const mine = list.find(e => e.user_id === user.id) ?? null;
        setUserRank(mine);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { leaders, userRank, loading, error, refetch };
}
