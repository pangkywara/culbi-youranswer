/**
 * hooks/useSearchHistory.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists and retrieves the user's recent destination searches, synced to
 * Supabase (search_history table). Works for both anonymous and authenticated
 * users — both have a stable auth.uid() via Supabase Anonymous Auth.
 *
 * Strategy:
 *   • On mount: fetch from Supabase, fall back to AsyncStorage when offline.
 *   • Writes: optimistic local state update → async Supabase sync.
 *   • AsyncStorage acts as an offline cache / first-paint fallback.
 *
 * Public API:
 *   history       – ordered array of RecentSearch (newest first)
 *   isLoaded      – true once history has been resolved on mount
 *   addSearch     – push a new entry (deduplicates & trims to MAX_ITEMS)
 *   removeSearch  – remove a single entry by id
 *   clearHistory  – wipe all entries
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = '@culbi:search_history';
const MAX_ITEMS   = 8;
const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RecentSearch {
  /** Supabase UUID (or a temp 't{timestamp}' string until the insert returns). */
  id:        string;
  name:      string;
  /** e.g. "Sarawak, Malaysia" — subtitle shown in the row. */
  region:    string;
  /** Supabase category or 'destination' for free-text searches. */
  category?: string;
  /** Google place_id — present when sourced from Supabase; absent for free-text. */
  placeId?:  string;
  timestamp: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSearchHistory() {
  const [history,  setHistory]  = useState<RecentSearch[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Load on mount: Supabase first, fallback to AsyncStorage ───────────────
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from('search_history')
            .select('id, name, region, category, place_id, searched_at')
            .eq('user_id', session.user.id)
            .order('searched_at', { ascending: false })
            .limit(MAX_ITEMS);

          if (!error && data && data.length > 0) {
            const mapped: RecentSearch[] = data.map((r: any) => ({
              id:        r.id,
              name:      r.name,
              region:    r.region ?? '',
              category:  r.category ?? 'destination',
              placeId:   r.place_id ?? undefined,
              timestamp: new Date(r.searched_at).getTime(),
            }));
            setHistory(mapped);
            // Keep local cache in sync
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            setIsLoaded(true);
            return;
          }
        }
      } catch {
        // Network or auth error — fall through to AsyncStorage
      }

      // Offline / no session fallback
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setHistory(JSON.parse(raw));
      } catch { /* corrupt cache — start fresh */ }

      setIsLoaded(true);
    }
    load();
  }, []);

  // ── Mirror to AsyncStorage whenever history changes (offline cache) ────────
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history, isLoaded]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const addSearch = useCallback((entry: Omit<RecentSearch, 'id' | 'timestamp'>) => {
    const ts      = Date.now();
    const tempId  = `t${ts}`;
    const newEntry: RecentSearch = { ...entry, id: tempId, timestamp: ts };

    // 1. Optimistic local update — user sees the result immediately
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => h.name.toLowerCase() !== entry.name.toLowerCase(),
      );
      return [newEntry, ...filtered].slice(0, MAX_ITEMS);
    });

    // 2. Async Supabase sync (fire-and-forget; callers do not await)
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Remove any existing row with the same name (case-insensitive)
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', session.user.id)
          .ilike('name', entry.name);

        // Insert and get back the generated UUID
        const { data, error } = await supabase
          .from('search_history')
          .insert({
            user_id:  session.user.id,
            name:     entry.name,
            region:   entry.region   ?? '',
            category: entry.category ?? 'destination',
            place_id: entry.placeId  ?? null,
          })
          .select('id')
          .single();

        if (!error && data?.id) {
          // Replace the temp ID with the real Supabase UUID
          const realId = data.id as string;
          setHistory((prev) =>
            prev.map((h) => (h.id === tempId ? { ...h, id: realId } : h)),
          );
        }

        // Trim to MAX_ITEMS on the server side
        const { data: all } = await supabase
          .from('search_history')
          .select('id')
          .eq('user_id', session.user.id)
          .order('searched_at', { ascending: false });

        if (all && all.length > MAX_ITEMS) {
          await supabase
            .from('search_history')
            .delete()
            .in('id', (all as { id: string }[]).slice(MAX_ITEMS).map((r) => r.id));
        }
      } catch { /* sync failed; local state already correct */ }
    })();
  }, []);

  // ── Remove ────────────────────────────────────────────────────────────────
  const removeSearch = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));

    ;(async () => {
      try {
        if (!UUID_RE.test(id)) return; // temp or legacy ID — nothing in DB
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase
          .from('search_history')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(STORAGE_KEY);

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', session.user.id);
      } catch { /* ignore */ }
    })();
  }, []);

  return { history, isLoaded, addSearch, removeSearch, clearHistory };
}
