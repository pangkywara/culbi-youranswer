/**
 * hooks/useMessageSearch.ts
 * ──────────────────────────
 * Searches through the current user's OWN sent messages (DMs + group chats)
 * using the search_my_messages RPC. Results are deduplicated per conversation
 * and returned as ConversationListItem entries so they slot straight into
 * the Bridge FlatList.
 *
 * Debounced 350 ms so we avoid firing on every keystroke.
 */

import { supabase } from '@/lib/supabase';
import type { ConversationCategory, ConversationItemType, ConversationListItem } from '@/types/chat';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface MessageSearchResult extends ConversationListItem {
  /** Snippet from the matched message */
  matchedSnippet: string;
}

interface UseMessageSearchReturn {
  results: MessageSearchResult[];
  loading: boolean;
}

/**
 * @param query       – raw search string (empty/whitespace = no search)
 * @param userId      – current user's UUID; skip search when empty
 * @param debounceMs  – debounce delay in ms (default 350)
 */
export function useMessageSearch(
  query: string,
  userId: string,
  debounceMs = 350,
): UseMessageSearchReturn {
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQueryRef = useRef<string>('');

  const search = useCallback(
    async (q: string) => {
      if (!userId || q.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      activeQueryRef.current = q;
      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('search_my_messages', {
          p_query: q.trim(),
          p_limit: 30,
        });

        // Discard stale results if a newer query fired
        if (activeQueryRef.current !== q) return;

        if (error) throw error;

        const rows = (data ?? []) as Array<{
          conversation_id: string;
          conversation_name: string;
          is_group: boolean;
          message_content: string;
          message_at: string;
          avatar_url: string | null;
        }>;

        // Build ConversationListItem entries with the matched snippet
        const items: MessageSearchResult[] = rows.map((row) => ({
          id: row.conversation_id,
          title: row.conversation_name,
          // Show matched snippet as last-message preview
          lastMessage: row.message_content ?? '',
          dateRange: '',
          time: formatRelativeTime(row.message_at),
          type: 'user' as ConversationItemType,
          isGroup: row.is_group,
          avatar: row.avatar_url ?? undefined,
          category: (row.is_group ? 'Traveling' : 'Bridge') as ConversationCategory,
          matchedSnippet: row.message_content ?? '',
        }));

        setResults(items);
      } catch (e: any) {
        console.warn('[useMessageSearch]', e?.message);
        setResults([]);
      } finally {
        if (activeQueryRef.current === q) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();

    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => search(query), debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, search]);

  return { results, loading };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
