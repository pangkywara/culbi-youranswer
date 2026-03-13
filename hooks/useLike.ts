/**
 * hooks/useLike.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Optimistic like/unlike for a single place.
 *
 * • Instantly toggles local state for zero-latency UI feedback.
 * • Rolls back to previous state if the Supabase write fails.
 * • Silently no-ops when there is no authenticated session (guests without
 *   anonymous auth enabled) — the heart still animates but persists nothing.
 * • Safe to call in hot paths (FlatList cells): each instance is independent
 *   and holds only the minimal state it needs.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UseLikeOptions {
  /** Google place_id — the canonical key used everywhere in the app */
  placeId: string;
  /** Human-readable name stored for convenience in the likes row */
  placeName?: string;
}

interface UseLikeReturn {
  isLiked:    boolean;
  isLoading:  boolean;
  toggleLike: () => Promise<void>;
}

export function useLike({ placeId, placeName = '' }: UseLikeOptions): UseLikeReturn {
  const [isLiked,   setIsLiked]   = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether we've mounted so we don't set state after unmount
  const mountedRef   = useRef(true);
  // Guard against concurrent toggle calls
  const togglingRef  = useRef(false);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || cancelled) {
          if (!cancelled && mountedRef.current) setIsLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('likes')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('place_id', placeId)
          .maybeSingle();

        if (!cancelled && mountedRef.current) {
          setIsLiked(!error && data !== null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled && mountedRef.current) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [placeId]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggleLike = useCallback(async () => {
    if (togglingRef.current) return;
    togglingRef.current = true;

    const prevLiked = isLiked;
    // Optimistic update — instant feedback
    setIsLiked(!prevLiked);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // No session — roll back the optimistic flip, don't persist
        if (mountedRef.current) setIsLiked(prevLiked);
        return;
      }

      if (prevLiked) {
        // Un-like: delete the row
        const { error } = await (supabase as any)
          .from('likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('place_id', placeId);

        if (error && mountedRef.current) setIsLiked(prevLiked); // rollback
      } else {
        // Like: insert (upsert so duplicate presses can't error)
        const { error } = await (supabase as any)
          .from('likes')
          .upsert(
            { user_id: session.user.id, place_id: placeId, place_name: placeName },
            { onConflict: 'user_id,place_id', ignoreDuplicates: false }
          );

        if (error && mountedRef.current) setIsLiked(prevLiked); // rollback
      }
    } catch {
      // Network / unexpected error — roll back
      if (mountedRef.current) setIsLiked(prevLiked);
    } finally {
      togglingRef.current = false;
    }
  }, [isLiked, placeId, placeName]);

  return { isLiked, isLoading, toggleLike };
}
