/**
 * Gacha Service
 * 
 * Service layer for ticket-based gacha system.
 * Handles:
 * - Awarding tickets from landmark scans (50/50 chance)
 * - Pulling gacha cards with tickets
 * - Fetching user collection and stats
 */

import { supabase } from './supabase';
import type {
  AwardTicketResponse,
  PullCardResponse,
  GachaStats,
  CollectionCard,
  GachaRarity,
  GachaCard,
} from '@/types/gacha';

// ============================================================
// TICKET MANAGEMENT
// ============================================================

/**
 * Award a gacha ticket with 50/50 chance (called after landmark scan)
 * 
 * @param userId - User's UUID
 * @returns Award result with new ticket count
 */
export async function awardGachaTicket(
  userId: string
): Promise<AwardTicketResponse | null> {
  try {
    const { data, error } = await supabase
      .rpc('award_gacha_ticket' as any, { p_user_id: userId });

    if (error) {
      console.error('[awardGachaTicket] Error:', error.message);
      throw error;
    }

    return data as unknown as AwardTicketResponse;
  } catch (error) {
    console.error('[awardGachaTicket] Failed:', error);
    return null;
  }
}

/**
 * Get user's current ticket balance
 * 
 * @param userId - User's UUID
 * @returns Ticket count or 0
 */
export async function getUserTicketBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('gacha_tickets' as any)
      .select('tickets')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return 0; // No record yet
      throw error;
    }

    return ((data as unknown) as { tickets: number } | null)?.tickets || 0;
  } catch (error) {
    console.error('[getUserTicketBalance] Failed:', error);
    return 0;
  }
}

// ============================================================
// GACHA PULL
// ============================================================

/**
 * Pull a gacha card using 1 ticket
 * 
 * @param userId - User's UUID
 * @returns Pull result with card data
 */
export async function pullGachaCard(
  userId: string
): Promise<PullCardResponse | null> {
  try {
    const { data, error } = await supabase
      .rpc('pull_gacha_card' as any, { p_user_id: userId });

    if (error) {
      console.error('[pullGachaCard] Error:', error.message);
      throw error;
    }

    return data as unknown as PullCardResponse;
  } catch (error) {
    console.error('[pullGachaCard] Failed:', error);
    return null;
  }
}

// ============================================================
// COLLECTION & STATS
// ============================================================

/**
 * Get user's gacha statistics
 * 
 * @param userId - User's UUID
 * @returns Comprehensive gacha stats
 */
export async function getUserGachaStats(
  userId: string
): Promise<GachaStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_gacha_stats' as any, { p_user_id: userId });

    if (error) {
      console.error('[getUserGachaStats] Error:', error.message);
      throw error;
    }

    return data as unknown as GachaStats;
  } catch (error) {
    console.error('[getUserGachaStats] Failed:', error);
    return null;
  }
}

/**
 * Get user's card collection
 * 
 * @param userId - User's UUID
 * @param rarity - Optional: filter by rarity
 * @param limit - Max cards to return
 * @returns Array of collected cards
 */
export async function getUserCollection(
  userId: string,
  rarity?: GachaRarity,
  limit = 50
): Promise<CollectionCard[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_collection' as any, {
        p_user_id: userId,
        p_rarity: rarity || null,
        p_limit: limit,
      });

    if (error) {
      console.error('[getUserCollection] Error:', error.message);
      throw error;
    }

    return (data as unknown as CollectionCard[]) || [];
  } catch (error) {
    console.error('[getUserCollection] Failed:', error);
    return [];
  }
}

/**
 * Get all available gacha cards (for display in collections grid)
 * 
 * @param rarity - Optional: filter by rarity
 * @returns Array of all gacha cards
 */
export async function getAllGachaCards(
  rarity?: GachaRarity
): Promise<GachaCard[]> {
  try {
    let query = supabase
      .from('gacha_cards' as any)
      .select('*')
      .eq('is_active', true)
      .order('rarity', { ascending: false })
      .order('card_title', { ascending: true });

    if (rarity) {
      query = query.eq('rarity', rarity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getAllGachaCards] Error:', error.message);
      throw error;
    }

    // Add landmark_id as null since these are standalone cards
    return ((data || []) as any[]).map(card => ({
      ...card,
      landmark_id: null,
    })) as GachaCard[];
  } catch (error) {
    console.error('[getAllGachaCards] Failed:', error);
    return [];
  }
}

// ============================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe to ticket balance changes
 * 
 * @param userId - User's UUID
 * @param callback - Called when tickets change
 * @returns Unsubscribe function
 */
export function subscribeToTicketBalance(
  userId: string,
  callback: (tickets: number) => void
) {
  const channel = supabase
    .channel(`gacha_tickets:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gacha_tickets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const { tickets } = payload.new as { tickets: number };
          callback(tickets);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to new card pulls
 * 
 * @param userId - User's UUID
 * @param callback - Called when user pulls a new card
 * @returns Unsubscribe function
 */
export function subscribeToCardPulls(
  userId: string,
  callback: (card: CollectionCard) => void
) {
  const channel = supabase
    .channel(`gacha_collection:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_gacha_collection',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch full card details
        if (payload.new && typeof payload.new === 'object') {
          const { card_id } = payload.new as { card_id: string };
          
          const { data } = await supabase
            .from('gacha_cards' as any)
            .select('*')
            .eq('id', card_id)
            .single();
          
          if (data) {
            callback(data as unknown as CollectionCard);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
