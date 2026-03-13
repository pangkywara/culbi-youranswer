/**
 * Gacha System Types (Ticket-Based)
 * 
 * TypeScript types for the ticket-based gacha card collection system.
 */

// ============================================================
// Database Table Types
// ============================================================

export interface GachaTickets {
  user_id: string;
  tickets: number;
  total_earned: number;
  updated_at?: string;
}

export interface GachaCard {
  id: string;
  landmark_id: string | null;
  image_url: string;
  card_title: string;
  card_subtitle: string | null;
  rarity: GachaRarity;
  pull_weight: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserGachaCollection {
  user_id: string;
  card_id: string;
  pulled_at: string;
  pull_number: number;
  is_duplicate: boolean;
}

export interface GachaPullHistory {
  id: string;
  user_id: string;
  card_id: string;
  rarity: GachaRarity;
  was_duplicate: boolean;
  created_at: string;
}

// ============================================================
// Enums
// ============================================================

export type GachaRarity = 
  | 'Secret'
  | 'Mythic'
  | 'Legends'
  | 'Epic'
  | 'Rare'
  | 'Common';

// ============================================================
// RPC Response Types
// ============================================================

/**
 * Response from award_gacha_ticket()
 * Called after landmark scan completes (50/50 chance)
 */
export interface AwardTicketResponse {
  awarded: boolean;
  tickets: number;
  message: string;
}

/**
 * Response from pull_gacha_card()
 * Spend 1 ticket to get 1 random card
 */
export interface PullCardResponse {
  success: boolean;
  card?: {
    id: string;
    image_url: string;
    title: string;
    subtitle: string | null;
    rarity: GachaRarity;
    landmark_id: string | null;
    is_duplicate: boolean;
    pull_number: number;
  };
  remaining_tickets?: number;
  error?: string;
}

/**
 * Response from get_user_gacha_stats()
 * Dashboard statistics
 */
export interface GachaStats {
  tickets: number;
  total_tickets_earned: number;
  total_pulls: number;
  unique_cards_owned: number;
  total_cards_available: number;
  collection_progress: number; // Percentage
  rarity_counts: {
    Secret: number;
    Mythic: number;
    Legends: number;
    Epic: number;
    Rare: number;
    Common: number;
  };
}

/**
 * Response from get_user_collection()
 * User's collected cards with duplicate counts
 */
export interface CollectionCard {
  card_id: string;
  image_url: string;
  title: string;
  subtitle: string | null;
  rarity: GachaRarity;
  pulled_at: string;
  duplicate_count: number;
}

// ============================================================
// Client-Side Types
// ============================================================

/**
 * Rarity configuration for UI display
 */
export interface RarityConfig {
  label: string;
  color: string;
  probability: number; // Pull probability (0-1)
}

export const RARITY_CONFIG: Record<GachaRarity, RarityConfig> = {
  Secret: {
    label: 'Secret Rare',
    color: '#E63946', // Red
    probability: 0.01, // 1%
  },
  Mythic: {
    label: 'Mythic',
    color: '#FFB703', // Gold
    probability: 0.03, // 3%
  },
  Legends: {
    label: 'Legendary',
    color: '#00B4D8', // Cyan
    probability: 0.06, // 6%
  },
  Epic: {
    label: 'Epic',
    color: '#8338EC', // Purple
    probability: 0.15, // 15%
  },
  Rare: {
    label: 'Rare',
    color: '#2A9D8F', // Teal
    probability: 0.25, // 25%
  },
  Common: {
    label: 'Common',
    color: '#6C757D', // Gray
    probability: 0.50, // 50%
  },
};

// ============================================================
// Constants
// ============================================================

export const GACHA_CONSTANTS = {
  TICKET_AWARD_CHANCE: 0.5, // 50/50 chance per landmark scan
  TICKETS_PER_PULL: 1, // Cost to pull one card
  
  // Animation durations (ms)
  CARD_REVEAL_DURATION: 2500,
  CARD_FLIP_DURATION: 1200,
  TOAST_DURATION: 4000,
} as const;
