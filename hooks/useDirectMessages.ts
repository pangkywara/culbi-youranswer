/**
 * hooks/useDirectMessages.ts
 *
 * Manages a single 1-to-1 direct-message conversation:
 *   - Initial message load (paginated, oldest-first)
 *   - Real-time NEW message subscription via Supabase Realtime
 *   - Send message (text or image URL)
 *   - Mark incoming messages as read (updates read_at)
 *   - Exposes the other participant's profile
 */

import { supabase } from '@/lib/supabase';
import type { DirectMessageUI, DMParticipant } from '@/types/chat';
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 40;

interface UseDMResult {
    messages: DirectMessageUI[];
    participant: DMParticipant | null;
    loading: boolean;
    sending: boolean;
    error: string | null;
    sendMessage: (content: string, imageUrl?: string, replyToId?: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
}

export function useDirectMessages(
    conversationId: string,
    currentUserId: string,
): UseDMResult {
    const [messages, setMessages] = useState<DirectMessageUI[]>([]);
    const [participant, setParticipant] = useState<DMParticipant | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const cursorRef = useRef<string | null>(null); // created_at of oldest loaded message

    // ── helpers ────────────────────────────────────────────────────────────────

    const toUI = useCallback(
        (row: any): DirectMessageUI => ({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            content: row.content ?? null,
            imageUrl: row.image_url ?? null,
            replyToId: row.reply_to_id ?? null,
            readAt: row.read_at ?? null,
            createdAt: row.created_at,
            isCurrentUser: row.sender_id === currentUserId,
            senderName: row.profiles?.full_name ?? row.profiles?.username ?? undefined,
            senderAvatar: row.profiles?.avatar_url ?? null,
        }),
        [currentUserId],
    );

    // ── initial conversation load ───────────────────────────────────────────────
    useEffect(() => {
        if (!conversationId || !currentUserId) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch conversation + participants
                const { data: conv, error: convErr } = await supabase
                    .from('direct_conversations')
                    .select('id, participant_one_id, participant_two_id')
                    .eq('id', conversationId)
                    .single();

                if (convErr || !conv) throw new Error(convErr?.message ?? 'Conversation not found');

                const otherUserId =
                    conv.participant_one_id === currentUserId
                        ? conv.participant_two_id
                        : conv.participant_one_id;

                // Fetch other participant's profile
                const { data: otherProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url')
                    .eq('id', otherUserId)
                    .maybeSingle();

                if (!cancelled && otherProfile) {
                    setParticipant({
                        id: otherProfile.id,
                        displayName: otherProfile.full_name ?? otherProfile.username ?? 'Unknown',
                        avatarUrl: otherProfile.avatar_url ?? null,
                    });
                }

                // Fetch latest PAGE_SIZE messages
                const { data: rows, error: msgErr } = await supabase
                    .from('direct_messages')
                    .select(`
            id, conversation_id, sender_id, content, image_url,
            reply_to_id, read_at, created_at,
            profiles:sender_id ( full_name, username, avatar_url )
          `)
                    .eq('conversation_id', conversationId)
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
    }, [conversationId, currentUserId, toUI]);

    // ── real-time subscription ──────────────────────────────────────────────────
    useEffect(() => {
        if (!conversationId || !currentUserId) return;

        const channel = supabase
            .channel(`dm:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    const raw = payload.new as any;

                    // Fetch the sender's profile so we can display name/avatar
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username, avatar_url')
                        .eq('id', raw.sender_id)
                        .maybeSingle();

                    const msg = toUI({ ...raw, profiles: profile });
                    setMessages((prev) => {
                        // Prevent duplicate (e.g. optimistic + real-time)
                        if (prev.some((m) => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversationId, currentUserId, toUI]);

    // ── sendMessage ─────────────────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (content: string, imageUrl?: string, replyToId?: string) => {
            if (sending) return;
            setSending(true);
            setError(null);
            try {
                const { error: insertErr } = await supabase
                    .from('direct_messages')
                    .insert({
                        conversation_id: conversationId,
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
        [conversationId, currentUserId, sending],
    );

    // ── markAllRead ─────────────────────────────────────────────────────────────
    // Marks all unread messages sent by the other participant as read.
    const markAllRead = useCallback(async () => {
        const now = new Date().toISOString();
        const unreadIds = messages
            .filter((m) => !m.isCurrentUser && !m.readAt)
            .map((m) => m.id);
        if (!unreadIds.length) return;

        const { error: updateErr } = await supabase
            .from('direct_messages')
            .update({ read_at: now })
            .in('id', unreadIds);

        if (!updateErr) {
            setMessages((prev) =>
                prev.map((m) => unreadIds.includes(m.id) ? { ...m, readAt: now } : m),
            );
        }
    }, [messages]);

    // ── loadMore (older messages) ───────────────────────────────────────────────
    const loadMore = useCallback(async () => {
        if (!hasMore || !cursorRef.current) return;

        const { data: rows, error: msgErr } = await supabase
            .from('direct_messages')
            .select(`
        id, conversation_id, sender_id, content, image_url,
        reply_to_id, read_at, created_at,
        profiles:sender_id ( full_name, username, avatar_url )
      `)
            .eq('conversation_id', conversationId)
            .lt('created_at', cursorRef.current)
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);

        if (msgErr || !rows) return;

        const ordered = [...rows].reverse();
        setMessages((prev) => [...ordered.map(toUI), ...prev]);
        setHasMore(rows.length === PAGE_SIZE);
        cursorRef.current = rows.length ? rows[rows.length - 1].created_at : null;
    }, [conversationId, hasMore, toUI]);

    return { messages, participant, loading, sending, error, sendMessage, markAllRead, loadMore, hasMore };
}
