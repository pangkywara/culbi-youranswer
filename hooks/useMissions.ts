/**
 * hooks/useMissions.ts
 *
 * Fetches all active missions from Supabase (via the `get_user_missions` RPC)
 * and transforms them into the `Mission` shape consumed by the existing mission
 * components.  Also exposes the current user's total XP + level label.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMissionIcon } from '@/lib/missionIconMap';
import type { Mission, MissionCategory } from '@/components/Missions/missions.types';
import type { MissionWithProgress } from '@/types/database';

// ─── Level / XP helpers (mirrors points/index.tsx) ────────────────────────────

const LEVEL_DATA = [
  { label: 'Newcomer',      min: 0    },
  { label: 'Explorer',      min: 200  },
  { label: 'Adventurer',    min: 500  },
  { label: 'Trailblazer',   min: 1000 },
  { label: 'Navigator',     min: 2000 },
  { label: 'Grand Explorer',min: 4000 },
];

export function getLevelLabel(xp: number): string {
  let label = LEVEL_DATA[0].label;
  for (const l of LEVEL_DATA) {
    if (xp >= l.min) label = l.label;
  }
  return label;
}

// ─── DB row → Mission transformer ─────────────────────────────────────────────

function toMission(row: MissionWithProgress): Mission {
  const { icon } = getMissionIcon(row.icon_name);

  const progress =
    row.category === 'Milestones'
      ? `Lv. ${row.current_count}/${row.target_count}`
      : `${row.current_count}/${row.target_count}`;

  const reward = row.reward_badge ? row.reward_badge : `${row.reward_xp} XP`;

  return {
    id:           row.id,
    title:        row.title,
    description:  row.description,
    category:     row.category as MissionCategory,
    progress,
    currentCount: row.current_count,
    targetCount:  row.target_count,
    reward,
    isCompleted:  row.is_completed,
    isOngoing:    row.current_count > 0 && !row.is_completed,
    rewardClaimed: row.reward_claimed,
    icon,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseMissionsResult {
  missions:   Mission[];
  loading:    boolean;
  error:      string | null;
  totalXp:    number;
  levelLabel: string;
  refetch:    () => Promise<void>;
}

export function useMissions(): UseMissionsResult {
  const [missions,   setMissions]   = useState<Mission[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [totalXp,    setTotalXp]    = useState(0);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all active missions + this user's progress (auth.uid() used server-side)
      const { data: rows, error: rpcErr } = await supabase.rpc('get_user_missions', {
        p_category: 'All',
      });
      if (rpcErr) throw rpcErr;

      setMissions((rows as MissionWithProgress[] ?? []).map(toMission));

      // Fetch XP total from the profile (safe – prefers the denormalised column)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_xp')
          .eq('id', user.id)
          .single();
        setTotalXp(profile?.total_xp ?? 0);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load missions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    missions,
    loading,
    error,
    totalXp,
    levelLabel: getLevelLabel(totalXp),
    refetch,
  };
}
