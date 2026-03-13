/**
 * hooks/useGroupMessages.ts
 *
 * Manages a single group-chat conversation:
 *   - Initial message load (paginated, oldest-first)
 *   - Real-time NEW message subscription via Supabase Realtime
 *   - Send message (text / image URL)
 *   - Exposes the group metadata and member list
 *   - Exposes loadMore for pagination
 */

import { supabase } from '@/lib/supabase';
import type { GroupConversation, GroupMember, GroupMessageUI } from '@/types/chat';
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 40;

export interface UseGroupMessagesResult {
  messages: GroupMessageUI[];
  group: GroupConversation | null;
  members: GroupMember[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (content: string, imageUrl?: string, replyToId?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  refreshGroupAndMembers: () => Promise<void>;
}

export function useGroupMessages(
  groupId: string,
  currentUserId: string,
): UseGroupMessagesResult {
  const [messages, setMessages] = useState<GroupMessageUI[]>([]);
  const [group, setGroup] = useState<GroupConversation | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────

  const toUI = useCallback(
    (row: any): GroupMessageUI => ({
      id: row.id,
      groupId: row.group_id,
      senderId: row.sender_id,
      content: row.content ?? null,
      imageUrl: row.image_url ?? null,
      replyToId: row.reply_to_id ?? null,
      createdAt: row.created_at,
      isCurrentUser: row.sender_id === currentUserId,
      senderName: row.profiles?.full_name ?? row.profiles?.username ?? undefined,
      senderAvatar: row.profiles?.avatar_url ?? null,
    }),
    [currentUserId],
  );

  // ── initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId || !currentUserId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch group metadata + member count
        const { data: conv, error: convErr } = await supabase
          .from('group_conversations')
          .select('id, name, description, avatar_url, created_by, visibility')
          .eq('id', groupId)
          .single();

        if (convErr || !conv) throw new Error(convErr?.message ?? 'Group not found');

        const { count: memberCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId);

        if (!cancelled) {
          setGroup({
            id: conv.id,
            name: conv.name,
            description: conv.description,
            avatarUrl: conv.avatar_url,
            createdBy: conv.created_by,
            memberCount: memberCount ?? 0,
            visibility: conv.visibility ?? 'private',
          });
        }

        // 2. Fetch members with profiles
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('user_id, role, profiles!group_members_user_id_profiles_fkey ( full_name, username, avatar_url )')
          .eq('group_id', groupId);

        if (!cancelled && memberRows) {
          setMembers(
            memberRows.map((m: any) => ({
              userId: m.user_id,
              displayName: m.profiles?.full_name ?? m.profiles?.username ?? 'Unknown',
              avatarUrl: m.profiles?.avatar_url ?? null,
              role: m.role as 'admin' | 'member',
            })),
          );
        }

        // 3. Fetch latest PAGE_SIZE messages
        const { data: rows, error: msgErr } = await supabase
          .from('group_messages')
          .select(`
            id, group_id, sender_id, content, image_url,
            reply_to_id, created_at,
            profiles!group_messages_sender_id_profiles_fkey ( full_name, username, avatar_url )
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        if (msgErr) throw new Error(msgErr.message);

        if (!cancelled && rows) {
          const ordered = [...rows].reverse();
          setMessages(ordered.map(toUI));
          setHasMore(rows.length === PAGE_SIZE);
          cursorRef.current = rows.length ? rows[rows.length - 1].created_at : null;
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [groupId, currentUserId, toUI]);

  // ── real-time subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId || !currentUserId) return;

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const raw = payload.new as any;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', raw.sender_id)
            .maybeSingle();

          const msg = toUI({ ...raw, profiles: profile });
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, currentUserId, toUI]);

  // ── sendMessage ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, imageUrl?: string, replyToId?: string) => {
      if (sending) return;
      setSending(true);
      setError(null);
      try {
        const { error: insertErr } = await supabase
          .from('group_messages')
          .insert({
            group_id: groupId,
            sender_id: currentUserId,
            content: content.trim() || null,
            image_url: imageUrl ?? null,
            reply_to_id: replyToId ?? null,
          });
        if (insertErr) throw new Error(insertErr.message);
      } catch (e: any) {
        setError(e.message ?? 'Failed to send');
      } finally {
        setSending(false);
      }
    },
    [groupId, currentUserId, sending],
  );

  // ── refreshGroupAndMembers ─────────────────────────────────────────────────
  const refreshGroupAndMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      const [{ data: conv }, { count: memberCount }, { data: memberRows }] = await Promise.all([
        supabase
          .from('group_conversations')
          .select('id, name, description, avatar_url, created_by')
          .eq('id', groupId)
          .single(),
        supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId),
        supabase
          .from('group_members')
          .select('user_id, role, profiles!group_members_user_id_profiles_fkey ( full_name, username, avatar_url )')
          .eq('group_id', groupId),
      ]);

      if (conv) {
        setGroup({
          id: conv.id,
          name: conv.name,
          description: conv.description,
          avatarUrl: conv.avatar_url,
          createdBy: conv.created_by,
          memberCount: memberCount ?? 0,
        });
      }
      if (memberRows) {
        setMembers(
          memberRows.map((m: any) => ({
            userId: m.user_id,
            displayName: m.profiles?.full_name ?? m.profiles?.username ?? 'Unknown',
            avatarUrl: m.profiles?.avatar_url ?? null,
            role: m.role as 'admin' | 'member',
          })),
        );
      }
    } catch {
      // silent — stale data is acceptable
    }
  }, [groupId]);

  // ── loadMore (older messages) ───────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || !cursorRef.current) return;

    const { data: rows, error: msgErr } = await supabase
      .from('group_messages')
      .select(`
        id, group_id, sender_id, content, image_url,
        reply_to_id, created_at,
        profiles!group_messages_sender_id_profiles_fkey ( full_name, username, avatar_url )
      `)
      .eq('group_id', groupId)
      .lt('created_at', cursorRef.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (msgErr || !rows) return;

    const ordered = [...rows].reverse();
    setMessages((prev) => [...ordered.map(toUI), ...prev]);
    setHasMore(rows.length === PAGE_SIZE);
    cursorRef.current = rows.length ? rows[rows.length - 1].created_at : null;
  }, [groupId, hasMore, toUI]);

  return { messages, group, members, loading, sending, error, sendMessage, loadMore, hasMore, refreshGroupAndMembers };
}
