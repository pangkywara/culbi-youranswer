/**
 * hooks/useUserSearch.ts
 *
 * Debounced username / full-name search backed by the
 * `search_users_by_username` Supabase RPC (SECURITY DEFINER — bypasses the
 * restrictive profiles RLS while only exposing safe columns).
 */

import { supabase } from '@/lib/supabase';
import type { UserSearchResult } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

export interface UseUserSearchResult {
  query:    string;
  results:  UserSearchResult[];
  loading:  boolean;
  error:    string | null;
  setQuery: (q: string) => void;
  clear:    () => void;
}

export function useUserSearch(): UseUserSearchResult {
  const [query,   setQueryState] = useState('');
  const [results, setResults]    = useState<UserSearchResult[]>([]);
  const [loading, setLoading]    = useState(false);
  const [error,   setError]      = useState<string | null>(null);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    abortRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'search_users_by_username',
        { p_query: trimmed },
      );
      if (abortRef.current) return;
      if (rpcError) throw rpcError;
      setResults((data as UserSearchResult[]) ?? []);
    } catch (e: any) {
      if (!abortRef.current) {
        setError(e?.message ?? 'Search failed');
        setResults([]);
      }
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, []);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);

      // Cancel pending debounce
      if (timerRef.current) clearTimeout(timerRef.current);

      if (q.trim().length < 2) {
        abortRef.current = true;
        setResults([]);
        setLoading(false);
        return;
      }

      // Debounce
      timerRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
    },
    [runSearch],
  );

  const clear = useCallback(() => {
    abortRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setQueryState('');
    setResults([]);
    setLoading(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { query, results, loading, error, setQuery, clear };
}
