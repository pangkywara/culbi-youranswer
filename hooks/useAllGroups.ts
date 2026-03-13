/**
 * hooks/useAllGroups.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches all public group_conversations for the Groups tab on the home screen.
 * Joins group_members count via a subquery aggregate so we know how many
 * people are in each group without a separate RPC.
 *
 * Groups are sorted by last_message_at DESC so the most active ones surface
 * first, matching the "discovery" intent of the home screen tab.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PublicGroup {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string | null;
  visibility: 'public' | 'private';
  memberCount: number;
  memberLimit: number | null;
  lastMessageAt: string | null;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
}

interface UseAllGroupsOptions {
  /** Hard cap on results (default 60) */
  limit?: number;
}

interface UseAllGroupsReturn {
  groups: PublicGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAllGroups({ limit = 60 }: UseAllGroupsOptions = {}): UseAllGroupsReturn {
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch public groups ordered by most recently active
      const { data, error: fetchErr } = await supabase
        .from('group_conversations')
        .select(`
          id,
          name,
          description,
          avatar_url,
          category,
          visibility,
          member_limit,
          last_message_at,
          created_at,
          latitude,
          longitude,
          group_members(count)
        `)
        .eq('visibility', 'public')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (fetchErr) throw fetchErr;

      // Extra JS-side guard: strip any private rows that slipped through RLS
      const publicOnly = (data ?? []).filter((g: any) => g.visibility === 'public');

      const mapped: PublicGroup[] = publicOnly.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        avatarUrl: g.avatar_url,
        category: g.category,
        visibility: g.visibility,
        memberCount: Number(g.group_members?.[0]?.count ?? 0),
        memberLimit: g.member_limit,
        lastMessageAt: g.last_message_at,
        createdAt: g.created_at,
        latitude: g.latitude,
        longitude: g.longitude,
      }));

      setGroups(mapped);
    } catch (e: any) {
      console.warn('[useAllGroups] error:', e?.message);
      setError(e?.message ?? 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refresh: fetchGroups };
}
