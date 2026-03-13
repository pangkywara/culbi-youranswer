/**
 * Gacha Hooks
 * 
 * React hooks for ticket-based gacha system.
 * Provides state management with real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  awardGachaTicket,
  pullGachaCard,
  getUserTicketBalance,
  getUserGachaStats,
  getUserCollection,
  subscribeToTicketBalance,
  subscribeToCardPulls,
} from '@/lib/gacha';
import type {
  AwardTicketResponse,
  PullCardResponse,
  GachaStats,
  CollectionCard,
  GachaRarity,
} from '@/types/gacha';

// ============================================================
// TICKET MANAGEMENT HOOK
// ============================================================

export interface UseGachaTicketsResult {
  tickets: number;
  loading: boolean;
  awarding: boolean;
  refresh: () => Promise<void>;
  awardTicket: () => Promise<AwardTicketResponse | null>;
}

/**
 * Manage user's gacha ticket balance with real-time updates
 * 
 * @returns Ticket state and operations
 */
export function useGachaTickets(): UseGachaTicketsResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);

  // Fetch initial ticket balance
  const refresh = useCallback(async () => {
    if (!userId) {
      setTickets(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const balance = await getUserTicketBalance(userId);
      setTickets(balance);
    } catch (error) {
      console.error('[useGachaTickets] Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Award ticket (50/50 chance)
  const awardTicket = useCallback(async (): Promise<AwardTicketResponse | null> => {
    if (!userId) return null;

    setAwarding(true);
    try {
      const result = await awardGachaTicket(userId);
      if (result?.awarded) {
        setTickets(result.tickets);
      }
      return result;
    } catch (error) {
      console.error('[useGachaTickets] Failed to award ticket:', error);
      return null;
    } finally {
      setAwarding(false);
    }
  }, [userId]);

  // Subscribe to real-time ticket changes
  useEffect(() => {
    if (!userId) return;

    refresh();

    const unsubscribe = subscribeToTicketBalance(userId, (newBalance) => {
      setTickets(newBalance);
    });

    return unsubscribe;
  }, [userId, refresh]);

  return {
    tickets,
    loading,
    awarding,
    refresh,
    awardTicket,
  };
}

// ============================================================
// GACHA PULL HOOK
// ============================================================

export interface UseGachaPullResult {
  pulling: boolean;
  lastPull: PullCardResponse | null;
  pull: () => Promise<PullCardResponse | null>;
  clearLastPull: () => void;
}

/**
 * Handle gacha card pulls
 * 
 * @returns Pull state and operations
 */
export function useGachaPull(): UseGachaPullResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [pulling, setPulling] = useState(false);
  const [lastPull, setLastPull] = useState<PullCardResponse | null>(null);

  const pull = useCallback(async (): Promise<PullCardResponse | null> => {
    if (!userId) return null;

    setPulling(true);
    try {
      const result = await pullGachaCard(userId);
      setLastPull(result);
      return result;
    } catch (error) {
      console.error('[useGachaPull] Failed to pull card:', error);
      return null;
    } finally {
      setPulling(false);
    }
  }, [userId]);

  const clearLastPull = useCallback(() => {
    setLastPull(null);
  }, []);

  return {
    pulling,
    lastPull,
    pull,
    clearLastPull,
  };
}

// ============================================================
// STATS HOOK
// ============================================================

export interface UseGachaStatsResult {
  stats: GachaStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Fetch user's gacha statistics
 * 
 * @returns Stats and refresh function
 */
export function useGachaStats(): UseGachaStatsResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [stats, setStats] = useState<GachaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getUserGachaStats(userId);
      setStats(data);
    } catch (error) {
      console.error('[useGachaStats] Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    refresh,
  };
}

// ============================================================
// COLLECTION HOOK
// ============================================================

export interface UseCollectionResult {
  cards: CollectionCard[];
  loading: boolean;
  refresh: () => Promise<void>;
  setRarityFilter: (rarity?: GachaRarity) => void;
}

/**
 * Fetch user's card collection with optional filtering
 * 
 * @param initialRarity - Initial rarity filter
 * @returns Collection state and operations
 */
export function useCollection(
  initialRarity?: GachaRarity
): UseCollectionResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState<GachaRarity | undefined>(
    initialRarity
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getUserCollection(userId, rarityFilter);
      setCards(data);
    } catch (error) {
      console.error('[useCollection] Failed to fetch collection:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, rarityFilter]);

  // Subscribe to new card pulls
  useEffect(() => {
    if (!userId) return;

    refresh();

    const unsubscribe = subscribeToCardPulls(userId, (newCard) => {
      setCards((prev) => [newCard, ...prev]);
    });

    return unsubscribe;
  }, [userId, refresh]);

  return {
    cards,
    loading,
    refresh,
    setRarityFilter,
  };
}

// ============================================================
// COMBINED GACHA HOOK (all-in-one)
// ============================================================

export interface UseGachaResult {
  tickets: UseGachaTicketsResult;
  pull: UseGachaPullResult;
  stats: UseGachaStatsResult;
  collection: UseCollectionResult;
}

/**
 * Combined hook for full gacha functionality
 * 
 * @returns All gacha state and operations
 */
export function useGacha(): UseGachaResult {
  const tickets = useGachaTickets();
  const pull = useGachaPull();
  const stats = useGachaStats();
  const collection = useCollection();

  return {
    tickets,
    pull,
    stats,
    collection,
  };
}
