/**
 * hooks/useConversations.ts
 *
 * Loads the current user's direct-message conversations from Supabase and
 * merges them with the static AI-Liaison stub so the Bridge inbox always
 * shows the chatbot entry at the top.
 *
 * Auth guard: returns an empty list immediately when the user is anonymous or
 * unauthenticated (no redirect — that is the screen's responsibility).
 */

import { supabase } from '@/lib/supabase';
import type { ConversationCategory, ConversationItemType, ConversationListItem } from '@/types/chat';
import { useCallback, useEffect, useState } from 'react';

// ── Static AI-Liaison stub ────────────────────────────────────────────────────
const AI_LIAISON_ITEM: ConversationListItem = {
    id: 'ai-liaison',
    title: 'AI Cultural Liaison',
    lastMessage: 'I found a cultural nuance regarding your trip to Kuching.',
    dateRange: 'Active Mediator • Always Online',
    time: 'Now',
    type: 'bot',
    isGroup: false,
    category: 'Bridge',
};

interface UseConversationsResult {
    items: ConversationListItem[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useConversations(currentUserId: string): UseConversationsResult {
    const [items, setItems] = useState<ConversationListItem[]>([AI_LIAISON_ITEM]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const refresh = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        // Skip for anonymous / unauthenticated callers
        if (!currentUserId) {
            setItems([AI_LIAISON_ITEM]);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                // Run DM and group-membership fetches in parallel.
                const [convResult, memberResult] = await Promise.all([
                    supabase
                        .from('direct_conversations')
                        .select('id, participant_one_id, participant_two_id, last_message_at, created_at')
                        .or(`participant_one_id.eq.${currentUserId},participant_two_id.eq.${currentUserId}`)
                        .order('last_message_at', { ascending: false, nullsFirst: false }),
                    supabase
                        .from('group_members')
                        .select('group_id')
                        .eq('user_id', currentUserId),
                ]);

                if (convResult.error) throw new Error(convResult.error.message);

                const convs = convResult.data ?? [];
                const groupIds = (memberResult.data ?? []).map((r) => r.group_id);

                // ── Fetch group conversations + their last messages ─────────────
                // ItemWithTs is used for the merge-sort at the end.
                type ItemWithTs = { item: ConversationListItem; ts: number };
                let groupWithTs: ItemWithTs[] = [];

                if (groupIds.length > 0) {
                    const [groupConvsResult, groupMsgsResult] = await Promise.all([
                        supabase
                            .from('group_conversations')
                            .select('id, name, avatar_url, created_at, last_message_at')
                            .in('id', groupIds)
                            .order('last_message_at', { ascending: false, nullsFirst: false }),
                        supabase
                            .from('group_messages')
                            .select('group_id, content, image_url, created_at')
                            .in('group_id', groupIds)
                            .order('created_at', { ascending: false })
                            // Use a generous limit so every group's latest message is included
                            // even when a single group has many recent messages.
                            .limit(Math.max(50, groupIds.length * 10)),
                    ]);

                    const groupLastMsgMap = new Map<
                        string,
                        { content: string | null; image_url: string | null; created_at: string }
                    >();
                    for (const m of groupMsgsResult.data ?? []) {
                        if (!groupLastMsgMap.has(m.group_id)) {
                            groupLastMsgMap.set(m.group_id, m);
                        }
                    }

                    groupWithTs = (groupConvsResult.data ?? []).map((g) => {
                        const lastMsg = groupLastMsgMap.get(g.id);
                        const displayAt = g.last_message_at ?? g.created_at;
                        return {
                            ts: new Date(displayAt).getTime(),
                            item: {
                                id: g.id,
                                title: g.name,
                                lastMessage:
                                    lastMsg?.content ??
                                    (lastMsg?.image_url ? 'Photo' : 'No messages yet'),
                                dateRange: '',
                                time: formatTime(displayAt),
                                type: 'user' as ConversationItemType,
                                isGroup: true,
                                avatar: g.avatar_url ?? undefined,
                                category: 'Traveling' as ConversationCategory,
                            },
                        };
                    });
                }

                // ── Fetch DM conversations ─────────────────────────────────────
                if (!convs.length && !groupWithTs.length) {
                    if (!cancelled) setItems([AI_LIAISON_ITEM]);
                    return;
                }

                // Collect other-participant IDs
                const otherIds = convs.map((c) =>
                    c.participant_one_id === currentUserId
                        ? c.participant_two_id
                        : c.participant_one_id,
                );

                // Batch-fetch profiles for all other participants
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url')
                    .in('id', otherIds);

                const profileMap = new Map(
                    (profiles ?? []).map((p) => [p.id, p]),
                );

                // Fetch the last message for each conversation in one query
                // (order desc, limit 1 per conversation_id via a lateral subquery is not
                //  directly supported in PostgREST, so we use a single query with a
                //  window-function workaround: fetch all recent messages and pick first)
                const convIds = convs.map((c) => c.id);
                const { data: lastMsgs } = await supabase
                    .from('direct_messages')
                    .select('conversation_id, content, image_url, created_at')
                    .in('conversation_id', convIds)
                    .order('created_at', { ascending: false })
                    .limit(convIds.length * 5); // generous limit; we deduplicate below

                // Keep only the most-recent message per conversation
                const lastMsgMap = new Map<string, { content: string | null; image_url: string | null; created_at: string }>();
                for (const m of lastMsgs ?? []) {
                    if (!lastMsgMap.has(m.conversation_id)) {
                        lastMsgMap.set(m.conversation_id, m);
                    }
                }

                // Build DM items with raw timestamps for the merge-sort below
                const dmWithTs: ItemWithTs[] = convs.map((conv) => {
                    const otherId =
                        conv.participant_one_id === currentUserId
                            ? conv.participant_two_id
                            : conv.participant_one_id;

                    const profile = profileMap.get(otherId);
                    const lastMsg = lastMsgMap.get(conv.id);
                    const displayAt = conv.last_message_at ?? conv.created_at;

                    return {
                        ts: new Date(displayAt).getTime(),
                        item: {
                            id: conv.id,
                            title: profile?.full_name ?? profile?.username ?? 'Unknown',
                            lastMessage: lastMsg?.content ?? (lastMsg?.image_url ? 'Photo' : 'No messages yet'),
                            dateRange: '',
                            time: formatTime(displayAt),
                            type: 'user' as ConversationItemType,
                            isGroup: false,
                            avatar: profile?.avatar_url ?? undefined,
                            category: 'Traveling' as ConversationCategory,
                        },
                    };
                });

                // Merge DMs + groups and sort most-recent first
                const allItems = [...dmWithTs, ...groupWithTs]
                    .sort((a, b) => b.ts - a.ts)
                    .map((x) => x.item);

                if (!cancelled) setItems([AI_LIAISON_ITEM, ...allItems]);
            } catch (e: any) {
                if (!cancelled) {
                    setError(e.message ?? 'Failed to load conversations');
                    // Still show the AI Liaison on error
                    setItems([AI_LIAISON_ITEM]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [currentUserId, tick]);

    // ── Realtime: refresh inbox when a new group message arrives ────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel(`inbox:group_messages:${currentUserId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'group_messages' },
                () => {
                    // Re-fetch the inbox so the group card shows the latest message
                    // and correct sort position.
                    setTick((t) => t + 1);
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId]);

    return { items, loading, error, refresh };
}

// ── helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
}
