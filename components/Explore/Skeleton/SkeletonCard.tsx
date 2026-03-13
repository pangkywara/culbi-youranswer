/**
 * SkeletonCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer placeholder that mirrors the layout of ExperienceCard:
 *   • Square image block (borderRadius 30, aspect-ratio 1:1)
 *   • Title line
 *   • Subtitle / distance line
 *
 * `shimmerX` must come from a parent `useSkeletonShimmer()` call so that
 * all cards on the same screen pulse in perfect phase-lock.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { SkeletonBox } from '@/components/Destinations/Skeleton/SkeletonBox';

interface SkeletonCardProps {
  shimmerX: SharedValue<number>;
  /** Pixel width of the card — matches the real card's cardWidth prop */
  width: number;
  /** 'standard' → full square image; 'compact' → same but smaller text */
  variant?: 'standard' | 'compact';
}

export function SkeletonCard({ shimmerX, width, variant = 'standard' }: SkeletonCardProps) {
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.card, { width }]}>
      {/* Image block — square, matching ExperienceCard imageWrapper */}
      <SkeletonBox
        shimmerX={shimmerX}
        width={width}
        height={width}       // aspect-ratio 1:1
        borderRadius={30}    // matches styles.imageWrapper borderRadius
      />

      {/* Text area */}
      <View style={styles.textArea}>
        {/* Title + rating row */}
        <View style={styles.titleRow}>
          <SkeletonBox
            shimmerX={shimmerX}
            width={isCompact ? '60%' : '65%'}
            height={13}
            borderRadius={6}
          />
          <SkeletonBox
            shimmerX={shimmerX}
            width={32}
            height={13}
            borderRadius={6}
          />
        </View>
        {/* Subtitle / distance */}
        <SkeletonBox
          shimmerX={shimmerX}
          width={isCompact ? '50%' : '55%'}
          height={12}
          borderRadius={6}
          style={{ marginTop: 6 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12, // matches CARD_GAP in index.tsx
  },
  textArea: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
