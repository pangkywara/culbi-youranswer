import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

// ─── Rarity helper ────────────────────────────────────────────────────────────

export type RarityLevel = 'Common' | 'Uncommon' | 'Rare' | 'Epic';

export function getRarity(weight: number): RarityLevel {
  if (weight >= 0.85) return 'Epic';
  if (weight >= 0.60) return 'Rare';
  if (weight >= 0.35) return 'Uncommon';
  return 'Common';
}

const RARITY_COLORS: Record<RarityLevel, { bg: string; text: string }> = {
  Common:   { bg: '#F2F2F2',  text: Colors.textTertiary },
  Uncommon: { bg: '#EAFAF1',  text: '#27AE60' },
  Rare:     { bg: '#E8EFFE',  text: Colors.brand },
  Epic:     { bg: '#FFF6E0',  text: '#E6A817' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface TripStop {
  /** Supabase row UUID — used for DB mutations (remove, reorder). Absent on new optimistic stops */
  _stop_id?: string;
  stop_order: number;
  /** ISO date string YYYY-MM-DD for the day this stop is scheduled on. Optional. */
  date?: string;
  /** True when this stop was suggested by the AI concierge and not yet accepted. */
  isSuggestion?: boolean;
  /** FK → landmarks.id — set when this stop references a verified DB landmark. */
  landmark_id?: string;
  landmark: {
    name: string;
    thumbnail_url: string;
    rarity_weight: number;
    latitude: number;
    longitude: number;
    sign_count: number;
    /** Short description injected by the AI concierge. */
    description?: string;
  };
}

interface TripStopRowProps {
  stop: TripStop;
  isLast: boolean;
}

export const TripStopRow = ({ stop, isLast }: TripStopRowProps) => {
  const rarity = getRarity(stop.landmark.rarity_weight);
  const rarityStyle = RARITY_COLORS[rarity];

  return (
    <View style={styles.row}>
      {/* Left: number bubble + connector line */}
      <View style={styles.timeline}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{stop.stop_order}</Text>
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Right: card */}
      <View style={[styles.card, isLast && styles.cardLast]}>
        {/* Thumbnail */}
        <Image
          source={{ uri: stop.landmark.thumbnail_url }}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.landmarkName} numberOfLines={2}>
            {stop.landmark.name}
          </Text>

          {/* Badges row */}
          <View style={styles.badges}>
            {/* Rarity */}
            <View style={[styles.badge, { backgroundColor: rarityStyle.bg }]}>
              <Text style={[styles.badgeText, { color: rarityStyle.text }]}>
                {rarity}
              </Text>
            </View>

            {/* Sign count */}
            <View style={styles.signBadge}>
              <Feather size={10} color={Colors.textSecondary} weight="bold" />
              <Text style={styles.signText}>
                {stop.landmark.sign_count} sign{stop.landmark.sign_count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const BUBBLE_SIZE = 28;
const LINE_WIDTH = 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // ── Timeline column ─────────────────────────────────────────────────────
  timeline: {
    alignItems: 'center',
    width: BUBBLE_SIZE,
    marginTop: 2,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bubbleText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  line: {
    width: LINE_WIDTH,
    flex: 1,
    minHeight: 24,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },

  // ── Stop card ───────────────────────────────────────────────────────────
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Space.sm,
    marginLeft: Space.md,
    marginBottom: Space.lg,
    gap: Space.md,
    ...Shadows.level1,
  },
  cardLast: {
    marginBottom: Space.sm,
  },

  thumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceMuted,
    flexShrink: 0,
  },

  info: {
    flex: 1,
    gap: 6,
  },

  landmarkName: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },

  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Type.sizeMicro + 1,
    fontWeight: Type.weightSemibold,
  },

  signBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  signText: {
    fontSize: Type.sizeMicro + 1,
    color: Colors.textSecondary,
    fontWeight: Type.weightMedium,
  },
});
