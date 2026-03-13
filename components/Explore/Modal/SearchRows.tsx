/**
 * components/Explore/Modal/SearchRows.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared row-level UI atoms for the search modal and the suggestions sheet.
 * Extracted here to avoid duplication between SearchModal and SearchSuggestionsView.
 *
 * Exports:
 *   SUGGESTED_SEEDS  – static seed destinations shown when there's no query
 *   DestinationIcon  – icon box for pin / city / navigation types
 *   LandmarkRow      – row for a live Supabase landmark result
 *   HistoryRow       – row for a persisted recent search (with remove button)
 *   SuggestedRow     – row for a static seed destination
 *   ROW_STYLES       – shared StyleSheet (consumed by parent sections)
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, Buildings, NavigationArrow, Clock, X } from 'react-native-phosphor';

import type { RecentSearch } from '@/hooks/useSearchHistory';
import type { LandmarkResult } from '@/hooks/useLandmarkSearch';

// ─── Static seed data ─────────────────────────────────────────────────────────
// Shown in the suggestions sheet and as card fallbacks when history is empty.
export const SUGGESTED_SEEDS = [
  { id: 'nearby', name: 'Nearby',           sub: "Find what's around you",     icon: 'navigation', color: '#4A90E2', bg: '#EBF3FD' },
  { id: 'kl',     name: 'Kuala Lumpur',     sub: 'Iconic Petronas Towers',     icon: 'city',       color: '#E05C5C', bg: '#FFF0F0' },
  { id: 'bali',   name: 'Bali, Indonesia',  sub: 'Temples & rice terraces',    icon: 'pin',        color: '#5BA65B', bg: '#EEF7EE' },
  { id: 'sgp',    name: 'Singapore',        sub: 'Gardens by the Bay & more',  icon: 'city',       color: '#888',    bg: '#F2F2F2' },
  { id: 'bkk',    name: 'Bangkok, Thailand',sub: 'Top-notch dining & temples', icon: 'city',       color: '#5B9BD5', bg: '#EEF4FB' },
  { id: 'hcm',    name: 'Ho Chi Minh City', sub: 'Ben Thanh Market & history', icon: 'pin',        color: '#E08A3C', bg: '#FFF3E6' },
] as const;

export type SuggestedSeed = (typeof SUGGESTED_SEEDS)[number];

// ─── Fallback card items (used in main discovery card when history is empty) ──
export const FALLBACK_CARD_ITEMS: { name: string; region: string; category: string }[] = [
  { name: 'Kuching',        region: 'Sarawak, Malaysia', category: 'destination' },
  { name: 'Bali, Indonesia', region: 'Bali, Indonesia',  category: 'destination' },
];

// ─── Icon helper ──────────────────────────────────────────────────────────────
export const DestinationIcon = React.memo(function DestinationIcon({
  type,
  color,
  bg,
}: {
  type: string;
  color: string;
  bg: string;
}) {
  let IconComp: React.ComponentType<any> = MapPin;
  if (type === 'city')       IconComp = Buildings;
  if (type === 'navigation') IconComp = NavigationArrow;

  return (
    <View style={[ROW_STYLES.iconBox, { backgroundColor: bg }]}>
      <IconComp size={22} color={color} weight="regular" />
    </View>
  );
});

// ─── Live Supabase landmark row ───────────────────────────────────────────────
export const LandmarkRow = React.memo(function LandmarkRow({
  item,
  onPress,
}: {
  item: LandmarkResult;
  onPress: (item: LandmarkResult) => void;
}) {
  return (
    <Pressable style={ROW_STYLES.row} onPress={() => onPress(item)}>
      <DestinationIcon type="pin" color="#222" bg="#F7F7F7" />
      <View style={ROW_STYLES.textWrap}>
        <Text style={ROW_STYLES.name}>{item.name}</Text>
        <Text style={ROW_STYLES.sub} numberOfLines={1}>{item.region}</Text>
      </View>
    </Pressable>
  );
});

// ─── Recent history row ───────────────────────────────────────────────────────
export const HistoryRow = React.memo(function HistoryRow({
  item,
  onPress,
  onRemove,
}: {
  item:     RecentSearch;
  onPress:  (item: RecentSearch) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Pressable style={ROW_STYLES.row} onPress={() => onPress(item)}>
      <View style={[ROW_STYLES.iconBox, { backgroundColor: '#F7F7F7' }]}>
        <Clock size={22} color="#717171" weight="regular" />
      </View>
      <View style={ROW_STYLES.textWrap}>
        <Text style={ROW_STYLES.name}>{item.name}</Text>
        <Text style={ROW_STYLES.sub} numberOfLines={1}>
          {item.region || item.category || 'Recent search'}
        </Text>
      </View>
      <Pressable hitSlop={12} onPress={() => onRemove(item.id)}>
        <X size={16} color="#BBBBBB" weight="bold" />
      </Pressable>
    </Pressable>
  );
});

// ─── Static seed row ──────────────────────────────────────────────────────────
export const SuggestedRow = React.memo(function SuggestedRow({
  item,
  onPress,
}: {
  item: SuggestedSeed;
  onPress: (name: string) => void;
}) {
  return (
    <Pressable style={ROW_STYLES.row} onPress={() => onPress(item.name)}>
      <DestinationIcon type={item.icon} color={item.color} bg={item.bg} />
      <View style={ROW_STYLES.textWrap}>
        <Text style={ROW_STYLES.name}>{item.name}</Text>
        <Text style={ROW_STYLES.sub} numberOfLines={1}>{item.sub}</Text>
      </View>
    </Pressable>
  );
});

// ─── Shared styles ────────────────────────────────────────────────────────────
export const ROW_STYLES = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  sub:  { fontSize: 13, color: '#717171',  marginTop: 2 },
});
