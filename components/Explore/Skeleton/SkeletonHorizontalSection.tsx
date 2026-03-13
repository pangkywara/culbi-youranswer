/**
 * SkeletonHorizontalSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder that mirrors HorizontalSection in index.tsx:
 *   • Section header row  (title bar + arrow-button box)
 *   • Horizontal row of SkeletonCards (3 visible + partial 4th implying scroll)
 *
 * `shimmerX` must come from a parent `useSkeletonShimmer()` call.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { SkeletonBox } from '@/components/Destinations/Skeleton/SkeletonBox';
import { SkeletonCard } from './SkeletonCard';

const HORIZONTAL_PADDING = 20;

interface SkeletonHorizontalSectionProps {
  shimmerX: SharedValue<number>;
  cardWidth: number;
  variant?: 'standard' | 'compact';
  /** Number of placeholder cards to render (default 3) */
  cardCount?: number;
}

export function SkeletonHorizontalSection({
  shimmerX,
  cardWidth,
  variant = 'standard',
  cardCount = 3,
}: SkeletonHorizontalSectionProps) {
  return (
    <View style={styles.section}>
      {/* Header: title + arrow button */}
      <View style={styles.header}>
        <SkeletonBox shimmerX={shimmerX} width={120} height={18} borderRadius={8} />
        <SkeletonBox shimmerX={shimmerX} width={32} height={32} borderRadius={16} />
      </View>

      {/* Horizontal card row — non-interactive ScrollView is sufficient */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.cardRow}
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard
            key={i}
            shimmerX={shimmerX}
            width={cardWidth}
            variant={variant}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
  },
  cardRow: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
});
