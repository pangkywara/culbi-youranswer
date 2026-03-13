/**
 * hooks/useGroupDetail.ts
 * ───────────────────────
 * Fetches a single public group from Supabase by UUID, including:
 *   - group metadata (name, description, category, visibility, etc.)
 *   - first 20 members with their profile info
 *   - resolved owner profile
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface GroupMember {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface GroupDetail {
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
  createdBy: string;
  members: GroupMember[];
  owner: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export function useGroupDetail(id: string) {
  const [group,   setGroup]   = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchGroup = async () => {
      setLoading(true);
      setError(null);

      try {
        // ── 1. Fetch group row ────────────────────────────────────────────
        const { data: raw, error: fetchErr } = await supabase
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
            created_by,
            group_members(count)
          `)
          .eq('id', id)
          .single();

        if (cancelled) return;
        if (fetchErr) throw fetchErr;

        const g = raw as any;

        // ── 2. Fetch members with profiles ────────────────────────────────
        const { data: membersRaw } = await supabase
          .from('group_members')
          .select(`
            user_id,
            role,
            joined_at,
            profiles(id, full_name, username, avatar_url)
          `)
          .eq('group_id', id)
          .order('joined_at', { ascending: true })
          .limit(20);

        if (cancelled) return;

        const members: GroupMember[] = (membersRaw ?? []).map((m: any) => ({
          userId:      m.user_id,
          displayName: m.profiles?.full_name ?? m.profiles?.username ?? 'Explorer',
          username:    m.profiles?.username ?? null,
          avatarUrl:   m.profiles?.avatar_url ?? null,
          role:        m.role,
          joinedAt:    m.joined_at,
        }));

        // ── 3. Resolve owner (from members list first, then fallback fetch) ─
        const ownerEntry = members.find(m => m.userId === g.created_by);
        let owner: GroupDetail['owner'] = ownerEntry
          ? {
              id:          ownerEntry.userId,
              displayName: ownerEntry.displayName,
              username:    ownerEntry.username,
              avatarUrl:   ownerEntry.avatarUrl,
            }
          : null;

        if (!owner) {
          const { data: op } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', g.created_by)
            .single();

          if (!cancelled && op) {
            const p = op as any;
            owner = {
              id:          p.id,
              displayName: p.full_name ?? p.username ?? 'Explorer',
              username:    p.username ?? null,
              avatarUrl:   p.avatar_url ?? null,
            };
          }
        }

        setGroup({
          id:            g.id,
          name:          g.name,
          description:   g.description,
          avatarUrl:     g.avatar_url,
          category:      g.category,
          visibility:    g.visibility,
          memberCount:   Number(g.group_members?.[0]?.count ?? 0),
          memberLimit:   g.member_limit,
          lastMessageAt: g.last_message_at,
          createdAt:     g.created_at,
          latitude:      g.latitude,
          longitude:     g.longitude,
          createdBy:     g.created_by,
          members,
          owner,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load group');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchGroup();
    return () => { cancelled = true; };
  }, [id]);

  return { group, loading, error };
}
