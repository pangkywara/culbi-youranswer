/**
 * hooks/useXpLedger.ts
 *
 * Fetches the current user's XP transaction history from `user_xp_ledger`
 * (protected by RLS – only the owner's rows are returned).
 * Returns typed `XPEntry` objects ready for the Points screen list.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMissionIcon } from '@/lib/missionIconMap';
import type { Icon } from 'react-native-phosphor';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface XPEntry {
  id:          string;
  title:       string;
  description: string;
  xp:          number;
  date:        string;
  icon:        Icon;
  iconBg:      string;
  iconColor:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  const diffMs   = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toXPEntry(row: {
  id: string;
  xp_delta: number;
  source_type: string;
  description: string | null;
  icon_name: string;
  created_at: string;
}): XPEntry {
  const { icon, bg, color } = getMissionIcon(row.icon_name);

  const title =
    row.description ??
    (row.source_type === 'mission' ? 'Mission Reward' : row.source_type);

  return {
    id:          row.id,
    title,
    description: row.source_type === 'mission' ? 'Mission completed' : row.source_type,
    xp:          row.xp_delta,
    date:        formatDate(row.created_at),
    icon,
    iconBg:      bg,
    iconColor:   color,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseXpLedgerResult {
  entries:  XPEntry[];
  loading:  boolean;
  error:    string | null;
  refetch:  () => Promise<void>;
}

export function useXpLedger(limit = 50): UseXpLedgerResult {
  const [entries, setEntries] = useState<XPEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Guard: anonymous users have no ledger
      if (!user) {
        setEntries([]);
        return;
      }

      const { data, error: dbErr } = await supabase
        .from('user_xp_ledger')
        .select('id, xp_delta, source_type, description, icon_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbErr) throw dbErr;

      setEntries((data ?? []).map(toXPEntry));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load XP history');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, loading, error, refetch };
}
